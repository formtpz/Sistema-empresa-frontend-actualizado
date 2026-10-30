export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRoleFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await requireRoleFromRequest(req, ["PM", "GERENCIA", "ADMIN"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const code = (new URL(req.url).searchParams.get("project") || "GENERAL").toUpperCase();
  if (!["GENERAL", "COLOMBIA", "PERU", "ITALIA"].includes(code)) {
    return NextResponse.json({ message: "Proyecto inválido" }, { status: 400 });
  }
  try {
    const projectRows = await query<{id:number;code:string;name:string}>(
      "SELECT id, code::text AS code, name FROM public.projects WHERE code::text=$1", [code]);
    const project = code === "GENERAL" ? null : projectRows[0];
    if (code !== "GENERAL" && !project) return NextResponse.json({message:"Proyecto no encontrado"},{status:404});
    const pid = project?.id ?? null;
    const counts = await query<{personal:number;pendienteshoy:number;pendientessemana:number;pendientesmes:number;aprobadosmes:number}>(
      `SELECT
      (SELECT count(*)::int FROM public.employees e WHERE ($1::int IS NULL OR e."projectId"=$1)) AS personal,
      count(*) FILTER (WHERE estado='ENVIADO' AND created_at >= current_date)::int AS pendienteshoy,
      count(*) FILTER (WHERE estado='ENVIADO' AND created_at >= date_trunc('week',current_timestamp))::int AS pendientessemana,
      count(*) FILTER (WHERE estado='ENVIADO' AND created_at >= date_trunc('month',current_timestamp))::int AS pendientesmes,
      count(*) FILTER (WHERE estado='APROBADO' AND created_at >= date_trunc('month',current_timestamp))::int AS aprobadosmes
      FROM public.permisos p WHERE ($1::int IS NULL OR p."projectId"=$1)`,[pid]);
    const filter = '($1::int IS NULL OR p."projectId"=$1) AND p.created_at >= date_trunc(\'month\',current_timestamp)';
    const top = await query<{username:string;count:number}>(
      "SELECT p.username,count(*)::int AS count FROM public.permisos p WHERE "+filter+" GROUP BY p.username ORDER BY count DESC LIMIT 5",[pid]);
    const types = await query<{tipo:string;count:number}>(
      "SELECT p.tipo::text AS tipo,count(*)::int AS count FROM public.permisos p WHERE "+filter+" GROUP BY p.tipo ORDER BY count DESC",[pid]);
    const states = await query<{estado:string;count:number}>(
      "SELECT p.estado::text AS estado,count(*)::int AS count FROM public.permisos p WHERE "+filter+" GROUP BY p.estado ORDER BY count DESC",[pid]);
    const supervisors = await query<{supervisor:string;count:number}>(
      "SELECT COALESCE(NULLIF(e.supervisor,''),'SIN_SUPERVISOR') AS supervisor,count(*)::int AS count FROM public.permisos p LEFT JOIN public.employees e ON e.username=p.username WHERE "+filter+" GROUP BY 1 ORDER BY count DESC",[pid]);
    const c=counts[0];
    return NextResponse.json({
      project: project ?? {code:"GENERAL",name:"General"}, personal:c.personal,
      kpis:{pendientesHoy:c.pendienteshoy,pendientesSemana:c.pendientessemana,pendientesMes:c.pendientesmes,aprobadosMes:c.aprobadosmes},
      topUsuarios:top.map(x=>({username:x.username,_count:x.count})),
      tiposFrecuentes:types.map(x=>({tipo:x.tipo,_count:x.count})),
      porEstado:states.map(x=>({estado:x.estado,_count:x.count})),
      porSupervisor:supervisors
    });
  } catch(error) {
    console.error("PM dashboard:",error);
    return NextResponse.json({message:"Error consultando dashboard"},{status:500});
  }
}
