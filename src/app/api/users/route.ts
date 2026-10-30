export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { getPool, query } from "@/lib/db";
type Role = "ADMIN" | "RH" | "COORDINACION" | "OPERADOR" | "PM" | "GERENCIA";
type ProjectCode = "COLOMBIA" | "PERU" | "ITALIA" | "GENERAL";

const ROLES: Role[]=["ADMIN","RH","COORDINACION","OPERADOR","PM","GERENCIA"];
const PROJECT_CODES: ProjectCode[]=["COLOMBIA","PERU","ITALIA","GENERAL"];
function isRole(role:string):role is Role{return ROLES.includes(role as Role);}
function isProjectCode(code:string):code is ProjectCode{return PROJECT_CODES.includes(code as ProjectCode);}
async function getSessionRole(){return (await getSession())?.role??null;}

function parseDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const role = await getSessionRole();

  if (!role) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }
  if (role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const users = await query<{username:string;name:string;email:string|null;role:string;active:boolean;created_at:Date;supervisor:string|null;puesto:string|null;cedula:string|null;vacaciones_saldo:string|null;start_date:Date|null;projectCode:string|null;project:string|null}>(
    'SELECT u.username,u.name,u.email,u.role,u.active,u.created_at,e.supervisor,e.puesto,e.cedula,e.vacaciones_saldo,e.start_date,p.code AS "projectCode",p.name AS project FROM public.users u LEFT JOIN public.employees e ON e.username=u.username LEFT JOIN public.projects p ON p.id=e."projectId" ORDER BY u.role,u.username'
  );
  const supervisorOptions = await query<{username:string;name:string;role:string}>(
    "SELECT e.username,u.name,u.role FROM public.employees e JOIN public.users u ON u.username=e.username WHERE e.puesto ILIKE '%super%' OR e.puesto ILIKE '%coord%' OR u.role IN ('COORDINACION','PM') ORDER BY u.name"
  );

  return NextResponse.json({
    users: users.map((user)=>({
      username:user.username,name:user.name,email:user.email??"",role:user.role,active:user.active,
      created_at:user.created_at,supervisor:user.supervisor??"",puesto:user.puesto??"",cedula:user.cedula??"",
      vacaciones_saldo:Number(user.vacaciones_saldo??0),
      start_date:user.start_date?new Date(user.start_date).toISOString().slice(0,10):"",
      projectCode:user.projectCode??"",project:user.project??""
    })),
    supervisorOptions:supervisorOptions.map(e=>({username:e.username,name:e.name||e.username,role:e.role})),
  });
}

export async function POST(req: Request) {
  const role = await getSessionRole();

  if (!role) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }
  if (role !== "ADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const username = String(body?.username ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const userRole = String(body?.role ?? "").trim().toUpperCase();
  const password = String(body?.password ?? "");
  const active = body?.active ?? true;
  const supervisor = String(body?.supervisor ?? "").trim();
  const cedula = String(body?.cedula ?? "").trim();
  const puesto = String(body?.puesto ?? "").trim();
  const vacacionesSaldo = Number(body?.vacaciones_saldo ?? 0);
  const startDate = parseDate(body?.start_date);
  const projectCode = String(body?.projectCode ?? "").trim().toUpperCase();

  if (!username || !name || !isRole(userRole) || typeof active !== "boolean" || !Number.isFinite(vacacionesSaldo) || password.length > 1024) {
    return NextResponse.json({ message: "Faltan datos." }, { status: 400 });
  }
  if (projectCode && !isProjectCode(projectCode)) {
    return NextResponse.json({ message: "Proyecto invalido." }, { status: 400 });
  }
  const parsedProjectCode = projectCode && isProjectCode(projectCode) ? projectCode : null;
  const session = await getSession();
  if (session?.username === username && (!active || userRole !== "ADMIN")) {
    return NextResponse.json({message:"No puedes desactivar tu propio acceso administrativo"},{status:400});
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{password:string}>(
      "SELECT password FROM public.users WHERE username=$1 FOR UPDATE",[username]);
    if (!existing.rowCount && !password) {
      await client.query("ROLLBACK");
      return NextResponse.json({message:"Password requerido para usuario nuevo."},{status:400});
    }
    const hashedPassword = password ? await bcrypt.hash(password,10) : existing.rows[0].password;
    await client.query(
      'INSERT INTO public.users(username,name,email,role,active,password) VALUES($1,$2,$3,$4::public."Role",$5,$6) ON CONFLICT(username) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,role=EXCLUDED.role,active=EXCLUDED.active,password=EXCLUDED.password',
      [username,name,email||null,userRole,active,hashedPassword]);
    const project = parsedProjectCode
      ? await client.query<{id:number}>('SELECT id FROM public.projects WHERE code=$1::public."ProjectCode"',[parsedProjectCode])
      : null;
    const projectId = project?.rows[0]?.id ?? null;
    const employee = await client.query("SELECT id FROM public.employees WHERE username=$1",[username]);
    const shouldHaveEmployee = Boolean(employee.rowCount || supervisor || cedula || puesto || projectId ||
      userRole==="OPERADOR" || userRole==="COORDINACION");
    if(shouldHaveEmployee) {
      await client.query(
        'INSERT INTO public.employees(username,cedula,email,puesto,supervisor,vacaciones_saldo,start_date,"projectId") VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(username) DO UPDATE SET cedula=EXCLUDED.cedula,email=EXCLUDED.email,puesto=EXCLUDED.puesto,supervisor=EXCLUDED.supervisor,vacaciones_saldo=EXCLUDED.vacaciones_saldo,start_date=EXCLUDED.start_date,"projectId"=EXCLUDED."projectId"',
        [username,cedula||null,email||null,puesto,supervisor,Number.isFinite(vacacionesSaldo)?vacacionesSaldo:0,startDate,projectId]);
    }
    await client.query("COMMIT");
  } catch(error) {
    await client.query("ROLLBACK");
    console.error("Error guardando usuario",error);
    return NextResponse.json({message:"Error guardando usuario"},{status:500});
  } finally { client.release(); }

  return NextResponse.json({ ok: true });
}
