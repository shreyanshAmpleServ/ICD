const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSearch(q) {
  console.log(`\n--- Testing Search for "${q}" ---`);
  
  // 1. Cargo Units
  const units = await prisma.cargo_unit.findMany({
    where: {
      OR: [
        { unit_no: { contains: q } },
        { engine_no: { contains: q } },
        { make: { contains: q } },
        { model: { contains: q } },
      ]
    },
    include: {
      cargo_unit_unit_stays: {
        take: 1,
        orderBy: { unit_stay_id: 'desc' }
      }
    },
    take: 5
  });
  console.log('Cargo units:', units.map(u => ({ unit_no: u.unit_no, make: u.make, stayStatus: u.cargo_unit_unit_stays[0]?.status })));

  // 2. Truck Visits
  const visits = await prisma.truck_visit.findMany({
    where: {
      OR: [
        { visit_no: { contains: q } },
        { gate_pass_no: { contains: q } },
        { nomination_ref: { contains: q } },
        { m_truck_truck_visit_truck_idTom_truck: { plate_no: { contains: q } } },
        { m_driver: { driver_name: { contains: q } } }
      ]
    },
    include: {
      m_truck_truck_visit_truck_idTom_truck: true,
      m_driver: true
    },
    take: 5
  });
  console.log('Truck visits:', visits.map(v => ({
    visit_no: v.visit_no,
    plate: v.m_truck_truck_visit_truck_idTom_truck?.plate_no,
    driver: v.m_driver?.driver_name,
    status: v.status
  })));

  // 3. Consignments
  const cons = await prisma.consignment.findMany({
    where: {
      OR: [
        { ref_no: { contains: q } },
        { cargo_description: { contains: q } },
      ]
    },
    take: 5
  });
  console.log('Consignments:', cons.map(c => ({ ref_no: c.ref_no, desc: c.cargo_description })));

  // 4. Parties
  const parties = await prisma.m_party.findMany({
    where: {
      OR: [
        { party_name: { contains: q } },
        { party_code: { contains: q } },
        { tax_id: { contains: q } }
      ]
    },
    take: 5
  });
  console.log('Parties:', parties.map(p => ({ code: p.party_code, name: p.party_name })));

  // 5. Invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      invoice_no: { contains: q }
    },
    take: 5
  });
  console.log('Invoices:', invoices.map(i => ({ invoice_no: i.invoice_no, total: i.total_amount, status: i.status })));
}

async function main() {
  await testSearch('MSKU');
  await testSearch('118');
  await testSearch('Global');
  await testSearch('INV');
  await prisma.$disconnect();
}

main().catch(console.error);
