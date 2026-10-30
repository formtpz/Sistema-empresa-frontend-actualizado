import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errors";
import { parseProjectCode } from "@/lib/projects";

function parsePeriod(period: string) {
  const [y, m] = period.split("-");
  const year = Number(y);
  const month = Number(m);
  if (!year || !month || month < 1 || month > 12) return null;
  return { year, month };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const project = (searchParams.get("project") ?? "GENERAL").toUpperCase();
    const period = searchParams.get("period");

    if (!period) {
      return NextResponse.json(
        { ok: false, error: "Falta 'period' (ej: 2026-02)" },
        { status: 400 }
      );
    }

    const parsed = parsePeriod(period);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "Formato inválido de 'period'. Usa YYYY-MM (ej: 2026-02)" },
        { status: 400 }
      );
    }

    const { year, month } = parsed;
    const projectCode = parseProjectCode(project);

    const projectFilter =
      project === "GENERAL" || !projectCode
        ? {}
        : {
            employee: {
              project: { code: projectCode },
            },
          };

    const rows = await prisma.horasExtraMes.findMany({
      where: {
        year,
        month,
        ...projectFilter,
      },
      include: {
        employee: {
          include: {
            user: true,
            project: true,
          },
        },
      },
      orderBy: {
        total: "desc",
      },
    });

    const items = rows.map((h) => ({
      id: h.id,
      employeeId: h.employeeId,
      username: h.employee.user.username,
      name: h.employee.user.name,
      project: h.employee.project?.code ?? "GENERAL",

      year: h.year,
      month: h.month,

      total: Number(h.total),
      ordinarias: Number(h.ordinarias),
      feriados: Number(h.feriados),
      diurnas: Number(h.diurnas),
      nocturnas: Number(h.nocturnas),
      diurnas_feriado: Number(h.diurnas_feriado),
      nocturnas_feriado: Number(h.nocturnas_feriado),
    }));

    const totalHoras = items.reduce((acc, x) => acc + (x.total || 0), 0);

    return NextResponse.json({
      ok: true,
      project,
      period,
      year,
      month,
      totalHoras,
      items,
    });
  } catch (error: unknown) {
    console.error("ERROR /api/pm/horas-extra:", error);

    return NextResponse.json(
      { ok: false, error: getErrorMessage(error, "Error interno cargando horas extra") },
      { status: 500 }
    );
  }
}
