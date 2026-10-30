import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";

function monthsDiffByAnniversary(startDate: Date, fromDate: Date, toDate: Date) {
  if (toDate < fromDate) return 0;

  let count = 0;
  const anniversaryDay = startDate.getDate();
  let current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);

  while (current <= toDate) {
    const year = current.getFullYear();
    const month = current.getMonth();

    let anniv = new Date(year, month, anniversaryDay);

    if (anniv.getMonth() !== month) {
      anniv = new Date(year, month + 1, 0); // último día del mes
    }

    if (anniv >= fromDate && anniv <= toDate) {
      count++;
    }

    current = new Date(year, month + 1, 1);
  }

  return count;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;

    const userNameDecoded = decodeURIComponent(username || "").trim();

    if (!userNameDecoded) {
      return NextResponse.json(
        { message: "Falta username en la ruta" },
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session) return NextResponse.json({message:"No autenticado"},{status:401});
    if (session.username !== userNameDecoded && !(await query<{allowed:boolean}>("SELECT public.app_can_access_request($1,$2,$3) AS allowed",[session.username,userNameDecoded,"permissions.read_team"]))[0]?.allowed)
      return NextResponse.json({message:"No autorizado"},{status:403});
    const users = await query<{username:string;name:string;role:string}>(
      "SELECT username,name,role FROM public.users WHERE username=$1 LIMIT 1",[userNameDecoded]);
    const user = users[0];
    const [employee] = await query<{start_date:Date|null;vacaciones_saldo:string}>(
      "SELECT * FROM public.employees WHERE username=$1 LIMIT 1",[userNameDecoded]);
    const permisos = await query(
      "SELECT * FROM public.permisos WHERE username=$1 ORDER BY created_at DESC",[userNameDecoded]);

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const corte = new Date("2026-01-19T00:00:00.000Z");
    const hoy = new Date();

    let vacacionesActual = Number(employee?.vacaciones_saldo ?? 0);

    if (employee?.start_date) {
      const extra = monthsDiffByAnniversary(new Date(employee.start_date), corte, hoy);
      vacacionesActual += extra;
    }

    return NextResponse.json({
      username: user.username,
      name: user.name,
      role: user.role,
      employee: {
        ...employee,
        vacaciones_actual: vacacionesActual,
      },
      permisos,
    });
  } catch {
    return NextResponse.json(
      { message: "Error consultando perfil" },
      { status: 500 }
    );
  }
}
