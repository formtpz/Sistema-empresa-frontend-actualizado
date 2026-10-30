"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? "No se pudo iniciar sesión.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Fondo visual */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(56,189,248,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_80%_20%,rgba(99,102,241,0.16),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_40%_90%,rgba(34,211,238,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-950" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
              <Image
                src="/logo-telespazio.png"
                alt="Logo Telespazio"
                width={40}
                height={40}
                className="h-full w-full object-contain p-1"
              />
            </div>
            <div className="leading-tight">
              <p className="text-sm text-slate-300">Plataforma</p>
              <p className="text-base font-semibold">Telespazio</p>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 hover:border-slate-500"
          >
            Volver al inicio
          </Link>
        </header>

        {/* Contenido */}
        <div className="mt-14 grid w-full grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          {/* Izquierda */}
          <section className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Acceso interno
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Sistema Empresa
              <span className="text-cyan-300"> Telespazio</span>
            </h1>

            <p className="mt-3 text-slate-300">
              Acceso seguro al perfil, RRHH, producción, KPIs y seguimiento de paquetes.
            </p>

            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
                ✅ Perfil: vacaciones, permisos, RH
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
                📊 Producción: ratios, calidad, KPIs
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
                📦 Paquetes: trazabilidad por fase
              </div>
            </div>
          </section>

          {/* Derecha: form */}
          <section className="flex items-center">
            <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                <h2 className="text-xl font-medium">Iniciar sesión</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Ingresá tus credenciales para continuar.
                </p>

                <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                  <div>
                    <label className="text-sm text-slate-200">Usuario</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-slate-600"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ej: mfernandez"
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-200">Contraseña</label>
                    <input
                      type="password"
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-slate-600"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <button
                    disabled={loading}
                    className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:opacity-90 disabled:opacity-60"
                  >
                    {loading ? "Ingresando..." : "Entrar"}
                  </button>

                  <p className="text-xs text-slate-400">
                    Piloto: usuarios de prueba. En producción se integra con SSO/RH.
                  </p>
                </form>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-14 border-t border-slate-900/60 py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Plataforma Interna. Piloto.
        </footer>
      </div>
    </main>
  );
}
