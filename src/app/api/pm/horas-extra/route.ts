export const runtime="nodejs";
import { NextResponse } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

type HoursRow = { id:string; employeeId:number; username:string; name:string; project:string|null; year:number; month:number; total:string; ordinarias:string; feriados:string; diurnas:string; nocturnas:string; diurnas_feriado:string; nocturnas_feriado:string };
const fields=["total","ordinarias","feriados","diurnas","nocturnas","diurnas_feriado","nocturnas_feriado"] as const;
export async function GET(req:Request) {
  const auth=await requireRoleFromRequest(req,["PM","GERENCIA","ADMIN"]);
  if(!auth.ok) return NextResponse.json({ok:false,error:auth.message},{status:auth.status});
  const sp=new URL(req.url).searchParams;
  const project=(sp.get("project")??"GENERAL").toUpperCase();
  const period=sp.get("period")??"";
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !["GENERAL","COLOMBIA","PERU","ITALIA"].includes(project)) return NextResponse.json({ok:false,error:"Periodo o proyecto inválido"},{status:400});
  const [year,month]=period.split("-").map(Number);
  try {
    const rows=await query<HoursRow>(`SELECT h.*,u.username,u.name,p.code::text AS project FROM public.horas_extra_mes h JOIN public.employees e ON e.id=h."employeeId" JOIN public.users u ON u.username=e.username LEFT JOIN public.projects p ON p.id=e."projectId" WHERE h.year=$1 AND h.month=$2 AND ($3='GENERAL' OR p.code::text=$3) ORDER BY h.total DESC`,[year,month,project]);
    const items=rows.map(row=>{const result={...row,project:row.project??"GENERAL"} as Record<string,unknown>;for(const field of fields) result[field]=Number(row[field]);return result;});
    return NextResponse.json({ok:true,project,period,year,month,totalHoras:items.reduce((s,r)=>s+Number(r.total),0),items});
  } catch(error) { console.error("Error cargando horas extra:",error);return NextResponse.json({ok:false,error:"Error interno cargando horas extra"},{status:500}); }
}
