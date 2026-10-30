"use client";

import { useEffect, useState } from "react";

type PermisoTipo = "VACACIONES" | "PERSONAL" | "MEDICO" | "TRAMITE" | "OTRO";
type PermisoEstado = "ENVIADO" | "APROBADO" | "RECHAZADO";

type Permiso = {
  id: string;
  username: string;
  tipo: PermisoTipo;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: PermisoEstado;
  created_at: string;
};

const TIPOS: Record<PermisoTipo, string> = {
  VACACIONES: "Vacaciones",
  PERSONAL: "Personal",
  MEDICO: "Medico",
  TRAMITE: "Tramite",
  OTRO: "Otro",
};

const ESTADOS: Record<PermisoEstado, string> = {
  ENVIADO: "Enviado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CR");
}

export default function AprobacionesRRHH() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const res = await fetch("/api/rrhh/permisos-equipo");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.message ?? "No se pudo cargar la bandeja.");
      return;
    }
    const data = await res.json();
    setPermisos(data.permisos ?? []);
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  async function accion(id: string, action: "APROBAR" | "RECHAZAR") {
    setMsg(null);
    setErr(null);

    const res = await fetch("/api/rrhh/permisos-equipo/accion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accion: action }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.message ?? "No se pudo aplicar la accion.");
      return;
    }

    setMsg(action === "APROBAR" ? "Permiso aprobado." : "Permiso rechazado.");
    await load();
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Bandeja de Aprobaciones</h1>
            <p className="mt-1 text-slate-300">Permisos del equipo.</p>
          </div>
          <a
            href="/dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
          >
            Volver al Dashboard
          </a>
        </header>

        {err && (
          <div className="mt-6 rounded-2xl border border-red-900/40 bg-red-950/40 p-4 text-red-200">
            {err}
          </div>
        )}
        {msg && (
          <div className="mt-6 rounded-2xl border border-emerald-900/40 bg-emerald-950/30 p-4 text-emerald-200">
            {msg}
          </div>
        )}

        <div className="mt-8 space-y-3">
          {permisos.length === 0 ? (
            <p className="text-sm text-slate-400">No hay permisos todavia.</p>
          ) : (
            permisos.map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">
                      Usuario: <span className="text-slate-200">{p.username}</span>
                    </p>
                    <p className="mt-1 text-lg font-medium">{TIPOS[p.tipo] ?? p.tipo}</p>
                    <p className="text-sm text-slate-300">
                      {formatDate(p.fecha_inicio)} - {formatDate(p.fecha_fin)}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">{p.motivo}</p>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">
                      {ESTADOS[p.estado] ?? p.estado}
                    </span>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => accion(p.id, "APROBAR")}
                        disabled={p.estado !== "ENVIADO"}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => accion(p.id, "RECHAZAR")}
                        disabled={p.estado !== "ENVIADO"}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50"
                      >
                        Rechazar
                      </button>

                      {p.estado === "APROBADO" && p.tipo === "VACACIONES" && (
                        <a
                          href={`/api/rrhh/documento-vacaciones?id=${p.id}`}
                          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
                        >
                          Generar PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
