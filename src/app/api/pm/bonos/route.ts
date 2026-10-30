import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errors";
import { parseProjectCode } from "@/lib/projects";

function parsePeriod(period: string) {
  // period esperado: "2026-02"
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

    // Filtro por proyecto (si es GENERAL, no filtra)
    const projectFilter =
      project === "GENERAL" || !projectCode
        ? {}
        : {
            employee: {
              project: { code: projectCode },
            },
          };

    const rows = await prisma.bonosMes.findMany({
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

    const items = rows.map((b) => ({
      id: b.id,
      employeeId: b.employeeId,
      username: b.employee.user.username,
      name: b.employee.user.name,
      project: b.employee.project?.code ?? "GENERAL",

      year: b.year,
      month: b.month,

      total: Number(b.total),
      productividad: Number(b.productividad),
      calidad: Number(b.calidad),
      qc: Number(b.qc),
      validacion: Number(b.validacion),
      supervision: Number(b.supervision),
      calidad_sup: Number(b.calidad_sup),
      supervision_sig: Number(b.supervision_sig),
      calidad_sig: Number(b.calidad_sig),
      bono_fijo: Number(b.bono_fijo),
    }));

    const total = items.reduce((acc, x) => acc + (x.total || 0), 0);

    return NextResponse.json({
      ok: true,
      project,
      period,
      year,
      month,
      total,
      items,
    });
  } catch (error: unknown) {
    console.error("ERROR /api/pm/bonos:", error);
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error, "Error interno cargando bonos") },
      { status: 500 }
    );
  }
}
