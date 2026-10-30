export const runtime="nodejs";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {query} from "@/lib/db";
export async function GET(){
 const session=await getSession();
 if(!session)return NextResponse.json({message:"No autenticado"},{status:401});
 if(!["COORDINACION","RH","ADMIN"].includes(session.role))return NextResponse.json({message:"No autorizado"},{status:403});
 try{
  const permisos=await query("SELECT * FROM public.permisos ORDER BY created_at DESC");
  return NextResponse.json({permisos});
 }catch(error){console.error("Permisos equipo:",error);return NextResponse.json({message:"Error cargando permisos"},{status:500});}
}
