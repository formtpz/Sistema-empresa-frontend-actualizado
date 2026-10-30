/* eslint-disable no-console */
const path = require("path");
const xlsx = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).trim().replace(",", "."); // por si viene 1,5
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function cleanCedula(v) {
  return String(v ?? "").trim();
}

async function seedHorasExtraPagoFeb2026() {
  // ✅ Pagos FEB 2026
  const year = 2026;
  const month = 2;

  // 👉 Poné el excel en: frontend/prisma/seed-data/
  const filePath = path.join(__dirname, "seed-data", "Horas_extra_febrero.xlsx");

  console.log("📄 Leyendo Excel:", filePath);

  const wb = xlsx.readFile(filePath);

  // Si querés forzar una hoja específica, cambiá acá:
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const rows = xlsx.utils.sheet_to_json(ws, { defval: "" });

  let upserted = 0;
  let noEmployee = 0;

  for (const r of rows) {
    const cedula = cleanCedula(r["Documento de Identidad"] ?? r["Cédula"] ?? r["Cedula"]);
    if (!cedula) continue;

    // Buscamos employee por cedula
    const emp = await prisma.employee.findFirst({ where: { cedula } });

    if (!emp) {
      noEmployee++;
      continue;
    }

    // Mapeo flexible (por si hay pequeñas variaciones de encabezados)
    const total = toNumber(r["Total de horas"] ?? r["Total de horas "] ?? r["Total"]);
    const ordinarias = toNumber(r["Horas Extra Ordinarias"] ?? r["Horas Extra Ordinarias (No feriado)"] ?? r["Ordinarias"]);
    const feriados = toNumber(r["Horas Extra Feriados"] ?? r["Feriados"]);
    const diurnas = toNumber(r["Horas Extras Diurnas"] ?? r["Diurnas"]);
    const nocturnas = toNumber(r["Horas Extras Nocturnas"] ?? r["Nocturnas"]);
    const diurnasF = toNumber(r["Horas Diurnas feriado"] ?? r["Diurnas feriado"]);
    const nocturnasF = toNumber(r["Horas Nocturnas Feriado"] ?? r["Nocturnas feriado"]);

    await prisma.horasExtraMes.upsert({
      where: {
        horas_extra_mes_unique: { employeeId: emp.id, year, month },
      },
      create: {
        employeeId: emp.id,
        year,
        month,
        total,
        ordinarias,
        feriados,
        diurnas,
        nocturnas,
        diurnas_feriado: diurnasF,
        nocturnas_feriado: nocturnasF,
      },
      update: {
        total,
        ordinarias,
        feriados,
        diurnas,
        nocturnas,
        diurnas_feriado: diurnasF,
        nocturnas_feriado: nocturnasF,
      },
    });

    upserted++;
  }

  console.log(`✅ HorasExtraMes (Feb-2026) upserts: ${upserted}`);
  console.log(`⚠️ Cédulas sin Employee: ${noEmployee}`);
}

async function main() {
  await seedHorasExtraPagoFeb2026();
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
