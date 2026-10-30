// src/app/api/bonos-extras/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
}

function toNumber(d: unknown) {
  // Prisma Decimal -> number (puede venir como Decimal/string)
  if (d === null || d === undefined) return 0;
  const n = typeof d === "number" ? d : Number(d.toString?.() ?? d);
  return Number.isFinite(n) ? n : 0;
}

function displayName(name: string, username: string) {
  const cleanName = name.trim();
  if (cleanName && cleanName.toLowerCase() !== username.toLowerCase()) {
    return cleanName;
  }

  return username
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function GET(req: Request) {
  try {
    // 1) Cookie session (Next moderno: cookies() es async)
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // 2) username desde JWT sub (igual que /api/me)
    const { payload } = await jwtVerify(token, getSecret());
    const username = String(payload.sub ?? "").trim();

    if (!username) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // 3) User activo
    const user = await prisma.user.findUnique({
      where: { username },
      select: { username: true, name: true, role: true, active: true },
    });

    if (!user || !user.active) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // 4) Employee por username (es @unique en tu schema)
    const employee = await prisma.employee.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        puesto: true,
        supervisor: true,
        vacaciones_saldo: true,
        start_date: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee no encontrado para username", username },
        { status: 404 }
      );
    }

    // 5) Periodo solicitado (default: mes actual)
    const url = new URL(req.url);
    const now = new Date();
    const requestedMonth = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
    const requestedYear = Number(url.searchParams.get("year") ?? now.getFullYear());

    // 6) Buscar registros EXACTOS del mes solicitado (por @@unique compuesto)
    const bonosRequested = await prisma.bonosMes.findUnique({
      where: {
        bonos_mes_unique: {
          employeeId: employee.id,
          year: requestedYear,
          month: requestedMonth,
        },
      },
    });

    const extrasRequested = await prisma.horasExtraMes.findUnique({
      where: {
        horas_extra_mes_unique: {
          employeeId: employee.id,
          year: requestedYear,
          month: requestedMonth,
        },
      },
    });

    // 7) Fallback: si el mes solicitado no tiene data, traer el último disponible
    const bonosFallback = !bonosRequested
      ? await prisma.bonosMes.findFirst({
          where: { employeeId: employee.id },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        })
      : null;

    const extrasFallback = !extrasRequested
      ? await prisma.horasExtraMes.findFirst({
          where: { employeeId: employee.id },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        })
      : null;

    const bonos = bonosRequested ?? bonosFallback;
    const extras = extrasRequested ?? extrasFallback;

    const usedFallback =
      (!bonosRequested && !!bonosFallback) || (!extrasRequested && !!extrasFallback);

    // Periodo final (si cae a febrero, devuelve febrero)
    const periodoFinal = {
      year: bonos?.year ?? extras?.year ?? requestedYear,
      month: bonos?.month ?? extras?.month ?? requestedMonth,
    };

    // 8) Totales (usa campo total si viene del excel; si no, calcula)
    const bonosCalc =
      toNumber(bonos?.productividad) +
      toNumber(bonos?.calidad) +
      toNumber(bonos?.qc) +
      toNumber(bonos?.validacion) +
      toNumber(bonos?.supervision) +
      toNumber(bonos?.calidad_sup) +
      toNumber(bonos?.supervision_sig) +
      toNumber(bonos?.calidad_sig) +
      toNumber(bonos?.bono_fijo);

    const bonosTotal = toNumber(bonos?.total) > 0 ? toNumber(bonos?.total) : bonosCalc;

    const extrasCalc =
      toNumber(extras?.ordinarias) +
      toNumber(extras?.feriados) +
      toNumber(extras?.diurnas) +
      toNumber(extras?.nocturnas) +
      toNumber(extras?.diurnas_feriado) +
      toNumber(extras?.nocturnas_feriado);

    const extrasTotalHoras =
      toNumber(extras?.total) > 0 ? toNumber(extras?.total) : extrasCalc;

    // 9) Respuesta lista para UI
    return NextResponse.json({
      authenticated: true,
      meta: {
        requested: { year: requestedYear, month: requestedMonth },
        usedFallback,
      },
      periodo: periodoFinal,
      user,
      display_name: displayName(user.name, user.username),
      employee,
      bonos: {
        total: bonosTotal,
        detalle: bonos
          ? {
              total: toNumber(bonos.total),
              productividad: toNumber(bonos.productividad),
              calidad: toNumber(bonos.calidad),
              qc: toNumber(bonos.qc),
              validacion: toNumber(bonos.validacion),
              supervision: toNumber(bonos.supervision),
              calidad_sup: toNumber(bonos.calidad_sup),
              supervision_sig: toNumber(bonos.supervision_sig),
              calidad_sig: toNumber(bonos.calidad_sig),
              bono_fijo: toNumber(bonos.bono_fijo),
            }
          : null,
      },
      extras: {
        total_horas: extrasTotalHoras,
        detalle: extras
          ? {
              total: toNumber(extras.total),
              ordinarias: toNumber(extras.ordinarias),
              feriados: toNumber(extras.feriados),
              diurnas: toNumber(extras.diurnas),
              nocturnas: toNumber(extras.nocturnas),
              diurnas_feriado: toNumber(extras.diurnas_feriado),
              nocturnas_feriado: toNumber(extras.nocturnas_feriado),
            }
          : null,
      },
    });
  } catch (e) {
    console.error("bonos-extras error:", e);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
