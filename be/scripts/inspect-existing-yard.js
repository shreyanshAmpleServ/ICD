const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const locs = await prisma.m_yard_location.findMany();
  console.log('Locations:', locs.map(l => ({ id: l.yard_location_id, code: l.location_code, full: l.full_code, kind: l.location_kind, is_slot: l.is_slot })));
  const visits = await prisma.truck_visit.findMany();
  console.log('Visits:', visits.map(v => ({ id: Number(v.truck_visit_id), visitNo: v.visit_no, status: v.status })));
  const stays = await prisma.unit_stay.findMany({ take: 6 });
  console.log('Stays:', stays.map(s => ({ id: Number(s.unit_stay_id), unitNo: s.unit_stay_id })));
  await prisma.$disconnect();
}

main();

