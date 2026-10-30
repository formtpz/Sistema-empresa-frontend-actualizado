export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  try {
    const [access] = await query<{ allowed: boolean }>(
      "SELECT public.app_has_permission($1,$2) AS allowed",
      [session.username, "permissions.read_team"]
    );
    if (!access?.allowed) return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    const permisos = await query(
      `SELECT p.* FROM public.permisos p
       WHERE public.app_can_access_request($1,p.username,'permissions.read_team')
       ORDER BY p.created_at DESC`,
      [session.username]
    );
    return NextResponse.json({ permisos });
  } catch (error) {
    console.error("Permisos equipo:", error);
    return NextResponse.json({ message: "Error cargando permisos" }, { status: 500 });
  }
}
