const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log({
    trucks: await prisma.m_truck.count(),
    drivers: await prisma.m_driver.count(),
    visitTypes: await prisma.m_visit_type.count(),
    equipment: await prisma.m_equipment.count(),
    yardLocations: await prisma.m_yard_location.count(),
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());

