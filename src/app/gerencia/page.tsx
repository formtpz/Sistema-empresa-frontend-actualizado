"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/errors";

type ProyectoResumen = {
  nombre: string;
  personal_total: number;
  activos: number;
  operadores: number;
  coordinadores: number;
  rh: number;
  pm: number;
};

type GerenciaResponse = {
  proyectos: ProyectoResumen[];
  message?: string;
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function GerenciaPage() {
  const [data, setData] = useState<GerenciaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gerencia/proyectos", { cache: "no-store" });
      const json = (await res.json()) as GerenciaResponse;

      if (!res.ok) {
        throw new Error(json.message ?? "No se pudo cargar gerencia.");
      }

      setData(json);
    } catch (err: unknown) {
      setData(null);
      setError(getErrorMessage(err, "No se pudo cargar gerencia."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const proyectos = data?.proyectos ?? [];
    return proyectos.reduce(
      (acc, proyecto) => ({
        personal: acc.personal + proyecto.personal_total,
        activos: acc.activos + proyecto.activos,
        operadores: acc.operadores + proyecto.operadores,
        liderazgo: acc.liderazgo + proyecto.coordinadores + proyecto.pm,
      }),
      { personal: 0, activos: 0, operadores: 0, liderazgo: 0 }
    );
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-red-300">
              Gerencia
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Resumen ejecutivo</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Vista consolidada de personal activo, estructura operativa y
              distribucion por proyecto.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={load}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:border-slate-500"
              type="button"
            >
              Recargar
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:border-slate-500"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-300">
            Cargando datos de gerencia...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-900/50 bg-red-950/40 p-6 text-red-200">
            {error}
          </div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-4">
              <StatCard label="Personal total" value={totals.personal} />
              <StatCard label="Activos" value={totals.activos} />
              <StatCard label="Operadores" value={totals.operadores} />
              <StatCard label="Liderazgo" value={totals.liderazgo} hint="Coordinacion + PM" />
            </section>

            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-medium">Proyectos</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Distribucion de personal por area y rol.
                  </p>
                </div>
                <Link
                  href="/pm/dashboard"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200"
                >
                  Ver dashboard PM
                </Link>
              </div>

              <div className="mt-5 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-400">
                    <tr className="border-b border-slate-800">
                      <th className="py-3 pr-4">Proyecto</th>
                      <th className="py-3 pr-4 text-right">Total</th>
                      <th className="py-3 pr-4 text-right">Activos</th>
                      <th className="py-3 pr-4 text-right">Operadores</th>
                      <th className="py-3 pr-4 text-right">Coordinacion</th>
                      <th className="py-3 pr-4 text-right">RH</th>
                      <th className="py-3 text-right">PM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.proyectos ?? []).map((proyecto) => (
                      <tr key={proyecto.nombre} className="border-b border-slate-900">
                        <td className="py-3 pr-4 font-medium text-white">{proyecto.nombre}</td>
                        <td className="py-3 pr-4 text-right">{proyecto.personal_total}</td>
                        <td className="py-3 pr-4 text-right">{proyecto.activos}</td>
                        <td className="py-3 pr-4 text-right">{proyecto.operadores}</td>
                        <td className="py-3 pr-4 text-right">{proyecto.coordinadores}</td>
                        <td className="py-3 pr-4 text-right">{proyecto.rh}</td>
                        <td className="py-3 text-right">{proyecto.pm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
