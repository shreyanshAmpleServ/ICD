const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('--- SEEDING SETUP / MASTERS ---');

  // 1. Ports
  const ports = [
    { unlocode: 'TZDAR', port_name: 'Port of Dar es Salaam', country_code: 'TZ', port_kind: 'SEAPORT' },
    { unlocode: 'TZTGT', port_name: 'Port of Tanga', country_code: 'TZ', port_kind: 'SEAPORT' },
    { unlocode: 'KEMBA', port_name: 'Port of Mombasa', country_code: 'KE', port_kind: 'SEAPORT' },
    { unlocode: 'TZTUN', port_name: 'Tunduma Border Post', country_code: 'TZ', port_kind: 'BORDER' },
    { unlocode: 'CDKAS', port_name: 'Kasumbalesa Border Post', country_code: 'CD', port_kind: 'BORDER' },
  ];

  for (const p of ports) {
    const existing = await prisma.m_port.findFirst({ where: { port_name: p.port_name } });
    if (!existing) {
      await prisma.m_port.create({
        data: {
          unlocode: p.unlocode,
          port_name: p.port_name,
          country_code: p.country_code,
          port_kind: p.port_kind,
          is_active: true,
          createdby: 'system',
        },
      });
      console.log(`Port created: ${p.port_name}`);
    }
  }

  // 2. Commodities
  const commodities = [
    { commodity_code: 'TILES', commodity_name: 'Ceramic tiles', hs_code: '6907.21', is_hazardous: false },
    { commodity_code: 'COFFEE', commodity_name: 'Green coffee beans', hs_code: '0901.11', is_hazardous: false },
    { commodity_code: 'CU_CABLE', commodity_name: 'Copper cable & wire', hs_code: '7413.00', is_hazardous: false },
    { commodity_code: 'PHARMA', commodity_name: 'Pharmaceutical products', hs_code: '3004.90', is_hazardous: false },
    { commodity_code: 'LUBE_OIL', commodity_name: 'Lubricating oils', hs_code: '2710.19', is_hazardous: true },
    { commodity_code: 'VEHICLES', commodity_name: 'Motor vehicles (passenger)', hs_code: '8703.23', is_hazardous: false },
    { commodity_code: 'CEMENT', commodity_name: 'Portland cement (bulk)', hs_code: '2523.29', is_hazardous: false },
    { commodity_code: 'TEA', commodity_name: 'Black tea (bulk bags)', hs_code: '0902.40', is_hazardous: false },
  ];

  for (const c of commodities) {
    const existing = await prisma.m_commodity.findUnique({ where: { commodity_code: c.commodity_code } });
    if (!existing) {
      await prisma.m_commodity.create({
        data: {
          commodity_code: c.commodity_code,
          commodity_name: c.commodity_name,
          hs_code: c.hs_code,
          is_hazardous: c.is_hazardous,
          is_active: true,
          createdby: 'system',
        },
      });
      console.log(`Commodity created: ${c.commodity_code}`);
    }
  }

  // 3. Equipment
  const equipment = [
    { equipment_code: 'RS-01', equipment_name: 'Reach stacker 1', equipment_type: 'REACH_STACKER', capacity_kg: 45000 },
    { equipment_code: 'RS-02', equipment_name: 'Reach stacker 2', equipment_type: 'REACH_STACKER', capacity_kg: 45000 },
    { equipment_code: 'EH-01', equipment_name: 'Empty handler 1', equipment_type: 'EMPTY_HANDLER', capacity_kg: 9000 },
    { equipment_code: 'FL-01', equipment_name: 'Heavy forklift 16T', equipment_type: 'FORKLIFT', capacity_kg: 16000 },
    { equipment_code: 'TT-01', equipment_name: 'Terminal tractor 1', equipment_type: 'TERMINAL_TRACTOR', capacity_kg: 65000 },
    { equipment_code: 'WB-01', equipment_name: 'Inbound weighbridge 80T', equipment_type: 'WEIGHBRIDGE', capacity_kg: 80000 },
  ];

  for (const eq of equipment) {
    const existing = await prisma.m_equipment.findFirst({
      where: { site_id: 1, equipment_code: eq.equipment_code },
    });
    if (!existing) {
      await prisma.m_equipment.create({
        data: {
          site_id: 1,
          equipment_code: eq.equipment_code,
          equipment_name: eq.equipment_name,
          equipment_type: eq.equipment_type,
          capacity_kg: eq.capacity_kg,
          is_active: true,
          createdby: 'system',
        },
      });
      console.log(`Equipment created: ${eq.equipment_code}`);
    }
  }

  // 4. Trucks
  const trucks = [
    { plate_no: 'T412DKL', plate_display: 'T 412 DKL', transporter_party_id: 7, country_code: 'TZ', make_model: 'Scania R460', axle_count: 3, tare_kg: 9200, vehicle_kind: 'TRUCK' },
    { plate_no: 'T902DMB', plate_display: 'T 902 DMB', transporter_party_id: 8, country_code: 'TZ', make_model: 'Howo A7', axle_count: 3, tare_kg: 9800, vehicle_kind: 'TRUCK' },
    { plate_no: 'T118DPE', plate_display: 'T 118 DPE', transporter_party_id: 8, country_code: 'TZ', make_model: 'Mercedes Actros 3340', axle_count: 3, tare_kg: 9400, vehicle_kind: 'TRUCK' },
    { plate_no: 'T771DGH', plate_display: 'T 771 DGH', transporter_party_id: 7, country_code: 'TZ', make_model: 'Volvo FH 440', axle_count: 3, tare_kg: 9100, vehicle_kind: 'TRUCK' },
    { plate_no: 'T340DRC', plate_display: 'T 340 DRC', transporter_party_id: 8, country_code: 'TZ', make_model: 'MAN TGS car carrier', axle_count: 3, tare_kg: 14500, vehicle_kind: 'TRUCK' },
    { plate_no: 'T655DQA', plate_display: 'T 655 DQA', transporter_party_id: 7, country_code: 'TZ', make_model: 'Faw J6P', axle_count: 3, tare_kg: 8800, vehicle_kind: 'TRUCK' },
    { plate_no: 'BAK4471', plate_display: 'BAK 4471', transporter_party_id: 9, country_code: 'ZM', make_model: 'Scania G410', axle_count: 3, tare_kg: 9300, vehicle_kind: 'TRUCK' },
    { plate_no: 'KDA233M', plate_display: 'KDA 233M', transporter_party_id: 8, country_code: 'KE', make_model: 'Isuzu Giga', axle_count: 3, tare_kg: 8900, vehicle_kind: 'TRUCK' },
    { plate_no: 'T552DEF', plate_display: 'T 552 DEF', transporter_party_id: 7, country_code: 'TZ', make_model: 'Sino 371', axle_count: 3, tare_kg: 9500, vehicle_kind: 'TRUCK' },
    { plate_no: 'T820CYK', plate_display: 'T 820 CYK', transporter_party_id: 8, country_code: 'TZ', make_model: 'Actros 2640', axle_count: 3, tare_kg: 9100, vehicle_kind: 'TRUCK' },
  ];

  for (const tr of trucks) {
    const existing = await prisma.m_truck.findUnique({ where: { plate_no: tr.plate_no } });
    if (!existing) {
      await prisma.m_truck.create({
        data: {
          plate_no: tr.plate_no,
          plate_display: tr.plate_display,
          transporter_party_id: tr.transporter_party_id,
          country_code: tr.country_code,
          make_model: tr.make_model,
          axle_count: tr.axle_count,
          tare_kg: tr.tare_kg,
          vehicle_kind: tr.vehicle_kind,
          source: 'LOCAL',
          sync_status: 'SYNCED',
          is_active: true,
          createdby: 'system',
        },
      });
      console.log(`Truck created: ${tr.plate_display}`);
    }
  }

  // 5. Drivers
  const drivers = [
    { driver_name: 'Baraka Mwita', licence_no: '4003218876', licence_country: 'TZ', licence_class: 'CLASS_E', licence_expiry: new Date('2027-11-15'), transporter_party_id: 7, phone: '+255 754 112233' },
    { driver_name: 'Musa Rajabu', licence_no: '4001877120', licence_country: 'TZ', licence_class: 'CLASS_E', licence_expiry: new Date('2026-11-18'), transporter_party_id: 8, phone: '+255 713 445566' },
    { driver_name: 'Said Omari', licence_no: '4002233019', licence_country: 'TZ', licence_class: 'CLASS_E', licence_expiry: new Date('2027-06-20'), transporter_party_id: 8, phone: '+255 784 778899' },
    { driver_name: 'John Massawe', licence_no: '4000981443', licence_country: 'TZ', licence_class: 'CLASS_E', licence_expiry: new Date('2026-09-24'), transporter_party_id: 7, phone: '+255 768 223344' },
    { driver_name: 'Abdul Kombo', licence_no: '4004410255', licence_country: 'TZ', licence_class: 'CLASS_E', licence_expiry: new Date('2027-02-05'), transporter_party_id: 8, phone: '+255 655 889900' },
    { driver_name: 'Hassan Ali', licence_no: '4003390712', licence_country: 'TZ', licence_class: 'CLASS_E', licence_expiry: new Date('2026-11-26'), transporter_party_id: 7, phone: '+255 712 334455' },
    { driver_name: 'Elia Mrema', licence_no: '4002876604', licence_country: 'TZ', licence_class: 'CLASS_E', licence_expiry: new Date('2028-03-15'), transporter_party_id: 8, phone: '+255 759 667788' },
    { driver_name: 'Chanda Mwape', licence_no: 'ZM-1188420', licence_country: 'ZM', licence_class: 'CLASS_CE', licence_expiry: new Date('2027-03-20'), transporter_party_id: 9, phone: '+260 977 123456' },
  ];

  for (const dr of drivers) {
    const existing = await prisma.m_driver.findFirst({
      where: { licence_country: dr.licence_country, licence_no: dr.licence_no },
    });
    if (!existing) {
      await prisma.m_driver.create({
        data: {
          driver_name: dr.driver_name,
          licence_no: dr.licence_no,
          licence_country: dr.licence_country,
          licence_class: dr.licence_class,
          licence_expiry: dr.licence_expiry,
          transporter_party_id: dr.transporter_party_id,
          phone: dr.phone,
          source: 'LOCAL',
          sync_status: 'SYNCED',
          is_active: true,
          createdby: 'system',
        },
      });
      console.log(`Driver created: ${dr.driver_name}`);
    }
  }

  // 6. Vessels
  const vessels = [
    { vessel_name: 'Meridian Star', imo_no: '9701234', call_sign: '3FMS7', operator_party_id: 1 },
    { vessel_name: 'Ocean Kestrel', imo_no: '9655881', call_sign: 'A8KE2', operator_party_id: 2 },
    { vessel_name: 'Cape Albatross', imo_no: '9588120', call_sign: '9HAL9', operator_party_id: 3 },
    { vessel_name: 'Hoegh Tanzanite', imo_no: '9690112', call_sign: 'LAHT5', operator_party_id: 1 },
  ];

  for (const v of vessels) {
    const existing = await prisma.m_vessel.findFirst({ where: { vessel_name: v.vessel_name } });
    if (!existing) {
      await prisma.m_vessel.create({
        data: {
          vessel_name: v.vessel_name,
          imo_no: v.imo_no,
          call_sign: v.call_sign,
          operator_party_id: v.operator_party_id,
          is_active: true,
          createdby: 'system',
        },
      });
      console.log(`Vessel created: ${v.vessel_name}`);
    }
  }

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

seed().finally(() => prisma.$disconnect());
