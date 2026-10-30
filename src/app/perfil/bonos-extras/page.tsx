"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BonosExtrasData = {
  display_name?: string;
  user?: {
    username: string;
    name: string;
  };
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

export default function BonosExtrasPage() {
  const router = useRouter();
  const [data, setData] = useState<BonosExtrasData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bonos-extras", { cache: "no-store", credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErr(body?.message ?? "No se pudo cargar bonos y horas extra.");
          return null;
        }
        return res.json();
      })
      .then((body) => {
        if (body) setData(body);
      })
      .catch(() => setErr("No se pudo cargar bonos y horas extra."));
  }, [router]);

  const displayName =
    data?.display_name ?? formatUsername(data?.user?.name || data?.user?.username || "");

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Bonos y horas extra
            </p>
            <h1 className="mt-1 text-3xl font-semibold">
              {displayName || "Colaborador"}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/perfil" className={secondaryButtonClass}>
              Volver a perfil
            </Link>
            <Link href="/dashboard" className={secondaryButtonClass}>
              Dashboard
            </Link>
          </div>
        </header>

        {err && (
          <div className="mt-6 rounded-lg border border-red-900/40 bg-red-950/40 p-4 text-red-200">
            {err}
          </div>
        )}

        <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-2xl font-medium">Bonos y horas extra propios</h2>

          {!data ? (
            <p className="mt-6 text-slate-400">Cargando...</p>
          ) : (
            <BonosExtrasSummary data={data} />
          )}
        </section>
      </div>
    </main>
  );
}

function BonosExtrasSummary({ data }: { data: BonosExtrasData }) {
  const periodo = `${String(data.periodo.month).padStart(2, "0")}/${data.periodo.year}`;

  return (
    <div>
      <div className="mt-6 grid max-w-xl gap-5 sm:grid-cols-2">
        <MiniStat label="Bono total" value={moneyCRC(data.bonos.total)} />
        <MiniStat
          label="Horas extra"
          value={`${Number(data.extras.total_horas ?? 0).toFixed(2)}\nhoras`}
        />
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Periodo mostrado: {periodo}
        {data.meta?.usedFallback ? " (ultimo registro disponible)" : ""}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-36 rounded-lg border border-slate-800 bg-slate-950/30 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-4 whitespace-pre-line text-3xl font-semibold text-slate-100">
        {value}
      </p>
    </div>
  );
}

function moneyCRC(value: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatUsername(value: string) {
  return value
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const secondaryButtonClass =
  "rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500";
