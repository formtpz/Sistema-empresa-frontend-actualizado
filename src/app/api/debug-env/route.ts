import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    AUTH_SECRET_exists: Boolean(process.env.AUTH_SECRET),
  });
}
