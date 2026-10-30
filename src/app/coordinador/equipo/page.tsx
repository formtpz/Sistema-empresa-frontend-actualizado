"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  username: string;
  name: string;
  role: string;
  active: boolean;
  email: string;
  puesto: string;
  supervisor: string;
  start_date: string | null;
  vacaciones_saldo: number;
};

export default function EquipoPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    // ✅ OJO: tu API está en /api/coordinador/equipo (según tu árbol)
    const res = await fetch("/api/coordinador/equipo", { cache: "no-store" });

    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status === 403) {
      setError("No autorizado para ver esta sección.");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Error cargando el equipo.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setRows(data.equipo ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.username, r.name, r.role, r.email, r.puesto, r.supervisor]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [q, rows]);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-8 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-semibold">Personal a cargo</h1>
          <p className="text-slate-300 mt-1">
            Ver personal, supervisor, puesto y saldo de vacaciones.
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-xl border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
        >
          Volver
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, usuario, rol, puesto, supervisor…"
          className="w-full max-w-xl px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-800 outline-none"
        />
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90"
        >
          Actualizar
        </button>
      </div>

      {loading && <div className="text-slate-300">Cargando equipo…</div>}

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-4 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="grid grid-cols-12 bg-slate-900/40 text-slate-300 text-sm px-4 py-3">
            <div className="col-span-2">Username</div>
            <div className="col-span-3">Nombre</div>
            <div className="col-span-2">Rol</div>
            <div className="col-span-2">Puesto</div>
            <div className="col-span-2">Supervisor</div>
            <div className="col-span-1 text-right">Vac.</div>
          </div>

          {filtered.map((r) => (
            <div
              key={r.username}
              className="grid grid-cols-12 px-4 py-3 border-t border-slate-800 hover:bg-slate-900/30"
            >
              <div className="col-span-2 font-mono text-sm">{r.username}</div>
              <div className="col-span-3">{r.name}</div>
              <div className="col-span-2">
                <span className="px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-sm">
                  {r.role}
                </span>
                {!r.active && <span className="ml-2 text-xs text-red-300">inactivo</span>}
              </div>
              <div className="col-span-2">{r.puesto || "-"}</div>
              <div className="col-span-2">{r.supervisor || "-"}</div>
              <div className="col-span-1 text-right">
                {Number(r.vacaciones_saldo || 0).toFixed(2)}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-4 text-slate-300">No hay resultados con ese filtro.</div>
          )}
        </div>
      )}
    </div>
  );
}
