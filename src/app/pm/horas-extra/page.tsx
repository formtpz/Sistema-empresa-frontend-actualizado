"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getErrorMessage } from "@/lib/errors";

type ExtraItem = {
  id: string;
  employeeId: number;
  username: string;
  name: string;
  project: string;

  year: number;
  month: number;

  total: number;
  ordinarias: number;
  feriados: number;
  diurnas: number;
  nocturnas: number;
  diurnas_feriado: number;
  nocturnas_feriado: number;
};

type ExtrasResponse = {
  ok: boolean;
  project: string;
  period: string;
  year: number;
  month: number;
  totalHoras: number;
  items: ExtraItem[];
  error?: string;
};

function num(n: number) {
  return (n ?? 0).toLocaleString("es-CR", { minimumFractionDigits: 2 });
}

export default function HorasExtraPage() {
  const [project, setProject] = useState("GENERAL");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [data, setData] = useState<ExtrasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadExtras = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);

      const res = await fetch(
        `/api/pm/horas-extra?project=${encodeURIComponent(project)}&period=${encodeURIComponent(period)}`,
        { cache: "no-store" }
      );

      const text = await res.text();

      let json: ExtrasResponse;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("La API devolvió una respuesta inválida (no JSON).");
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Error HTTP ${res.status}`);
      }

      setData(json);
    } catch (e: unknown) {
      console.error("HORAS EXTRA PAGE ERROR:", e);
      setErr(getErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, project]);

  useEffect(() => {
    void Promise.resolve().then(() => loadExtras());
  }, [loadExtras]);

  const totalHoras = useMemo(() => data?.totalHoras ?? 0, [data]);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Horas Extra | {project} | {period}
          </h1>
          <p className="text-sm opacity-70">
            Detalle de horas extra registradas por persona para el periodo seleccionado.
          </p>
        </div>

        <Link
          href="/pm/dashboard"
          className="border border-white/30 px-4 py-2 rounded-xl hover:bg-white/10 transition"
        >
          ← Volver al dashboard
        </Link>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs opacity-70">Proyecto</label>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm"
          >
            <option value="GENERAL">GENERAL</option>
            <option value="COLOMBIA">COLOMBIA</option>
            <option value="PERU">PERU</option>
            <option value="ITALIA">ITALIA</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs opacity-70">Periodo</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={loadExtras}
            className="bg-white text-black font-semibold px-4 py-2 rounded-xl hover:bg-gray-200 transition"
          >
            Recargar
          </button>
        </div>
      </div>

      {/* ERROR */}
      {err && (
        <div className="border border-red-500/40 bg-red-500/10 text-red-200 rounded-xl p-4 mb-6">
          {err}
        </div>
      )}

      {/* TOTAL */}
      <div className="border border-white/20 rounded-2xl p-6 mb-6 bg-white/5">
        <p className="text-sm opacity-70">Total horas extra</p>
        <h2 className="text-3xl font-bold">{num(totalHoras)} hrs</h2>
      </div>

      {/* DETALLE */}
      <div className="border border-white/20 rounded-2xl p-6 bg-white/5">
        <h3 className="text-lg font-semibold mb-2">Detalle por personal</h3>
        <p className="text-sm opacity-70 mb-4">Horas extra registradas en Prisma para el periodo.</p>

        {loading ? (
          <p className="opacity-70">Cargando...</p>
        ) : !data || data.items.length === 0 ? (
          <p className="opacity-70">No hay horas extra para este periodo.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="py-2">Usuario</th>
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Proyecto</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Ordinarias</th>
                  <th className="py-2 text-right">Feriados</th>
                  <th className="py-2 text-right">Diurnas</th>
                  <th className="py-2 text-right">Nocturnas</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((h) => (
                  <tr key={h.id} className="border-b border-white/5">
                    <td className="py-2">{h.username}</td>
                    <td className="py-2">{h.name}</td>
                    <td className="py-2 opacity-80">{h.project}</td>
                    <td className="py-2 text-right font-semibold">{num(h.total)}</td>
                    <td className="py-2 text-right">{num(h.ordinarias)}</td>
                    <td className="py-2 text-right">{num(h.feriados)}</td>
                    <td className="py-2 text-right">{num(h.diurnas)}</td>
                    <td className="py-2 text-right">{num(h.nocturnas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-xs opacity-60 mt-4">
              Nota: el total incluye feriados, ordinarias y combinaciones diurnas/nocturnas según Excel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
