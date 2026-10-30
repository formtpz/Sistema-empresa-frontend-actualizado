export const runtime="nodejs";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {query} from "@/lib/db";
export async function GET(){
 const session=await getSession();
 if(!session)return NextResponse.json({message:"No autenticado"},{status:401});
 if(!(await query<{allowed:boolean}>("SELECT public.app_has_permission($1,$2) AS allowed",[session.username,"users.manage"]))[0]?.allowed)return NextResponse.json({message:"No autorizado"},{status:403});
 try{
 const [users,employees]=await Promise.all([
 query("SELECT username,name,email,role,active,created_at FROM public.users ORDER BY created_at DESC"),
 query("SELECT username,puesto,supervisor,vacaciones_saldo,created_at FROM public.employees ORDER BY created_at DESC")]);
 return NextResponse.json({users,employees});
 }catch(error){console.error("DB admin:",error);return NextResponse.json({message:"Error consultando datos"},{status:500});}
}
