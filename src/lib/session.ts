import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { query } from "@/lib/db";

export const SESSION_SECONDS = 8 * 60 * 60;
export const SESSION_COOKIE = "session";
export type Session = { username: string; role: string };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(username: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO public.app_sessions(username,token_hash,expires_at)
     VALUES($1,$2,now()+interval '8 hours')`,
    [username, hashToken(token)]
  );
  return token;
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await query("UPDATE public.app_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL",
    [hashToken(token)]);
}

export async function getSessionFromToken(token: string | undefined): Promise<Session | null> {
  if (!token || token.length > 256) return null;
  const rows = await query<Session>(
    `SELECT u.username,u.role FROM public.app_sessions s
     JOIN public.users u ON u.username=s.username
     WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()
       AND u.active=true LIMIT 1`,
    [hashToken(token)]
  );
  return rows[0] ?? null;
}

export async function getSession(): Promise<Session | null> {
  return getSessionFromToken((await cookies()).get(SESSION_COOKIE)?.value);
}
