const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Operations data: CFS, Reefers, Repairs, Inspections, Weighbridge...');

  // 1. Repair Codes
  const repairCodes = [
    { repair_code: 'STR-DT', repair_name: 'Straighten dent', default_labour_hours: 1.5 },
    { repair_code: 'PAT-WLD', repair_name: 'Patch weld, steel insert', default_labour_hours: 2.5 },
    { repair_code: 'FLR-PLY', repair_name: 'Replace floor plywood (per board)', default_labour_hours: 3.0 },
    { repair_code: 'DR-GSK', repair_name: 'Replace door gasket', default_labour_hours: 1.0 },
    { repair_code: 'LB-STR', repair_name: 'Straighten locking bar', default_labour_hours: 0.8 },
    { repair_code: 'CR-WLD', repair_name: 'Corner post weld and straighten', default_labour_hours: 4.0 },
    { repair_code: 'RF-PAT', repair_name: 'Roof patch', default_labour_hours: 2.0 },
    { repair_code: 'CLN-WSH', repair_name: 'Sweep and wash inside', default_labour_hours: 0.5 },
    { repair_code: 'PNT-TCH', repair_name: 'Paint touch-up', default_labour_hours: 0.5 },
    { repair_code: 'LBL-REM', repair_name: 'Remove old labels and placards', default_labour_hours: 0.3 },
  ];

  for (const rc of repairCodes) {
    const existing = await prisma.m_repair_code.findUnique({ where: { repair_code: rc.repair_code } });
    if (!existing) {
      await prisma.m_repair_code.create({
        data: {
          repair_code: rc.repair_code,
          repair_name: rc.repair_name,
          default_labour_hours: rc.default_labour_hours,
          is_active: true,
          createdby: 'system',
        },
      });
    }
  }
  console.log('Repair codes ensured.');

  // 2. Damage Codes
  const damageCodes = [
    { damage_code: 'DT', damage_name: 'Dent', applies_to: 'ANY' },
    { damage_code: 'HO', damage_name: 'Hole', applies_to: 'CONTAINER' },
    { damage_code: 'BR', damage_name: 'Broken', applies_to: 'ANY' },
    { damage_code: 'CU', damage_name: 'Cut or tear', applies_to: 'ANY' },
    { damage_code: 'BT', damage_name: 'Bent', applies_to: 'CONTAINER' },
    { damage_code: 'CR', damage_name: 'Corroded', applies_to: 'CONTAINER' },
    { damage_code: 'MS', damage_name: 'Missing', applies_to: 'ANY' },
    { damage_code: 'LO', damage_name: 'Loose', applies_to: 'ANY' },
    { damage_code: 'SC', damage_name: 'Scratch', applies_to: 'VEHICLE' },
    { damage_code: 'CK', damage_name: 'Cracked glass', applies_to: 'VEHICLE' },
    { damage_code: 'PT', damage_name: 'Paint damage', applies_to: 'VEHICLE' },
    { damage_code: 'DY', damage_name: 'Dirty or contaminated', applies_to: 'CONTAINER' },
  ];

  for (const dc of damageCodes) {
    const existing = await prisma.m_damage_code.findFirst({ where: { damage_code: dc.damage_code } });
    if (!existing) {
      await prisma.m_damage_code.create({
        data: {
          damage_code: dc.damage_code,
          damage_name: dc.damage_name,
          applies_to: dc.applies_to,
          createdby: 'system',
        },
      });
    }
  }
  console.log('Damage codes ensured.');

  // 3. Labour Contractors
  const contractorsData = [
    { site_id: 1, contractor_name: 'Umoja Labour Group', rate_basis: 'PER_PACKAGE', rate: 0.35, currency: 'USD' },
    { site_id: 1, contractor_name: 'Bandari Casuals Cooperative', rate_basis: 'PER_TONNE', rate: 2.80, currency: 'USD' },
    { site_id: 1, contractor_name: 'Mwenge Handling Crew', rate_basis: 'PER_JOB', rate: 120.00, currency: 'USD' },
  ];

  const contractorMap = {};
  for (const c of contractorsData) {
    let contractor = await prisma.labour_contractor.findFirst({ where: { contractor_name: c.contractor_name } });
    if (!contractor) {
      contractor = await prisma.labour_contractor.create({
        data: {
          site_id: c.site_id,
          contractor_name: c.contractor_name,
          rate_basis: c.rate_basis,
          rate: c.rate,
          currency: c.currency,
          is_active: true,
          createdby: 'system',
        },
      });
    }
    contractorMap[c.contractor_name] = contractor.labour_contractor_id;
  }
  console.log('Labour contractors ensured:', contractorMap);

  // 4. Ensure Truck Visits
  const visitType = await prisma.m_visit_type.findFirst();
  const visitTypeId = visitType?.visit_type_id || 1;
  const truck = await prisma.m_truck.findFirst();
  const truckId = truck?.truck_id || 1;
  const driver = await prisma.m_driver.findFirst();
  const driverId = driver?.driver_id || 1;

  const visitData = [
    { visit_no: 'TV-26-04410', status: 'ADMITTED', plate_no: 'T 902 DMB', driver_name: 'Hamisi J.' },
    { visit_no: 'TV-26-04411', status: 'ADMITTED', plate_no: 'T 412 DKL', driver_name: 'Baraka Mwita' },
    { visit_no: 'TV-26-04412', status: 'ADMITTED', plate_no: 'T 118 DPE', driver_name: 'Said Omari' },
    { visit_no: 'TV-26-04413', status: 'ADMITTED', plate_no: 'T 771 DGH', driver_name: 'John Massawe' },
    { visit_no: 'TV-26-04414', status: 'ADMITTED', plate_no: 'T 230 DLX', driver_name: 'Elia Mrema' },
    { visit_no: 'TV-26-04415', status: 'ANNOUNCED', plate_no: 'T 655 DQA', driver_name: 'Hassan Ali' },
    { visit_no: 'TV-26-04416', status: 'ADMITTED', plate_no: 'T 340 DRC', driver_name: 'Abdul Kombo' },
  ];

  const visitMap = {};
  for (const vd of visitData) {
    let visit = await prisma.truck_visit.findFirst({ where: { visit_no: vd.visit_no } });
    if (!visit) {
      visit = await prisma.truck_visit.create({
        data: {
          site_id: 1,
          visit_no: vd.visit_no,
          visit_type_id: visitTypeId,
          conveyance: 'TRUCK',
          truck_id: truckId,
          driver_id: driverId,
          status: vd.status,
          expected_from: new Date(),
          arrived_at: new Date(),
          admitted_at: new Date(),
          createdby: 'system',
        },
      });
    }
    visitMap[vd.visit_no] = visit.truck_visit_id;
  }
  console.log('Truck visits ensured.');

  // 5. Ensure Cargo Units & Unit Stays
  const stayConfigs = [
    { unitNo: 'MSKU8820149', category: 'CONTAINER', typeId: 8, temp: -18.0, desc: 'Frozen Fish', loc: 1 },
    { unitNo: 'CMAU7712031', category: 'CONTAINER', typeId: 2, temp: 4.0, desc: 'Fresh Fruit', loc: 2 },
    { unitNo: 'MEDU9920144', category: 'CONTAINER', typeId: 8, temp: -20.0, desc: 'Frozen Meat', loc: 3 },
    { unitNo: 'MSKU4021178', category: 'CONTAINER', typeId: 7, temp: null, desc: 'General Cargo', loc: 4 },
    { unitNo: 'SCLU2910441', category: 'CONTAINER', typeId: 1, temp: null, desc: 'Empty return', loc: 5 },
    { unitNo: 'MEDU8840123', category: 'CONTAINER', typeId: 6, temp: null, desc: 'Empty return', loc: 6 },
    { unitNo: 'LOT-SOL-001', category: 'LOT', typeId: 23, temp: null, desc: 'Crates of solar panels', loc: 7 },
    { unitNo: 'LOT-KIT-002', category: 'LOT', typeId: 20, temp: null, desc: 'Cartons of kitchenware', loc: 8 },
    { unitNo: 'LOT-AQU-003', category: 'LOT', typeId: 21, temp: null, desc: 'Pallets of bottled water', loc: 9 },
    { unitNo: 'LOT-COF-004', category: 'LOT', typeId: 22, temp: null, desc: 'Bags of green coffee', loc: 10 },
    { unitNo: 'KM8JM123456789012', category: 'VEHICLE', typeId: 13, temp: null, desc: 'Toyota Land Cruiser', loc: 11 },
  ];

  const stayIds = [];
  for (const sc of stayConfigs) {
    let cu = await prisma.cargo_unit.findFirst({ where: { unit_no: sc.unitNo } });
    if (!cu) {
      cu = await prisma.cargo_unit.create({
        data: {
          unit_no: sc.unitNo,
          unit_category: sc.category,
          unit_type_id: sc.typeId,
          createdby: 'system',
        },
      });
    }

    let us = await prisma.unit_stay.findFirst({ where: { cargo_unit_id: cu.cargo_unit_id } });
    if (!us) {
      us = await prisma.unit_stay.create({
        data: {
          site_id: 1,
          cargo_unit_id: cu.cargo_unit_id,
          cargo_regime_id: 1,
          flow: sc.desc.includes('Empty') ? 'EMPTY_RETURN' : 'IMPORT',
          full_empty: sc.desc.includes('Empty') ? 'E' : 'F',
          physical_status: 'IN_YARD',
          customs_status: 'CLEARED',
          billing_status: 'PAID',
          release_status: 'APPROVED',
          condition_status: 'SOUND',
          current_location_id: sc.loc,
          cargo_description: sc.desc,
          reefer_set_temp_c: sc.temp,
          createdby: 'system',
        },
      });
    }
    stayIds.push(us.unit_stay_id);
  }
  console.log(`Unit stays ensured: ${stayIds.length} operational stays.`);

  // 6. Seed CFS Handling Jobs
  const cfsJobs = [
    {
      job_no: 'CFS-DAR1-26-2201',
      job_kind: 'DESTUFF',
      container_stay_id: stayIds[3],
      status: 'COMPLETED',
      planned_at: new Date(Date.now() - 3600000 * 6),
      started_at: new Date(Date.now() - 3600000 * 5),
      completed_at: new Date(Date.now() - 3600000 * 3),
      labour_contractor_id: contractorMap['Umoja Labour Group'],
      labour_count: 8,
      equipment_id: 1,
      customs_officer_name: 'Rehema K. (TRA)',
      remarks: 'Four cartons short on line 2. Two pallets of water wrapped but crushed.',
      lines: [
        { line_no: 1, marks_numbers: 'MZ/SOL/1-60', description: 'Crates of solar panels', package_type: 'CRATE', packages_declared: 60, packages_counted: 60, short_qty: 0, excess_qty: 0, damaged_qty: 0, weight_kg: 3120, lot_stay_id: stayIds[6] },
        { line_no: 2, marks_numbers: 'MZ/KIT/1-240', description: 'Cartons of kitchenware', package_type: 'CARTON', packages_declared: 240, packages_counted: 236, short_qty: 4, excess_qty: 0, damaged_qty: 0, weight_kg: 2860, lot_stay_id: stayIds[7] },
        { line_no: 3, marks_numbers: 'AQUA/DSM/1-20', description: 'Pallets of bottled water', package_type: 'PALLET', packages_declared: 20, packages_counted: 20, short_qty: 0, excess_qty: 0, damaged_qty: 2, damage_note: 'Shrink wrap torn, 30 bottles crushed', weight_kg: 18200, lot_stay_id: stayIds[8] },
        { line_no: 4, marks_numbers: 'NO MARKS', description: 'Spare parts (unmanifested)', package_type: 'CARTON', packages_declared: 0, packages_counted: 3, short_qty: 0, excess_qty: 3, damaged_qty: 0, weight_kg: 45 },
      ],
    },
    {
      job_no: 'CFS-DAR1-26-2202',
      job_kind: 'DESTUFF',
      container_stay_id: stayIds[0],
      status: 'IN_PROGRESS',
      planned_at: new Date(Date.now() - 3600000 * 2),
      started_at: new Date(Date.now() - 3600000),
      labour_contractor_id: contractorMap['Bandari Casuals Cooperative'],
      labour_count: 6,
      equipment_id: 2,
      customs_officer_name: 'Rehema K. (TRA)',
      lines: [
        { line_no: 1, marks_numbers: 'MZ/SOL/61-120', description: 'Crates of solar panels', package_type: 'CRATE', packages_declared: 60, packages_counted: 41, short_qty: 0, excess_qty: 0, damaged_qty: 0, lot_stay_id: stayIds[6] },
        { line_no: 2, marks_numbers: 'PW/HW/1-90', description: 'Cartons of hand tools', package_type: 'CARTON', packages_declared: 90, packages_counted: 0, short_qty: 0, excess_qty: 0, damaged_qty: 0 },
      ],
    },
    {
      job_no: 'CFS-DAR1-26-2203',
      job_kind: 'STUFF',
      container_stay_id: stayIds[1],
      status: 'PLANNED',
      planned_at: new Date(Date.now() + 3600000 * 3),
      labour_contractor_id: contractorMap['Mwenge Handling Crew'],
      labour_count: 10,
      equipment_id: 1,
      remarks: 'Stuff 320 bags of green coffee for Cape Albatross 318N. VGM after stuffing.',
      lines: [
        { line_no: 1, marks_numbers: 'NYOTA/AA/1-320', description: 'Green coffee beans, 60 kg jute bags', package_type: 'BAG', packages_declared: 320, packages_counted: 0, short_qty: 0, excess_qty: 0, damaged_qty: 0, weight_kg: 19200 },
      ],
    },
    {
      job_no: 'CFS-DAR1-26-2204',
      job_kind: 'STUFF',
      container_stay_id: stayIds[2],
      status: 'APPROVED',
      planned_at: new Date(Date.now() - 3600000 * 28),
      started_at: new Date(Date.now() - 3600000 * 27),
      completed_at: new Date(Date.now() - 3600000 * 24),
      labour_contractor_id: contractorMap['Mwenge Handling Crew'],
      labour_count: 10,
      equipment_id: 2,
      seal_applied: 'SCL-0448712',
      lines: [
        { line_no: 1, marks_numbers: 'NYOTA/AB/1-320', description: 'Green coffee beans, 60 kg jute bags', package_type: 'BAG', packages_declared: 320, packages_counted: 320, short_qty: 0, excess_qty: 0, damaged_qty: 0, weight_kg: 19200 },
      ],
    },
    {
      job_no: 'CFS-DAR1-26-2205',
      job_kind: 'DESTUFF',
      container_stay_id: stayIds[4],
      status: 'PLANNED',
      planned_at: new Date(Date.now() + 3600000 * 20),
      labour_contractor_id: contractorMap['Umoja Labour Group'],
      labour_count: 8,
      lines: [
        { line_no: 1, marks_numbers: 'MZ/MIX/1-150', description: 'Mixed cartons', package_type: 'CARTON', packages_declared: 150, packages_counted: 0, short_qty: 0, excess_qty: 0, damaged_qty: 0 },
      ],
    },
  ];

  for (const j of cfsJobs) {
    const existing = await prisma.handling_job.findFirst({ where: { job_no: j.job_no } });
    if (!existing) {
      await prisma.handling_job.create({
        data: {
          site_id: 1,
          job_no: j.job_no,
          job_kind: j.job_kind,
          container_stay_id: j.container_stay_id,
          status: j.status,
          planned_at: j.planned_at,
          started_at: j.started_at,
          completed_at: j.completed_at,
          supervisor_sub: 'Halima S.',
          labour_contractor_id: j.labour_contractor_id,
          labour_count: j.labour_count,
          equipment_id: j.equipment_id,
          seal_removed: j.seal_removed,
          seal_applied: j.seal_applied,
          customs_officer_name: j.customs_officer_name,
          remarks: j.remarks,
          createdby: 'system',
          handling_job_lines: {
            create: j.lines.map((l) => ({
              line_no: l.line_no,
              marks_numbers: l.marks_numbers,
              description: l.description,
              package_type: l.package_type,
              packages_declared: l.packages_declared,
              packages_counted: l.packages_counted,
              short_qty: l.short_qty,
              excess_qty: l.excess_qty,
              damaged_qty: l.damaged_qty,
              damage_note: l.damage_note,
              weight_kg: l.weight_kg,
              lot_stay_id: l.lot_stay_id,
              createdby: 'system',
            })),
          },
        },
      });
    }
  }
  console.log('CFS handling jobs ensured.');

  // 7. Seed Reefer Sessions & Readings
  const reeferConfigs = [
    { stayId: stayIds[0], plugId: 1, temp: -18.0, hours: 48, alarm: 'HIGH_TEMP' },
    { stayId: stayIds[1], plugId: 2, temp: 4.0, hours: 24, alarm: null },
    { stayId: stayIds[2], plugId: 3, temp: -20.0, hours: 72, alarm: 'POWER_OFF' },
  ];

  for (const rc of reeferConfigs) {
    const existing = await prisma.reefer_session.findFirst({ where: { unit_stay_id: rc.stayId } });
    if (!existing) {
      const pluggedAt = new Date(Date.now() - 3600000 * rc.hours);
      const readings = [];
      for (let h = 0; h < 6; h++) {
        const readAt = new Date(pluggedAt.getTime() + 3600000 * (h * 4));
        let supply = rc.temp;
        if (rc.alarm === 'HIGH_TEMP' && h >= 4) supply += 4.5;
        if (rc.alarm === 'POWER_OFF' && h >= 4) supply += 2.8;
        readings.push({
          read_at: readAt,
          supply_temp_c: supply,
          return_temp_c: supply + 1.2,
          set_temp_c: rc.temp,
          power_on: rc.alarm === 'POWER_OFF' && h >= 4 ? false : true,
          alarm_code: rc.alarm && h >= 4 ? (rc.alarm === 'HIGH_TEMP' ? 'AL-HIGH' : 'AL-POWER') : null,
          source: h % 2 === 0 ? 'MANUAL' : 'IOT',
          is_out_of_range: Math.abs(supply - rc.temp) > 2,
          createdby: 'system',
        });
      }

      await prisma.reefer_session.create({
        data: {
          unit_stay_id: rc.stayId,
          plug_location_id: rc.plugId,
          set_temp_c: rc.temp,
          plugged_at: pluggedAt,
          meter_start_kwh: 12400.0,
          meter_end_kwh: 12400.0 + parseFloat((rc.hours * 2.8).toFixed(1)),
          plugged_by_sub: 'tech.ali',
          createdby: 'system',
          reefer_session_readings: {
            create: readings,
          },
        },
      });
    }
  }
  console.log('Reefer sessions and readings ensured.');

  // 8. Seed Repair Estimates
  const estimates = [
    {
      estimate_no: 'EST-26-0410',
      stayId: stayIds[4],
      status: 'DRAFT',
      partyId: 1,
      lines: [
        { line_no: 1, repair_code: 'STR-DT', loc: 'Front end', qty: 1, hours: 1.5, lab: 27, mat: 0, resp: 'OWNER', status: 'PROPOSED' },
        { line_no: 2, repair_code: 'PNT-TCH', loc: 'Front end', qty: 1, hours: 0.5, lab: 9, mat: 12, resp: 'OWNER', status: 'PROPOSED' },
      ],
    },
    {
      estimate_no: 'EST-26-0411',
      stayId: stayIds[5],
      status: 'SENT',
      partyId: 2,
      lines: [
        { line_no: 1, repair_code: 'DR-GSK', loc: 'Right door', qty: 1, hours: 1.0, lab: 18, mat: 64, resp: 'OWNER', status: 'PROPOSED' },
        { line_no: 2, repair_code: 'LB-STR', loc: 'Left door, bar 2', qty: 1, hours: 0.8, lab: 14.4, mat: 0, resp: 'USER', status: 'PROPOSED' },
      ],
    },
    {
      estimate_no: 'EST-26-0412',
      stayId: stayIds[4],
      status: 'APPROVED',
      partyId: 1,
      lines: [
        { line_no: 1, repair_code: 'PAT-WLD', loc: 'Left side, panel 3', qty: 1, hours: 2.5, lab: 45, mat: 85, resp: 'USER', status: 'APPROVED' },
        { line_no: 2, repair_code: 'FLR-PLY', loc: 'Floor, door end', qty: 2, hours: 6.0, lab: 108, mat: 140, resp: 'OWNER', status: 'APPROVED' },
        { line_no: 3, repair_code: 'CLN-WSH', loc: 'Inside', qty: 1, hours: 0.5, lab: 9, mat: 6, resp: 'DEPOT', status: 'APPROVED' },
      ],
    },
    {
      estimate_no: 'EST-26-0413',
      stayId: stayIds[5],
      status: 'PARTIAL',
      partyId: 2,
      lines: [
        { line_no: 1, repair_code: 'RF-PAT', loc: 'Roof over door header', qty: 1, hours: 2.0, lab: 36, mat: 70, resp: 'OWNER', status: 'REJECTED' },
        { line_no: 2, repair_code: 'CR-WLD', loc: 'Rear right corner post', qty: 1, hours: 4.0, lab: 72, mat: 120, resp: 'USER', status: 'APPROVED' },
        { line_no: 3, repair_code: 'PNT-TCH', loc: 'Roof', qty: 1, hours: 0.5, lab: 9, mat: 15, resp: 'OWNER', status: 'APPROVED' },
      ],
    },
    {
      estimate_no: 'EST-26-0414',
      stayId: stayIds[3],
      status: 'COMPLETED',
      partyId: 1,
      lines: [
        { line_no: 1, repair_code: 'CLN-WSH', loc: 'Inside', qty: 1, hours: 0.5, lab: 9, mat: 6, resp: 'USER', status: 'DONE' },
        { line_no: 2, repair_code: 'LBL-REM', loc: 'Both sides', qty: 4, hours: 1.2, lab: 21.6, mat: 0, resp: 'USER', status: 'DONE' },
      ],
    },
  ];

  for (const est of estimates) {
    const existing = await prisma.repair_estimate.findFirst({ where: { estimate_no: est.estimate_no } });
    if (!existing) {
      const totLab = est.lines.reduce((a, l) => a + l.lab, 0);
      const totMat = est.lines.reduce((a, l) => a + l.mat, 0);
      await prisma.repair_estimate.create({
        data: {
          site_id: 1,
          estimate_no: est.estimate_no,
          unit_stay_id: est.stayId,
          approver_party_id: est.partyId,
          currency: 'USD',
          labour_rate: 18.0,
          total_labour: totLab,
          total_material: totMat,
          status: est.status,
          sent_at: est.status !== 'DRAFT' ? new Date(Date.now() - 3600000 * 48) : null,
          approver_ref: ['APPROVED', 'PARTIAL', 'COMPLETED'].includes(est.status) ? `APP-REF-${est.estimate_no}` : null,
          decided_at: ['APPROVED', 'PARTIAL', 'COMPLETED'].includes(est.status) ? new Date(Date.now() - 3600000 * 24) : null,
          completed_at: est.status === 'COMPLETED' ? new Date(Date.now() - 3600000 * 6) : null,
          createdby: 'system',
          repair_estimate_lines: {
            create: est.lines.map((l) => ({
              line_no: l.line_no,
              repair_code: l.repair_code,
              location_detail: l.loc,
              quantity: l.qty,
              labour_hours: l.hours,
              labour_cost: l.lab,
              material_cost: l.mat,
              responsibility: l.resp,
              line_status: l.status,
              createdby: 'system',
            })),
          },
        },
      });
    }
  }
  console.log('Repair estimates ensured.');

  // 9. Seed Inspections
  const inspData = [
    {
      stayId: stayIds[3],
      templateId: 1,
      kind: 'GATE_IN',
      status: 'COMPLETED',
      cond: 'MAJOR_DAMAGE',
      remarks: 'Puncture through side panel near bay 3. Unit kept on hold.',
      findings: [
        { area: 'WALLS', codeId: 2, sev: 'MAJOR', loc: 'Left side', size: '18 × 6', desc: 'Puncture through the side panel near bay 3' },
        { area: 'FLOOR', codeId: 5, sev: 'MAJOR', loc: 'Floor', size: '40 × 15', desc: 'Plywood board split at door end' },
      ],
    },
    {
      stayId: stayIds[0],
      templateId: 1,
      kind: 'GATE_IN',
      status: 'IN_PROGRESS',
      truckVisitId: visitMap['TV-26-04410'],
      remarks: 'Seal inspection underway.',
      findings: [],
    },
    {
      stayId: stayIds[1],
      templateId: 1,
      kind: 'EXAM',
      status: 'PENDING',
      remarks: 'Joint customs exam at X-01.',
      findings: [],
    },
    {
      stayId: stayIds[2],
      templateId: 2,
      kind: 'GATE_OUT',
      status: 'COMPLETED',
      cond: 'SOUND',
      remarks: 'Clean sound condition on gate out.',
      findings: [],
    },
    {
      stayId: stayIds[10], // Vehicle
      templateId: 3,
      kind: 'GATE_IN',
      status: 'COMPLETED',
      cond: 'MINOR_DAMAGE',
      odo: 84213,
      fuel: '1/4',
      bat: true,
      effects: 'Child seat in the back, umbrella in boot',
      remarks: 'Minor scratches along rear left door.',
      findings: [
        { area: 'EXTERIOR', codeId: 14, sev: 'MINOR', loc: 'Left side', size: '40', desc: 'Scratch along rear left door' },
      ],
    },
  ];

  for (const ins of inspData) {
    const existing = await prisma.inspection.findFirst({ where: { unit_stay_id: ins.stayId, inspection_kind: ins.kind } });
    if (!existing) {
      await prisma.inspection.create({
        data: {
          unit_stay_id: ins.stayId,
          inspection_template_id: ins.templateId,
          inspection_kind: ins.kind,
          truck_visit_id: ins.truckVisitId,
          status: ins.status,
          overall_condition: ins.cond,
          odometer_km: ins.odo,
          fuel_level: ins.fuel,
          battery_ok: ins.bat,
          personal_effects: ins.effects,
          remarks: ins.remarks,
          started_at: new Date(Date.now() - 3600000 * 4),
          completed_at: ins.status === 'COMPLETED' ? new Date(Date.now() - 3600000 * 2) : null,
          inspector_sub: 'Juma M.',
          createdby: 'system',
          inspection_finding: {
            create: ins.findings.map((f) => ({
              area: f.area,
              damage_code_id: f.codeId,
              severity: f.sev,
              location_detail: f.loc,
              size_cm: f.size,
              description: f.desc,
              needs_repair: f.sev !== 'MINOR',
              createdby: 'system',
            })),
          },
        },
      });
    }
  }
  console.log('Inspections ensured.');

  // 10. Seed Weighbridge Tickets
  const weighings = [
    { ticket_no: 'WT-DAR1-26-5531', kind: 'IN', visitId: visitMap['TV-26-04413'], stayId: stayIds[4], gross: 19840, tare: 15600, net: 4240, source: 'DEVICE', ref: 'WB-01', tol: true },
    { ticket_no: 'WT-DAR1-26-5530', kind: 'OUT', visitId: visitMap['TV-26-04412'], stayId: stayIds[0], gross: 31260, tare: 15800, net: 15460, declared: 14200, variance: 8.9, source: 'DEVICE', ref: 'WB-01', tol: false },
    { ticket_no: 'WT-DAR1-26-5529', kind: 'OUT', visitId: visitMap['TV-26-04414'], stayId: stayIds[1], gross: 36420, tare: 15900, net: 20520, declared: 20100, variance: 2.1, source: 'DEVICE', ref: 'WB-01', tol: true },
    { ticket_no: 'WT-DAR1-26-5528', kind: 'IN', visitId: visitMap['TV-26-04410'], stayId: stayIds[3], gross: 38150, tare: 15400, net: 22750, declared: 22400, variance: 1.6, source: 'DEVICE', ref: 'WB-01', tol: true },
    { ticket_no: 'WT-DAR1-26-5527', kind: 'VGM', stayId: stayIds[2], gross: 41720, tare: 15500, ctrTare: 3750, declared: 29400, variance: 1.9, source: 'DEVICE', ref: 'WB-01', tol: true },
    { ticket_no: 'WT-DAR1-26-5526', kind: 'IN', visitId: visitMap['TV-26-04411'], stayId: stayIds[5], gross: 18100, tare: 15300, net: 2800, source: 'MANUAL', ref: null, tol: true },
  ];

  for (const w of weighings) {
    const existing = await prisma.weighing.findFirst({ where: { site_id: 1, ticket_no: w.ticket_no } });
    if (!existing) {
      await prisma.weighing.create({
        data: {
          site_id: 1,
          ticket_no: w.ticket_no,
          weigh_kind: w.kind,
          truck_visit_id: w.visitId,
          unit_stay_id: w.stayId,
          gross_kg: w.gross,
          tare_kg: w.tare,
          container_tare_kg: w.ctrTare,
          declared_kg: w.declared,
          variance_pct: w.variance,
          within_tolerance: w.tol,
          source: w.source,
          device_ref: w.ref,
          weighed_at: new Date(Date.now() - 3600000 * 2),
          createdby: 'system',
        },
      });
    }
  }
  console.log('Weighbridge tickets ensured.');

  console.log('--- ALL OPS DATA SEEDED SUCCESSFULLY ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
