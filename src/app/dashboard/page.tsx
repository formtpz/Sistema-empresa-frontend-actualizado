"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

type Me = {
  authenticated: boolean;
  username?: string;
  name?: string;
  role?: string;
};

type MenuItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  href?: string;
  visible: boolean;
};

function displayName(name?: string, username?: string) {
  const raw = (name || username || "").trim();
  const fallback = (username || "").trim();
  if (raw && fallback && raw.toLowerCase() !== fallback.toLowerCase()) return raw;

  return (raw || fallback)
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [activeId, setActiveId] = useState("perfil");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setMe(data))
      .catch(() => setMe({ authenticated: false }));
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const role = me?.role ?? "";
  const isOperador = role === "OPERADOR";
  const hasPersonalProfile = role !== "RH" && role !== "GERENCIA";

  const canApproveRRHH = role === "COORDINACION" || role === "RH" || role === "ADMIN";
  const canSeeProyectos = role === "COORDINACION" || role === "RH" || role === "ADMIN";
  const canSeeContable = role === "RH" || role === "ADMIN";
  const canSeePaquetes = !isOperador && (role === "COORDINACION" || role === "ADMIN");
  const canSeeUsuarios = role === "ADMIN";
  const canSeeEquipo = role === "COORDINACION" || role === "ADMIN";
  const canSeeGerencia = role === "GERENCIA" || role === "PM" || role === "ADMIN";

  const menuItems = useMemo<MenuItem[]>(
    () => [
      {
        id: "perfil",
        label: "Perfil",
        title: "Perfil",
        description: "Vacaciones, permisos y datos de RH.",
        href: "/perfil",
        visible: hasPersonalProfile,
      },
      {
        id: "historial",
        label: "Historial",
        title: "Historial",
        description: "Revision de permisos y movimientos recientes del perfil.",
        href: "/perfil/historial",
        visible: hasPersonalProfile,
      },
      {
        id: "vacaciones",
        label: "Vacaciones",
        title: "Vacaciones",
        description: "Consulta del saldo y solicitudes asociadas a vacaciones.",
        href: "/perfil/vacaciones",
        visible: hasPersonalProfile,
      },
      {
        id: "bonos-extras",
        label: "Bonos y Horas Extras",
        title: "Bonos y Horas Extras",
        description: "Resumen propio de bonos y horas extra.",
        href: "/perfil/bonos-extras",
        visible: hasPersonalProfile,
      },
      {
        id: "correcciones",
        label: "Solicitud Correcciones",
        title: "Solicitud Correcciones",
        description: "Espacio reservado para solicitar ajustes o revisiones de datos.",
        visible: hasPersonalProfile,
      },
      {
        id: "aprobaciones",
        label: "Aprobaciones RRHH",
        title: "Aprobaciones RRHH",
        description: "Bandeja de permisos del equipo.",
        href: "/rrhh/aprobaciones",
        visible: canApproveRRHH,
      },
      {
        id: "personal",
        label: "Personal a cargo",
        title: "Personal a cargo",
        description: "Personal, supervisor, puesto y saldos de vacaciones.",
        href: "/coordinador/equipo",
        visible: canSeeEquipo,
      },
      {
        id: "proyectos",
        label: "Proyectos",
        title: "Proyectos",
        description: "KPIs por proyecto, estado y metricas.",
        href: "/proyectos",
        visible: canSeeProyectos,
      },
      {
        id: "gerencia",
        label: "Gerencia",
        title: "Gerencia",
        description: "Resumen ejecutivo de personal y proyectos.",
        href: "/gerencia",
        visible: canSeeGerencia,
      },
      {
        id: "usuarios",
        label: "Usuarios",
        title: "Usuarios",
        description: "Crear usuarios, editar roles y desactivar accesos.",
        href: "/usuarios",
        visible: canSeeUsuarios,
      },
      {
        id: "contable",
        label: "Contable",
        title: "Contable",
        description: "Certificados y documentos.",
        href: "/contable",
        visible: canSeeContable,
      },
      {
        id: "paquetes",
        label: "Paquetes",
        title: "Paquetes",
        description: "Seguimiento micro de paquetes.",
        href: "/paquetes",
        visible: canSeePaquetes,
      },
    ],
    [
      canApproveRRHH,
      canSeeContable,
      canSeeEquipo,
      canSeeGerencia,
      canSeePaquetes,
      canSeeProyectos,
      canSeeUsuarios,
      hasPersonalProfile,
    ]
  );

  const visibleItems = menuItems.filter((item) => item.visible);
  const activeItem = visibleItems.find((item) => item.id === activeId) ?? visibleItems[0];

  return (
    <main className="min-h-screen bg-white text-slate-950 dark:bg-[#0b0e14] dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-100 p-5 dark:border-slate-800 dark:bg-[#2a2b33] lg:border-b-0 lg:border-r">
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700">
            <Image
              src="/logo-telespazio.png"
              alt="Logo Telespazio"
              width={360}
              height={96}
              className="h-16 w-full object-contain"
              priority
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold">Menu</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {me?.authenticated ? me.role ?? "Usuario" : "Cargando"}
            </p>
          </div>

          <nav className="mt-6 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={`whitespace-nowrap rounded-md border px-3 py-2 text-left text-sm transition ${
                  activeItem?.id === item.id
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-slate-300 bg-transparent text-slate-800 hover:border-slate-500 dark:border-slate-600 dark:text-white dark:hover:border-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={logout}
              className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-left text-sm text-slate-800 hover:border-red-400 hover:text-red-700 dark:border-slate-600 dark:text-white dark:hover:border-red-400 dark:hover:text-red-100"
            >
              Salir
            </button>
          </nav>
        </aside>

        <section className="p-6 md:p-10 lg:p-14">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">
                {me?.authenticated
                  ? `Hola, ${displayName(me.name, me.username)}`
                  : "Cargando usuario..."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ThemeToggle />
              <button
                onClick={logout}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-800 hover:border-slate-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
              >
                Cerrar sesion
              </button>
            </div>
          </header>

          <div className="mt-10">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-[#11151d] dark:shadow-black/20">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-500">
                    Seccion seleccionada
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold">{activeItem?.title}</h2>
                  <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
                    {activeItem?.description}
                  </p>
                </div>

                {activeItem?.href && (
                  <Link
                    href={activeItem.href}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    Abrir
                  </Link>
                )}
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    className={`rounded-lg border p-5 text-left transition ${
                      activeItem?.id === item.id
                        ? "border-slate-400 bg-slate-100 dark:bg-slate-800/60"
                        : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-600"
                    }`}
                  >
                    <h3 className="text-lg font-medium">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
