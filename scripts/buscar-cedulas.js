import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cedulas = ["1-1642-0612", "3-0550-0233", "5-0426-0876"];

function digitsOnly(s) {
  return String(s).replace(/[^0-9]/g, "");
}

async function main() {
  console.log("✅ Iniciando búsqueda de cédulas...");

  for (const c of cedulas) {
    const d = digitsOnly(c);

    const exact = await prisma.employee.findFirst({
      where: { cedula: c },
      select: { id: true, username: true, cedula: true, email: true },
    });

    const contains = await prisma.employee.findFirst({
      where: {
        OR: [{ cedula: { contains: c } }, { cedula: { contains: d } }],
      },
      select: { id: true, username: true, cedula: true, email: true },
    });

    console.log("\n🔎 Cédula:", c);
    console.log("Exact:", exact);
    console.log("Contains:", contains);
  }

  console.log("\n✅ Terminado.");
}

main()
  .catch((e) => console.error("❌ Error:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
