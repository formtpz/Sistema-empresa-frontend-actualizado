"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getErrorMessage } from "@/lib/errors";

type BonoItem = {
  id: string;
  employeeId: number;
  username: string;
  name: string;
  project: string;

  year: number;
  month: number;

  total: number;
  productividad: number;
  calidad: number;
  qc: number;
  validacion: number;
  supervision: number;
  calidad_sup: number;
  supervision_sig: number;
  calidad_sig: number;
  bono_fijo: number;
};

type BonosResponse = {
  ok: boolean;
  project: string;
  period: string;
  year: number;
  month: number;
  total: number;
  items: BonoItem[];
  error?: string;
};

function moneyCRC(n: number) {
  return `₡${(n ?? 0).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
}

export default function BonosPage() {
  const [project, setProject] = useState("GENERAL");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [data, setData] = useState<BonosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadBonos = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);

      const res = await fetch(
        `/api/pm/bonos?project=${encodeURIComponent(project)}&period=${encodeURIComponent(period)}`,
        { cache: "no-store" }
      );

      const text = await res.text();

      let json: BonosResponse;
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
      console.error("BONOS PAGE ERROR:", e);
      setErr(getErrorMessage(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, project]);

  useEffect(() => {
    void loadBonos();
  }, [loadBonos]);

  const totalBonos = useMemo(() => data?.total ?? 0, [data]);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Bonos | {project} | {period}
          </h1>
          <p className="text-sm opacity-70">
            Detalle de incentivos por persona para el periodo seleccionado.
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
            onClick={loadBonos}
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
        <p className="text-sm opacity-70">Total bonos</p>
        <h2 className="text-3xl font-bold">{moneyCRC(totalBonos)}</h2>
      </div>

      {/* DETALLE */}
      <div className="border border-white/20 rounded-2xl p-6 bg-white/5">
        <h3 className="text-lg font-semibold mb-2">Detalle por personal</h3>
        <p className="text-sm opacity-70 mb-4">Incentivos registrados en Prisma para el periodo.</p>

        {loading ? (
          <p className="opacity-70">Cargando...</p>
        ) : !data || data.items.length === 0 ? (
          <p className="opacity-70">No hay bonos para este periodo.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="py-2">Usuario</th>
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Proyecto</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b.id} className="border-b border-white/5">
                    <td className="py-2">{b.username}</td>
                    <td className="py-2">{b.name}</td>
                    <td className="py-2 opacity-80">{b.project}</td>
                    <td className="py-2 text-right font-semibold">{moneyCRC(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Si querés, después hacemos un "expand" por fila para ver productividad/calidad/qc/etc */}
          </div>
        )}
      </div>

      {/* ❌ Nota eliminada */}
    </div>
  );
}
