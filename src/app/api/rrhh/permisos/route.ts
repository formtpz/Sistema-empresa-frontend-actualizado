export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { STORE, Permiso } from "../../../../lib/rrhhStore";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurado.");
  return new TextEncoder().encode(secret);
}

async function getUsername() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return String(payload.sub ?? "");
  } catch {
    return null;
  }
}

export async function GET() {
  const username = await getUsername();
  if (!username) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const mine = STORE
    .filter((p) => p.username === username)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return NextResponse.json({ permisos: mine });
}

export async function POST(req: Request) {
  const username = await getUsername();
  if (!username) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const tipo = body?.tipo as Permiso["tipo"];
  const fecha_inicio = String(body?.fecha_inicio ?? "");
  const fecha_fin = String(body?.fecha_fin ?? "");
  const motivo = String(body?.motivo ?? "").trim();

  if (!tipo || !fecha_inicio || !fecha_fin || !motivo) {
    return NextResponse.json({ message: "Faltan datos del permiso." }, { status: 400 });
  }

  const permiso: Permiso = {
    id: crypto.randomUUID(),
    username,
    tipo,
    fecha_inicio,
    fecha_fin,
    motivo,
    estado: "Enviado",
    created_at: new Date().toISOString(),
  };

  STORE.push(permiso);

  return NextResponse.json({ ok: true, permiso });
}
