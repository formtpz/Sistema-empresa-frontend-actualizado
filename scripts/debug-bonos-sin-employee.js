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
    if (realKey) return r[realKey];
  }
  return "";
}

function normalizeCedula(v) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[‐-‒–—]/g, "-");
}

async function main() {
  console.log("✅ Debug Bonos sin employee iniciado...");

  const bonosPath = path.join(process.cwd(), "prisma", "seed-data", "Bonos_febrero.xlsx");
  console.log("📄 Archivo:", bonosPath);

  const wb = XLSX.readFile(bonosPath);
  const sheetName = wb.SheetNames[0];
  console.log("📄 Hoja:", sheetName);

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  console.log("📌 Filas leídas:", rows.length);

  const missing = new Set();

  for (const r of rows) {
    const cedula = normalizeCedula(pick(r, ["Documento de Identidad", "Cédula", "Cedula", "Documento"]));
    if (!cedula) continue;

    const emp = await prisma.employee.findFirst({
      where: { cedula },
      select: { id: true },
    });

    if (!emp) missing.add(cedula);
  }

  console.log("🚫 Cédulas sin Employee:", Array.from(missing));
}

main()
  .catch((e) => console.error("❌ Error:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
