export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  username: string;
  role: string;
};

type HorasExtraInput = {
  employeeUsername?: unknown;
  year?: unknown;
  month?: unknown;
  total?: unknown;
  ordinarias?: unknown;
  feriados?: unknown;
  diurnas?: unknown;
  nocturnas?: unknown;
  diurnas_feriado?: unknown;
  nocturnas_feriado?: unknown;
};

type TeamEmployee = {
  id: number;
  username: string;
  puesto: string | null;
  supervisor: string | null;
  user: { name: string };
};

type HorasExtraRow = {
  employeeId: number;
  total: unknown;
  ordinarias: unknown;
  feriados: unknown;
  diurnas: unknown;
  nocturnas: unknown;
  diurnas_feriado: unknown;
  nocturnas_feriado: unknown;
};

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
}

async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  const { payload } = await jwtVerify(token, getSecret());
  const username = String(payload.sub ?? payload.username ?? "").trim();
  const role = String(payload.role ?? "").toUpperCase();

  if (!username) return null;
  return { username, role };
}

function monthsDiff(from: Date, to: Date) {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

function monthsDiffByAnniversary(startDate: Date, fromDate: Date, toDate: Date) {
  if (toDate < fromDate) return 0;

  let count = 0;
  const anniversaryDay = startDate.getDate();
  let current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);

  while (current <= toDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    let anniversary = new Date(year, month, anniversaryDay);

    if (anniversary.getMonth() !== month) {
      anniversary = new Date(year, month + 1, 0);
    }

    if (anniversary >= fromDate && anniversary <= toDate) {
      count++;
    }

    current = new Date(year, month + 1, 1);
  }

  return count;
}

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

