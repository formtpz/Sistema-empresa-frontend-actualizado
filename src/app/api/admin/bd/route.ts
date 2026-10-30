export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurado.");
  return new TextEncoder().encode(secret);
}

async function getRole() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return String(payload.role ?? "");
  } catch {
    return null;
  }
}

export async function GET() {
  const role = await getRole();
  if (!role) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  if (role !== "ADMIN") return NextResponse.json({ message: "No autorizado" }, { status: 403 });

  // Traer datos reales desde Postgres
  const [users, employees, permisos] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.employee.findMany({
      select: {
        id: true,
        username: true,
        cedula: true,
        email: true,
        puesto: true,
        supervisor: true,
        start_date: true,
        vacaciones_saldo: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.permiso.findMany({
      select: {
        id: true,
        username: true,
        tipo: true,
        fecha_inicio: true,
        fecha_fin: true,
        motivo: true,
        estado: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  return NextResponse.json({ users, employees, permisos });
}
