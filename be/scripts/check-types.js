const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.m_unit_type.findMany({ select: { unit_type_id: true, type_code: true, unit_category: true } });
  console.log('Unit types:', types);
  const existingStays = await prisma.unit_stay.findMany({
    include: { unit_stay_cargo_units: true }
  });
  console.log('Existing stays:', existingStays.map(s => ({
    stayId: Number(s.unit_stay_id),
    unitNo: s.unit_stay_cargo_units?.unit_no,
    category: s.unit_stay_cargo_units?.unit_category
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());

