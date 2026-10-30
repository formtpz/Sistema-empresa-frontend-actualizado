"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

type ProjectCode = "GENERAL" | "COLOMBIA" | "PERU" | "ITALIA";
type DashboardProject = { code: ProjectCode; name: string; id?: number };

type DashboardResponse = {
  project: DashboardProject;
  personal: number; // headcount por proyecto
  kpis: {
    pendientesHoy: number;
    pendientesSemana: number;
    pendientesMes: number;
    aprobadosMes: number;
  };
  topUsuarios: { username: string; _count: number }[];
  tiposFrecuentes: { tipo: string; _count: number }[];
  porEstado: { estado: string; _count: number }[];
  porSupervisor: { supervisor: string; count: number }[];
};

const PROJECTS: { code: ProjectCode; label: string }[] = [
  { code: "GENERAL", label: "General" },
  { code: "COLOMBIA", label: "Colombia" },
  { code: "PERU", label: "Perú" },
  { code: "ITALIA", label: "Italia" },
];

function clsx(...x: (string | false | null | undefined)[]) {
  return x.filter(Boolean).join(" ");
}

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "px-3 py-1.5 rounded-full border text-sm transition",
        active
          ? "border-white bg-white text-black"
          : "border-white/35 text-white hover:border-white/70"
      )}
    >
      {children}
    </button>
  );
}

