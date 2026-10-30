export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";

const tipos = new Set(["VACACIONES", "PERSONAL", "MEDICO", "TRAMITE", "OTRO"]);
function restricted(role: string) { return role === "RH" || role === "GERENCIA"; }

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  if (restricted(session.role)) return NextResponse.json({ message: "Este perfil no tiene solicitudes personales de permisos." }, { status: 403 });
  try {
    const permisos = await query("SELECT * FROM public.permisos WHERE username=$1 ORDER BY created_at DESC", [session.username]);
    return NextResponse.json({ permisos });
  } catch {
    return NextResponse.json({ message: "Error consultando permisos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  if (restricted(session.role)) return NextResponse.json({ message: "Este perfil no puede solicitar permisos personales." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const tipo = String(body?.tipo ?? "OTRO").toUpperCase();
  const inicio = String(body?.fecha_inicio ?? "");
  const fin = String(body?.fecha_fin ?? "");
  const motivo = String(body?.motivo ?? "").trim();
  const a = new Date(inicio), b = new Date(fin);
  if (!motivo || motivo.length > 5000 || !inicio || !fin || !Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || a > b) {
    return NextResponse.json({ message: "Datos del permiso inválidos" }, { status: 400 });
  }
  try {
    const rows = await query(
      "INSERT INTO public.permisos (username,tipo,fecha_inicio,fecha_fin,motivo,estado) VALUES ($1,$2,$3,$4,$5,'ENVIADO') RETURNING *",
      [session.username, tipos.has(tipo) ? tipo : "OTRO", a, b, motivo]
    );
    return NextResponse.json({ ok: true, permiso: rows[0] });
  } catch {
    return NextResponse.json({ message: "No se pudo guardar el permiso" }, { status: 500 });
  }
}
