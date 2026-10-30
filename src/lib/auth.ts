import { jwtVerify } from "jose";

type Role = "ADMIN" | "RH" | "COORDINACION" | "OPERADOR" | "PM" | "GERENCIA";

export async function requireRoleFromRequest(
  req: Request,
  allowed: Role[]
): Promise<{ ok: boolean; status: number; message?: string; role?: string }> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return { ok: false, status: 500, message: "JWT_SECRET no configurada" };
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("session="))?.slice(8);
  if (!token) return { ok: false, status: 401, message: "No autenticado" };
  try {
    const { payload } = await jwtVerify(decodeURIComponent(token), new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    const username = String(payload.sub ?? "");
    if (!username) return { ok: false, status: 401, message: "Sesión inválida" };
    const { query } = await import("@/lib/db");
    const users = await query<{ role: Role; active: boolean }>(
      'SELECT role, active FROM public.users WHERE username = $1 LIMIT 1', [username]
    );
    const user = users[0];
    if (!user || !user.active) return { ok: false, status: 401, message: "Usuario inactivo o inexistente" };
    if (!allowed.includes(user.role)) return { ok: false, status: 403, message: "Sin permisos" };
    return { ok: true, status: 200, role: user.role };
  } catch {
    return { ok: false, status: 401, message: "Sesión inválida" };
  }
}
