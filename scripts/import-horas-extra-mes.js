/* eslint-disable no-console */
const path = require("path");
const xlsx = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function cleanCedula(v) {
  return String(v ?? "").trim();
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith("--file="))?.split("=")[1];
  const year = Number(args.find((a) => a.startsWith("--year="))?.split("=")[1] ?? 2026);
  const month = Number(args.find((a) => a.startsWith("--month="))?.split("=")[1] ?? 2);

  if (!fileArg) {
    console.error('Usá: node scripts/import-horas-extra-mes.js --file="Horas_extra_febrero.xlsx" --year=2026 --month=2');
    process.exit(1);
  }

  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  const wb = xlsx.readFile(filePath);

  // Si no sabés la hoja, toma la primera:
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const rows = xlsx.utils.sheet_to_json(ws, { defval: "" });

  let ok = 0, skippedNoEmployee = 0;

  for (const r of rows) {
    const cedula = cleanCedula(r["Documento de Identidad"] ?? r["Cédula"] ?? r["Cedula"]);
    if (!cedula) continue;

    const emp = await prisma.employee.findFirst({ where: { cedula } });
    if (!emp) {
      skippedNoEmployee++;
      continue;
    }

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

    ok++;
  }

  console.log(`✅ Import listo. Guardados/actualizados: ${ok}`);
  console.log(`⚠️ Cédulas sin Employee: ${skippedNoEmployee}`);
}

main()
  .catch((e) => {
    console.error("❌ Import error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
