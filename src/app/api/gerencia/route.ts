export const runtime="nodejs";
import {NextResponse} from "next/server";
import {getSession} from "@/lib/session";
import {query} from "@/lib/db";
export async function GET(){
 const session=await getSession();
 if(!session)return NextResponse.json({message:"No autenticado"},{status:401});
 if(!["GERENCIA","PM","ADMIN"].includes(session.role))return NextResponse.json({message:"No autorizado"},{status:403});
 try {const proyectos=await query("SELECT * FROM public.projects ORDER BY created_at DESC");return NextResponse.json({proyectos});}
 catch(error){console.error("Gerencia:",error);return NextResponse.json({message:"Error consultando proyectos"},{status:500});}
}
