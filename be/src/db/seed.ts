import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

import { seedPortalData } from '../scripts/seed-portal';

dotenv.config();

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Starting full database seed for ICD_New on MSSQL...');

  // 1. Companies & Sites
  let comp = await prisma.companies.findFirst({ where: { company_code: 'DCC' } });
  if (!comp) {
    comp = await prisma.companies.create({
      data: {
        company_code: 'DCC',
        legal_name: 'Depot & Container Control Ltd',
        trading_name: 'DCC Terminal Services',
        country_code: 'TZ',
        country_pack_code: 'TZ_DEFAULT',
        base_currency: 'USD',
        tax_id: 'TAX-TZ-98721',
        vat_no: 'VAT-TZ-55120',
        is_active: true
      }
    });
  }

  const siteDar1 = await prisma.sites.upsert({
    where: { site_code: 'DAR1' },
    update: {},
    create: {
      site_code: 'DAR1',
      site_name: 'Dar es Salaam main yard (Yard 1)',
      company_id: comp.company_id,
      country_code: 'TZ',
      time_zone: 'Africa/Dar_es_Salaam',
      city: 'Dar es Salaam',
      address_line1: 'Bandari Road, Kurasini',
      is_active: true
    }
  });

  const siteDar2 = await prisma.sites.upsert({
    where: { site_code: 'DAR2' },
    update: {},
    create: {
      site_code: 'DAR2',
      site_name: 'Dar es Salaam vehicle yard (Yard 2)',
      company_id: comp.company_id,
      country_code: 'TZ',
      time_zone: 'Africa/Dar_es_Salaam',
      city: 'Dar es Salaam',
      address_line1: 'Nelson Mandela Road',
      is_active: true
    }
  });

  const siteKbh1 = await prisma.sites.upsert({
    where: { site_code: 'KBH1' },
    update: {},
    create: {
      site_code: 'KBH1',
      site_name: 'Kibaha Inland Warehouse & CFS',
      company_id: comp.company_id,
      country_code: 'TZ',
      time_zone: 'Africa/Dar_es_Salaam',
      city: 'Kibaha',
      address_line1: 'Morogoro Road, Kibaha',
      is_active: true
    }
  });

  console.log('✅ Sites seeded: DAR1, DAR2, KBH1');

  // 2. Roles & Permissions
  const adminRole = await prisma.roles.upsert({
    where: { role_code: 'ALL_PERMISSIONS' },
    update: {},
    create: {
      role_code: 'ALL_PERMISSIONS',
      role_name: 'Administrator (All Permissions)',
      description: 'Super-user access to all terminal modules',
      is_system: true,
      is_active: true
    }
  });

  const gateRole = await prisma.roles.upsert({
    where: { role_code: 'GATE_OFFICER' },
    update: {},
    create: {
      role_code: 'GATE_OFFICER',
      role_name: 'Gate Officer',
      description: 'Check-in, weighbridge and lane gate inspection',
      is_system: false,
      is_active: true
    }
  });

  const yardRole = await prisma.roles.upsert({
    where: { role_code: 'YARD_OFFICER' },
    update: {},
    create: {
      role_code: 'YARD_OFFICER',
      role_name: 'Yard Planner / Officer',
      description: 'Yard layout, equipment allocation and moves',
      is_system: false,
      is_active: true
    }
  });

  const perm1 = await prisma.permissions.upsert({
    where: { permission_code: 'admin.site.manage' },
    update: {},
    create: { permission_code: 'admin.site.manage', module: 'admin', description: 'Configure site metadata' }
  });

  const perm2 = await prisma.permissions.upsert({
    where: { permission_code: 'yard.map.view' },
    update: {},
    create: { permission_code: 'yard.map.view', module: 'yard', description: 'View 2D yard map' }
  });

  const perm3 = await prisma.permissions.upsert({
    where: { permission_code: 'gate.visit.process' },
    update: {},
    create: { permission_code: 'gate.visit.process', module: 'gate', description: 'Process truck entry/exit' }
  });

  // 3. Users
  const userAshok = await prisma.users.upsert({
    where: { user_name: 'Ashok Kumar' },
    update: {},
    create: {
      user_sub: 'ng|8101',
      user_name: 'Ashok Kumar',
      email: 'ashok.k@mlimani-icd.example',
      phone: '+255 754 000 111',
      default_site_id: siteDar1.site_id,
      is_active: true
    }
  });

  const userFatma = await prisma.users.upsert({
    where: { user_name: 'Fatma Ally' },
    update: {},
    create: {
      user_sub: 'ng|8102',
      user_name: 'Fatma Ally',
      email: 'fatma.a@mlimani-icd.example',
      phone: '+255 754 000 222',
      default_site_id: siteDar1.site_id,
      is_active: true
    }
  });

  console.log('✅ Users seeded: Ashok Kumar, Fatma Ally');

  // 4. Unit Types & Regimes
  const ut20 = await prisma.unit_types.upsert({
    where: { type_code: '20GP' },
    update: {},
    create: { type_code: '20GP', type_name: '20ft General Purpose', category: 'CONTAINER', length_ft: 20, teu: 1.0, is_reefer: false, is_active: true }
  });

  const ut40 = await prisma.unit_types.upsert({
    where: { type_code: '40HC' },
    update: {},
    create: { type_code: '40HC', type_name: '40ft High Cube', category: 'CONTAINER', length_ft: 40, teu: 2.0, is_reefer: false, is_active: true }
  });

  const ut40Rf = await prisma.unit_types.upsert({
    where: { type_code: '40RF' },
    update: {},
    create: { type_code: '40RF', type_name: '40ft High Cube Reefer', category: 'CONTAINER', length_ft: 40, teu: 2.0, is_reefer: true, is_active: true }
  });

  const regimeImport = await prisma.cargo_regimes.upsert({
    where: { regime_code: 'IMPORT' },
    update: {},
    create: { regime_code: 'IMPORT', regime_name: 'Local Home Consumption (Imports)', requires_customs: true }
  });

  const regimeTransit = await prisma.cargo_regimes.upsert({
    where: { regime_code: 'TRANSIT' },
    update: {},
    create: { regime_code: 'TRANSIT', regime_name: 'Transit Cargo (Uganda / Rwanda / DRC / Zambia)', requires_customs: true }
  });

  const regimeExport = await prisma.cargo_regimes.upsert({
    where: { regime_code: 'EXPORT' },
    update: {},
    create: { regime_code: 'EXPORT', regime_name: 'Outbound Exportation', requires_customs: true }
  });

  // 5. Parties & Masters
  const pMaersk = await prisma.parties.upsert({
    where: { party_code: 'MSK' },
    update: {},
    create: { party_code: 'MSK', party_name: 'Maersk Line Tanzania', short_name: 'Maersk', country_code: 'TZ', credit_status: 'CREDIT', credit_limit: 150000, is_active: true }
  });

  const pCma = await prisma.parties.upsert({
    where: { party_code: 'CMA' },
    update: {},
    create: { party_code: 'CMA', party_name: 'CMA CGM Shipping Agency', short_name: 'CMA CGM', country_code: 'TZ', credit_status: 'CREDIT', credit_limit: 120000, is_active: true }
  });

  const pBollore = await prisma.parties.upsert({
    where: { party_code: 'BOL' },
    update: {},
    create: { party_code: 'BOL', party_name: 'Bolloré Transport & Logistics', short_name: 'Bolloré', country_code: 'TZ', credit_status: 'CREDIT', credit_limit: 200000, is_active: true }
  });

  const pDarTrans = await prisma.parties.upsert({
    where: { party_code: 'DTT' },
    update: {},
    create: { party_code: 'DTT', party_name: 'Dar Trucking Transporters Ltd', short_name: 'DarTrans', country_code: 'TZ', credit_status: 'CASH', is_active: true }
  });

  const pTwiga = await prisma.parties.upsert({
    where: { party_code: 'TWI' },
    update: {},
    create: { party_code: 'TWI', party_name: 'Twiga Minerals Consignee Ltd', short_name: 'Twiga', country_code: 'TZ', credit_status: 'CREDIT', credit_limit: 90000, is_active: true }
  });

  // Trucks & Drivers
  const truck1 = await prisma.trucks.upsert({
    where: { plate_no: 'T 118 DPE' },
    update: {},
    create: { plate_no: 'T 118 DPE', transporter_party_id: pDarTrans.party_id, make_model: 'Scania R500', tare_kg: 8500, is_active: true }
  });

  const truck2 = await prisma.trucks.upsert({
    where: { plate_no: 'T 342 BKN' },
    update: {},
    create: { plate_no: 'T 342 BKN', transporter_party_id: pDarTrans.party_id, make_model: 'Mercedes-Benz Actros', tare_kg: 8900, is_active: true }
  });

  const truck3 = await prisma.trucks.upsert({
    where: { plate_no: 'T 884 DAF' },
    update: {},
    create: { plate_no: 'T 884 DAF', transporter_party_id: pDarTrans.party_id, make_model: 'Volvo FH16', tare_kg: 9100, is_active: true }
  });

  const driver1 = await prisma.drivers.upsert({
    where: { licence_no: 'DL-TZ-99210' },
    update: {},
    create: { driver_name: 'Juma Ramadhani', licence_no: 'DL-TZ-99210', licence_class: 'CE', phone: '+255 712 111 222', transporter_party_id: pDarTrans.party_id, is_active: true }
  });

  const driver2 = await prisma.drivers.upsert({
    where: { licence_no: 'DL-TZ-88401' },
    update: {},
    create: { driver_name: 'Hamisi Bakari', licence_no: 'DL-TZ-88401', licence_class: 'CE', phone: '+255 713 333 444', transporter_party_id: pDarTrans.party_id, is_active: true }
  });

  // Equipment
  const eqRs1 = await prisma.equipment.upsert({
    where: { equipment_code: 'RS-01' },
    update: {},
    create: { equipment_code: 'RS-01', equipment_name: 'Konecranes Reach Stacker 1', equipment_type: 'REACH_STACKER', site_id: siteDar1.site_id, capacity_kg: 45000, is_active: true }
  });

  const eqRs2 = await prisma.equipment.upsert({
    where: { equipment_code: 'RS-02' },
    update: {},
    create: { equipment_code: 'RS-02', equipment_name: 'Kalmar Reach Stacker 2', equipment_type: 'REACH_STACKER', site_id: siteDar1.site_id, capacity_kg: 45000, is_active: true }
  });

  const eqWb1 = await prisma.equipment.upsert({
    where: { equipment_code: 'WB-01' },
    update: {},
    create: { equipment_code: 'WB-01', equipment_name: 'Main Gate Weighbridge 1', equipment_type: 'WEIGHBRIDGE', site_id: siteDar1.site_id, capacity_kg: 80000, is_active: true }
  });

  console.log('✅ Master data seeded: Parties, Trucks, Drivers, Equipment');

  // 6. Yard Blocks & Locations
  const blkA = await prisma.yard_blocks.create({
    data: { site_id: siteDar1.site_id, block_code: 'A', block_name: 'Block A (Import 20ft & 40ft)', max_bays: 12, max_rows: 6, max_tiers: 4 }
  });

  const blkB = await prisma.yard_blocks.create({
    data: { site_id: siteDar1.site_id, block_code: 'B', block_name: 'Block B (Transit Stack)', max_bays: 10, max_rows: 6, max_tiers: 4 }
  });

  const blkR = await prisma.yard_blocks.create({
    data: { site_id: siteDar1.site_id, block_code: 'R', block_name: 'Reefer Yard (Plugs R1-R24)', max_bays: 6, max_rows: 4, max_tiers: 2 }
  });

  const blkX = await prisma.yard_blocks.create({
    data: { site_id: siteDar1.site_id, block_code: 'X', block_name: 'Customs Examination Bay', max_bays: 4, max_rows: 2, max_tiers: 1 }
  });

  const locA01 = await prisma.yard_locations.upsert({
    where: { full_code: 'A-01-01-1' },
    update: {},
    create: { site_id: siteDar1.site_id, yard_block_id: blkA.yard_block_id, location_code: '01-01-1', full_code: 'A-01-01-1', kind: 'SLOT', is_slot: true, is_blocked: false }
  });

  const locA02 = await prisma.yard_locations.upsert({
    where: { full_code: 'A-01-02-1' },
    update: {},
    create: { site_id: siteDar1.site_id, yard_block_id: blkA.yard_block_id, location_code: '01-02-1', full_code: 'A-01-02-1', kind: 'SLOT', is_slot: true, is_blocked: false }
  });

  const locR01 = await prisma.yard_locations.upsert({
    where: { full_code: 'R-01-01-1' },
    update: {},
    create: { site_id: siteDar1.site_id, yard_block_id: blkR.yard_block_id, location_code: '01-01-1', full_code: 'R-01-01-1', kind: 'SLOT', is_slot: true, is_blocked: false }
  });

  const locX01 = await prisma.yard_locations.upsert({
    where: { full_code: 'X-01-01-1' },
    update: {},
    create: { site_id: siteDar1.site_id, yard_block_id: blkX.yard_block_id, location_code: '01-01-1', full_code: 'X-01-01-1', kind: 'SLOT', is_slot: true, is_blocked: false }
  });

  // 7. Consignments & Unit Stays
  const cons1 = await prisma.consignments.upsert({
    where: { ref_no: 'BL-DAR-2026-9901' },
    update: {},
    create: {
      site_id: siteDar1.site_id,
      cargo_regime_id: regimeImport.cargo_regime_id,
      shipping_line_party_id: pMaersk.party_id,
      consignee_party_id: pTwiga.party_id,
      bill_to_party_id: pTwiga.party_id,
      agent_party_id: pBollore.party_id,
      ref_type: 'BL',
      ref_no: 'BL-DAR-2026-9901',
      status: 'OPEN'
    }
  });

  const cons2 = await prisma.consignments.upsert({
    where: { ref_no: 'BL-CMA-2026-4412' },
    update: {},
    create: {
      site_id: siteDar1.site_id,
      cargo_regime_id: regimeTransit.cargo_regime_id,
      shipping_line_party_id: pCma.party_id,
      consignee_party_id: pBollore.party_id,
      bill_to_party_id: pBollore.party_id,
      ref_type: 'BL',
      ref_no: 'BL-CMA-2026-4412',
      status: 'OPEN'
    }
  });

  const stay1 = await prisma.unit_stays.create({
    data: {
      site_id: siteDar1.site_id,
      unit_type_id: ut40.unit_type_id,
      consignment_id: cons1.consignment_id,
      cargo_regime_id: regimeImport.cargo_regime_id,
      yard_location_id: locA01.yard_location_id,
      unit_no: 'MSKU 882014 9',
      flow: 'IMPORT',
      full_empty: 'F',
      physical_status: 'IN_YARD',
      customs_status: 'CLEARED',
      release_status: 'READY',
      billing_status: 'PAID',
      seal_no: 'ML-TZ-98214',
      gross_weight_kg: 28400.00
    }
  });

  const stay2 = await prisma.unit_stays.create({
    data: {
      site_id: siteDar1.site_id,
      unit_type_id: ut20.unit_type_id,
      consignment_id: cons1.consignment_id,
      cargo_regime_id: regimeImport.cargo_regime_id,
      yard_location_id: locA02.yard_location_id,
      unit_no: 'TCLU 551902 4',
      flow: 'IMPORT',
      full_empty: 'F',
      physical_status: 'IN_YARD',
      customs_status: 'UNDER_EXAM',
      release_status: 'BLOCKED',
      billing_status: 'ACCRUING',
      seal_no: 'TC-TZ-11029',
      gross_weight_kg: 21800.00
    }
  });

  const stay3 = await prisma.unit_stays.create({
    data: {
      site_id: siteDar1.site_id,
      unit_type_id: ut40Rf.unit_type_id,
      consignment_id: cons2.consignment_id,
      cargo_regime_id: regimeTransit.cargo_regime_id,
      yard_location_id: locR01.yard_location_id,
      unit_no: 'CMAU 773120 1',
      flow: 'TRANSIT',
      full_empty: 'F',
      physical_status: 'IN_YARD',
      customs_status: 'LODGED',
      release_status: 'PENDING_CHARGES',
      billing_status: 'ACCRUING',
      seal_no: 'CMA-994102',
      gross_weight_kg: 30200.00
    }
  });

  console.log('✅ Unit stays created in yard: MSKU 882014 9, TCLU 551902 4, CMAU 773120 1');

  // 8. Gates & Checkpoints & Visit Types
  const gate1 = await prisma.gates.upsert({
    where: { gate_code: 'G-MAIN' },
    update: {},
    create: { site_id: siteDar1.site_id, gate_code: 'G-MAIN', gate_name: 'Main Terminal Gate', gate_kind: 'OUTER', is_active: true }
  });

  const lane1 = await prisma.gate_lanes.create({
    data: { gate_id: gate1.gate_id, lane_code: 'Lane 1 In', direction: 'IN', is_active: true }
  });

  const lane2 = await prisma.gate_lanes.create({
    data: { gate_id: gate1.gate_id, lane_code: 'Lane 2 Out', direction: 'OUT', is_active: true }
  });

  const cpOuterIn = await prisma.checkpoints.upsert({
    where: { checkpoint_code: 'CP-OUTER-IN' },
    update: {},
    create: { gate_id: gate1.gate_id, checkpoint_code: 'CP-OUTER-IN', checkpoint_name: 'Outer Gate Entry Checkpoint', checkpoint_kind: 'OUTER_IN', is_active: true }
  });

  const cpWeighIn = await prisma.checkpoints.upsert({
    where: { checkpoint_code: 'CP-WEIGH-IN' },
    update: {},
    create: { gate_id: gate1.gate_id, checkpoint_code: 'CP-WEIGH-IN', checkpoint_name: 'Weighbridge Inbound Scale', checkpoint_kind: 'WEIGH_IN', is_active: true }
  });

  const vtDrop = await prisma.visit_types.upsert({
    where: { visit_code: 'DROP_OFF' },
    update: {},
    create: { visit_code: 'DROP_OFF', visit_name: 'Export / Empty Return Drop-off', requires_appointment: true, is_active: true }
  });

  const vtPick = await prisma.visit_types.upsert({
    where: { visit_code: 'PICK_UP' },
    update: {},
    create: { visit_code: 'PICK_UP', visit_name: 'Import Delivery Pick-up', requires_appointment: true, is_active: true }
  });

  // 9. Truck Visits & Queue
  const visit1 = await prisma.truck_visits.upsert({
    where: { visit_no: 'V-2026-001091' },
    update: {},
    create: {
      site_id: siteDar1.site_id,
      visit_no: 'V-2026-001091',
      visit_type_id: vtPick.visit_type_id,
      truck_id: truck1.truck_id,
      driver_id: driver1.driver_id,
      transporter_party_id: pDarTrans.party_id,
      gate_id: gate1.gate_id,
      gate_lane_id: lane1.gate_lane_id,
      status: 'ADMITTED',
      arrived_at: new Date(Date.now() - 45 * 60000)
    }
  });

  await prisma.truck_visit_units.create({
    data: {
      truck_visit_id: visit1.truck_visit_id,
      unit_stay_id: stay1.unit_stay_id,
      direction: 'PICK',
      status: 'IN_PROGRESS',
      truck_position: 'SINGLE',
      seal_no: 'ML-TZ-98214'
    }
  });

  const visit2 = await prisma.truck_visits.upsert({
    where: { visit_no: 'V-2026-001092' },
    update: {},
    create: {
      site_id: siteDar1.site_id,
      visit_no: 'V-2026-001092',
      visit_type_id: vtDrop.visit_type_id,
      truck_id: truck2.truck_id,
      driver_id: driver2.driver_id,
      transporter_party_id: pDarTrans.party_id,
      gate_id: gate1.gate_id,
      gate_lane_id: lane1.gate_lane_id,
      status: 'AT_OUTER_GATE',
      arrived_at: new Date(Date.now() - 15 * 60000)
    }
  });

  console.log('✅ Gate visits created: V-2026-001091, V-2026-001092');

  // 10. Yard Moves & Work Orders
  const move1 = await prisma.yard_moves.create({
    data: {
      site_id: siteDar1.site_id,
      unit_stay_id: stay1.unit_stay_id,
      from_location_id: locA01.yard_location_id,
      to_location_id: locX01.yard_location_id,
      operator_user_id: userAshok.user_id,
      equipment_id: eqRs1.equipment_id,
      move_type: 'CUSTOMS_SHUTTLE',
      status: 'COMPLETED',
      ordered_at: new Date(Date.now() - 120 * 60000),
      executed_at: new Date(Date.now() - 95 * 60000)
    }
  });

  const move2 = await prisma.yard_moves.create({
    data: {
      site_id: siteDar1.site_id,
      unit_stay_id: stay2.unit_stay_id,
      from_location_id: locA02.yard_location_id,
      to_location_id: locX01.yard_location_id,
      operator_user_id: userAshok.user_id,
      equipment_id: eqRs2.equipment_id,
      move_type: 'YARD_REHANDLE',
      status: 'IN_PROGRESS',
      ordered_at: new Date(Date.now() - 30 * 60000),
      executed_at: new Date()
    }
  });

  console.log('✅ Yard moves created: 2 move orders');

  // 11. Weighings & Inspections
  await prisma.weighing_tickets.create({
    data: {
      site_id: siteDar1.site_id,
      truck_visit_id: visit1.truck_visit_id,
      gross_weight_kg: 37300.00,
      tare_weight_kg: 8500.00,
      net_weight_kg: 28800.00,
      weighed_at: new Date(Date.now() - 35 * 60000),
      status: 'COMPLETED'
    }
  });

  const insp1 = await prisma.inspections.create({
    data: {
      site_id: siteDar1.site_id,
      unit_stay_id: stay1.unit_stay_id,
      inspector_user_id: userAshok.user_id,
      inspection_type: 'GATE_IN',
      condition_status: 'SOUND',
      inspected_at: new Date(Date.now() - 40 * 60000),
      status: 'COMPLETED'
    }
  });

  await prisma.inspection_findings.create({
    data: {
      inspection_id: insp1.inspection_id,
      area: 'EXTERIOR',
      severity: 'LOW',
      damage_code: 'SCRATCH',
      remarks: 'Minor paint scratch right side panel'
    }
  });

  // 12. Holds & Approvals & Exceptions
  await prisma.holds.create({
    data: {
      unit_stay_id: stay2.unit_stay_id,
      placed_by_user_id: userAshok.user_id,
      hold_type: 'CUSTOMS',
      reason: 'Physical examination ordered by TRA officer',
      status: 'ACTIVE',
      placed_at: new Date(Date.now() - 180 * 60000)
    }
  });

  await prisma.approval_requests.upsert({
    where: { request_no: 'APR-2026-00441' },
    update: {},
    create: {
      site_id: siteDar1.site_id,
      requested_by_user_id: userAshok.user_id,
      request_no: 'APR-2026-00441',
      permission_code: 'billing.charge.waive',
      entity_name: 'billable_charges',
      entity_id: 1,
      requested_amount: 140.00,
      currency: 'USD',
      status: 'PENDING',
      requested_at: new Date(Date.now() - 60 * 60000)
    }
  });

  const exc1 = await prisma.exception_cases.upsert({
    where: { case_no: 'EXC-2026-00712' },
    update: {},
    create: {
      site_id: siteDar1.site_id,
      case_no: 'EXC-2026-00712',
      truck_visit_id: visit2.truck_visit_id,
      unit_stay_id: stay2.unit_stay_id,
      assigned_to_user_id: userAshok.user_id,
      category: 'GATE_CHECK_MISMATCH',
      severity: 'HIGH',
      status: 'OPEN',
      opened_at: new Date(Date.now() - 25 * 60000)
    }
  });

  await prisma.exception_comments.create({
    data: {
      exception_case_id: exc1.exception_case_id,
      user_id: userAshok.user_id,
      comment_text: 'Seal number discrepancy noted on interchange document.'
    }
  });

  // 13. Billing & Invoices
  const charge1 = await prisma.billable_charges.create({
    data: {
      site_id: siteDar1.site_id,
      consignment_id: cons1.consignment_id,
      bill_to_party_id: pTwiga.party_id,
      unit_stay_id: stay1.unit_stay_id,
      charge_code: 'STORAGE_DEMURRAGE',
      charge_name: 'Container Yard Storage (Day 1-4)',
      quantity: 4.00,
      unit_price: 35.00,
      amount: 140.00,
      currency: 'USD',
      status: 'BILLED'
    }
  });

  const inv1 = await prisma.invoices.upsert({
    where: { invoice_no: 'INV-2026-003318' },
    update: {},
    create: {
      site_id: siteDar1.site_id,
      consignment_id: cons1.consignment_id,
      bill_to_party_id: pTwiga.party_id,
      invoice_no: 'INV-2026-003318',
      invoice_type: 'COMMERCIAL',
      status: 'PAID',
      currency: 'USD',
      subtotal: 140.00,
      tax_amount: 25.20,
      total_amount: 165.20
    }
  });

  await prisma.invoice_lines.create({
    data: {
      invoice_id: inv1.invoice_id,
      charge_id: charge1.charge_id,
      unit_stay_id: stay1.unit_stay_id,
      line_no: 1,
      description: 'Storage charge for MSKU 882014 9',
      quantity: 4.00,
      unit_price: 35.00,
      amount: 140.00
    }
  });

  // 14. Depth M5: Appointments, Handling Jobs, Reefers, Repairs
  const appt1 = await prisma.appointments.upsert({
    where: { appointment_no: 'APT-2026-004410' },
    update: {},
    create: {
      site_id: siteDar1.site_id,
      visit_type_id: vtPick.visit_type_id,
      transporter_party_id: pDarTrans.party_id,
      appointment_no: 'APT-2026-004410',
      truck_plate: 'T 118 DPE',
      slot_start: new Date(Date.now() - 60 * 60000),
      slot_end: new Date(Date.now() + 60 * 60000),
      status: 'ARRIVED'
    }
  });

  const job1 = await prisma.handling_jobs.create({
    data: {
      site_id: siteDar1.site_id,
      unit_stay_id: stay2.unit_stay_id,
      job_type: 'CFS_DESTUFFING',
      status: 'IN_PROGRESS',
      started_at: new Date(Date.now() - 50 * 60000)
    }
  });

  await prisma.handling_job_lines.create({
    data: {
      handling_job_id: job1.handling_job_id,
      line_no: 1,
      package_count: 450,
      uom: 'CARTONS',
      cargo_description: 'Industrial pump components & spare seals'
    }
  });

  const reefer1 = await prisma.reefer_sessions.create({
    data: {
      site_id: siteDar1.site_id,
      unit_stay_id: stay3.unit_stay_id,
      plug_code: 'R-01',
      plugged_at: new Date(Date.now() - 360 * 60000),
      target_temp_c: -18.00,
      status: 'ACTIVE'
    }
  });

  await prisma.reefer_readings.create({
    data: {
      reefer_session_id: reefer1.reefer_session_id,
      set_temp_c: -18.00,
      supply_temp_c: -17.90,
      return_temp_c: -17.40,
      power_kw: 4.80,
      recorded_at: new Date()
    }
  });

  const repair1 = await prisma.repair_estimates.create({
    data: {
      unit_stay_id: stay2.unit_stay_id,
      party_id: pMaersk.party_id,
      total_hours: 3.5,
      total_amount: 280.00,
      status: 'APPROVED'
    }
  });

  // 15. Notifications / Inbox
  await prisma.notifications.create({
    data: {
      site_id: siteDar1.site_id,
      user_id: userAshok.user_id,
      event_type: 'GATE_HOLD',
      title: 'Gate Hold Placed on Truck T 342 BKN',
      message: 'Exception case EXC-2026-00712 opened due to seal mismatch at Outer In.',
      is_read: false
    }
  });

  await prisma.notifications.create({
    data: {
      site_id: siteDar1.site_id,
      user_id: userAshok.user_id,
      event_type: 'APPROVAL_REQUIRED',
      title: 'Demurrage Waiver Request APR-2026-00441',
      message: 'Waiver request of USD 140.00 submitted for container MSKU 882014 9.',
      is_read: false
    }
  });

  // 16. Customer Portal Data Seed
  await seedPortalData();

  console.log('🎉 Full database seeding finished successfully! All tables seeded in MSSQL ICD_New.');
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
