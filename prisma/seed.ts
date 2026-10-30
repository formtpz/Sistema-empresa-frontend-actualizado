// prisma/seed.ts
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import path from "path";
import xlsxImport from "xlsx";
import bcrypt from "bcryptjs";

const XLSX: any = (xlsxImport as any).default ?? xlsxImport; // ✅ FIX ESM/CJS
const prisma = new PrismaClient();

function excelDateToJSDate(value: any): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;

  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d || !d.y || !d.m || !d.d) return null;
    return new Date(d.y, d.m - 1, d.d);
  }

  const s = String(value).trim();
  if (!s) return null;

  const asDate = new Date(s);
  if (!isNaN(asDate.getTime())) return asDate;

  return null;
}

function toNumber(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  const cleaned = String(value).trim().replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function usernameFromEmail(email: string): string {
  return String(email || "")
    .trim()
    .toLowerCase()
    .split("@")[0]
    .replace(/\s+/g, "");
}

function normalizeKey(s: string) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[–—]/g, "-");
}

/** Busca por nombre exacto, pero con normalización */
function pick(r: Record<string, any>, keys: string[]) {
  const map = new Map<string, string>();
  for (const k of Object.keys(r)) map.set(normalizeKey(k), k);

  for (const wanted of keys) {
    const realKey = map.get(normalizeKey(wanted));
    if (realKey) {
      const v = r[realKey];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }
  return "";
}

/** Busca por “contiene” (ideal para columnas con fecha o variantes) */
function pickContains(r: Record<string, any>, contains: string[]) {
  const allKeys = Object.keys(r);
  const normAll = allKeys.map((k) => ({ raw: k, norm: normalizeKey(k) }));

  for (const c of contains) {
    const target = normalizeKey(c);
    const found = normAll.find((x) => x.norm.includes(target));
    if (found) {
      const v = r[found.raw];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }
  return "";
}

function roleFromExcel(value: any): Role {
  const v = String(value || "").trim().toUpperCase();
  if (v === "ADMIN") return Role.ADMIN;
  if (v === "RH" || v === "RRHH") return Role.RH;
  if (v === "COORDINACION" || v === "COORDINACIÓN") return Role.COORDINACION;
  if (v === "PM") return Role.PM;
  if (v === "GERENCIA") return Role.GERENCIA;
  return Role.OPERADOR;
}

function activeFromExcel(value: any): boolean {
  const v = String(value ?? "true").trim().toLowerCase();
  return v === "true" || v === "si" || v === "sí" || v === "1" || v === "yes";
}

async function seedHorasExtraPagoFeb2026() {
  const year = 2026;
  const month = 2;

  const horasPath = path.join(process.cwd(), "prisma", "seed-data", "Horas_extra_febrero.xlsx");
  const wbHoras = XLSX.readFile(horasPath);

  const sheetNameHoras = wbHoras.SheetNames[0];
  const wsHoras = wbHoras.Sheets[sheetNameHoras];
  if (!wsHoras) throw new Error(`No pude leer la hoja de horas extra. Hojas: ${wbHoras.SheetNames.join(", ")}`);

  const rowsHoras = XLSX.utils.sheet_to_json(wsHoras, { defval: "" }) as Array<Record<string, any>>;

  let upserted = 0;
  let noEmployee = 0;

  for (const r of rowsHoras) {
    const cedula = String(pick(r, ["Documento de Identidad", "Cédula", "Cedula", "Documento"]) || "").trim();
    if (!cedula) continue;

    const emp = await prisma.employee.findFirst({
      where: { cedula },
      select: { id: true },
    });

    if (!emp) {
      noEmployee++;
      continue;
    }

    const total = toNumber(pick(r, ["Total de horas", "Total de horas ", "Total"]));
    const ordinarias = toNumber(pick(r, ["Horas Extra Ordinarias", "Horas Extra Ordinarias (No feriado)", "Ordinarias"]));
    const feriados = toNumber(pick(r, ["Horas Extra Feriados", "Feriados"]));
    const diurnas = toNumber(pick(r, ["Horas Extras Diurnas", "Diurnas"]));
    const nocturnas = toNumber(pick(r, ["Horas Extras Nocturnas", "Nocturnas"]));
    const diurnasF = toNumber(pick(r, ["Horas Diurnas feriado", "Diurnas feriado"]));
    const nocturnasF = toNumber(pick(r, ["Horas Nocturnas Feriado", "Nocturnas feriado"]));

    await prisma.horasExtraMes.upsert({
      where: {
        horas_extra_mes_unique: {
          employeeId: emp.id,
          year,
          month,
        },
      },
      create: {
        employeeId: emp.id,
        year,
        month,
        total: total as any,
        ordinarias: ordinarias as any,
        feriados: feriados as any,
        diurnas: diurnas as any,
        nocturnas: nocturnas as any,
        diurnas_feriado: diurnasF as any,
        nocturnas_feriado: nocturnasF as any,
      },
      update: {
        total: total as any,
        ordinarias: ordinarias as any,
        feriados: feriados as any,
        diurnas: diurnas as any,
        nocturnas: nocturnas as any,
        diurnas_feriado: diurnasF as any,
        nocturnas_feriado: nocturnasF as any,
      },
    });

    upserted++;
  }

  console.log(`✅ HorasExtraMes cargadas para ${year}-${String(month).padStart(2, "0")}. Registros: ${upserted}`);
  console.log(`⚠️ Cédulas sin Employee en horas extra: ${noEmployee}`);
}

async function seedBonosPagoFeb2026() {
  const year = 2026;
  const month = 2;

  // ✅ guardá tu excel de bonos con este nombre en prisma/seed-data/
  const bonosPath = path.join(process.cwd(), "prisma", "seed-data", "Bonos_febrero.xlsx");
  const wbBonos = XLSX.readFile(bonosPath);

  const sheetName = wbBonos.SheetNames[0];
  const ws = wbBonos.Sheets[sheetName];
  if (!ws) throw new Error(`No pude leer la hoja de bonos. Hojas: ${wbBonos.SheetNames.join(", ")}`);

  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Array<Record<string, any>>;

  let upserted = 0;
  let noEmployee = 0;

  for (const r of rows) {
    const cedula = String(pick(r, ["Documento de Identidad", "Cédula", "Cedula", "Documento"]) || "").trim();
    if (!cedula) continue;

    const emp = await prisma.employee.findFirst({
      where: { cedula },
      select: { id: true },
    });

    if (!emp) {
      noEmployee++;
      continue;
    }

    // ✅ Columnas EXACTAS según tu captura
    const productividad = toNumber(pick(r, ["Monto Por Productividad"]));
    const calidad = toNumber(pick(r, ["Monto Por Calidad"]));
    const montoQC = toNumber(pick(r, ["Monto QC"]));
    const validacion = toNumber(pick(r, ["Monto Validación", "Monto Validacion"]));
    const supervision = toNumber(pick(r, ["Supervision", "Supervisión"]));
    const calidadSupervisor = toNumber(pick(r, ["Calidad /Entregas Supervisor", "Calidad/Entregas Supervisor"]));
    const supervisionSIG = toNumber(pick(r, ["Supervision SIG", "Supervisión SIG"]));
    const calidadSIG = toNumber(pick(r, ["Calidad /Entregas SIG", "Calidad/Entregas SIG"]));
    const bonoFijo = toNumber(pick(r, ["Bono Fijo"]));

    const total =
      productividad +
      calidad +
      montoQC +
      validacion +
      supervision +
      calidadSupervisor +
      supervisionSIG +
      calidadSIG +
      bonoFijo;

    // ⚠️ Esto asume que tu modelo Prisma se llama BonosMes y tiene estos campos:
    // productividad, calidad, qc, validacion, supervision, calidad_supervisor, supervision_sig, calidad_sig, bono_fijo, total
    await prisma.bonosMes.upsert({
      where: {
        bonos_mes_unique: {
          employeeId: emp.id,
          year,
          month,
        },
      },
      create: {
        employeeId: emp.id,
        year,
        month,
        productividad: productividad as any,
        calidad: calidad as any,
        qc: montoQC as any,
        validacion: validacion as any,
        supervision: supervision as any,
        calidad_sup: calidadSupervisor as any,
        supervision_sig: supervisionSIG as any,
        calidad_sig: calidadSIG as any,
        bono_fijo: bonoFijo as any,
        total: total as any,
      },
      update: {
        productividad: productividad as any,
        calidad: calidad as any,
        qc: montoQC as any,
        validacion: validacion as any,
        supervision: supervision as any,
        calidad_sup: calidadSupervisor as any,
        supervision_sig: supervisionSIG as any,
        calidad_sig: calidadSIG as any,
        bono_fijo: bonoFijo as any,
        total: total as any,
      },
    });

    upserted++;
  }

  console.log(`✅ BonosMes cargados para ${year}-${String(month).padStart(2, "0")}. Registros: ${upserted}`);
  console.log(`⚠️ Cédulas sin Employee en bonos: ${noEmployee}`);
}

async function main() {
  const usersPath = path.join(process.cwd(), "prisma", "seed-data", "usuarios_login.xlsx");
  const colPath = path.join(process.cwd(), "prisma", "seed-data", "COL.xlsx");

  // ⚠️ Limpieza total (cuidado: borra todo cada seed)
  await prisma.permiso.deleteMany({});
  await prisma.horasExtraMes.deleteMany({});
  await prisma.bonosMes.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});

  // 1) Seed de usuarios desde usuarios_login.xlsx
  const wbUsers = XLSX.readFile(usersPath);
  const wsUsers = wbUsers.Sheets["Usuarios_Login"];
  if (!wsUsers) throw new Error(`No existe la hoja "Usuarios_Login" en usuarios_login.xlsx`);

  const rowsUsers = XLSX.utils.sheet_to_json(wsUsers, { defval: "" }) as Array<Record<string, any>>;

  for (const r of rowsUsers) {
    const username = String(r.username || "").trim().toLowerCase();
    const plainPass = String(r.password || "").trim();
    if (!username || !plainPass) continue;

    const name = String(r.name || username).trim();
    const role = roleFromExcel(r.role);
    const active = activeFromExcel(r.active);

    const hash = await bcrypt.hash(plainPass, 10);

    await prisma.user.upsert({
      where: { username },
      update: { name, role, active, password: hash },
      create: { username, name, role, active, password: hash },
    });
  }

  // 2) Seed de empleados desde COL.xlsx
  const wb = XLSX.readFile(colPath);

  const sheetName = wb.SheetNames.find((n: string) => n.trim() === "Hoja2");
  if (!sheetName) throw new Error(`No existe la hoja "Hoja2". Hojas: ${wb.SheetNames.join(", ")}`);

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Array<Record<string, any>>;

  for (const r of rows) {
    const nombre = pick(r, ["Nombre y Apellido", "Nombre", "Nombre completo"]);
    const cedula = pick(r, ["# documento de identidad(Cédula)", "Cédula", "Cedula", "Documento"]);
    const fechaInicio = pick(r, ["Fecha de inicio contrato", "Fecha inicio", "Inicio contrato"]);

    const emailRaw = pick(r, ["E-mail empresarial", "Email empresarial", "Email", "E-mail", "Correo"]);
    const email = String(emailRaw || "").trim();
    if (!email) continue;

    const vacacionesRaw =
      pick(r, ["Vacaciones al 19-01"]) ||
      pickContains(r, ["vacaciones al 19-01", "vacaciones al 19", "saldo vacaciones", "vacaciones"]);
    const vacaciones = toNumber(vacacionesRaw);

    const puesto = pick(r, ["Puesto", "Cargo"]);
    const supervisor = pick(r, ["Supervisor", "Jefe", "Responsable"]);

    const username = usernameFromEmail(email);
    if (!username) continue;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      const defaultHash = await bcrypt.hash("Telespazio2026", 10);
      await prisma.user.create({
        data: {
          username,
          name: String(nombre || username),
          email,
          role: Role.OPERADOR,
          active: true,
          password: defaultHash,
        },
      });
    } else {
      await prisma.user.update({
        where: { username },
        data: {
          name: existing.name || String(nombre || username),
          email: existing.email || email,
        },
      });
    }

    await prisma.employee.upsert({
      where: { username },
      update: {
        cedula: String(cedula || "").trim(),
        email,
        puesto: String(puesto || "").trim(),
        supervisor: String(supervisor || "").trim(),
        start_date: excelDateToJSDate(fechaInicio),
        vacaciones_saldo: vacaciones as any,
      },
      create: {
        username,
        cedula: String(cedula || "").trim(),
        email,
        puesto: String(puesto || "").trim(),
        supervisor: String(supervisor || "").trim(),
        start_date: excelDateToJSDate(fechaInicio),
        vacaciones_saldo: vacaciones as any,
      },
    });
  }

  // 3) Seed de horas extra (pago Feb-2026)
  await seedHorasExtraPagoFeb2026();

  // 4) Seed de bonos (pago Feb-2026)
  await seedBonosPagoFeb2026();

  console.log("✅ Seed completado: usuarios_login.xlsx + COL.xlsx + Horas_extra_febrero.xlsx + Bonos_febrero.xlsx.");
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
