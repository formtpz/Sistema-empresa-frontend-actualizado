export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function getSecrets() {
  return [process.env.JWT_SECRET, process.env.AUTH_SECRET, "dev-secret"]
    .filter(Boolean)
    .map((secret) => new TextEncoder().encode(secret));
}

async function getSessionRole() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  for (const secret of getSecrets()) {
    try {
      const { payload } = await jwtVerify(token, secret);
      return String(payload.role ?? "").toUpperCase();
    } catch {
      // Try the next local secret.
    }
  }

  return null;
}

export async function POST(req: Request) {
  const role = await getSessionRole();
  if (role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  if (!username) return NextResponse.json({ message: "Falta username." }, { status: 400 });
  if (username === "admin") {
    return NextResponse.json({ message: "No se puede desactivar admin." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { username },
    data: { active: false },
    select: { username: true },
  });

  return NextResponse.json({ ok: true, user });
}
