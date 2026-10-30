export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PermisoEstado } from "@prisma/client";

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
}

async function getRole() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return String(payload.role ?? "").toUpperCase();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const role = await getRole();
  const allowed = ["COORDINACION", "RH", "ADMIN"];

  if (!role) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  if (!allowed.includes(role)) return NextResponse.json({ message: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const accion = String(body?.accion ?? "");

  if (!id || !["APROBAR", "RECHAZAR"].includes(accion)) {
    return NextResponse.json({ message: "Datos invalidos." }, { status: 400 });
  }

  const permiso = await prisma.permiso.findUnique({ where: { id } });
  if (!permiso) return NextResponse.json({ message: "Permiso no encontrado." }, { status: 404 });

  if (permiso.estado !== PermisoEstado.ENVIADO) {
    return NextResponse.json({ message: "Este permiso ya fue gestionado." }, { status: 409 });
  }

  const updated = await prisma.permiso.update({
    where: { id },
    data: {
      estado: accion === "APROBAR" ? PermisoEstado.APROBADO : PermisoEstado.RECHAZADO,
    },
  });

  return NextResponse.json({ ok: true, permiso: updated });
}
