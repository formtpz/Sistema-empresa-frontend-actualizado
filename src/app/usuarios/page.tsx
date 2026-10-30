"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "RH" | "COORDINACION" | "OPERADOR" | "PM" | "GERENCIA";

type UserRow = {
  username: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
  supervisor: string;
  puesto: string;
  project: string;
  projectCode: string;
  cedula: string;
  vacaciones_saldo: number;
  start_date: string;
};

type SupervisorOption = {
  username: string;
  name: string;
  role: Role;
};

const emptyForm = {
  username: "",
  name: "",
  email: "",
  role: "OPERADOR" as Role,
  password: "",
  active: true,
  supervisor: "",
  puesto: "",
  cedula: "",
  vacaciones_saldo: "",
  start_date: "",
  projectCode: "",
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [supervisorOptions, setSupervisorOptions] = useState<SupervisorOption[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [savingSupervisor, setSavingSupervisor] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/users", { cache: "no-store", credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.message ?? "No se pudo cargar usuarios.");
      return;
    }
    const data = await res.json();
    setUsers(data.users ?? []);
    setSupervisorOptions(data.supervisorOptions ?? []);
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      return [
        u.username,
        u.name,
        u.email,
        u.role,
        u.supervisor,
        u.puesto,
        u.project,
        u.cedula,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [users, q]);

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const payload = {
      username: form.username.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      password: form.password,
      active: form.active,
      supervisor: form.supervisor.trim(),
      puesto: form.puesto.trim(),
      cedula: form.cedula.trim(),
      vacaciones_saldo: Number(form.vacaciones_saldo || 0),
      start_date: form.start_date,
      projectCode: form.projectCode,
    };

    const res = await fetch("/api/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.message ?? "No se pudo guardar el usuario.");
      return;
    }

    setMsg("Usuario guardado.");
    setForm(emptyForm);
    await load();
  }

  function editUser(u: UserRow) {
    setForm({
      username: u.username,
      name: u.name,
      email: u.email ?? "",
      role: u.role,
      password: "",
      active: u.active,
      supervisor: u.supervisor ?? "",
      puesto: u.puesto ?? "",
      cedula: u.cedula ?? "",
      vacaciones_saldo: String(u.vacaciones_saldo ?? 0),
      start_date: u.start_date ?? "",
      projectCode: u.projectCode ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deactivate(username: string) {
    setErr(null);
    setMsg(null);

    const res = await fetch("/api/users/deactivate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.message ?? "No se pudo desactivar.");
      return;
    }

    setMsg(`Usuario "${username}" desactivado.`);
    await load();
  }

  async function updateUser(u: UserRow, changes: Partial<UserRow>) {
    setErr(null);
    setMsg(null);
    if (changes.supervisor !== undefined) setSavingSupervisor(u.username);

    const res = await fetch("/api/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: u.username,
        name: u.name,
        email: u.email,
        role: changes.role ?? u.role,
        active: u.active,
        password: "",
        supervisor: changes.supervisor ?? u.supervisor ?? "",
        puesto: changes.puesto ?? u.puesto ?? "",
        cedula: changes.cedula ?? u.cedula ?? "",
        vacaciones_saldo: changes.vacaciones_saldo ?? u.vacaciones_saldo ?? 0,
        start_date: changes.start_date ?? u.start_date ?? "",
        projectCode: changes.projectCode ?? u.projectCode ?? "",
      }),
    });

    setSavingSupervisor(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.message ?? "No se pudo actualizar el usuario.");
      return;
    }

    setMsg("Usuario actualizado.");
    await load();
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <datalist id="supervisores">
        {supervisorOptions.map((option) => (
          <option key={option.username} value={option.name}>
            {option.username} - {option.role}
          </option>
        ))}
      </datalist>

      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Usuarios</h1>
            <p className="mt-1 text-slate-300">
              Gestion de usuarios, roles y supervisor a cargo.
            </p>
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

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <form
            onSubmit={saveUser}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
          >
            <h2 className="text-xl font-medium">Crear / Editar usuario</h2>
            <p className="mt-1 text-sm text-slate-300">
              Si el username existe, se actualiza. Para usuario nuevo se requiere password.
            </p>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-sm text-slate-300">Username</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                  placeholder="ej: operador1"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                  placeholder="correo@empresa.com"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Supervisor a cargo</label>
                <input
                  value={form.supervisor}
                  onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
                  list="supervisores"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                  placeholder="Nombre o usuario del supervisor"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-300">Cedula</label>
                  <input
                    value={form.cedula}
                    onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                    placeholder="Identificacion"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300">Puesto</label>
                  <input
                    value={form.puesto}
                    onChange={(e) => setForm({ ...form, puesto: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                    placeholder="Puesto"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-sm text-slate-300">Proyecto</label>
                  <select
                    value={form.projectCode}
                    onChange={(e) => setForm({ ...form, projectCode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                  >
                    <option value="">Sin proyecto</option>
                    <option value="COLOMBIA">Colombia</option>
                    <option value="PERU">Peru</option>
                    <option value="ITALIA">Italia</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-300">Vacaciones</label>
                  <input
                    value={form.vacaciones_saldo}
                    onChange={(e) => setForm({ ...form, vacaciones_saldo: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300">Fecha ingreso</label>
                  <input
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                    type="date"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-300">Rol</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                  >
                    <option value="OPERADOR">OPERADOR</option>
                    <option value="COORDINACION">COORDINACION</option>
                    <option value="RH">RH</option>
                    <option value="PM">PM</option>
                    <option value="GERENCIA">GERENCIA</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <input
                    id="active"
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="active" className="text-sm text-slate-300">
                    Activo
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300">Password</label>
                <input
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
                  placeholder="Solo requerido para usuario nuevo"
                  type="password"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="mt-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950"
                >
                  Guardar usuario
                </button>
                <button
                  type="button"
                  onClick={() => setForm(emptyForm)}
                  className="mt-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium">Lista</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Buscar, cambiar rol, asignar supervisor o desactivar.
                </p>
              </div>
              <button
                onClick={load}
                className="rounded-xl border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
              >
                Recargar
              </button>
            </div>

            <div className="mt-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por username, nombre, rol, email, supervisor..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-100 outline-none focus:border-slate-600"
              />
            </div>

            <div className="mt-4 max-h-[720px] space-y-3 overflow-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400">No hay usuarios.</p>
              ) : (
                filtered.map((u) => (
                  <div
                    key={u.username}
                    className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-400">
                          Username: <span className="text-slate-200">{u.username}</span>
                        </p>
                        <p className="mt-1 text-lg font-medium">{u.name}</p>
                        <p className="text-sm text-slate-300">{u.email || "-"}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          Puesto: <span className="text-slate-200">{u.puesto || "-"}</span>
                          {u.project ? (
                            <>
                              {" "}
                              | Proyecto: <span className="text-slate-200">{u.project}</span>
                            </>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Cedula: <span className="text-slate-200">{u.cedula || "-"}</span>
                          {" "} | Vacaciones:{" "}
                          <span className="text-slate-200">{Number(u.vacaciones_saldo || 0).toFixed(2)}</span>
                          {u.start_date ? (
                            <>
                              {" "}
                              | Ingreso: <span className="text-slate-200">{u.start_date}</span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-lg border px-2 py-1 text-xs ${
                            u.active
                              ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-200"
                              : "border-red-900/40 bg-red-950/40 text-red-200"
                          }`}
                        >
                          {u.active ? "Activo" : "Inactivo"}
                        </span>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <select
                            value={u.role}
                            onChange={(e) =>
                              void updateUser(u, { role: e.target.value as Role })
                            }
                            className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
                          >
                            <option value="OPERADOR">OPERADOR</option>
                            <option value="COORDINACION">COORDINACION</option>
                            <option value="RH">RH</option>
                            <option value="PM">PM</option>
                            <option value="GERENCIA">GERENCIA</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>

                          <button
                            onClick={() => editUser(u)}
                            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => deactivate(u.username)}
                            disabled={!u.active || u.username === "admin"}
                            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50"
                            title={u.username === "admin" ? "No desactivar admin" : "Desactivar"}
                          >
                            Desactivar
                          </button>
                        </div>

                        <div className="w-full min-w-[280px]">
                          <label className="text-xs text-slate-400">Supervisor a cargo</label>
                          <input
                            key={`${u.username}-${u.supervisor}`}
                            defaultValue={u.supervisor ?? ""}
                            list="supervisores"
                            onBlur={(e) => {
                              const next = e.target.value.trim();
                              if (next !== (u.supervisor ?? "")) {
                                void updateUser(u, { supervisor: next });
                              }
                            }}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
                            placeholder="Sin supervisor"
                          />
                          {savingSupervisor === u.username ? (
                            <p className="mt-1 text-xs text-slate-500">Guardando...</p>
                          ) : null}
                        </div>

                        <p className="text-xs text-slate-500">
                          Creado: {new Date(u.created_at).toLocaleString("es-CR")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
