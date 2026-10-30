import {NextResponse} from "next/server";
export async function GET(){return NextResponse.json({message:"No disponible"},{status:404});}
