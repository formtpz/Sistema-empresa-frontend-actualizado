"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TeamMember = {
  username: string;
  name: string;
  puesto: string;
};

type HorasDiaItem = {
  id: string;
  username: string;
  name: string;
  puesto: string;
  date: string;
  total: number;
  ordinarias: number;
  feriados: number;
  diurnas: number;
  nocturnas: number;
  diurnas_feriado: number;
  nocturnas_feriado: number;
  justificacion: string;
};

type HorasDiaResponse = {
  year: number;
  month: number;
  team: TeamMember[];
  items: HorasDiaItem[];
};

type HorasDiaForm = {
  employeeUsername: string;
  date: string;
  cantidad: string;
  justificacion: string;
};

const today = new Date().toISOString().slice(0, 10);
const currentPeriod = today.slice(0, 7);

const emptyForm: HorasDiaForm = {
  employeeUsername: "",
  date: today,
  cantidad: "0",
  justificacion: "",
};

export default function RegistroHorasExtraPage() {
  const router = useRouter();
  const initialPeriod = getInitialPeriod();
  const [data, setData] = useState<HorasDiaResponse | null>(null);
  const [period, setPeriod] = useState(initialPeriod);
  const [form, setForm] = useState<HorasDiaForm>(() => ({
    ...emptyForm,
    date: `${initialPeriod}-01`,
  }));
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => toNumber(form.cantidad), [form.cantidad]);

  useEffect(() => {
    let active = true;

    async function load() {
      const [year, month] = period.split("-");
      try {
        const res = await fetch(`/api/operador/horas-extra-dia?year=${year}&month=${month}`);
        if (res.status === 401 || res.status === 403) {
          router.push("/perfil");
          return;
        }
        if (!res.ok) throw new Error("No se pudo cargar el registro.");

        const body = (await res.json()) as HorasDiaResponse;
        if (!active) return;

        setData(body);
        setForm((current) => ({
          ...current,
          employeeUsername: current.employeeUsername || body.team[0]?.username || "",
          date: current.date.startsWith(period) ? current.date : `${period}-01`,
        }));
      } catch {
        if (active) setErr("No se pudo cargar el registro diario.");
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [period, router]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSaving(true);

    const res = await fetch("/api/operador/horas-extra-dia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const body = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setErr(body?.message ?? "No se pudieron guardar las horas.");
      return;
    }

    setData(body);
    setPeriod(`${body.year}-${String(body.month).padStart(2, "0")}`);
    setMsg(body?.message ?? "Horas guardadas.");
  }

  function loadItem(item: HorasDiaItem) {
    setForm({
      employeeUsername: item.username,
      date: item.date,
      cantidad: String(item.total),
      justificacion: item.justificacion ?? "",
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Horas extra
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Registro diario</h1>
            <p className="mt-1 text-slate-300">
              Carga horas por fecha; el acumulado mensual se actualiza automaticamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/perfil" className={secondaryButtonClass}>
              Volver al perfil
            </Link>
            <button onClick={logout} className={dangerButtonClass}>
              Cerrar sesion
            </button>
          </div>
        </header>

        {err && (
          <div className="mt-6 rounded-lg border border-red-900/40 bg-red-950/40 p-4 text-red-200">
            {err}
          </div>
        )}
        {msg && (
          <div className="mt-6 rounded-lg border border-emerald-900/40 bg-emerald-950/30 p-4 text-emerald-200">
            {msg}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="text-xl font-medium">Nueva entrada</h2>
            <form onSubmit={save} className="mt-4 grid gap-3">
              <Field label="Periodo">
                <input
                  type="month"
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    setForm((current) => ({
                      ...current,
                      date: `${e.target.value}-01`,
                    }));
                  }}
                  className={inputClass}
                />
              </Field>

              <Field label="Fecha">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, date: e.target.value }))
                  }
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Operario">
                <select
                  value={form.employeeUsername}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      employeeUsername: e.target.value,
                    }))
                  }
                  className={inputClass}
                  required
                >
                  {(data?.team ?? []).map((member) => (
                    <option key={member.username} value={member.username}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>

              <NumberField label="Cantidad de horas extra" form={form} onChange={setForm} />

              <Field label="Justificacion">
                <textarea
                  value={form.justificacion}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      justificacion: e.target.value,
                    }))
                  }
                  className={`${inputClass} min-h-24 resize-y`}
                  placeholder="Ej: cierre de entrega, reproceso urgente, soporte fuera de horario..."
                  required
                />
              </Field>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-sm text-slate-400">Total del dia</p>
                <p className="text-2xl font-semibold">{total.toFixed(2)} horas</p>
              </div>

              <button
                disabled={saving || !data?.team.length}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar dia"}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium">Entradas del periodo</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {data?.items.length ?? 0} registros diarios
                </p>
              </div>
              <p className="text-sm text-slate-300">
                Total:{" "}
                <span className="font-semibold text-white">
                  {sumItems(data?.items ?? []).toFixed(2)}
                </span>
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="py-2 pr-3 font-medium">Fecha</th>
                    <th className="py-2 pr-3 font-medium">Operario</th>
                    <th className="py-2 pr-3 text-right font-medium">Total</th>
                    <th className="py-2 pr-3 font-medium">Justificacion</th>
                    <th className="py-2 text-right font-medium">Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items ?? []).length === 0 ? (
                    <tr>
                      <td className="py-6 text-slate-500" colSpan={5}>
                        No hay horas diarias registradas para este periodo.
                      </td>
                    </tr>
                  ) : (
                    data?.items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-900">
                        <td className="py-3 pr-3 text-slate-300">{item.date}</td>
                        <td className="py-3 pr-3">
                          <p className="font-medium text-slate-100">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            {item.puesto || item.username}
                          </p>
                        </td>
                        <td className="py-3 pr-3 text-right font-medium">
                          {item.total.toFixed(2)}
                        </td>
                        <td className="max-w-xs py-3 pr-3 text-slate-300">
                          {item.justificacion || "-"}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => loadItem(item)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                          >
                            Cargar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function NumberField({
  label,
  form,
  onChange,
}: {
  label: string;
  form: HorasDiaForm;
  onChange: React.Dispatch<React.SetStateAction<HorasDiaForm>>;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        step="0.25"
        value={form.cantidad}
        onChange={(e) =>
          onChange((current) => ({ ...current, cantidad: e.target.value }))
        }
        className={inputClass}
        required
      />
    </Field>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-slate-300">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumItems(items: HorasDiaItem[]) {
  return items.reduce((acc, item) => acc + item.total, 0);
}

const inputClass =
  "w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600";

const secondaryButtonClass =
  "rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500";

const dangerButtonClass =
  "rounded-lg border border-red-900/60 px-4 py-2 text-red-100 hover:border-red-500";

function getInitialPeriod() {
  if (typeof window === "undefined") return currentPeriod;
  const requested = new URLSearchParams(window.location.search).get("period");
  return requested && /^\d{4}-\d{2}$/.test(requested) ? requested : currentPeriod;
}