function displayName(name: string, username: string) {
  const cleanName = name.trim();
  if (cleanName && cleanName.toLowerCase() !== username.toLowerCase()) {
    return cleanName;
  }

  return username
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseHorasPayload(body: HorasExtraInput) {
  const employeeUsername =
    typeof body.employeeUsername === "string" ? body.employeeUsername.trim() : "";
  const year = Number(body.year);
  const month = Number(body.month);

  const ordinarias = numberFromInput(body.ordinarias);
  const feriados = numberFromInput(body.feriados);
  const diurnas = numberFromInput(body.diurnas);
  const nocturnas = numberFromInput(body.nocturnas);
  const diurnasFeriado = numberFromInput(body.diurnas_feriado);
  const nocturnasFeriado = numberFromInput(body.nocturnas_feriado);
  const totalInput = numberFromInput(body.total);

  if (!employeeUsername) return null;
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (
    ordinarias === null ||
    feriados === null ||
    diurnas === null ||
    nocturnas === null ||
    diurnasFeriado === null ||
    nocturnasFeriado === null ||
    totalInput === null
  ) {
    return null;
  }

  const calculatedTotal =
    ordinarias + feriados + diurnas + nocturnas + diurnasFeriado + nocturnasFeriado;
  const total = totalInput > 0 ? totalInput : calculatedTotal;

  return {
    employeeUsername,
    year,
    month,
    total,
    ordinarias,
    feriados,
    diurnas,
    nocturnas,
    diurnas_feriado: diurnasFeriado,
    nocturnas_feriado: nocturnasFeriado,
  };
}

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    if (session.role !== "OPERADOR") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { username: session.username },
      select: { username: true, name: true, email: true, role: true },
    });

    const emp = await prisma.employee.findUnique({
      where: { username: session.username },
      select: {
        cedula: true,
        puesto: true,
        supervisor: true,
        start_date: true,
        vacaciones_saldo: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuario no existe" }, { status: 404 });
    }

    const startDate = emp?.start_date ?? null;
    const now = new Date();
    const antigMeses = startDate ? monthsDiff(startDate, now) : 0;

    const corte = new Date("2026-01-19T00:00:00.000Z");
    const vacacionesSaldo = emp ? Number(emp.vacaciones_saldo) : 0;
    let vacacionesActual = vacacionesSaldo;

    if (startDate) {
      const extra = monthsDiffByAnniversary(startDate, corte, now);
      vacacionesActual = vacacionesSaldo + extra;
    }

    return NextResponse.json({
      username: user.username,
      name: displayName(user.name, user.username),
      email: user.email ?? "",
      puesto: emp?.puesto ?? "",
      supervisor: emp?.supervisor ?? "",
      start_date: startDate ? startDate.toISOString() : null,
      antiguedad_meses: antigMeses,
      vacaciones_saldo: vacacionesSaldo,
      vacaciones_actual: vacacionesActual,
      equipo_horas_extra: await getEquipoHorasExtra(session.username),
    });
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

    const parsed = parseHorasPayload((await req.json().catch(() => ({}))) as HorasExtraInput);
    if (!parsed) {
      return NextResponse.json(
        { message: "Datos invalidos para guardar horas extra." },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { username: parsed.employeeUsername },
      select: {
        id: true,
        username: true,
        supervisor: true,
        user: { select: { name: true } },
      },
    });

    if (!employee || !supervisorMatches(session.username, employee.supervisor)) {
      return NextResponse.json(
        { message: "Ese operario no pertenece a este supervisor." },
        { status: 403 }
      );
    }

    const saved = await prisma.horasExtraMes.upsert({
      where: {
        horas_extra_mes_unique: {
          employeeId: employee.id,
          year: parsed.year,
          month: parsed.month,
        },
      },
      update: {
        total: parsed.total,
        ordinarias: parsed.ordinarias,
        feriados: parsed.feriados,
        diurnas: parsed.diurnas,
        nocturnas: parsed.nocturnas,
        diurnas_feriado: parsed.diurnas_feriado,
        nocturnas_feriado: parsed.nocturnas_feriado,
      },
      create: {
        employeeId: employee.id,
        year: parsed.year,
        month: parsed.month,
        total: parsed.total,
        ordinarias: parsed.ordinarias,
        feriados: parsed.feriados,
        diurnas: parsed.diurnas,
        nocturnas: parsed.nocturnas,
        diurnas_feriado: parsed.diurnas_feriado,
        nocturnas_feriado: parsed.nocturnas_feriado,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Horas extra guardadas.",
      item: {
        username: employee.username,
        name: employee.user.name,
        year: saved.year,
        month: saved.month,
        total: Number(saved.total),
        ordinarias: Number(saved.ordinarias),
        feriados: Number(saved.feriados),
        diurnas: Number(saved.diurnas),
        nocturnas: Number(saved.nocturnas),
        diurnas_feriado: Number(saved.diurnas_feriado),
        nocturnas_feriado: Number(saved.nocturnas_feriado),
      },
      equipo_horas_extra: await getEquipoHorasExtra(session.username, saved.year, saved.month),
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudieron guardar las horas extra." },
      { status: 500 }
    );
  }
}

async function getEquipoHorasExtra(username: string, year?: number, month?: number) {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      username: true,
      puesto: true,
      supervisor: true,
      user: { select: { name: true } },
    },
  });

  const equipo = employees.filter((employee) =>
    supervisorMatches(username, employee.supervisor)
  );

  if (equipo.length === 0) return null;

  const employeeIds = equipo.map((employee) => employee.id);
  const latest =
    year && month
      ? { year, month }
      : await prisma.horasExtraMes.findFirst({
          where: { employeeId: { in: employeeIds } },
          orderBy: [{ year: "desc" }, { month: "desc" }],
          select: { year: true, month: true },
        });

  if (!latest) {
    return buildEquipoHorasExtra(equipo, null, null, []);
  }

  const rows = await prisma.horasExtraMes.findMany({
    where: {
      employeeId: { in: employeeIds },
      year: latest.year,
      month: latest.month,
    },
  });

  return buildEquipoHorasExtra(equipo, latest.year, latest.month, rows);
}

function buildEquipoHorasExtra(
  equipo: TeamEmployee[],
  year: number | null,
  month: number | null,
  rows: HorasExtraRow[]
) {
  const horasByEmployee = new Map(rows.map((row) => [row.employeeId, row]));
  const items = equipo.map((employee) => {
    const horas = horasByEmployee.get(employee.id);

    return {
      username: employee.username,
      name: employee.user.name,
      puesto: employee.puesto ?? "",
      total: Number(horas?.total ?? 0),
      ordinarias: Number(horas?.ordinarias ?? 0),
      feriados: Number(horas?.feriados ?? 0),
      diurnas: Number(horas?.diurnas ?? 0),
      nocturnas: Number(horas?.nocturnas ?? 0),
      diurnas_feriado: Number(horas?.diurnas_feriado ?? 0),
      nocturnas_feriado: Number(horas?.nocturnas_feriado ?? 0),
    };
  });

  return {
    year,
    month,
    total_horas: items.reduce((acc, item) => acc + item.total, 0),
    items,
  };
}
