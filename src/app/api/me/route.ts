export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

type User = { username: string; name: string; role: string; active: boolean };

export async function GET() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return NextResponse.json({ authenticated: false });
  const secret = process.env.JWT_SECRET;
  if (!secret) return NextResponse.json({ authenticated: false }, { status: 500 });
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    const username = String(payload.sub ?? "");
    if (!username) return NextResponse.json({ authenticated: false });
    const users = await query<User>(
      "SELECT username, name, role, active FROM public.users WHERE username = $1 LIMIT 1", [username]
    );
    const user = users[0];
    if (!user?.active) return NextResponse.json({ authenticated: false });
    return NextResponse.json({ authenticated: true, username: user.username, name: user.name, role: user.role });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
