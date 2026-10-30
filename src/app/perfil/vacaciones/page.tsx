"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type OperadorData = {
  name: string;
  puesto: string;
  supervisor: string;
  start_date: string | null;
  antiguedad_meses: number;
  vacaciones_saldo: number;
  vacaciones_actual?: number;
};

export default function VacacionesPage() {
  const router = useRouter();
  const [data, setData] = useState<OperadorData | null>(null);

  useEffect(() => {
    fetch("/api/operador", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) => setData(body))
      .catch(() => router.push("/login"));
  }, [router]);

  const antiguedadTexto = useMemo(() => {
    const monthsTotal = data?.antiguedad_meses ?? 0;
    const years = Math.floor(monthsTotal / 12);
    const months = monthsTotal % 12;
    if (years === 0) return `${months} mes(es)`;
    if (months === 0) return `${years} ano(s)`;
    return `${years} ano(s) y ${months} mes(es)`;
  }, [data]);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Cargando vacaciones...
      </main>
    );
  }

  const saldoBase = Number(data.vacaciones_saldo ?? 0);
  const saldoActual = Number(data.vacaciones_actual ?? data.vacaciones_saldo ?? 0);
  const ajuste = saldoActual - saldoBase;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Modulo de vacaciones
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Vacaciones</h1>
            <p className="mt-1 text-slate-300">
              {data.name} - {data.puesto || "-"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/perfil/permisos" className={primaryButtonClass}>
              Solicitar vacaciones
            </Link>
            <Link href="/perfil" className={secondaryButtonClass}>
              Volver a perfil
            </Link>
            <Link href="/dashboard" className={secondaryButtonClass}>
              Dashboard
            </Link>
          </div>
        </header>

        <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            Saldo disponible
          </p>
          <p className="mt-3 text-5xl font-semibold">{saldoActual.toFixed(2)} dias</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MiniStat label="Saldo base" value={`${saldoBase.toFixed(2)} dias`} />
            <MiniStat label="Ajuste acumulado" value={`${ajuste.toFixed(2)} dias`} />
            <MiniStat label="Antiguedad" value={antiguedadTexto} />
          </div>
          <p className="mt-5 text-sm text-slate-400">
            El saldo se calcula con el saldo cargado y el ajuste mensual desde el corte.
          </p>
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-medium text-slate-100">{value}</p>
    </div>
  );
}

const primaryButtonClass =
  "rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200";

const secondaryButtonClass =
  "rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500";
