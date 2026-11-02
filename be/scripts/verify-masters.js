const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('m_truck count:', await prisma.m_truck.count());
  console.log('m_driver count:', await prisma.m_driver.count());
  console.log('m_vessel count:', await prisma.m_vessel.count());
  console.log('m_port count:', await prisma.m_port.count());
  console.log('m_commodity count:', await prisma.m_commodity.count());
  console.log('m_equipment count:', await prisma.m_equipment.count());
  await prisma.$disconnect();
}

check().catch(console.error);

