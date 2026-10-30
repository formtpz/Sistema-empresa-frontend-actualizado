export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
type Role = "ADMIN" | "RH" | "COORDINACION" | "OPERADOR" | "PM" | "GERENCIA";
type ProjectCode = "COLOMBIA" | "PERU" | "ITALIA" | "GENERAL";

const ROLES: Role[]=["ADMIN","RH","COORDINACION","OPERADOR","PM","GERENCIA"];
const PROJECT_CODES: ProjectCode[]=["COLOMBIA","PERU","ITALIA","GENERAL"];
function isRole(role:string):role is Role{return ROLES.includes(role as Role);}
function isProjectCode(code:string):code is ProjectCode{return PROJECT_CODES.includes(code as ProjectCode);}
async function getSessionRole(){return (await getSession())?.role??null;}

function parseDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const role = await getSessionRole();

  if (!role) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }
  if (role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { username: "asc" }],
    select: {
      username: true,
      name: true,
      email: true,
      role: true,
      active: true,
      created_at: true,
      employee: {
        select: {
          supervisor: true,
          puesto: true,
          cedula: true,
          vacaciones_saldo: true,
          start_date: true,
          project: { select: { code: true, name: true } },
        },
      },
    },
  });

  const supervisorOptionsRaw = await prisma.employee.findMany({
    where: {
      OR: [
        { puesto: { contains: "super", mode: "insensitive" } },
        { puesto: { contains: "coord", mode: "insensitive" } },
        { user: { role: { in: ["COORDINACION", "PM"] } } },
      ],
    },
    orderBy: [{ user: { name: "asc" } }],
    select: {
      username: true,
      user: { select: { name: true, role: true } },
    },
  });

  const supervisorOptions = supervisorOptionsRaw.map((employee) => ({
    username: employee.username,
    name: employee.user.name || employee.username,
    role: employee.user.role,
  }));

  return NextResponse.json({
    users: users.map((user) => ({
      username: user.username,
      name: user.name,
      email: user.email ?? "",
      role: user.role,
      active: user.active,
      created_at: user.created_at,
      supervisor: user.employee?.supervisor ?? "",
      puesto: user.employee?.puesto ?? "",
      cedula: user.employee?.cedula ?? "",
      vacaciones_saldo: Number(user.employee?.vacaciones_saldo ?? 0),
      start_date: user.employee?.start_date?.toISOString().slice(0, 10) ?? "",
      projectCode: user.employee?.project?.code ?? "",
      project: user.employee?.project?.name ?? "",
    })),
    supervisorOptions,
  });
}

export async function POST(req: Request) {
  const role = await getSessionRole();

  if (!role) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }
  if (role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const username = String(body?.username ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const userRole = String(body?.role ?? "").trim().toUpperCase();
  const password = String(body?.password ?? "");
  const active = Boolean(body?.active ?? true);
  const supervisor = String(body?.supervisor ?? "").trim();
  const cedula = String(body?.cedula ?? "").trim();
  const puesto = String(body?.puesto ?? "").trim();
  const vacacionesSaldo = Number(body?.vacaciones_saldo ?? 0);
  const startDate = parseDate(body?.start_date);
  const projectCode = String(body?.projectCode ?? "").trim().toUpperCase();

  if (!username || !name || !isRole(userRole)) {
    return NextResponse.json({ message: "Faltan datos." }, { status: 400 });
  }
  if (projectCode && !isProjectCode(projectCode)) {
    return NextResponse.json({ message: "Proyecto invalido." }, { status: 400 });
  }
  const parsedProjectCode = projectCode && isProjectCode(projectCode) ? projectCode : null;

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { username: true, password: true },
  });

  if (!existing && !password) {
    return NextResponse.json(
      { message: "Password requerido para usuario nuevo." },
      { status: 400 }
    );
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : existing!.password;

  await prisma.user.upsert({
    where: { username },
    update: {
      name,
      email: email || null,
      role: userRole,
      active,
      password: hashedPassword,
    },
    create: {
      username,
      name,
      email: email || null,
      role: userRole,
      active,
      password: hashedPassword,
    },
  });

  const project = parsedProjectCode
    ? await prisma.project.findUnique({ where: { code: parsedProjectCode } })
    : null;

  const employee = await prisma.employee.findUnique({ where: { username } });
  const shouldHaveEmployee =
    employee ||
    supervisor ||
    cedula ||
    puesto ||
    project ||
    userRole === "OPERADOR" ||
    userRole === "COORDINACION";

  if (shouldHaveEmployee) {
    await prisma.employee.upsert({
      where: { username },
      update: {
        cedula: cedula || null,
        email: email || null,
        puesto,
        supervisor,
        vacaciones_saldo: Number.isFinite(vacacionesSaldo) ? vacacionesSaldo : 0,
        start_date: startDate,
        projectId: project?.id ?? null,
      },
      create: {
        username,
        cedula: cedula || null,
        email: email || null,
        supervisor,
        puesto,
        vacaciones_saldo: Number.isFinite(vacacionesSaldo) ? vacacionesSaldo : 0,
        start_date: startDate,
        projectId: project?.id ?? null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
