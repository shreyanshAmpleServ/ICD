const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stays = await prisma.unit_stay.findMany({
    include: { unit_stay_cargo_units: true }
  });
  console.log('Unit Stays Count:', stays.length);
  console.log(stays.map(s => ({
    id: Number(s.unit_stay_id),
    unit_no: s.unit_stay_cargo_units?.unit_no,
    category: s.unit_stay_cargo_units?.category,
    status: s.physical_status,
    flow: s.flow,
    location_id: s.current_location_id
  })));

  const visits = await prisma.truck_visit.findMany();
  console.log('Truck visits count:', visits.length);

  const locs = await prisma.m_yard_location.findMany();
  console.log('Locations count:', locs.length);

  const parties = await prisma.m_party.findMany({ select: { party_id: true, party_name: true, party_code: true } });
  console.log('Parties count:', parties.length, parties.slice(0, 10));

  const sites = await prisma.m_site.findMany({ select: { site_id: true, site_name: true, site_code: true } });
  console.log('Sites:', sites);
}

main().catch(console.error).finally(() => prisma.$disconnect());

