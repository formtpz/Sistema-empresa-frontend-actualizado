export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
}

async function auth() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const username = String(payload.sub ?? "").trim();
    const role = String(payload.role ?? "").toUpperCase();
    const name = String(payload.name ?? "").trim();
    if (!username) return null;
    return { username, role, name };
  } catch {
    return null;
  }
}

export async function GET() {
  const a = await auth();
  if (!a) return NextResponse.json({ message: "No autenticado" }, { status: 401 });

  if (a.role !== "COORDINACION" && a.role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  // Regla: equipo = empleados cuyo supervisor coincide con el nombre del coordinador o su username
  const equipo = await prisma.employee.findMany({
    where: {
      OR: [
        { supervisor: { contains: a.name, mode: "insensitive" } },
        { supervisor: { contains: a.username, mode: "insensitive" } },
      ],
    },
    select: {
      username: true,
      puesto: true,
      supervisor: true,
      start_date: true,
      vacaciones_saldo: true,
      user: { select: { name: true, email: true, role: true, active: true } },
    },
    orderBy: [{ supervisor: "asc" }, { username: "asc" }],
  });

  return NextResponse.json({
    coordinador: { username: a.username, name: a.name },
    total: equipo.length,
    equipo: equipo.map((e) => ({
      username: e.username,
      name: e.user?.name ?? e.username,
      email: e.user?.email ?? "",
      role: e.user?.role ?? "OPERADOR",
      active: e.user?.active ?? true,
      puesto: e.puesto ?? "",
      supervisor: e.supervisor ?? "",
      start_date: e.start_date ? e.start_date.toISOString() : null,
      vacaciones_saldo: Number(e.vacaciones_saldo ?? 0),
    })),
  });
}
