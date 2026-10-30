export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false });
  const users = await query<{username:string;name:string;role:string}>(
    "SELECT username,name,role FROM public.users WHERE username=$1 AND active=true LIMIT 1",
    [session.username]
  );
  const user = users[0];
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, username: user.username, name: user.name, role: user.role });
}
