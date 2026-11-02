const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

function addDays(d, days) {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

async function seed() {
  console.log('Seeding Master Data into Microsoft SQL Server (ICD_New)...');
  const now = new Date();

  // 1. Trucks
  const trucksData = [
    { plate_no: 'T412DKL', plate_display: 'T 412 DKL', transporter_party_id: 7, make_model: 'Scania R460', axle_count: 3, tare_kg: 9200, vehicle_kind: 'TRUCK', country_code: 'TZ', source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-T5001' },
    { plate_no: 'T902DMB', plate_display: 'T 902 DMB', transporter_party_id: 8, make_model: 'Howo A7', axle_count: 3, tare_kg: 9800, vehicle_kind: 'TRUCK', country_code: 'TZ', source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-T5002' },
    { plate_no: 'T118DPE', plate_display: 'T 118 DPE', transporter_party_id: 8, make_model: 'Mercedes Actros 3340', axle_count: 3, tare_kg: 9400, vehicle_kind: 'TRUCK', country_code: 'TZ', source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-T5003' },
    { plate_no: 'T771DGH', plate_display: 'T 771 DGH', transporter_party_id: 7, make_model: 'Volvo FH 440', axle_count: 3, tare_kg: 9100, vehicle_kind: 'TRUCK', country_code: 'TZ', source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-T5004' },
    { plate_no: 'T340DRC', plate_display: 'T 340 DRC', transporter_party_id: 8, make_model: 'MAN TGS car carrier', axle_count: 3, tare_kg: 14500, vehicle_kind: 'CAR_CARRIER', country_code: 'TZ', source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-T5005' },
    { plate_no: 'T655DQA', plate_display: 'T 655 DQA', transporter_party_id: 7, make_model: 'Faw J6P', axle_count: 3, tare_kg: 8800, vehicle_kind: 'TRUCK', country_code: 'TZ', source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-T5006' },
    { plate_no: 'BAK4471', plate_display: 'BAK 4471', transporter_party_id: 9, make_model: 'Scania G410', axle_count: 3, tare_kg: 9300, vehicle_kind: 'TRUCK', country_code: 'ZM', source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-T5107' },
    { plate_no: 'T505DJN', plate_display: 'T 505 DJN', transporter_party_id: 11, make_model: 'Isuzu FVZ', axle_count: 2, tare_kg: 7200, vehicle_kind: 'TRUCK', country_code: 'TZ', source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-T5008' },
    { plate_no: 'T233DSW', plate_display: 'T 233 DSW', transporter_party_id: 7, make_model: 'Howo trailer', axle_count: 0, tare_kg: 6100, vehicle_kind: 'TRAILER', country_code: 'TZ', source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-T5009' },
    { plate_no: 'T880DFF', plate_display: 'T 880 DFF', transporter_party_id: 7, make_model: 'Volvo FMX', axle_count: 3, tare_kg: 9600, vehicle_kind: 'TRUCK', country_code: 'TZ', source: 'LOCAL', sync_status: 'PROVISIONAL', ng_ref_id: null },
  ];

  for (const t of trucksData) {
    try {
      const existing = await prisma.m_truck.findFirst({ where: { plate_no: t.plate_no } });
      if (existing) {
        await prisma.m_truck.update({
          where: { truck_id: existing.truck_id },
          data: {
            plate_display: t.plate_display,
            make_model: t.make_model,
            axle_count: t.axle_count,
            tare_kg: t.tare_kg,
            vehicle_kind: t.vehicle_kind,
            country_code: t.country_code,
            transporter_party_id: t.transporter_party_id,
            source: t.source,
            sync_status: t.sync_status,
            ng_ref_id: t.ng_ref_id,
            is_active: true,
            updatedate: now,
            updatedby: 'SEED',
          },
        });
      } else {
        await prisma.m_truck.create({
          data: {
            ...t,
            is_active: true,
            createdby: 'SEED',
            log_inst: 1,
          },
        });
      }
      console.log('✓ Truck processed:', t.plate_no);
    } catch (err) {
      console.error('Truck failed:', t.plate_no, err.message);
    }
  }

  // 2. Drivers
  const driversData = [
    { driver_name: 'Baraka Mwita', licence_no: '4003218876', licence_class: 'E', licence_expiry: addDays(now, 410), licence_country: 'TZ', phone: '+255 754 112 233', transporter_party_id: 7, source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-D7001' },
    { driver_name: 'Musa Rajabu', licence_no: '4001877120', licence_class: 'E', licence_expiry: addDays(now, 19), licence_country: 'TZ', phone: '+255 755 120 220', transporter_party_id: 8, source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-D7002' },
    { driver_name: 'Said Omari', licence_no: '4002233019', licence_class: 'E', licence_expiry: addDays(now, 260), licence_country: 'TZ', phone: '+255 756 127 231', transporter_party_id: 8, source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-D7003' },
    { driver_name: 'John Massawe', licence_no: '4000981443', licence_class: 'E', licence_expiry: addDays(now, -6), licence_country: 'TZ', phone: '+255 757 134 242', transporter_party_id: 7, source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-D7004' },
    { driver_name: 'Abdul Kombo', licence_no: '4004410255', licence_class: 'E', licence_expiry: addDays(now, 95), licence_country: 'TZ', phone: '+255 758 141 253', transporter_party_id: 8, source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-D7005' },
    { driver_name: 'Hassan Ali', licence_no: '4003390712', licence_class: 'E', licence_expiry: addDays(now, 27), licence_country: 'TZ', phone: '+255 759 148 264', transporter_party_id: 7, source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-D7006' },
    { driver_name: 'Elia Mrema', licence_no: '4002876604', licence_class: 'E', licence_expiry: addDays(now, 530), licence_country: 'TZ', phone: '+255 760 155 275', transporter_party_id: 8, source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-D7007' },
    { driver_name: 'Chanda Mwape', licence_no: 'ZM-1188420', licence_class: 'E', licence_expiry: addDays(now, 140), licence_country: 'ZM', phone: '+260 977 123 456', transporter_party_id: 9, source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-D7008' },
    { driver_name: 'Peter Lyimo', licence_no: '4001120987', licence_class: 'E', licence_expiry: addDays(now, 3), licence_country: 'TZ', phone: '+255 762 169 297', transporter_party_id: 11, source: 'NG', sync_status: 'SYNCED', ng_ref_id: 'NG-D7009' },
    { driver_name: 'Yusuf Bakari', licence_no: '4005512330', licence_class: 'E', licence_expiry: addDays(now, 300), licence_country: 'TZ', phone: '+255 763 176 308', transporter_party_id: 7, source: 'LOCAL', sync_status: 'PROVISIONAL', ng_ref_id: null },
  ];

  for (const d of driversData) {
    try {
      const existing = await prisma.m_driver.findFirst({ where: { licence_no: d.licence_no } });
      if (existing) {
        await prisma.m_driver.update({
          where: { driver_id: existing.driver_id },
          data: {
            driver_name: d.driver_name,
            licence_class: d.licence_class,
            licence_expiry: d.licence_expiry,
            licence_country: d.licence_country,
            phone: d.phone,
            transporter_party_id: d.transporter_party_id,
            source: d.source,
            sync_status: d.sync_status,
            ng_ref_id: d.ng_ref_id,
            is_active: true,
            updatedate: now,
            updatedby: 'SEED',
          },
        });
      } else {
        await prisma.m_driver.create({
          data: {
            ...d,
            is_active: true,
            createdby: 'SEED',
            log_inst: 1,
          },
        });
      }
      console.log('✓ Driver processed:', d.driver_name);
    } catch (err) {
      console.error('Driver failed:', d.driver_name, err.message);
    }
  }

  // 3. Vessels
  const vesselsData = [
    { vessel_name: 'Meridian Star', imo_no: '9701234', call_sign: '3FMS7', flag_country: 'PA', operator_party_id: 4 },
    { vessel_name: 'Ocean Kestrel', imo_no: '9655881', call_sign: 'A8KE2', flag_country: 'LR', operator_party_id: 5 },
    { vessel_name: 'Cape Albatross', imo_no: '9588120', call_sign: '9HAL9', flag_country: 'MT', operator_party_id: 6 },
    { vessel_name: 'Hoegh Tanzanite', imo_no: '9690112', call_sign: 'LAHT5', flag_country: 'NO', operator_party_id: 5 },
    { vessel_name: 'Maersk Mc-Kinney Moller', imo_no: '9619907', call_sign: 'OWET2', flag_country: 'TZ', operator_party_id: 1 },
  ];

  for (const v of vesselsData) {
    try {
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
            updatedate: now,
            updatedby: 'SEED',
          },
        });
      } else {
        await prisma.m_vessel.create({
          data: {
            ...v,
            is_active: true,
            createdby: 'SEED',
            log_inst: 1,
          },
        });
      }
      console.log('✓ Vessel processed:', v.vessel_name);
    } catch (err) {
      console.error('Vessel failed:', v.vessel_name, err.message);
    }
  }

  // 4. Ports
  const portsData = [
    { unlocode: 'TZDAR', port_name: 'Dar es Salaam', country_code: 'TZ', port_kind: 'SEAPORT', is_active: true },
    { unlocode: 'TZTGT', port_name: 'Tanga', country_code: 'TZ', port_kind: 'SEAPORT', is_active: true },
    { unlocode: 'KEMBA', port_name: 'Mombasa', country_code: 'KE', port_kind: 'SEAPORT', is_active: true },
    { unlocode: null, port_name: 'Tunduma border post', country_code: 'TZ', port_kind: 'BORDER', is_active: true },
    { unlocode: null, port_name: 'Rusumo border post', country_code: 'TZ', port_kind: 'BORDER', is_active: true },
    { unlocode: null, port_name: 'Lusaka dry port', country_code: 'ZM', port_kind: 'ICD', is_active: true },
    { unlocode: null, port_name: 'Kwala dry port', country_code: 'TZ', port_kind: 'ICD', is_active: false },
  ];

  for (const p of portsData) {
    try {
      const existing = await prisma.m_port.findFirst({ where: { port_name: p.port_name } });
      if (existing) {
        await prisma.m_port.update({
          where: { port_id: existing.port_id },
          data: {
            unlocode: p.unlocode,
            country_code: p.country_code,
            port_kind: p.port_kind,
            is_active: p.is_active,
            updatedate: now,
            updatedby: 'SEED',
          },
        });
      } else {
        await prisma.m_port.create({
          data: {
            ...p,
            createdby: 'SEED',
            log_inst: 1,
          },
        });
      }
      console.log('✓ Port processed:', p.port_name);
    } catch (err) {
      console.error('Port failed:', p.port_name, err.message);
    }
  }

  // 5. Commodities
  const commoditiesData = [
    { commodity_code: 'TILES', commodity_name: 'Ceramic tiles', hs_code: '6907', is_hazardous: false, is_active: true },
    { commodity_code: 'COFFEE', commodity_name: 'Green coffee', hs_code: '0901', is_hazardous: false, is_active: true },
    { commodity_code: 'COPPER', commodity_name: 'Copper cathodes', hs_code: '7403', is_hazardous: false, is_active: true },
    { commodity_code: 'TOBACCO', commodity_name: 'Flue-cured tobacco', hs_code: '2401', is_hazardous: false, is_active: true },
    { commodity_code: 'PHARMA', commodity_name: 'Essential medicines', hs_code: '3004', is_hazardous: false, is_active: true },
    { commodity_code: 'VEHICLE', commodity_name: 'Passenger vehicles', hs_code: '8703', is_hazardous: false, is_active: true },
    { commodity_code: 'HAZCHEM', commodity_name: 'Industrial solvents', hs_code: '2905', is_hazardous: true, is_active: true },
    { commodity_code: 'SPARES', commodity_name: 'Machinery parts', hs_code: '8431', is_hazardous: false, is_active: true },
  ];

  for (const c of commoditiesData) {
    try {
      const existing = await prisma.m_commodity.findFirst({ where: { commodity_code: c.commodity_code } });
      if (existing) {
        await prisma.m_commodity.update({
          where: { commodity_id: existing.commodity_id },
          data: {
            commodity_name: c.commodity_name,
            hs_code: c.hs_code,
            is_hazardous: c.is_hazardous,
            is_active: c.is_active,
            updatedate: now,
            updatedby: 'SEED',
          },
        });
      } else {
        await prisma.m_commodity.create({
          data: {
            ...c,
            createdby: 'SEED',
            log_inst: 1,
          },
        });
      }
      console.log('✓ Commodity processed:', c.commodity_code);
    } catch (err) {
      console.error('Commodity failed:', c.commodity_code, err.message);
    }
  }

  // 6. Equipment
  const equipmentData = [
    { equipment_code: 'RS-01', equipment_name: 'Reach stacker 1', equipment_type: 'REACH_STACKER', capacity_kg: 45000, site_id: 1, is_active: true },
    { equipment_code: 'RS-02', equipment_name: 'Reach stacker 2', equipment_type: 'REACH_STACKER', capacity_kg: 45000, site_id: 1, is_active: true },
    { equipment_code: 'EH-01', equipment_name: 'Empty handler', equipment_type: 'EMPTY_HANDLER', capacity_kg: 9000, site_id: 1, is_active: true },
    { equipment_code: 'FL-03', equipment_name: 'Forklift 3 t (CFS)', equipment_type: 'FORKLIFT', capacity_kg: 3000, site_id: 1, is_active: true },
    { equipment_code: 'TT-01', equipment_name: 'Terminal tractor', equipment_type: 'TERMINAL_TRACTOR', capacity_kg: 65000, site_id: 1, is_active: true },
    { equipment_code: 'WB-01', equipment_name: 'Weighbridge 80 t', equipment_type: 'WEIGHBRIDGE', capacity_kg: 80000, site_id: 1, is_active: true },
  ];

  for (const e of equipmentData) {
    try {
      const existing = await prisma.m_equipment.findFirst({ where: { equipment_code: e.equipment_code } });
      if (existing) {
        await prisma.m_equipment.update({
          where: { equipment_id: existing.equipment_id },
          data: {
            equipment_name: e.equipment_name,
            equipment_type: e.equipment_type,
            capacity_kg: e.capacity_kg,
            site_id: e.site_id,
            is_active: e.is_active,
            updatedate: now,
            updatedby: 'SEED',
          },
        });
      } else {
        await prisma.m_equipment.create({
          data: {
            ...e,
            createdby: 'SEED',
            log_inst: 1,
          },
        });
      }
      console.log('✓ Equipment processed:', e.equipment_code);
    } catch (err) {
      console.error('Equipment failed:', e.equipment_code, err.message);
    }
  }

  console.log('ALL MASTER DATA SEEDED SUCCESSFULLY!');
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
