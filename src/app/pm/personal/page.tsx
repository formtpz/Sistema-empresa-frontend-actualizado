"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getErrorMessage } from "@/lib/errors";

type ProjectCode = "GENERAL" | "COLOMBIA" | "PERU" | "ITALIA";

type DashboardProject = { code: ProjectCode; name: string };

type PersonalEmployee = {
  username: string;
  puesto: string | null;
  supervisor: string | null;
  start_date: string | null;
  projectId: number | null;
  user: {
    name: string;
    email: string | null;
    role: string;
    active: boolean;
  };
};

type PersonalResponse = {
  project: DashboardProject & { id?: number };
  total: number;
  porPuesto: { puesto: string; count: number }[];
  porSupervisor: { supervisor: string; count: number }[];
  employees: PersonalEmployee[];
};

const PROJECTS: { code: ProjectCode; label: string }[] = [
  { code: "GENERAL", label: "General" },
  { code: "COLOMBIA", label: "Colombia" },
  { code: "PERU", label: "Perú" },
  { code: "ITALIA", label: "Italia" },
];

function normalizeProject(value: string | null): ProjectCode {
  const code = String(value ?? "").toUpperCase();
  return PROJECTS.some((project) => project.code === code) ? (code as ProjectCode) : "COLOMBIA";
}

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

export default function Page() {
  const [project, setProject] = useState<ProjectCode>("COLOMBIA");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PersonalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // filtros
  const [q, setQ] = useState("");
  const [puestoSel, setPuestoSel] = useState<string>("ALL");
  const [supSel, setSupSel] = useState<string>("ALL");

  const load = useCallback(async (p: ProjectCode) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pm/personal?project=${p}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Error cargando personal");
      setData(json as PersonalResponse);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Error cargando personal"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => setProject(normalizeProject(new URLSearchParams(window.location.search).get("project"))));
  }, []);

  useEffect(() => {
    void load(project);
  }, [load, project]);

  function selectProject(nextProject: ProjectCode) {
    setProject(nextProject);
    setPuestoSel("ALL");
    setSupSel("ALL");
    setQ("");
    window.history.replaceState(null, "", `/pm/personal?project=${nextProject}`);
  }

  const filteredEmployees = useMemo(() => {
    const list = data?.employees ?? [];
    const qq = q.trim().toLowerCase();

    return list.filter((e) => {
      const puesto = (e.puesto || "SIN_PUESTO").trim();
      const sup = (e.supervisor || "SIN_SUPERVISOR").trim();

      if (puestoSel !== "ALL" && puesto !== puestoSel) return false;
      if (supSel !== "ALL" && sup !== supSel) return false;

      if (!qq) return true;

      const haystack = [
        e.username,
        e.user?.name,
        e.user?.email,
        puesto,
        sup,
        e.user?.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(qq);
    });
  }, [data, q, puestoSel, supSel]);

  const headerProjectLabel =
    PROJECTS.find((x) => x.code === project)?.label || project;

  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#050B18] to-black">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-white text-2xl font-semibold">
              Personal | {headerProjectLabel}
            </div>
            <div className="text-white/65 text-sm mt-1">
              Headcount por proyecto, con filtros por puesto y supervisor.
            </div>
          </div>

          <Link
            href="/pm/dashboard"
            className="rounded-full border border-white/30 px-4 py-2 text-white/90 hover:border-white/70 transition"
          >
            Volver
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {PROJECTS.map((p) => (
            <Chip key={p.code} active={project === p.code} onClick={() => selectProject(p.code)}>
              {p.label}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl border border-white/35 bg-black/40 backdrop-blur-md p-5">
            <div className="text-white/70 text-sm">Total personal</div>
            <div className="text-white text-3xl font-semibold mt-1">{loading ? "…" : total}</div>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-white/35 bg-black/40 backdrop-blur-md p-5">
            <div className="text-white font-semibold">Buscar</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre, username, email, puesto, supervisor..."
              className="mt-3 w-full px-4 py-2 rounded-xl border border-white/25 bg-black/40 text-white placeholder:text-white/40 outline-none focus:border-white/60"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-white/70 mt-6">Cargando personal...</div>
        ) : error ? (
          <div className="text-red-300 border border-red-400/30 bg-red-500/10 rounded-xl p-3 mt-6">
            {error}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="rounded-2xl border border-white/25 bg-black/40 p-4">
                <div className="text-white font-semibold">Por puesto</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Chip active={puestoSel === "ALL"} onClick={() => setPuestoSel("ALL")}>
                    Todos
                  </Chip>
                  {data.porPuesto.map((x) => (
                    <Chip
                      key={x.puesto}
                      active={puestoSel === x.puesto}
                      onClick={() => setPuestoSel(x.puesto)}
                    >
                      {x.puesto} ({x.count})
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/25 bg-black/40 p-4">
                <div className="text-white font-semibold">Por supervisor</div>
                <div className="flex flex-wrap gap-2 mt-3 max-h-28 overflow-auto pr-1">
                  <Chip active={supSel === "ALL"} onClick={() => setSupSel("ALL")}>
                    Todos
                  </Chip>
                  {data.porSupervisor.map((x) => (
                    <Chip
                      key={x.supervisor}
                      active={supSel === x.supervisor}
                      onClick={() => setSupSel(x.supervisor)}
                    >
                      {x.supervisor} ({x.count})
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/25 bg-black/40 overflow-hidden mt-6">
              <div className="px-4 py-3 border-b border-white/15 text-white font-semibold flex items-center justify-between">
                <span>Lista de personal</span>
                <span className="text-white/70 text-sm">
                  Mostrando: <span className="text-white">{filteredEmployees.length}</span>
                </span>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-white/70">
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-3">Nombre</th>
                      <th className="text-left px-4 py-3">Username</th>
                      <th className="text-left px-4 py-3">Puesto</th>
                      <th className="text-left px-4 py-3">Supervisor</th>
                      <th className="text-left px-4 py-3">Email</th>
                      <th className="text-left px-4 py-3">Activo</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {filteredEmployees.map((e) => (
                      <tr
                        key={e.username}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="px-4 py-3 font-medium">{e.user?.name || "—"}</td>
                        <td className="px-4 py-3 text-white/85">{e.username}</td>
                        <td className="px-4 py-3">{e.puesto || "SIN_PUESTO"}</td>
                        <td className="px-4 py-3">{e.supervisor || "SIN_SUPERVISOR"}</td>
                        <td className="px-4 py-3 text-white/85">
                          {(e.user?.email || "").trim() || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "inline-flex items-center rounded-full px-3 py-1 border",
                              e.user?.active
                                ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
                                : "border-red-400/40 text-red-200 bg-red-500/10"
                            )}
                          >
                            {e.user?.active ? "Sí" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-white/70" colSpan={6}>
                          No hay resultados con esos filtros.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-white/70 mt-6">Sin datos aún.</div>
        )}
      </div>
    </div>
  );
}
