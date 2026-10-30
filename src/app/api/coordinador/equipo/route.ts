export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function getSecret() {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
}

async function auth() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      username: String(payload.sub ?? ""),
      role: String(payload.role ?? ""),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const a = await auth();
  if (!a) return NextResponse.json({ message: "No autenticado" }, { status: 401 });

  // ✅ Solo COORDINACION/ADMIN por ahora
  if (a.role !== "COORDINACION" && a.role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const equipo = await prisma.employee.findMany({
    select: {
      username: true,
      cedula: true,
      email: true,
      puesto: true,
      supervisor: true,
      start_date: true,
      vacaciones_saldo: true,
      user: {
        select: { name: true, role: true, active: true },
      },
    },
    orderBy: [{ supervisor: "asc" }, { puesto: "asc" }, { username: "asc" }],
  });

  // Normaliza formato para UI
  const out = equipo.map((e) => ({
    username: e.username,
    name: e.user?.name ?? e.username,
    email: e.email ?? "",
    role: e.user?.role ?? "OPERADOR",
    active: e.user?.active ?? true,
    puesto: e.puesto ?? "",
    supervisor: e.supervisor ?? "",
    start_date: e.start_date ? e.start_date.toISOString() : null,
    vacaciones_saldo: Number(e.vacaciones_saldo ?? 0),
  }));

  return NextResponse.json({ equipo: out });
}
