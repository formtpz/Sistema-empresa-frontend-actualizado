export const runtime="nodejs";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {query} from "@/lib/db";
export async function POST(req:Request){
 const session=await getSession();
 if(!session)return NextResponse.json({message:"No autenticado"},{status:401});
 if(!["COORDINACION","RH","ADMIN"].includes(session.role))return NextResponse.json({message:"No autorizado"},{status:403});
 const body=await req.json().catch(()=>null);
 const id=String(body?.id??"").trim(),accion=String(body?.accion??"");
 if(!id||!["APROBAR","RECHAZAR"].includes(accion))return NextResponse.json({message:"Datos invalidos."},{status:400});
 try{
  const estado=accion==="APROBAR"?"APROBADO":"RECHAZADO";
  const updated=await query("UPDATE public.permisos SET estado=$2 WHERE id=$1 AND estado='ENVIADO' RETURNING *",[id,estado]);
  if(updated[0])return NextResponse.json({ok:true,permiso:updated[0]});
  const found=await query("SELECT estado FROM public.permisos WHERE id=$1",[id]);
  return NextResponse.json({message:found[0]?"Este permiso ya fue gestionado.":"Permiso no encontrado."},{status:found[0]?409:404});
 }catch(error){console.error("Accion permiso:",error);return NextResponse.json({message:"Error gestionando permiso"},{status:500});}
}
