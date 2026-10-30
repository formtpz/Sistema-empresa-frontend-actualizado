export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { getUser, type Role } from "@/lib/userStore";
import { withTimeout } from "@/lib/timeout";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

type AuthUser = {
  username: string;
  password: string;
  name: string;
  role: Role;
  active: boolean;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.username || !body?.password) {
      return NextResponse.json({ message: "Faltan credenciales" }, { status: 400 });
    }

    const username = String(body.username).trim();
    const password = String(body.password);
    const host = req.headers.get("host") ?? "";
    const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");

    let user: AuthUser | null = null;
    let usingFallbackStore = false;

    try {
      user = await withTimeout(prisma.user.findFirst({ where: { username } }));
    } catch (error) {
      console.warn("LOGIN DB unavailable, using local userStore:", error);
      user = getUser(username);
      usingFallbackStore = true;
    }

    if (!user || !user.active) {
      return NextResponse.json({ message: "Usuario o contrasena incorrectos" }, { status: 401 });
    }

    const ok = usingFallbackStore
      ? password === user.password
      : await bcrypt.compare(password, user.password);

    if (!ok) {
      return NextResponse.json({ message: "Usuario o contrasena incorrectos" }, { status: 401 });
    }

    const token = await new SignJWT({
      role: user.role,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.username)
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(secret);

    const res = NextResponse.json({ ok: true }, { status: 200 });

    res.cookies.set({
      name: "session",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && !isLocalhost,
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ message: "Error interno en login" }, { status: 500 });
  }
}
