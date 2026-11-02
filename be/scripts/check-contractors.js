const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contractors = await prisma.labour_contractor.findMany();
  console.log('Contractors:', contractors.map(c => ({ id: c.labour_contractor_id, name: c.contractor_name })));
  const stays = await prisma.unit_stay.findMany({
    take: 5,
    include: { unit_stay_cargo_units: true }
  });
  console.log('Stays:', stays.map(s => ({ id: Number(s.unit_stay_id), unitNo: s.unit_stay_cargo_units?.unit_no })));
  await prisma.$disconnect();
}

main();

