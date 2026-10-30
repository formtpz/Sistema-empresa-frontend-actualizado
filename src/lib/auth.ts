import { query } from "@/lib/db";
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

export async function requirePermissionFromRequest(req: Request, permission: string):
 Promise<{ok:boolean;status:number;message?:string;username?:string}> {
  const cookie = req.headers.get("cookie") ?? "";
  const raw = cookie.split(";").map(p => p.trim()).find(p => p.startsWith("session="))?.slice(8);
  let token: string | undefined;
  try { token = raw ? decodeURIComponent(raw) : undefined; } catch { return {ok:false,status:401,message:"No autenticado"}; }
  const session = await getSessionFromToken(token);
  if (!session) return {ok:false,status:401,message:"No autenticado"};
  const [row] = await query<{allowed:boolean}>(
    "SELECT public.app_has_permission($1,$2) AS allowed",[session.username,permission]);
  if (!row?.allowed) return {ok:false,status:403,message:"No autorizado"};
  return {ok:true,status:200,username:session.username};
}
