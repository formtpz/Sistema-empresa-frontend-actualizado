export const runtime="nodejs";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {query} from "@/lib/db";
type TeamRow={username:string;name:string;email:string|null;role:string;active:boolean;puesto:string|null;supervisor:string|null;start_date:Date|null;vacaciones_saldo:string};
export async function GET(){
 const session=await getSession();
 if(!session)return NextResponse.json({message:"No autenticado"},{status:401});
 if(!(await query<{allowed:boolean}>("SELECT public.app_has_permission($1,$2) AS allowed",[session.username,"permissions.read_team"]))[0]?.allowed)return NextResponse.json({message:"No autorizado"},{status:403});
 try{
  const [current]=await query<{name:string}>("SELECT name FROM public.users WHERE username=$1",[session.username]);
  const name=current?.name??session.username;
  const equipo=await query<TeamRow>(
   "SELECT e.username,u.name,u.email,u.role,u.active,e.puesto,e.supervisor,e.start_date,e.vacaciones_saldo "+
   "FROM public.employees e JOIN public.users u ON u.username=e.username "+
   "WHERE (u.username=$2 OR public.app_can_access_request($2,e.username,'permissions.read_team')) "+
   "ORDER BY e.supervisor,e.username",[name,session.username]);
  return NextResponse.json({coordinador:{username:session.username,name},total:equipo.length,equipo:equipo.map(e=>({
   username:e.username,name:e.name||e.username,email:e.email??"",role:e.role,active:e.active,
   puesto:e.puesto??"",supervisor:e.supervisor??"",start_date:e.start_date?new Date(e.start_date).toISOString():null,
   vacaciones_saldo:Number(e.vacaciones_saldo)
  }))});
 }catch(error){console.error("Coordinacion:",error);return NextResponse.json({message:"Error consultando equipo"},{status:500});}
}
