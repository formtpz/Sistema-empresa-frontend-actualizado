export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

type Profile = { username:string; name:string; role:string; puesto:string|null; vacaciones_saldo:string|null; project:string|null };
export async function GET() {
 const session=await getSession();
 if(!session) return NextResponse.json({message:"No autenticado"},{status:401});
 try {
  const rows=await query<Profile>(
   `SELECT u.username,u.name,u.role::text AS role,e.puesto,e.vacaciones_saldo,p.name AS project
     FROM public.users u LEFT JOIN public.employees e ON e.username=u.username
     LEFT JOIN public.projects p ON p.id=e."projectId" WHERE u.username=$1 LIMIT 1`,[session.username]);
  const user=rows[0];
  if(!user) return NextResponse.json({message:"Usuario no encontrado"},{status:404});
  const saldo=Number(user.vacaciones_saldo??0);
  return NextResponse.json({
   user:{username:user.username,name:user.name,role:user.role},
   rrhh:{username:user.username,vacaciones_total:saldo,vacaciones_usadas:0,
    vacaciones_disponibles:Math.max(0,saldo),puesto:user.puesto??"",area:user.project??"General"}
  });
 }catch(error){
  console.error("Error cargando perfil RRHH:",error);
  return NextResponse.json({message:"Error consultando perfil"},{status:500});
 }
}
