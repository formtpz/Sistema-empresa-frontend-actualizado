export default function ProyectosPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Proyectos</h1>
        <p className="mt-2 text-slate-300">
          Vista general por proyecto: KPIs, estado, distribución y métricas.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <p className="text-slate-200">
            Aquí vamos a montar los gráficos y tablas (ausentismo, rotación, distribución, etc.).
          </p>
          <p className="mt-2 text-sm text-slate-400">
            (Piloto) Esta sección puede empezar solo en modo lectura para RH y Coordinación.
          </p>
        </div>
      </div>
    </main>
  );
}
