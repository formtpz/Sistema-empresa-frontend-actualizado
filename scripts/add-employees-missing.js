import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import path from "path";
import xlsxImport from "xlsx";
import bcrypt from "bcryptjs";

const XLSX = xlsxImport.default ?? xlsxImport;
const prisma = new PrismaClient();

const TARGET = new Set(["1-1642-0612", "3-0550-0233", "5-0426-0876"]);

function normalizeKey(s) {
  return String(s).toLowerCase().trim().replace(/\s+/g, " ").replace(/[–—]/g, "-");
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

function usernameFromCedula(cedula) {
  return `missing_${String(cedula).replace(/[^0-9]/g, "")}`;
}

async function main() {
  console.log("🚀 Iniciando add-employees-missing...");

  const bonosPath = path.join(process.cwd(), "prisma", "seed-data", "Bonos_febrero.xlsx");
  console.log("📄 Excel:", bonosPath);

  const wb = XLSX.readFile(bonosPath);
  const sheetName = wb.SheetNames[0];
  console.log("📄 Hoja:", sheetName);

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  console.log("📌 Filas:", rows.length);

  const found = new Map();

  for (const r of rows) {
    const cedula = normalizeCedula(
      pick(r, ["Documento de Identidad", "Cédula", "Cedula", "Documento"])
    );
    if (TARGET.has(cedula)) found.set(cedula, r);
  }

  console.log("🎯 Encontradas:", Array.from(found.keys()));

  for (const cedula of TARGET) {
    const r = found.get(cedula);

    if (!r) {
      console.log("⚠️ No encontrada en excel:", cedula);
      continue;
    }

    const nombre = String(pick(r, ["Apellido y Nombre"]) || "").trim();
    const supervisor = String(pick(r, ["Supervisor"]) || "").trim();
    const puesto = String(pick(r, ["Puesto"]) || "").trim();

    const username = usernameFromCedula(cedula);

    console.log("👤 Creando:", cedula, "->", username);

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (!existingUser) {
      const hash = await bcrypt.hash("Telespazio2026", 10);

      await prisma.user.create({
        data: {
          username,
          name: nombre || username,
          email: null,
          role: Role.OPERADOR,
          active: false,
          password: hash,
        },
      });
    }

    await prisma.employee.upsert({
      where: { username },
      update: {
        cedula,
        puesto: puesto || null,
        supervisor: supervisor || null,
        vacaciones_saldo: 0,
      },
      create: {
        username,
        cedula,
        email: null,
        puesto: puesto || null,
        supervisor: supervisor || null,
        vacaciones_saldo: 0,
        start_date: null,
      },
    });

    console.log("✅ OK:", cedula);
  }

  console.log("🏁 Listo. Ahora reimportá bonos.");
}

main()
  .catch((e) => console.error("❌ Error:", e))
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Prisma disconnected");
  });
