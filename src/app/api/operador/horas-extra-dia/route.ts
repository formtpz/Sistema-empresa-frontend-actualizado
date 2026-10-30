export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  username: string;
  role: string;
};

type HorasDiaInput = {
  employeeUsername?: unknown;
  date?: unknown;
  cantidad?: unknown;
  ordinarias?: unknown;
  feriados?: unknown;
  diurnas?: unknown;
  nocturnas?: unknown;
  diurnas_feriado?: unknown;
  nocturnas_feriado?: unknown;
  justificacion?: unknown;
};

const getSessionUser = getSession;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function supervisorMatches(username: string, supervisor: string | null) {
  if (!supervisor) return false;

  const normalizedSupervisor = normalizeText(supervisor);
  const tokens = username
    .split(/[._-]/)
    .map((token) => normalizeText(token.trim()))
    .filter(Boolean);

  return tokens.length > 0 && tokens.every((token) => normalizedSupervisor.includes(token));
}

function numberFromInput(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numberValue) || numberValue < 0) return null;
  return numberValue;
}

function dateFromInput(value: unknown) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { date, year, month, day };
}

function parsePayload(body: HorasDiaInput) {
  const employeeUsername =
    typeof body.employeeUsername === "string" ? body.employeeUsername.trim() : "";
  const parsedDate = dateFromInput(body.date);

  const cantidad = numberFromInput(body.cantidad);

  if (!employeeUsername || !parsedDate) return null;
  if (cantidad === null) return null;

  return {
    employeeUsername,
    ...parsedDate,
    ordinarias: 0,
    feriados: 0,
    diurnas: 0,
    nocturnas: 0,
    diurnas_feriado: 0,
    nocturnas_feriado: 0,
    total: cantidad,
    justificacion:
      typeof body.justificacion === "string" ? body.justificacion.trim() : "",
  };
}

async function getSupervisorTeam(username: string) {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      username: true,
      puesto: true,
      supervisor: true,
      user: { select: { name: true } },
    },
  });

  return employees.filter((employee) => supervisorMatches(username, employee.supervisor));
}

async function recalculateMonthly(employeeId: number, year: number, month: number) {
  const rows = await prisma.horasExtraDia.findMany({
    where: { employeeId, year, month },
    select: {
      total: true,
      ordinarias: true,
      feriados: true,
      diurnas: true,
      nocturnas: true,
      diurnas_feriado: true,
      nocturnas_feriado: true,
    },
  });

  const totals = rows.reduce(
    (acc, row) => ({
      total: acc.total + Number(row.total),
      ordinarias: acc.ordinarias + Number(row.ordinarias),
      feriados: acc.feriados + Number(row.feriados),
      diurnas: acc.diurnas + Number(row.diurnas),
      nocturnas: acc.nocturnas + Number(row.nocturnas),
      diurnas_feriado: acc.diurnas_feriado + Number(row.diurnas_feriado),
      nocturnas_feriado: acc.nocturnas_feriado + Number(row.nocturnas_feriado),
    }),
    {
      total: 0,
      ordinarias: 0,
      feriados: 0,
      diurnas: 0,
      nocturnas: 0,
      diurnas_feriado: 0,
      nocturnas_feriado: 0,
    }
  );

  await prisma.horasExtraMes.upsert({
    where: {
      horas_extra_mes_unique: { employeeId, year, month },
    },
    update: totals,
    create: { employeeId, year, month, ...totals },
  });
}

async function buildResponse(username: string, year: number, month: number) {
  const team = await getSupervisorTeam(username);
  const employeeIds = team.map((employee) => employee.id);

  const rows =
    employeeIds.length > 0
      ? await prisma.horasExtraDia.findMany({
          where: { employeeId: { in: employeeIds }, year, month },
          include: { employee: { include: { user: true } } },
          orderBy: [{ date: "desc" }, { employee: { username: "asc" } }],
        })
      : [];

  return {
    ok: true,
    year,
    month,
    team: team.map((employee) => ({
      username: employee.username,
      name: employee.user.name,
      puesto: employee.puesto ?? "",
    })),
    items: rows.map((row) => ({
      id: row.id,
      username: row.employee.username,
      name: row.employee.user.name,
      puesto: row.employee.puesto ?? "",
      date: row.date.toISOString().slice(0, 10),
      total: Number(row.total),
      ordinarias: Number(row.ordinarias),
      feriados: Number(row.feriados),
      diurnas: Number(row.diurnas),
      nocturnas: Number(row.nocturnas),
      diurnas_feriado: Number(row.diurnas_feriado),
      nocturnas_feriado: Number(row.nocturnas_feriado),
      justificacion: row.justificacion ?? "",
    })),
  };
}

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (session.role !== "OPERADOR") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ message: "Periodo invalido." }, { status: 400 });
    }

    const team = await getSupervisorTeam(session.username);
    if (team.length === 0) {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json(await buildResponse(session.username, year, month));
  } catch {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (session.role !== "OPERADOR") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const parsed = parsePayload((await req.json().catch(() => ({}))) as HorasDiaInput);
    if (!parsed) {
      return NextResponse.json({ message: "Datos invalidos." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { username: parsed.employeeUsername },
      select: { id: true, supervisor: true },
    });

    if (!employee || !supervisorMatches(session.username, employee.supervisor)) {
      return NextResponse.json(
        { message: "Ese operario no pertenece a este supervisor." },
        { status: 403 }
      );
    }

    await prisma.horasExtraDia.upsert({
      where: {
        horas_extra_dia_unique: {
          employeeId: employee.id,
          date: parsed.date,
        },
      },
      update: {
        year: parsed.year,
        month: parsed.month,
        day: parsed.day,
        total: parsed.total,
        ordinarias: parsed.ordinarias,
        feriados: parsed.feriados,
        diurnas: parsed.diurnas,
        nocturnas: parsed.nocturnas,
        diurnas_feriado: parsed.diurnas_feriado,
        nocturnas_feriado: parsed.nocturnas_feriado,
        justificacion: parsed.justificacion,
      },
      create: {
        employeeId: employee.id,
        date: parsed.date,
        year: parsed.year,
        month: parsed.month,
        day: parsed.day,
        total: parsed.total,
        ordinarias: parsed.ordinarias,
        feriados: parsed.feriados,
        diurnas: parsed.diurnas,
        nocturnas: parsed.nocturnas,
        diurnas_feriado: parsed.diurnas_feriado,
        nocturnas_feriado: parsed.nocturnas_feriado,
        justificacion: parsed.justificacion,
      },
    });

    await recalculateMonthly(employee.id, parsed.year, parsed.month);

    return NextResponse.json({
      ...(await buildResponse(session.username, parsed.year, parsed.month)),
      message: "Horas del dia guardadas.",
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudieron guardar las horas del dia." },
      { status: 500 }
    );
  }
}
