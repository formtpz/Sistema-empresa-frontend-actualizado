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
  const rows=await query<TeamRow>('SELECT e.username,u.name,e.email,u.role,u.active,e.puesto,e.supervisor,e.start_date,e.vacaciones_saldo FROM public.employees e JOIN public.users u ON u.username=e.username WHERE public.app_can_view_employee($1,e.username) ORDER BY e.supervisor,e.puesto,e.username',[session.username]);
  return NextResponse.json({equipo:rows.map(e=>({username:e.username,name:e.name||e.username,email:e.email??"",role:e.role,active:e.active,puesto:e.puesto??"",supervisor:e.supervisor??"",start_date:e.start_date?new Date(e.start_date).toISOString():null,vacaciones_saldo:Number(e.vacaciones_saldo)}))});
 }catch(error){console.error("Equipo coordinacion:",error);return NextResponse.json({message:"Error consultando equipo"},{status:500});}
}
