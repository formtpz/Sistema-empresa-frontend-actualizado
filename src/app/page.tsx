"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

type Me = {
  authenticated: boolean;
  username?: string;
  name?: string;
  role?: string;
};

export default function Home() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  // Cargar sesión (si existe)
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setMe(data))
      .catch(() => setMe({ authenticated: false }));
  }, []);

  function goModule(href: string) {
    const isAuth = me?.authenticated;
    if (isAuth) {
      router.push(href);
      return;
    }
    // Si no está logueado, lo mandamos a login con redirect
    router.push(`/login?next=${encodeURIComponent(href)}`);
  }

  return (
    <main className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      {/* Fondo visual */}
      <div className="pointer-events-none fixed inset-0">
        {/* Dark */}
        <div className="absolute inset-0 hidden dark:block">
          <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(239,68,68,0.22),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(750px_circle_at_80%_20%,rgba(239,68,68,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-950" />
        </div>

        {/* Light */}
        <div className="absolute inset-0 dark:hidden">
          <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(239,68,68,0.10),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(750px_circle_at_80%_20%,rgba(239,68,68,0.06),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-white" />
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          {/* Logo grande sin texto extra */}
          <div className="flex items-center gap-3">
            <div className="h-28 w-[min(440px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
              <Image
                src="/logo-telespazio.png"
                alt="Logo Telespazio"
                width={440}
                height={112}
                className="h-full w-full object-contain p-2"
                priority
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link
              href="/login"
              className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
            >
              Iniciar sesión
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="mt-14 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Piloto interno
            </div>

            <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
              Plataforma Telespazio
            </h1>

            <p className="mt-4 max-w-xl text-slate-700 dark:text-slate-300">
              Un solo lugar para RRHH, Producción, KPIs, vacaciones, permisos,
              trazabilidad de paquetes y gestión documental.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-500"
              >
                Entrar al sistema
              </Link>

              <a
                href="#modulos"
                className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-3 text-sm text-slate-900 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:border-slate-500"
              >
                Ver módulos
              </a>
            </div>

            {/* ✅ Los cuadros que te gustaban */}
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-xs">
              <MiniCard title="Seguridad" desc="Acceso por roles" />
              <MiniCard title="Escalable" desc="+300 usuarios" />
              <MiniCard title="Centralizado" desc="Todo en 1" />
            </div>
          </div>

          {/* Acceso rápido */}
          <div
            id="modulos"
            className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Acceso rápido
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ModuleCard
                  title="Perfil RRHH"
                  desc="Vacaciones, permisos y documentos"
                  onClick={() => goModule("/perfil")}
                />
                <ModuleCard
                  title="Producción"
                  desc="KPIs, ratios y calidad"
                  onClick={() => goModule("/produccion")}
                />
                <ModuleCard
                  title="Contable"
                  desc="Certificados y pagos"
                  onClick={() => goModule("/contable")}
                />
                <ModuleCard
                  title="Paquetes"
                  desc="Seguimiento y trazabilidad"
                  onClick={() => goModule("/paquetes")}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Tip: si no tenés cuenta, pedila a{" "}
                  <span className="font-medium text-slate-900 dark:text-white">
                    RH
                  </span>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-200 py-6 text-xs text-slate-500 dark:border-slate-900/60 dark:text-slate-500">
          © {new Date().getFullYear()} Plataforma Telespazio · Piloto interno
        </footer>
      </div>
    </main>
  );
}

function ModuleCard({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-slate-200 bg-white/60 p-4 transition
                 hover:border-red-300 hover:bg-white
                 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-slate-600 dark:hover:bg-slate-900/40"
    >
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{desc}</p>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Abrir →
      </p>
    </button>
  );
}

function MiniCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/60 p-3 dark:border-slate-800 dark:bg-slate-900/30">
      <p className="font-medium text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">{desc}</p>
    </div>
  );
}
