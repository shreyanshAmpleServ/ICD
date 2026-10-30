require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const counts = {
    vessel_calls: await prisma.vessel_calls.count(),
    manifests: await prisma.manifests.count(),
    manifest_lines: await prisma.manifest_lines.count(),
    consignments: await prisma.consignments.count(),
    consignment_lines: await prisma.consignment_lines.count(),
    cargo_units: await prisma.cargo_units.count(),
    unit_stays: await prisma.unit_stays.count(),
    holds: await prisma.holds.count(),
    release_orders: await prisma.release_orders.count(),
    customs_refs: await prisma.customs_refs.count(),
    customs_exams: await prisma.customs_exams.count(),
    dg_lines: await prisma.dg_lines.count(),
  };
  console.log('COUNTS:', JSON.stringify(counts, null, 2));
  await prisma.$disconnect();
}

check().catch(e => {
  console.error('Error checking counts:', e);
  process.exit(1);
});
