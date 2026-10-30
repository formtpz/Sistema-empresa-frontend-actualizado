"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type EquipoHorasExtraItem = {
  username: string;
  name: string;
  puesto: string;
  total: number;
  diurnas: number;
  nocturnas: number;
  feriados: number;
};

type EquipoHorasExtra = {
  year: number | null;
  month: number | null;
  total_horas: number;
  items: EquipoHorasExtraItem[];
};

type BonosExtrasData = {
  meta?: {
    usedFallback?: boolean;
  };
  periodo: {
    year: number;
    month: number;
  };
  bonos: {
    total: number;
  };
  extras: {
    total_horas: number;
  };
};

type OperadorData = {
  username: string;
  name: string;
  email: string;
  puesto: string;
  supervisor: string;
  start_date: string | null;
  antiguedad_meses: number;
  vacaciones_saldo: number;
  vacaciones_actual?: number;
  equipo_horas_extra?: EquipoHorasExtra | null;
};

export default function PerfilOperadorPage() {
  const router = useRouter();
  const [data, setData] = useState<OperadorData | null>(null);
  const [bonosExtras, setBonosExtras] = useState<BonosExtrasData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const res = await fetch("/api/operador", { cache: "no-store" });
        if (!res.ok) {
          router.push("/login");
          return;
        }

        const operador = await res.json();
        if (active) setData(operador);

        const bonosRes = await fetch("/api/bonos-extras", { cache: "no-store" });
        if (bonosRes.ok) {
          const bonosBody = await bonosRes.json();
          if (active) setBonosExtras(bonosBody);
        }
      } catch {
        if (active) setErr("No se pudo cargar el perfil.");
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  const antiguedadTexto = useMemo(() => {
    const monthsTotal = data?.antiguedad_meses ?? 0;
    const years = Math.floor(monthsTotal / 12);
    const months = monthsTotal % 12;
    if (years === 0) return `${months} mes(es)`;
    if (months === 0) return `${years} ano(s)`;
    return `${years} ano(s) y ${months} mes(es)`;
  }, [data]);

  const saldoVacaciones = Number(data?.vacaciones_actual ?? data?.vacaciones_saldo ?? 0);

  async function logout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Cargando perfil...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Perfil del colaborador
            </p>
            <h1 className="mt-1 text-3xl font-semibold">{data.name}</h1>
            <p className="mt-1 text-slate-300">
              {data.puesto || "-"} - Supervisor: {data.supervisor || "-"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className={secondaryButtonClass}>
              Volver
            </Link>
            <button onClick={logout} className={dangerButtonClass}>
              Cerrar sesion
            </button>
          </div>
        </header>

        {err && (
          <div className="mt-6 rounded-lg border border-red-900/40 bg-red-950/40 p-4 text-red-200">
            {err}
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card title="Datos personales">
            <InfoRow label="Usuario" value={data.username} />
            <InfoRow label="Correo" value={data.email || "-"} />
            <InfoRow label="Puesto" value={data.puesto || "-"} />
            <InfoRow label="Supervisor" value={data.supervisor || "-"} />
          </Card>

          <Card title="Antiguedad">
            <p className="text-2xl font-semibold text-white">{antiguedadTexto}</p>
            <p className="mt-2 text-sm text-slate-400">
              Inicio de contrato:{" "}
              {data.start_date
                ? new Date(data.start_date).toLocaleDateString("es-CR")
                : "-"}
            </p>
          </Card>

          <Card title="Vacaciones">
            <p className="text-3xl font-semibold text-white">
              {saldoVacaciones.toFixed(2)} dias
            </p>
            <p className="mt-2 text-sm text-slate-400">
              El detalle y las solicitudes estan en el modulo de vacaciones.
            </p>
            <Link href="/perfil/vacaciones" className={`mt-5 inline-flex ${primaryButtonClass}`}>
              Ver vacaciones
            </Link>
          </Card>

          <Card title="Bonos y horas extra propios">
            <BonosExtrasSummary data={bonosExtras} />
          </Card>

          {data.equipo_horas_extra && (
            <Card title="Horas extra del equipo">
              <EquipoHorasExtraSummary equipo={data.equipo_horas_extra} />
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

function BonosExtrasSummary({ data }: { data: BonosExtrasData | null }) {
  if (!data) {
    return (
      <p className="text-slate-400">
        No hay bonos u horas extra registrados para mostrar.
      </p>
    );
  }

  const periodo = `${String(data.periodo.month).padStart(2, "0")}/${data.periodo.year}`;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MiniStat label="Bono total" value={moneyCRC(data.bonos.total)} />
        <MiniStat
          label="Horas extra"
          value={`${Number(data.extras.total_horas ?? 0).toFixed(2)} horas`}
        />
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Periodo mostrado: {periodo}
        {data.meta?.usedFallback ? " (ultimo registro disponible)" : ""}
      </p>
    </div>
  );
}

function EquipoHorasExtraSummary({ equipo }: { equipo: EquipoHorasExtra }) {
  const periodo =
    equipo.year && equipo.month
      ? `Periodo ${String(equipo.month).padStart(2, "0")}/${equipo.year}`
      : "Sin periodo registrado";
  const registroHref =
    equipo.year && equipo.month
      ? `/perfil/horas-extra?period=${equipo.year}-${String(equipo.month).padStart(2, "0")}`
      : "/perfil/horas-extra";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold">
            {equipo.total_horas.toFixed(2)} horas
          </p>
          <p className="mt-1 text-sm text-slate-400">{periodo}</p>
        </div>
        <Link href={registroHref} className={primaryButtonClass}>
          Registrar por dia
        </Link>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="py-2 pr-3 font-medium">Operario</th>
              <th className="py-2 pr-3 text-right font-medium">Total</th>
              <th className="py-2 pr-3 text-right font-medium">Diurnas</th>
              <th className="py-2 pr-3 text-right font-medium">Nocturnas</th>
              <th className="py-2 text-right font-medium">Feriados</th>
            </tr>
          </thead>
          <tbody>
            {equipo.items.map((item) => (
              <tr key={item.username} className="border-b border-slate-900">
                <td className="py-3 pr-3">
                  <p className="font-medium text-slate-100">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.puesto || item.username}</p>
                </td>
                <td className="py-3 pr-3 text-right font-medium">
                  {item.total.toFixed(2)}
                </td>
                <td className="py-3 pr-3 text-right text-slate-300">
                  {item.diurnas.toFixed(2)}
                </td>
                <td className="py-3 pr-3 text-right text-slate-300">
                  {item.nocturnas.toFixed(2)}
                </td>
                <td className="py-3 text-right text-slate-300">
                  {item.feriados.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-800 py-3 last:border-b-0">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-slate-100">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const primaryButtonClass =
  "rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200";

const secondaryButtonClass =
  "rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500";

const dangerButtonClass =
  "rounded-lg border border-red-900/60 px-4 py-2 text-red-100 hover:border-red-500";

function moneyCRC(value: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}
