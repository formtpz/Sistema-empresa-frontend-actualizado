export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

type Row = { nombre:string; personal_total:number; activos:number; operadores:number; coordinadores:number; rh:number; pm:number };
export async function GET() {
  const session=await getSession();
  if(!session)return NextResponse.json({message:"No autenticado"},{status:401});
  if(!["GERENCIA","PM","ADMIN"].includes(session.role))return NextResponse.json({message:"No autorizado"},{status:403});
  try {
    const proyectos=await query<Row>(
      "SELECT p.name AS nombre, COUNT(e.id)::int AS personal_total, "+
      "COUNT(e.id) FILTER (WHERE u.active)::int AS activos, "+
      "COUNT(e.id) FILTER (WHERE u.active AND u.role='OPERADOR')::int AS operadores, "+
      "COUNT(e.id) FILTER (WHERE u.active AND u.role='COORDINACION')::int AS coordinadores, "+
      "COUNT(e.id) FILTER (WHERE u.active AND u.role='RH')::int AS rh, "+
      "COUNT(e.id) FILTER (WHERE u.active AND u.role='PM')::int AS pm "+
      "FROM public.projects p LEFT JOIN public.employees e ON e.\"projectId\"=p.id "+
      "LEFT JOIN public.users u ON u.username=e.username "+
      "WHERE p.code::text <> 'GENERAL' GROUP BY p.id,p.name ORDER BY p.name"
    );
    return NextResponse.json({proyectos});
  }catch(error){
    console.error("Proyectos gerencia:",error);
    return NextResponse.json({message:"Error cargando proyectos"},{status:500});
  }
}
