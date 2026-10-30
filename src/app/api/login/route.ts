export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

type AuthUser = { username: string; password: string; name: string; role: string; active: boolean };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (typeof body?.username !== "string" || typeof body?.password !== "string") {
      return NextResponse.json({ message: "Faltan credenciales" }, { status: 400 });
    }
    const username = body.username.trim();
    const password = body.password;
    if (!username || !password) return NextResponse.json({ message: "Faltan credenciales" }, { status: 400 });
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
    const users = await query<AuthUser>(
      "SELECT username, password, name, role, active FROM public.users WHERE username = $1 LIMIT 1",
      [username]
    );
    const user = users[0];
    if (!user || !user.active || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    const token = await new SignJWT({ role: user.role, name: user.name })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.username)
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode(secret));
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", token, {
      httpOnly: true, sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 12
    });
    return res;
  } catch (error) {
    console.error("Error de autenticación:", error);
    return NextResponse.json({ message: "Error interno de autenticación" }, { status: 500 });
  }
}
