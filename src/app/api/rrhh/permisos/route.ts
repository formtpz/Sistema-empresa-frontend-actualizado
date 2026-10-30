export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

const tipos = new Set(["VACACIONES","PERSONAL","MEDICO","TRAMITE","OTRO"]);
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({message:"No autenticado"},{status:401});
  try {
    const rows = await query("SELECT id,username,tipo,fecha_inicio,fecha_fin,motivo,estado,created_at FROM public.permisos WHERE username=$1 ORDER BY created_at DESC",[session.username]);
    return NextResponse.json({permisos:rows.map(row=>({...row,estado:row.estado==="ENVIADO"?"Enviado":row.estado==="APROBADO"?"Aprobado":"Rechazado"}))});
  } catch { return NextResponse.json({message:"No se pudieron cargar permisos"},{status:500}); }
}
export async function POST(req:Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({message:"No autenticado"},{status:401});
  const body = await req.json().catch(()=>null);
  const tipo = String(body?.tipo??"").toUpperCase();
  const inicio = String(body?.fecha_inicio??"");
  const fin = String(body?.fecha_fin??"");
  const motivo = String(body?.motivo??"").trim();
  const start = new Date(inicio), end = new Date(fin);
  if (!tipos.has(tipo) || !inicio || !fin || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start>end || !motivo || motivo.length>5000) return NextResponse.json({message:"Datos del permiso inválidos"},{status:400});
  try {
    const rows=await query("INSERT INTO public.permisos(username,tipo,fecha_inicio,fecha_fin,motivo,estado) VALUES($1,$2,$3,$4,$5,'ENVIADO') RETURNING id,username,tipo,fecha_inicio,fecha_fin,motivo,estado,created_at",[session.username,tipo,start,end,motivo]);
    return NextResponse.json({ok:true,permiso:{...rows[0],estado:"Enviado"}});
  } catch { return NextResponse.json({message:"No se pudo guardar el permiso"},{status:500}); }
}
