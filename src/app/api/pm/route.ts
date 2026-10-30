import { NextResponse } from "next/server";
import { requirePermissionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requirePermissionFromRequest(req, "reports.read_all");
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  return NextResponse.json({
    ok: true,
    message: "PM API root. Usa /api/pm/dashboard o /api/pm/personal",
    endpoints: ["/api/pm/dashboard", "/api/pm/personal"],
  });
}