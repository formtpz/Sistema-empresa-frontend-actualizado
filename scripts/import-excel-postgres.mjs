// Run locally: node scripts/import-excel-postgres.mjs /absolute/path/to/excel-folder
// Requires DATABASE_URL in environment. Does not delete or overwrite existing records.
import "dotenv/config";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import pg from "pg";
import xlsx from "xlsx";
import bcrypt from "bcryptjs";

const dir=resolve(process.argv[2]??"");
if(!process.argv[2]) throw Error("Indica la carpeta local de los cuatro Excel como argumento.");
if(!process.env.DATABASE_URL) throw Error("DATABASE_URL no configurada en el entorno.");
const filenames=["usuarios_login.xlsx","COL.xlsx","Horas_extra_febrero.xlsx","Bonos_febrero.xlsx"];
for(const file of filenames) if(!existsSync(join(dir,file))) throw Error("Falta el archivo "+file+" en la carpeta indicada.");
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
const normalize=s=>String(s??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[–—]/g,"-").replace(/\s+/g," ");
const get=(r,...keys)=>{const entries=Object.entries(r);for(const k of keys){const e=entries.find(([key])=>normalize(key)===normalize(k));if(e && String(e[1]??"").trim())return e[1];}return "";};
const contains=(r,...keys)=>{for(const k of keys){const e=Object.entries(r).find(([key])=>normalize(key).includes(normalize(k)));if(e && String(e[1]??"").trim())return e[1];}return "";};
const rows=(file,sheet)=>{const wb=xlsx.readFile(join(dir,file));const ws=wb.Sheets[sheet??wb.SheetNames[0]];if(!ws)throw Error("Hoja no encontrada: "+file+" "+sheet);return xlsx.utils.sheet_to_json(ws,{defval:""});};
const num=x=>{const n=Number(String(x??0).replace(",","."));return Number.isFinite(n)?n:0;};
const role=x=>{const v=normalize(x).toUpperCase();return v==="RRHH"?"RH":v==="COORDINACIÓN"?"COORDINACION":["ADMIN","RH","COORDINACION","OPERADOR","PM","GERENCIA"].includes(v)?v:"OPERADOR";};
const active=x=>["true","si","sí","1","yes"].includes(normalize(x));
const date=x=>{if(!x)return null;if(typeof x==="number"){const d=xlsx.SSF.parse_date_code(x);return d?new Date(Date.UTC(d.y,d.m-1,d.d)):null;}const d=new Date(x);return Number.isFinite(d.getTime())?d:null;};
const stats={users:0,employees:0,hours:0,bonuses:0,unmatchedHours:0,unmatchedBonuses:0};
async function run(){
 await client.connect();
 try{
  await client.query("BEGIN");
  const users=rows("usuarios_login.xlsx","Usuarios_Login");
  for(const r of users){
   const username=String(r.username??"").trim().toLowerCase(),pass=String(r.password??"").trim();
   if(!username)continue;
   // Existing accounts and password hashes are preserved. Passwords from the public repository are NOT imported.
   const hash=await bcrypt.hash(randomBytes(48).toString("hex"),10);
   const result=await client.query(`INSERT INTO public.users(username,name,role,active,password) VALUES($1,$2,$3,$4,$5) ON CONFLICT(username) DO NOTHING RETURNING id`,
    [username,String(r.name??username).trim()||username,role(r.role),active(r.active),hash]);
   stats.users+=result.rowCount;
  }
  const project=await client.query("SELECT id FROM public.projects WHERE code='COLOMBIA' LIMIT 1");
  const projectId=project.rows[0]?.id??null;
  for(const r of rows("COL.xlsx","Hoja2")){
   const email=String(get(r,"E-mail empresarial","Email empresarial","Email","E-mail","Correo")).trim();
   const username=email.split("@")[0].trim().toLowerCase().replace(/\s+/g,"");
   if(!username)continue;
   const name=String(get(r,"Nombre y Apellido","Nombre","Nombre completo")||username).trim();
   const hash=await bcrypt.hash(randomBytes(48).toString("hex"),10);
   await client.query(`INSERT INTO public.users(username,name,email,role,active,password) VALUES($1,$2,$3,'OPERADOR',true,$4) ON CONFLICT(username) DO NOTHING`,[username,name,email,hash]);
   const cedula=String(get(r,"# documento de identidad(Cédula)","Cédula","Cedula","Documento")).trim()||null;
   const start=date(get(r,"Fecha de inicio contrato","Fecha inicio","Inicio contrato"));
   const vacaciones=num(get(r,"Vacaciones al 19-01")||contains(r,"vacaciones al","saldo vacaciones","vacaciones"));
   const result=await client.query(`INSERT INTO public.employees(username,cedula,email,puesto,supervisor,start_date,vacaciones_saldo,"projectId")
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(username) DO NOTHING RETURNING id`,
    [username,cedula,email,String(get(r,"Puesto","Cargo")),String(get(r,"Supervisor","Jefe","Responsable")),start,vacaciones,projectId]);
   stats.employees+=result.rowCount;
  }
  for(const [file,kind] of [["Horas_extra_febrero.xlsx","hours"],["Bonos_febrero.xlsx","bonuses"]]){
   for(const r of rows(file)){
    const cedula=String(get(r,"Documento de Identidad","Cédula","Cedula","Documento")).trim();
    if(!cedula)continue;
    const emp=await client.query("SELECT id FROM public.employees WHERE cedula=$1",[cedula]);
    if(!emp.rowCount){if(kind==="hours")stats.unmatchedHours++;else stats.unmatchedBonuses++;continue;}
    const employeeId=emp.rows[0].id;
    if(kind==="hours"){
     const v=[num(get(r,"Total de horas","Total")),num(get(r,"Horas Extra Ordinarias","Horas Extra Ordinarias (No feriado)","Ordinarias")),num(get(r,"Horas Extra Feriados","Feriados")),num(get(r,"Horas Extras Diurnas","Diurnas")),num(get(r,"Horas Extras Nocturnas","Nocturnas")),num(get(r,"Horas Diurnas feriado","Diurnas feriado")),num(get(r,"Horas Nocturnas Feriado","Nocturnas feriado"))];
     const result=await client.query(`INSERT INTO public.horas_extra_mes("employeeId",year,month,total,ordinarias,feriados,diurnas,nocturnas,diurnas_feriado,nocturnas_feriado)
       VALUES($1,2026,2,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT("employeeId",year,month) DO NOTHING RETURNING id`,[employeeId,...v]);
     stats.hours+=result.rowCount;
    }else{
     const v=[num(get(r,"Monto Por Productividad")),num(get(r,"Monto Por Calidad")),num(get(r,"Monto QC")),num(get(r,"Monto Validación","Monto Validacion")),num(get(r,"Supervision","Supervisión")),num(get(r,"Calidad /Entregas Supervisor","Calidad/Entregas Supervisor")),num(get(r,"Supervision SIG","Supervisión SIG")),num(get(r,"Calidad /Entregas SIG","Calidad/Entregas SIG")),num(get(r,"Bono Fijo"))];
     const result=await client.query(`INSERT INTO public.bonos_mes("employeeId",year,month,total,productividad,calidad,qc,validacion,supervision,calidad_sup,supervision_sig,calidad_sig,bono_fijo)
       VALUES($1,2026,2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT("employeeId",year,month) DO NOTHING RETURNING id`,[employeeId,v.reduce((a,b)=>a+b,0),...v]);
     stats.bonuses+=result.rowCount;
    }
   }
  }
  if(stats.unmatchedHours||stats.unmatchedBonuses)throw Error("Hay cédulas sin empleado (horas: "+stats.unmatchedHours+", bonos: "+stats.unmatchedBonuses+"). Se revierte toda la importación.");
  if(process.env.CONFIRM_IMPORT!=="YES"){await client.query("ROLLBACK");console.log("SIMULACIÓN: transacción revertida. Conteos potenciales:",stats);console.log("Para confirmar, establece CONFIRM_IMPORT=YES.");}
  else{await client.query("COMMIT");console.log("IMPORTACIÓN CONFIRMADA:",stats);console.log("Las cuentas nuevas tienen contraseñas aleatorias no conocidas; configura un flujo seguro de restablecimiento antes de permitir acceso.");}
 }catch(err){await client.query("ROLLBACK").catch(()=>{});throw err;}finally{await client.end();}
}
run().catch(err=>{console.error("Importación fallida:",err.message);process.exitCode=1;});
