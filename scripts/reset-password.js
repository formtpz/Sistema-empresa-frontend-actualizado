const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  const newPass = process.argv[3];

  console.log("Iniciando reset...");
  console.log("Username:", username);

  if (!username || !newPass) {
    console.log("Uso: node scripts/reset-password.js <username> <nuevaClave>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({ where: { username } });

  if (!user) {
    console.log("❌ Usuario no encontrado:", username);
    process.exit(1);
  }

  console.log("Usuario encontrado. ID:", user.id);

  const hash = await bcrypt.hash(newPass, 10);

  await prisma.user.update({
    where: { username },
    data: { password: hash },
  });

  console.log("✅ Contraseña actualizada con éxito.");
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
