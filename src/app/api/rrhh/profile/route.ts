export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ensureUser } from "../../../../lib/rrhhData";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurado.");
  return new TextEncoder().encode(secret);
}

async function getSession() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      username: String(payload.sub ?? ""),
      name: String(payload.name ?? ""),
      role: String(payload.role ?? ""),
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

  const rrhh = ensureUser(session.username);
  const vacaciones_disponibles = Math.max(0, rrhh.vacaciones_total - rrhh.vacaciones_usadas);

  return NextResponse.json({
    user: session,
    rrhh: {
      ...rrhh,
      vacaciones_disponibles,
    },
  });
}
