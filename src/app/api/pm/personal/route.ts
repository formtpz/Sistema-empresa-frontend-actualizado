import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleFromRequest } from "@/lib/auth";
import { parseProjectCode } from "@/lib/projects";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // ✅ Auth (solo PM/GERENCIA/ADMIN)
  const auth = await requireRoleFromRequest(req, ["PM", "GERENCIA", "ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const projectCode = (searchParams.get("project") || "GENERAL").toUpperCase();
    const parsedProjectCode = parseProjectCode(projectCode);

    const project =
      projectCode === "GENERAL" || !parsedProjectCode
        ? null
        : await prisma.project.findUnique({
            where: { code: parsedProjectCode },
            select: { id: true, code: true, name: true },
          });

    const whereEmp = project ? { projectId: project.id } : {};

    const employees = await prisma.employee.findMany({
      where: whereEmp,
      orderBy: [{ supervisor: "asc" }, { puesto: "asc" }, { username: "asc" }],
      select: {
        username: true,
        puesto: true,
        supervisor: true,
        start_date: true,
        projectId: true,
        user: {
          select: { name: true, email: true, role: true, active: true },
        },
      },
    });

    const porPuestoRaw = await prisma.employee.groupBy({
      by: ["puesto"],
      where: whereEmp,
      _count: true,
    });

    const porPuesto = porPuestoRaw
      .map((x) => ({
        puesto: x.puesto || "SIN_PUESTO",
        count: x._count,
      }))
      .sort((a, b) => b.count - a.count);

    const porSupervisorRaw = await prisma.employee.groupBy({
      by: ["supervisor"],
      where: whereEmp,
      _count: true,
    });

    const porSupervisor = porSupervisorRaw
      .map((x) => ({
        supervisor: x.supervisor || "SIN_SUPERVISOR",
        count: x._count,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      project: project ? project : { code: "GENERAL", name: "General" },
      total: employees.length,
      porPuesto,
      porSupervisor,
      employees,
    });
  } catch (err) {
    console.error("PM PERSONAL ERROR:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
