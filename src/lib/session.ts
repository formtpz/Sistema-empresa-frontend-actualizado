import "server-only";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { query } from "@/lib/db";

type Session = { username: string; role: string };
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get("session")?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    const username = String(payload.sub ?? "");
    if (!username) return null;
    const rows = await query<{role:string;active:boolean}>("SELECT role, active FROM public.users WHERE username=$1 LIMIT 1",[username]);
    if (!rows[0]?.active) return null;
    return { username, role: rows[0].role };
  } catch { return null; }
}
