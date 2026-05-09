require('dotenv').config();
const { prisma } = require("./utils/db");

async function main() {
  console.log("Seeding Roles, Permissions, and Multiple Organisers...");

  const pBuy = await prisma.permission.upsert({ where: { name: 'BUY_TICKETS' }, update: {}, create: { name: 'BUY_TICKETS' } });
  const pCreate = await prisma.permission.upsert({ where: { name: 'CREATE_EVENT' }, update: {}, create: { name: 'CREATE_EVENT' } });
  const pEditOwn = await prisma.permission.upsert({ where: { name: 'EDIT_OWN_EVENT' }, update: {}, create: { name: 'EDIT_OWN_EVENT' } });
  const pManageAll = await prisma.permission.upsert({ where: { name: 'MANAGE_ALL_EVENTS' }, update: {}, create: { name: 'MANAGE_ALL_EVENTS' } });

  const consumerRole = await prisma.role.upsert({
    where: { name: 'CONSUMER' },
    update: {},
    create: { name: 'CONSUMER', permissions: { connect: [{ id: pBuy.id }] } }
  });

  const organiserRole = await prisma.role.upsert({
    where: { name: 'ORGANISER' },
    update: {},
    create: { name: 'ORGANISER', permissions: { connect: [{ id: pCreate.id }, { id: pEditOwn.id }] } }
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'MASTER_ADMIN' },
    update: {},
    create: { name: 'MASTER_ADMIN', permissions: { connect: [{ id: pBuy.id }, { id: pCreate.id }, { id: pEditOwn.id }, { id: pManageAll.id }] } }
  });

  const usersToSeed = [
    { email: 'admin@tiget.com', name: 'Master Admin', roleId: adminRole.id },
    { email: 'john@gmail.com', name: 'John Consumer', roleId: consumerRole.id },
    
    { email: 'untold@tiget.com', name: 'Untold Universe', roleId: organiserRole.id },
    { email: 'ec@tiget.com', name: 'Electric Castle', roleId: organiserRole.id },
    { email: 'tnb@tiget.com', name: 'Teatrul Național', roleId: organiserRole.id },
    { email: 'arena@tiget.com', name: 'Arena Events', roleId: organiserRole.id }
  ];

  for (const user of usersToSeed) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: 'password123' }
    });
  }

  console.log("Database successfully seeded with 4 distinct Organisers!");
}

main().catch(e => console.error(e)).finally(async () => { await prisma.$disconnect(); });