const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vt = await prisma.m_visit_type.findMany();
  console.log('Visit types:', vt.map(v => ({ id: v.visit_type_id, code: v.visit_code, name: v.visit_name })));
  await prisma.$disconnect();
}

main();

