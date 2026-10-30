export const runtime="nodejs";
import { NextResponse } from "next/server";
import { requirePermissionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

type BonusRow = { id:string; employeeId:number; username:string; name:string; project:string|null; year:number; month:number; total:string; productividad:string; calidad:string; qc:string; validacion:string; supervision:string; calidad_sup:string; supervision_sig:string; calidad_sig:string; bono_fijo:string };
const fields=["total","productividad","calidad","qc","validacion","supervision","calidad_sup","supervision_sig","calidad_sig","bono_fijo"] as const;
export async function GET(req:Request) {
  const auth=await requirePermissionFromRequest(req, "reports.read_all");
  if(!auth.ok) return NextResponse.json({ok:false,error:auth.message},{status:auth.status});
  const sp=new URL(req.url).searchParams;
  const project=(sp.get("project")??"GENERAL").toUpperCase();
  const period=sp.get("period")??"";
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !["GENERAL","COLOMBIA","PERU","ITALIA"].includes(project)) return NextResponse.json({ok:false,error:"Periodo o proyecto inválido"},{status:400});
  const [year,month]=period.split("-").map(Number);
  try {
    const rows=await query<BonusRow>(`SELECT b.*,u.username,u.name,p.code::text AS project FROM public.bonos_mes b JOIN public.employees e ON e.id=b."employeeId" JOIN public.users u ON u.username=e.username LEFT JOIN public.projects p ON p.id=e."projectId" WHERE b.year=$1 AND b.month=$2 AND ($3='GENERAL' OR p.code::text=$3) ORDER BY b.total DESC`,[year,month,project]);
    const items=rows.map(row=>{const result={...row,project:row.project??"GENERAL"} as Record<string,unknown>;for(const field of fields) result[field]=Number(row[field]);return result;});
    return NextResponse.json({ok:true,project,period,year,month,total:items.reduce((s,r)=>s+Number(r.total),0),items});
  } catch(error) { console.error("Error cargando bonos:",error);return NextResponse.json({ok:false,error:"Error interno cargando bonos"},{status:500}); }
}
