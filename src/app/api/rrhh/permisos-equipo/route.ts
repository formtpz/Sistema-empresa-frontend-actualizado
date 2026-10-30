export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
}

async function getSession() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      username: String(payload.sub ?? ""),
      role: String(payload.role ?? "").toUpperCase(),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session?.username) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const allowed = ["COORDINACION", "RH", "ADMIN"];
  if (!allowed.includes(session.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const permisos = await prisma.permiso.findMany({
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ permisos });
}
