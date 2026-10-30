"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

const TIPOS: { value: PermisoTipo; label: string }[] = [
  { value: "VACACIONES", label: "Vacaciones" },
  { value: "PERSONAL", label: "Personal" },
  { value: "MEDICO", label: "Medico" },
  { value: "TRAMITE", label: "Tramite" },
  { value: "OTRO", label: "Otro" },
];

const ESTADOS: Record<PermisoEstado, string> = {
  ENVIADO: "Enviado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

function daysInclusive(fechaInicio: string, fechaFin: string) {
  if (!fechaInicio || !fechaFin) return 0;
  const start = new Date(`${fechaInicio}T00:00:00`);
  const end = new Date(`${fechaFin}T00:00:00`);
  const ms = end.getTime() - start.getTime();
  const diff = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CR");
}

export default function PerfilPermisosPage() {
  const router = useRouter();
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState<PermisoTipo>("VACACIONES");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [motivo, setMotivo] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const dias = useMemo(() => daysInclusive(fechaInicio, fechaFin), [fechaInicio, fechaFin]);

  async function load() {
    setErr(null);
    setMsg(null);
    setLoading(true);

    const res = await fetch("/api/permisos", {
      cache: "no-store",
      credentials: "include",
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.message ?? "No se pudieron cargar tus permisos.");
      return;
    }

    const data = await res.json();
    setPermisos(data.permisos ?? []);
  }

  useEffect(() => {
    fetch("/api/me", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const role = String(data?.role ?? "").toUpperCase();
        if (role === "RH") {
          router.replace("/rrhh/aprobaciones");
        }
        if (role === "GERENCIA") {
          router.replace("/gerencia");
        }
      })
      .catch(() => undefined);

    void Promise.resolve().then(load);
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const res = await fetch("/api/permisos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        motivo,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.message ?? "No se pudo enviar la solicitud.");
      return;
    }

    setMsg(tipo === "VACACIONES" ? "Solicitud de vacaciones enviada." : "Permiso enviado.");
    setMotivo("");
    setFechaInicio("");
    setFechaFin("");
    setTipo("VACACIONES");
    await load();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Vacaciones y Permisos</h1>
            <p className="mt-1 text-slate-300">
              Envia solicitudes y revisa tu historial.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/perfil"
              className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 hover:border-slate-500"
            >
              Volver a Perfil
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 hover:border-slate-500"
            >
              Dashboard
            </Link>
          </div>
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

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-medium">Nueva solicitud</h2>

          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-slate-200">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as PermisoTipo)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-slate-600"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {tipo === "VACACIONES" && (
                <p className="mt-2 text-xs text-slate-400">
                  Nota: por ahora contamos dias calendario.
                  {dias > 0 ? ` Solicitando: ${dias} dia(s).` : ""}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-200">Motivo</label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-slate-600"
                placeholder="Ej: cita medica, tramite, vacaciones..."
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-200">Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-slate-600"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-200">Fecha fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-slate-600"
                required
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
              <button
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-500"
                type="submit"
              >
                Enviar solicitud
              </button>
              <button
                type="button"
                onClick={load}
                className="rounded-2xl border border-slate-700 bg-slate-900/40 px-5 py-3 text-sm text-slate-100 hover:border-slate-500"
              >
                Recargar
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-medium">Mis solicitudes</h2>
            <p className="text-xs text-slate-400">
              {loading ? "Cargando..." : `${permisos.length} registro(s)`}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {!loading && permisos.length === 0 ? (
              <p className="text-sm text-slate-400">Todavia no tenes solicitudes.</p>
            ) : (
              permisos.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-400">
                        Tipo: <span className="text-slate-200">{TIPOS.find((t) => t.value === p.tipo)?.label ?? p.tipo}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {formatDate(p.fecha_inicio)} - {formatDate(p.fecha_fin)}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">{p.motivo}</p>
                      <p className="mt-2 text-xs text-slate-500">ID: {p.id}</p>
                    </div>

                    <span className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">
                      {ESTADOS[p.estado] ?? p.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
