import { NextResponse } from "next/server";
import { requireRoleFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireRoleFromRequest(req, ["PM", "GERENCIA", "ADMIN"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  return NextResponse.json({
    ok: true,
    message: "PM API root. Usa /api/pm/dashboard o /api/pm/personal",
    endpoints: ["/api/pm/dashboard", "/api/pm/personal"],
  });
}