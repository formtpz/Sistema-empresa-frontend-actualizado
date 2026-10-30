export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePermissionFromRequest } from "@/lib/auth";

type Project = { id: number; code: string; name: string };
type EmployeeRow = { username:string; puesto:string|null; supervisor:string|null; start_date:Date|null; projectId:number|null; name:string; email:string|null; role:string; active:boolean };
type CountRow = { label: string|null; count: number };

export async function GET(req: Request) {
  const auth = await requirePermissionFromRequest(req, "reports.read_all");
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });
  const code = (new URL(req.url).searchParams.get("project") ?? "GENERAL").toUpperCase();
  if (!["GENERAL","COLOMBIA","PERU","ITALIA"].includes(code)) return NextResponse.json({ message: "Proyecto inválido" }, { status: 400 });
  try {
    const projects = code === "GENERAL" ? [] : await query<Project>("SELECT id,code,name FROM public.projects WHERE code::text=$1 LIMIT 1",[code]);
    const project = projects[0] ?? null;
    if (code !== "GENERAL" && !project) return NextResponse.json({ message: "Proyecto no encontrado" }, { status: 404 });
    const filter = project ? 'WHERE e."projectId"=$1' : "";
    const params = project ? [project.id] : [];
    const rows = await query<EmployeeRow>(`SELECT e.username,e.puesto,e.supervisor,e.start_date,e."projectId",u.name,u.email,u.role,u.active
      FROM public.employees e JOIN public.users u ON u.username=e.username ${filter}
      ORDER BY e.supervisor NULLS FIRST,e.puesto NULLS FIRST,e.username`,params);
    const countsPuesto = await query<CountRow>(`SELECT e.puesto AS label, COUNT(*)::int AS count FROM public.employees e ${filter} GROUP BY e.puesto ORDER BY count DESC`,params);
    const countsSupervisor = await query<CountRow>(`SELECT e.supervisor AS label, COUNT(*)::int AS count FROM public.employees e ${filter} GROUP BY e.supervisor ORDER BY count DESC`,params);
    return NextResponse.json({
      project: project ?? { code:"GENERAL",name:"General" },
      total: rows.length,
      porPuesto: countsPuesto.map(x=>({puesto:x.label || "SIN_PUESTO",count:x.count})),
      porSupervisor: countsSupervisor.map(x=>({supervisor:x.label || "SIN_SUPERVISOR",count:x.count})),
      employees: rows.map(({name,email,role,active,...e})=>({...e,user:{name,email,role,active}}))
    });
  } catch (error) {
    console.error("Error consultando personal:",error);
    return NextResponse.json({ message:"Error consultando personal" },{status:500});
  }
}
