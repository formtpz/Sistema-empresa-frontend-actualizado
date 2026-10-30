import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleFromRequest } from "@/lib/auth";
import { parseProjectCode } from "@/lib/projects";
import { listUsers } from "@/lib/userStore";
import { withTimeout } from "@/lib/timeout";

export const runtime = "nodejs";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=domingo
  const diff = (day === 0 ? -6 : 1) - day; // lunes inicio
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function fallbackDashboard(projectCode: string) {
  const users = listUsers();
  const activeUsers = users.filter((user) => user.active);
  const operators = activeUsers.filter((user) => user.role === "OPERADOR").length;
  const coordinators = activeUsers.filter((user) => user.role === "COORDINACION").length;
  const rh = activeUsers.filter((user) => user.role === "RH").length;
  const pm = activeUsers.filter((user) => user.role === "PM").length;

  return {
    project: { code: projectCode, name: projectCode === "GENERAL" ? "General" : projectCode },
    personal: activeUsers.length,
    kpis: {
      pendientesHoy: 0,
      pendientesSemana: 0,
      pendientesMes: 0,
      aprobadosMes: 0,
    },
    topUsuarios: users.slice(0, 5).map((user) => ({ username: user.username, _count: 0 })),
    tiposFrecuentes: [
      { tipo: "OPERADOR", _count: operators },
      { tipo: "COORDINACION", _count: coordinators },
      { tipo: "RH", _count: rh },
      { tipo: "PM", _count: pm },
    ].filter((item) => item._count > 0),
    porEstado: [{ estado: "SIN_DATOS_DB", _count: 0 }],
    porSupervisor: [{ supervisor: "SIN_SUPERVISOR", count: activeUsers.length }],
  };
}

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
        : await withTimeout(
            prisma.project.findUnique({
              where: { code: parsedProjectCode },
              select: { id: true, code: true, name: true },
            })
          );

    const wherePermisoProject = project ? { projectId: project.id } : {};
    const whereEmployeeProject = project ? { projectId: project.id } : {};

    const today = startOfDay();
    const week = startOfWeek();
    const month = startOfMonth();

    // -------------------------
    // Headcount por proyecto
    // -------------------------
    const personal = await withTimeout(
      prisma.employee.count({
        where: whereEmployeeProject,
      })
    );

    // -------------------------
    // KPIs Permisos
    // -------------------------
    const pendientesHoy = await withTimeout(
      prisma.permiso.count({
        where: { ...wherePermisoProject, estado: "ENVIADO", created_at: { gte: today } },
      })
    );

    const pendientesSemana = await withTimeout(
      prisma.permiso.count({
        where: { ...wherePermisoProject, estado: "ENVIADO", created_at: { gte: week } },
      })
    );

    const pendientesMes = await withTimeout(
      prisma.permiso.count({
        where: { ...wherePermisoProject, estado: "ENVIADO", created_at: { gte: month } },
      })
    );

    const aprobadosMes = await withTimeout(
      prisma.permiso.count({
        where: { ...wherePermisoProject, estado: "APROBADO", created_at: { gte: month } },
      })
    );

    // -------------------------
    // Top 5 usuarios con más permisos (mes)
    // -------------------------
    const topUsuariosRaw = await withTimeout(
      prisma.permiso.groupBy({
        by: ["username"],
        where: { ...wherePermisoProject, created_at: { gte: month } },
        _count: true,
      })
    );

    const topUsuarios = [...topUsuariosRaw]
      .map((x) => ({ username: x.username, _count: x._count }))
      .sort((a, b) => b._count - a._count)
      .slice(0, 5);

    // -------------------------
    // Tipos más frecuentes (mes)
    // -------------------------
    const tiposFrecuentesRaw = await withTimeout(
      prisma.permiso.groupBy({
        by: ["tipo"],
        where: { ...wherePermisoProject, created_at: { gte: month } },
        _count: true,
      })
    );

    const tiposFrecuentes = [...tiposFrecuentesRaw]
      .map((x) => ({ tipo: String(x.tipo), _count: x._count }))
      .sort((a, b) => b._count - a._count);

    // -------------------------
    // Por estado (mes)
    // -------------------------
    const porEstadoRaw = await withTimeout(
      prisma.permiso.groupBy({
        by: ["estado"],
        where: { ...wherePermisoProject, created_at: { gte: month } },
        _count: true,
      })
    );

    const porEstado = [...porEstadoRaw]
      .map((x) => ({ estado: String(x.estado), _count: x._count }))
      .sort((a, b) => b._count - a._count);

    // -------------------------
    // Por supervisor (mes)
    // -------------------------
    const permisosMes = await withTimeout(
      prisma.permiso.findMany({
        where: { ...wherePermisoProject, created_at: { gte: month } },
        select: { username: true },
      })
    );

    const usernames = Array.from(new Set(permisosMes.map((p) => p.username)));

    const employees = usernames.length
      ? await withTimeout(
          prisma.employee.findMany({
            where: { username: { in: usernames } },
            select: { username: true, supervisor: true },
          })
        )
      : [];

    const supervisorMap = new Map<string, string>();
    employees.forEach((e) => supervisorMap.set(e.username, e.supervisor || "SIN_SUPERVISOR"));

    const porSupervisorObj: Record<string, number> = {};
    permisosMes.forEach((p) => {
      const sup = supervisorMap.get(p.username) || "SIN_SUPERVISOR";
      porSupervisorObj[sup] = (porSupervisorObj[sup] || 0) + 1;
    });

    const porSupervisor = Object.entries(porSupervisorObj)
      .map(([supervisor, count]) => ({ supervisor, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      project: project ? project : { code: "GENERAL", name: "General" },
      personal,
      kpis: { pendientesHoy, pendientesSemana, pendientesMes, aprobadosMes },
      topUsuarios,
      tiposFrecuentes,
      porEstado,
      porSupervisor,
    });
  } catch (err) {
    console.error("PM DASHBOARD ERROR:", err);
    const { searchParams } = new URL(req.url);
    const projectCode = (searchParams.get("project") || "GENERAL").toUpperCase();
    return NextResponse.json(fallbackDashboard(projectCode));
  }
}