function Card({
  title,
  subtitle,
  right,
  onClick,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/35 bg-black/40 backdrop-blur-md p-6",
        onClick && "cursor-pointer hover:border-white/70 transition"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">{title}</div>
          {subtitle ? (
            <div className="text-sm text-white/70 mt-1">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/25 bg-black/40 p-4">
      <div className="text-white/70 text-xs">{label}</div>
      <div className="text-white text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function ListPill({ left, right }: { left: string; right: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/25 bg-black/40 px-4 py-3">
      <div className="text-white/90 text-sm">{left}</div>
      <div className="text-white font-semibold text-sm">{right}</div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectCode>("GENERAL");

  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);

  const headerProjectLabel =
    PROJECTS.find((x) => x.code === project)?.label || project;

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const loadDashboard = useCallback(async (p: ProjectCode) => {
    setDashLoading(true);
    setDashError(null);
    try {
      const res = await fetch(`/api/pm/dashboard?project=${p}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Error cargando dashboard");
      setDash(json as DashboardResponse);
    } catch (e: unknown) {
      setDash(null);
      setDashError(getErrorMessage(e, "Error cargando dashboard"));
    } finally {
      setDashLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadDashboard(project));
  }, [loadDashboard, project]);

  const headcount = dash?.personal ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#050B18] to-black">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-white text-2xl font-semibold">
          Proyectos | {headerProjectLabel}
        </div>
            <div className="text-white/65 text-sm mt-1">
          Vista general (GENERAL) o detalle por proyecto (Colombia / Perú / Italia).
        </div>

          </div>

          <button
            onClick={logout}
            className="rounded-full border border-white/30 px-4 py-2 text-sm text-white/90 transition hover:border-white/70 hover:bg-white/10"
            type="button"
          >
            Cerrar sesion
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {PROJECTS.map((p) => (
            <Chip
              key={p.code}
              active={project === p.code}
              onClick={() => setProject(p.code)}
            >
              {p.label}
            </Chip>
          ))}
        </div>

        {dashLoading ? (
          <div className="text-white/70 mt-6">Cargando dashboard...</div>
        ) : dashError ? (
          <div className="mt-6 text-red-300 border border-red-400/30 bg-red-500/10 rounded-xl p-3">
            {dashError}
          </div>
        ) : null}

        {/* CARDS SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
          {/* ✅ BONOS (MISMA PESTAÑA) */}
          <Card
            title="Bonos"
            subtitle="Incentivos / pagos"
            onClick={() => router.push(`/pm/bonos?project=${project}&year=2026&month=2`)}
          />

          {/* ✅ HORAS EXTRA (MISMA PESTAÑA) */}
          <Card
            title="Horas extra"
            subtitle="Horas extra / pagos"
            onClick={() => router.push(`/pm/horas-extra?project=${project}&year=2026&month=2`)}
          />

          <Card title="Consumido" subtitle="Gasto mensual / budget / burn" />
          <Card title="Rotación" subtitle="Altas / bajas / movimientos" />

          {/* ✅ PERSONAL */}
          <Card
            title="Cant. de personal"
            subtitle="Headcount / por puesto / por supervisor"
            onClick={() => router.push(`/pm/personal?project=${project}`)}
            right={
              <div className="rounded-xl border border-white/35 px-4 py-2 text-white text-sm">
                <div className="text-white/70 text-xs -mb-0.5">Total</div>
                <div className="text-lg font-semibold leading-tight">
                  {dash ? headcount : "—"}
                </div>
              </div>
            }
          />

          <Card title="Permisos" subtitle="Pendientes, aprobados y estadísticas" />
        </div>

        {/* KPIs */}
        <div className="mt-8">
          <div className="text-white text-lg font-semibold">Permisos | KPIs</div>
          <div className="text-white/65 text-sm mt-1">
            Pendientes (ENVIADO) y aprobados del mes. Top usuarios y distribución.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <MiniStat label="Pendientes hoy" value={dash?.kpis.pendientesHoy ?? 0} />
            <MiniStat label="Pendientes semana" value={dash?.kpis.pendientesSemana ?? 0} />
            <MiniStat label="Pendientes mes" value={dash?.kpis.pendientesMes ?? 0} />
            <MiniStat label="Aprobados mes" value={dash?.kpis.aprobadosMes ?? 0} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div className="rounded-2xl border border-white/35 bg-black/40 p-5">
              <div className="text-white font-semibold">Top 5 usuarios (mes)</div>
              <div className="mt-3 flex flex-col gap-2">
                {(dash?.topUsuarios?.length ?? 0) === 0 ? (
                  <div className="text-white/70 text-sm">Sin datos todavía.</div>
                ) : (
                  dash!.topUsuarios.map((x) => (
                    <ListPill key={x.username} left={x.username} right={x._count} />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/35 bg-black/40 p-5">
              <div className="text-white font-semibold">Tipos más frecuentes (mes)</div>
              <div className="mt-3 flex flex-col gap-2">
                {(dash?.tiposFrecuentes?.length ?? 0) === 0 ? (
                  <div className="text-white/70 text-sm">Sin datos todavía.</div>
                ) : (
                  dash!.tiposFrecuentes.map((x) => (
                    <ListPill key={x.tipo} left={x.tipo} right={x._count} />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/35 bg-black/40 p-5">
              <div className="text-white font-semibold">Por estado (mes)</div>
              <div className="mt-3 flex flex-col gap-2">
                {(dash?.porEstado?.length ?? 0) === 0 ? (
                  <div className="text-white/70 text-sm">Sin datos todavía.</div>
                ) : (
                  dash!.porEstado.map((x) => (
                    <ListPill key={x.estado} left={x.estado} right={x._count} />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/35 bg-black/40 p-5">
              <div className="text-white font-semibold">Por supervisor (mes)</div>
              <div className="mt-3 flex flex-col gap-2">
                {(dash?.porSupervisor?.length ?? 0) === 0 ? (
                  <div className="text-white/70 text-sm">Sin datos todavía.</div>
                ) : (
                  dash!.porSupervisor.slice(0, 8).map((x) => (
                    <ListPill key={x.supervisor} left={x.supervisor} right={x.count} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TIP */}
        <div className="mt-6 text-white/45 text-xs">
          Tip: “Cant. de personal” ahora abre /pm/personal y ahí cargás la lista desde /api/pm/personal.
        </div>
      </div>
    </div>
  );
}
