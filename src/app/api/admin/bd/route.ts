export const runtime="nodejs";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {query} from "@/lib/db";
export async function GET(){
 const session=await getSession();
 if(!session)return NextResponse.json({message:"No autenticado"},{status:401});
 if(session.role!=="ADMIN")return NextResponse.json({message:"No autorizado"},{status:403});
 try{
 const [users,employees,permisos]=await Promise.all([
 query("SELECT id,username,name,email,role,active,created_at FROM public.users ORDER BY created_at DESC"),
 query("SELECT id,username,cedula,email,puesto,supervisor,start_date,vacaciones_saldo,created_at FROM public.employees ORDER BY created_at DESC"),
 query("SELECT id,username,tipo,fecha_inicio,fecha_fin,motivo,estado,created_at FROM public.permisos ORDER BY created_at DESC")]);
 return NextResponse.json({users,employees,permisos});
 }catch(error){console.error("Admin BD:",error);return NextResponse.json({message:"Error consultando datos"},{status:500});}
}
