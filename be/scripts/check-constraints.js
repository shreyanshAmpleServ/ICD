const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function fixSeed() {
  console.log('Inserting missing flag countries...');
  const countries = [
    { country_code: 'PA', country_name: 'Panama' },
    { country_code: 'LR', country_name: 'Liberia' },
    { country_code: 'MT', country_name: 'Malta' },
    { country_code: 'NO', country_name: 'Norway' },
  ];
  for (const c of countries) {
    const exist = await prisma.m_country.findUnique({ where: { country_code: c.country_code } });
    if (!exist) {
      await prisma.m_country.create({
        data: {
          country_code: c.country_code,
          country_name: c.country_name,
          is_active: true,
          createdby: 'SEED',
          log_inst: 1,
        },
      });
      console.log('✓ Added country:', c.country_code);
    }
  }

  // Update T340DRC directly or with Prisma
  try {
    await prisma.$executeRawUnsafe(`UPDATE m_truck SET vehicle_kind = 'CAR_CARRIER' WHERE plate_no = 'T340DRC'`);
    console.log('✓ Updated T340DRC vehicle_kind to CAR_CARRIER');
  } catch (err) {
    console.error('Failed updating T340DRC:', err.message);
  }

  // Update vessels now that countries exist
  const vesselsData = [
    { vessel_name: 'Meridian Star', imo_no: '9701234', call_sign: '3FMS7', flag_country: 'PA', operator_party_id: 4 },
    { vessel_name: 'Ocean Kestrel', imo_no: '9655881', call_sign: 'A8KE2', flag_country: 'LR', operator_party_id: 5 },
    { vessel_name: 'Cape Albatross', imo_no: '9588120', call_sign: '9HAL9', flag_country: 'MT', operator_party_id: 6 },
    { vessel_name: 'Hoegh Tanzanite', imo_no: '9690112', call_sign: 'LAHT5', flag_country: 'NO', operator_party_id: 5 },
    { vessel_name: 'Maersk Mc-Kinney Moller', imo_no: '9619907', call_sign: 'OWET2', flag_country: 'TZ', operator_party_id: 1 },
  ];

  for (const v of vesselsData) {
    const existing = await prisma.m_vessel.findFirst({ where: { imo_no: v.imo_no } });
    if (existing) {
      await prisma.m_vessel.update({
        where: { vessel_id: existing.vessel_id },
        data: {
          vessel_name: v.vessel_name,
          call_sign: v.call_sign,
          flag_country: v.flag_country,
          operator_party_id: v.operator_party_id,
          is_active: true,
          updatedby: 'SEED',
        },
      });
      console.log('✓ Updated vessel:', v.vessel_name);
    } else {
      await prisma.m_vessel.create({
        data: {
          ...v,
          is_active: true,
          createdby: 'SEED',
          log_inst: 1,
        },
      });
      console.log('✓ Created vessel:', v.vessel_name);
    }
  }

  // Update existing ports with proper unlocode / names
  const ports = [
    { unlocode: 'TZDAR', port_name: 'Dar es Salaam', country_code: 'TZ', port_kind: 'SEAPORT' },
    { unlocode: 'TZTGT', port_name: 'Tanga', country_code: 'TZ', port_kind: 'SEAPORT' },
    { unlocode: 'KEMBA', port_name: 'Mombasa', country_code: 'KE', port_kind: 'SEAPORT' },
  ];
  for (const p of ports) {
    const exist = await prisma.m_port.findFirst({ where: { unlocode: p.unlocode } });
    if (exist) {
      await prisma.m_port.update({
        where: { port_id: exist.port_id },
        data: { port_name: p.port_name, country_code: p.country_code, port_kind: p.port_kind, is_active: true },
      });
      console.log('✓ Updated port with unlocode:', p.unlocode);
    }
  }

  console.log('ALL FIXES APPLIED SUCCESSFULLY!');
  await prisma.$disconnect();
}

fixSeed().catch(console.error);
