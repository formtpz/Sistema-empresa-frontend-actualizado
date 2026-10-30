import { getSessionFromToken } from "@/lib/session";

type Role = "ADMIN" | "RH" | "COORDINACION" | "OPERADOR" | "PM" | "GERENCIA";
export async function requireRoleFromRequest(
  req: Request, allowed: Role[]
): Promise<{ ok: boolean; status: number; message?: string; role?: string }> {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie.split(";").map(p => p.trim()).find(p => p.startsWith("session="))?.slice(8);
  const session = await getSessionFromToken(token ? decodeURIComponent(token) : undefined);
  if (!session) return { ok: false, status: 401, message: "No autenticado" };
  if (!allowed.includes(session.role as Role))
    return { ok: false, status: 403, message: "Sin permisos" };
  return { ok: true, status: 200, role: session.role };
}
