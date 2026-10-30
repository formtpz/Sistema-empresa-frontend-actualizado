export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

export async function POST(req:Request) {
  const session=await getSession();
  if(!session) return NextResponse.json({message:"No autenticado"},{status:401});
  if(session.role!=="ADMIN") return NextResponse.json({message:"No autorizado"},{status:403});
  const body=await req.json().catch(()=>null);
  const username=String(body?.username??"").trim();
  if(!username) return NextResponse.json({message:"Falta username."},{status:400});
  if(username===session.username || username==="admin") return NextResponse.json({message:"No se puede desactivar esta cuenta administrativa."},{status:400});
  try {
    const users=await query<{username:string}>("UPDATE public.users SET active=false WHERE username=$1 RETURNING username",[username]);
    if(!users[0]) return NextResponse.json({message:"Usuario no encontrado"},{status:404});
    return NextResponse.json({ok:true,user:users[0]});
  } catch(error) {
    console.error("Error desactivando usuario:",error);
    return NextResponse.json({message:"Error desactivando usuario"},{status:500});
  }
}
