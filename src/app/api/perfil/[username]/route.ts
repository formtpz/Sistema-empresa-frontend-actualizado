import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const user = await prisma.user.findUnique({
      where: { username: userNameDecoded },
      include: {
        employee: true,
        permisos: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const corte = new Date("2026-01-19T00:00:00.000Z");
    const hoy = new Date();

    let vacacionesActual = Number(user.employee?.vacaciones_saldo ?? 0);

    if (user.employee?.start_date) {
      const extra = monthsDiffByAnniversary(user.employee.start_date, corte, hoy);
      vacacionesActual += extra;
    }

    return NextResponse.json({
      username: user.username,
      name: user.name,
      role: user.role,
      employee: {
        ...user.employee,
        vacaciones_actual: vacacionesActual,
      },
      permisos: user.permisos,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error consultando perfil", error: String(error) },
      { status: 500 }
    );
  }
}
