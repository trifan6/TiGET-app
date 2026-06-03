require('dotenv').config();
const { prisma } = require("./utils/db");

async function main() {
  console.log("\n=========================================");
  console.log("🔐 SECURING EXISTING ACCOUNTS WITH 3FA");
  console.log("=========================================\n");

  // Fetch all users
  const users = await prisma.user.findMany({ include: { role: true } });

  for (const user of users) {
    let currentPin = user.securityPin;

    // If they don't have a PIN, generate one and update the database
    if (!currentPin) {
      currentPin = Math.floor(100000 + Math.random() * 900000).toString();
      await prisma.user.update({
        where: { id: user.id },
        data: { securityPin: currentPin }
      });
      console.log(`✅ [UPDATED] ${user.email.padEnd(20)} | Role: ${user.role.name.padEnd(15)} | PIN: ${currentPin}`);
    } else {
      console.log(`ℹ️  [EXISTING] ${user.email.padEnd(20)} | Role: ${user.role.name.padEnd(15)} | PIN: ${currentPin}`);
    }
  }
  
  console.log("\n✅ All accounts are now secured.");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());