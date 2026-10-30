export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const accion = String(body?.accion ?? "");
  if (!id || !["APROBAR", "RECHAZAR"].includes(accion))
    return NextResponse.json({ message: "Datos invalidos." }, { status: 400 });
  try {
    const [access] = await query<{ allowed: boolean }>(
      "SELECT public.app_has_permission($1,$2) AS allowed",
      [session.username, "permissions.decide_team"]
    );
    if (!access?.allowed) return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    const estado = accion === "APROBAR" ? "APROBADO" : "RECHAZADO";
    const updated = await query(
      `UPDATE public.permisos p SET estado=$2::public."PermisoEstado"
       WHERE p.id=$1 AND p.estado='ENVIADO'
       AND public.app_can_access_request($3,p.username,'permissions.decide_team')
       RETURNING p.*`,
      [id, estado, session.username]
    );
    if (updated[0]) return NextResponse.json({ ok: true, permiso: updated[0] });
    // Do not disclose existence or state of requests outside the actor's scope.
    return NextResponse.json({ message: "Permiso no disponible para gestionar." }, { status: 404 });
  } catch (error) {
    console.error("Accion permiso:", error);
    return NextResponse.json({ message: "Error gestionando permiso" }, { status: 500 });
  }
}
