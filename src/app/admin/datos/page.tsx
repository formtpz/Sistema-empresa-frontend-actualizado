export const runtime = "nodejs";

async function getData() {
  const res = await fetch("http://localhost:3000/api/admin/bd", {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Error cargando datos");
  }

  return res.json();
}

type UserRow = {
  username: string;
  name: string;
  role: string;
  active: boolean;
};

type EmployeeRow = {
  username: string;
  puesto: string | null;
  supervisor: string | null;
  vacaciones_saldo: string | number;
};

type AdminData = {
  users: UserRow[];
  employees: EmployeeRow[];
  permisos: unknown[];
};

export default async function AdminDatos() {
  const { users, employees, permisos } = (await getData()) as AdminData;

  return (
    <main className="p-8 text-white">
      <h1 className="text-2xl font-semibold mb-6">
        Datos reales (Admin)
      </h1>

      {/* USERS */}
      <section className="mb-8">
        <h2 className="text-xl mb-2">Usuarios</h2>
        <table className="w-full border border-slate-700 text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-2">Username</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Activo</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} className="border-t border-slate-700">
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.active ? "Sí" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* EMPLOYEES */}
      <section className="mb-8">
        <h2 className="text-xl mb-2">Empleados</h2>
        <table className="w-full border border-slate-700 text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-2">Username</th>
              <th className="p-2">Puesto</th>
              <th className="p-2">Supervisor</th>
              <th className="p-2">Vacaciones</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.username} className="border-t border-slate-700">
                <td className="p-2">{e.username}</td>
                <td className="p-2">{e.puesto}</td>
                <td className="p-2">{e.supervisor}</td>
                <td className="p-2">{e.vacaciones_saldo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* PERMISOS */}
      <section>
        <h2 className="text-xl mb-2">Permisos</h2>
        {permisos.length === 0 ? (
          <p className="text-slate-400">No hay permisos registrados.</p>
        ) : (
          <pre>{JSON.stringify(permisos, null, 2)}</pre>
        )}
      </section>
    </main>
  );
}
