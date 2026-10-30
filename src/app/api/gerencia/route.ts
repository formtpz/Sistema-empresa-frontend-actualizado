export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
}

export async function GET() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return NextResponse.json({ message: "No autenticado" }, { status: 401 });

  const { payload } = await jwtVerify(token, getSecret());
  const role = String(payload.role ?? "").toUpperCase();

  if (role !== "GERENCIA" && role !== "PM" && role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  // ejemplo: listar proyectos (por ahora mock o tabla real si ya la creamos)
  const proyectos = await prisma.project.findMany({ orderBy: { created_at: "desc" } });

  return NextResponse.json({ proyectos });
}
