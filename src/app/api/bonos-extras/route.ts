// src/app/api/bonos-extras/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

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
    const session=await getSession();
    if(!session)return NextResponse.json({authenticated:false},{status:401});
    const username=session.username;
    const [access]=await query<{allowed:boolean}>("SELECT public.app_has_permission($1,$2) AS allowed",[username,"reports.read_own"]);
    if(!access?.allowed)return NextResponse.json({message:"No autorizado"},{status:403});
    const [user]=await query<{username:string;name:string;role:string;active:boolean}>(
      "SELECT username,name,role,active FROM public.users WHERE username=$1",[username]);
    if(!user)return NextResponse.json({authenticated:false},{status:401});
    const [employee]=await query<{id:number;username:string;puesto:string|null;supervisor:string|null;vacaciones_saldo:string;start_date:Date|null}>(
      "SELECT id,username,puesto,supervisor,vacaciones_saldo,start_date FROM public.employees WHERE username=$1",[username]);
    if(!employee)return NextResponse.json({message:"Employee no encontrado para username",username},{status:404});

    // 5) Periodo solicitado (default: mes actual)
    const url = new URL(req.url);
    const now = new Date();
    const requestedMonth = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
    const requestedYear = Number(url.searchParams.get("year") ?? now.getFullYear());

    if(!Number.isInteger(requestedYear)||requestedYear<2020||requestedYear>2100||!Number.isInteger(requestedMonth)||requestedMonth<1||requestedMonth>12)
      return NextResponse.json({message:"Periodo invalido"},{status:400});
    type Bonus={year:number;month:number;total:string;productividad:string;calidad:string;qc:string;validacion:string;supervision:string;calidad_sup:string;supervision_sig:string;calidad_sig:string;bono_fijo:string};
    type Extra={year:number;month:number;total:string;ordinarias:string;feriados:string;diurnas:string;nocturnas:string;diurnas_feriado:string;nocturnas_feriado:string};
    const [bonosRequested]=await query<Bonus>('SELECT * FROM public.bonos_mes WHERE "employeeId"=$1 AND year=$2 AND month=$3',[employee.id,requestedYear,requestedMonth]);
    const [extrasRequested]=await query<Extra>('SELECT * FROM public.horas_extra_mes WHERE "employeeId"=$1 AND year=$2 AND month=$3',[employee.id,requestedYear,requestedMonth]);
    const [bonosFallback]=bonosRequested?[]:await query<Bonus>('SELECT * FROM public.bonos_mes WHERE "employeeId"=$1 ORDER BY year DESC,month DESC LIMIT 1',[employee.id]);
    const [extrasFallback]=extrasRequested?[]:await query<Extra>('SELECT * FROM public.horas_extra_mes WHERE "employeeId"=$1 ORDER BY year DESC,month DESC LIMIT 1',[employee.id]);

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
