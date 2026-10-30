"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PermisoEstado = "ENVIADO" | "APROBADO" | "RECHAZADO";

type Permiso = {
  id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: PermisoEstado;
  created_at: string;
};

const ESTADOS: Record<PermisoEstado, string> = {
  ENVIADO: "Enviado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CR");
}

export default function HistorialPage() {
  const router = useRouter();
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/permisos", { cache: "no-store", credentials: "include" })
      .then(async (res) => {
        setLoading(false);
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErr(data?.message ?? "No se pudo cargar el historial.");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setPermisos(data.permisos ?? []);
      })
      .catch(() => {
        setLoading(false);
        setErr("No se pudo cargar el historial.");
      });
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Historial personal
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Mis solicitudes</h1>
            <p className="mt-1 text-slate-300">
              Revisa el estado de vacaciones y permisos enviados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/perfil/permisos" className={primaryButtonClass}>
              Nueva solicitud
            </Link>
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

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-medium">Registros</h2>
            <p className="text-xs text-slate-400">
              {loading ? "Cargando..." : `${permisos.length} registro(s)`}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {!loading && permisos.length === 0 ? (
              <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
                Todavia no tenes solicitudes.
              </p>
            ) : (
              permisos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-400">
                        Tipo: <span className="text-slate-200">{p.tipo}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {formatDate(p.fecha_inicio)} - {formatDate(p.fecha_fin)}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">{p.motivo}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Enviado: {formatDate(p.created_at)}
                      </p>
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

const primaryButtonClass =
  "rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200";

const secondaryButtonClass =
  "rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500";
