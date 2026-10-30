export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/userStore";
import { withTimeout } from "@/lib/timeout";

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, debug: { hasSessionCookie: false } },
        { status: 200 }
      );
    }

    const { payload } = await jwtVerify(token, getSecret());
    const username = String(payload.sub ?? "").trim();

    if (!username) {
      return NextResponse.json(
        { authenticated: false, debug: { hasSessionCookie: true, hasSub: false } },
        { status: 200 }
      );
    }

    let user = null;

    try {
      user = await withTimeout(
        prisma.user.findUnique({
          where: { username },
          select: { username: true, name: true, role: true, active: true },
        })
      );
    } catch {
      user = getUser(username);
    }

    if (!user || !user.active) {
      return NextResponse.json(
        { authenticated: false, debug: { hasSessionCookie: true, userFound: false } },
        { status: 200 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  } catch {
    return NextResponse.json(
      { authenticated: false, debug: { error: "jwtVerify_failed" } },
      { status: 200 }
    );
  }
}
