type Role = "PM" | "GERENCIA" | "ADMIN" | string;

export async function requireRoleFromRequest(
  _req: Request,
  _allowed: Role[]
): Promise<{ ok: boolean; status: number; message?: string; role?: string }> {
  // ✅ DEMO MODE: si no hay auth todavía, dejá pasar todo
  // (así compila y podés presentar)
  void _req;
  void _allowed;
  return { ok: true, status: 200, role: "DEMO" };

  // ---- Si luego querés activarlo de verdad, descomentá esta idea:
  // const role = req.headers.get("x-role") || ""; // o desde cookie/jwt
  // if (!role) return { ok: false, status: 401, message: "No autenticado" };
  // if (!allowed.includes(role)) return { ok: false, status: 403, message: "Sin permisos" };
  // return { ok: true, status: 200, role };
}
