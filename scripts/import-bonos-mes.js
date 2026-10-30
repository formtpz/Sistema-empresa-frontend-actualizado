// scripts/import-bonos-mes.js
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import path from "path";
import xlsxImport from "xlsx";

const XLSX = xlsxImport.default ?? xlsxImport;
const prisma = new PrismaClient();

function normalizeKey(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[–—]/g, "-");
}

function pick(r, keys) {
  const map = new Map();
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

function toNumber(value) {
  if (value === null || value === undefined || value === "" || value === "-") return 0;
  // limpia: "₡ 31,250.00" -> "31250.00"
  const cleaned = String(value)
    .trim()
    .replace(/₡/g, "")
    .replace(/\s+/g, "")
    .replace(/,/g, "") // miles
    .replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2") // por si viene 31.250,00 estilo
    .replace(",", "."); // decimales
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCedula(v) {
  // deja solo números y guiones, quita espacios raros
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[‐-‒–—]/g, "-");
}

const periodMap = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function parsePeriodo(periodo) {
  const s = String(periodo || "").trim().toLowerCase();
  const parts = s.split(/[-/]/).map((x) => x.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const mTxt = parts[0];
    const y = Number(parts[1]);
    const m = periodMap[mTxt];
    if (Number.isFinite(y) && m) return { year: y, month: m };
  }

  // default: pago Feb-2026 (horas de enero / bonos pagados en febrero)
  return { year: 2026, month: 2 };
}

async function main() {
  const bonosPath = path.join(process.cwd(), "prisma", "seed-data", "Bonos_febrero.xlsx");

  console.log("✅ Iniciando import BonosMes...");
  console.log("📄 Archivo:", bonosPath);

  const wb = XLSX.readFile(bonosPath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  console.log("📄 Hoja:", sheetName);

  if (!ws) throw new Error(`No pude leer la hoja. Hojas: ${wb.SheetNames.join(", ")}`);

  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  console.log("📌 Filas leídas:", rows.length);

  let upserted = 0;
  let noEmployee = 0;

  for (const r of rows) {
    const cedulaRaw = pick(r, ["Documento de Identidad", "Cédula", "Cedula", "Documento"]);
    const cedula = normalizeCedula(cedulaRaw);
    if (!cedula) continue;

    // Intento 1: match exacto
    let emp = await prisma.employee.findFirst({
      where: { cedula },
      select: { id: true, cedula: true },
    });

    // Intento 2: match flexible (por si en DB está con espacios o sin guiones)
    if (!emp) {
      const cedulaDigits = cedula.replace(/-/g, "");
      emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { cedula: { contains: cedula } },
            { cedula: { contains: cedulaDigits } },
          ],
        },
        select: { id: true, cedula: true },
      });
    }

    if (!emp) {
      noEmployee++;
      continue;
    }

    const { year, month } = parsePeriodo(pick(r, ["Periodo", "Período"]));

    // ✅ Columnas EXACTAS de tu excel (F..N)
    const productividad = toNumber(pick(r, ["Monto Por Productividad"]));
    const calidad = toNumber(pick(r, ["Monto Por Calidad"]));
    const qc = toNumber(pick(r, ["Monto QC"]));
    const validacion = toNumber(pick(r, ["Monto Validación", "Monto Validacion"]));
    const supervision = toNumber(pick(r, ["Supervisión", "Supervision"]));
    const calidad_sup = toNumber(pick(r, ["Calidad /Entregas Supervisor", "Calidad/Entregas Supervisor"]));
    const supervision_sig = toNumber(pick(r, ["Supervisión SIG", "Supervision SIG"]));
    const calidad_sig = toNumber(pick(r, ["Calidad /Entregas SIG", "Calidad/Entregas SIG"]));
    const bono_fijo = toNumber(pick(r, ["Bono Fijo"]));

    const totalExcel = toNumber(pick(r, ["Total Bono", "Total"]));
    const totalCalc =
      productividad +
      calidad +
      qc +
      validacion +
      supervision +
      calidad_sup +
      supervision_sig +
      calidad_sig +
      bono_fijo;

    const total = totalExcel > 0 ? totalExcel : totalCalc;

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
        total,
        productividad,
        calidad,
        qc,
        validacion,
        supervision,
        calidad_sup,
        supervision_sig,
        calidad_sig,
        bono_fijo,
      },
      update: {
        total,
        productividad,
        calidad,
        qc,
        validacion,
        supervision,
        calidad_sup,
        supervision_sig,
        calidad_sig,
        bono_fijo,
      },
    });

    upserted++;
  }

  console.log(`✅ BonosMes importados. Registros: ${upserted}`);
  console.log(`⚠️ Cédulas sin Employee: ${noEmployee}`);
}

main()
  .catch((e) => {
    console.error("❌ Error importando bonos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
