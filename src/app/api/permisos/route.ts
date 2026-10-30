export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PermisoEstado, PermisoTipo } from "@prisma/client";

function getSecrets() {
  return [process.env.JWT_SECRET, process.env.AUTH_SECRET, "dev-secret"]
    .filter(Boolean)
    .map((secret) => new TextEncoder().encode(secret));
}

async function auth() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  for (const secret of getSecrets()) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const username = String(payload.sub ?? payload.username ?? "").trim();
      const role = String(payload.role ?? "").toUpperCase();
      if (!username) return null;
      return { username, role };
    } catch {
      // Try the next local secret. This keeps older browser sessions valid.
    }
  }

  return null;
}

function isNonPersonalRole(role: string) {
  return role === "RH" || role === "GERENCIA";
}

export async function GET() {
  const a = await auth();
  if (!a) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  if (isNonPersonalRole(a.role)) {
    return NextResponse.json(
      { message: "Este perfil no tiene solicitudes personales de permisos." },
      { status: 403 }
    );
  }

  const permisos = await prisma.permiso.findMany({
    where: { username: a.username },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ permisos });
}

export async function POST(req: Request) {
  const a = await auth();
  if (!a) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  if (isNonPersonalRole(a.role)) {
    return NextResponse.json(
      { message: "Este perfil no puede solicitar permisos personales." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);

  const tipo = String(body?.tipo ?? "OTRO").toUpperCase();
  const fecha_inicio = String(body?.fecha_inicio ?? "");
  const fecha_fin = String(body?.fecha_fin ?? "");
  const motivo = String(body?.motivo ?? "");

  if (!fecha_inicio || !fecha_fin || !motivo) {
    return NextResponse.json({ message: "Faltan datos del permiso." }, { status: 400 });
  }

  const permisoTipo = Object.values(PermisoTipo).includes(tipo as PermisoTipo)
    ? (tipo as PermisoTipo)
    : PermisoTipo.OTRO;

  const permiso = await prisma.permiso.create({
    data: {
      username: a.username,
      tipo: permisoTipo,
      fecha_inicio: new Date(fecha_inicio),
      fecha_fin: new Date(fecha_fin),
      motivo,
      estado: PermisoEstado.ENVIADO,
    },
  });

  return NextResponse.json({ ok: true, permiso });
}
