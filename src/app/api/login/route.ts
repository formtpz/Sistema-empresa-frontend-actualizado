export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/session";
import bcrypt from "bcryptjs";

type AuthUser = { username: string; password: string; active: boolean };
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (typeof body?.username !== "string" || typeof body?.password !== "string")
      return NextResponse.json({ message: "Faltan credenciales" }, { status: 400 });
    const username = body.username.trim(), password = body.password;
    if (!username || !password || username.length > 256 || password.length > 1024)
      return NextResponse.json({ message: "Credenciales invalidas" }, { status: 400 });
    const users = await query<AuthUser>(
      "SELECT username,password,active FROM public.users WHERE username=$1 LIMIT 1", [username]
    );
    const user = users[0];
    if (!user?.active || !(await bcrypt.compare(password, user.password)))
      return NextResponse.json({ message: "Usuario o contraseña incorrectos" }, { status: 401 });
    // Each login creates its own session. Other devices remain authenticated.
    const token = await createSession(user.username);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: SESSION_SECONDS
    });
    return res;
  } catch (error) {
    console.error("Error de autenticación:", error);
    return NextResponse.json({ message: "Error interno de autenticación" }, { status: 500 });
  }
}
