export const runtime = "nodejs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    await revokeSession(token);
  } catch (error) {
    console.error("Error revocando sesión:", error);
    return NextResponse.json({ message: "No se pudo cerrar la sesión" }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}
