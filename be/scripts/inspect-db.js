const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  console.log('--- VESSEL CALLS ---');
  console.log(await prisma.vessel_calls.findMany());
  
  console.log('--- MANIFESTS ---');
  console.log(await prisma.manifests.findMany({ include: { manifest_lines: true } }));
  
  console.log('--- CONSIGNMENTS SAMPLE ---');
  console.log(await prisma.consignments.findMany({ take: 3 }));
  
  console.log('--- UNIT STAYS SAMPLE ---');
  console.log(await prisma.unit_stays.findMany({ take: 3 }));

  console.log('--- HOLDS ---');
  console.log(await prisma.holds.findMany());

  console.log('--- RELEASE ORDERS ---');
  console.log(await prisma.release_orders.findMany());

  console.log('--- CUSTOMS REFS ---');
  console.log(await prisma.customs_refs.findMany());

  console.log('--- CUSTOMS EXAMS ---');
  console.log(await prisma.customs_exams.findMany());

  console.log('--- DG LINES ---');
  console.log(await prisma.dg_lines.findMany());

  await prisma.$disconnect();
}

inspect().catch(e => {
  console.error(e);
  process.exit(1);
});

