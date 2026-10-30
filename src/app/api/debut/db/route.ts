export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

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
  if (role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { username: true, name: true, email: true, role: true, active: true, created_at: true },
    orderBy: { created_at: "desc" },
  });

  const employees = await prisma.employee.findMany({
    select: {
      username: true,
      puesto: true,
      supervisor: true,
      vacaciones_saldo: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ users, employees });
}
