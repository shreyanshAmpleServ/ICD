const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Setup Seeder ---');

  // 1. Ensure Sites exist
  let s1 = await prisma.m_site.findFirst({ where: { site_id: 1 } });
  if (!s1) {
    s1 = await prisma.m_site.create({
      data: {
        site_code: 'DAR1',
        site_name: 'Dar es Salaam main yard',
        company_id: 1,
        country_code: 'TZ',
        time_zone: 'Africa/Dar_es_Salaam',
        address_line1: 'Plot 112, Nelson Mandela Road',
        city: 'Dar es Salaam',
        latitude: -6.832100,
        longitude: 39.231700,
        customs_station_code: 'DLICD1',
        regulator_licence_no: 'TASAC/ICD/0231',
        offline_gate_limit_min: 60,
        signature_mode: 'EITHER',
        is_active: true,
        createdby: 'system',
      }
    });
  } else {
    await prisma.m_site.update({
      where: { site_id: 1 },
      data: {
        site_code: 'DAR1',
        site_name: 'Dar es Salaam main yard',
        address_line1: 'Plot 112, Nelson Mandela Road',
        customs_station_code: 'DLICD1',
        regulator_licence_no: 'TASAC/ICD/0231',
      }
    });
  }

  let s2 = await prisma.m_site.findFirst({ where: { site_code: 'DAR2' } });
  if (!s2) {
    s2 = await prisma.m_site.create({
      data: {
        site_code: 'DAR2',
        site_name: 'Dar es Salaam vehicle yard',
        company_id: 1,
        country_code: 'TZ',
        time_zone: 'Africa/Dar_es_Salaam',
        address_line1: 'Kurasini, Mivinjeni Street',
        city: 'Dar es Salaam',
        latitude: -6.858400,
        longitude: 39.276900,
        customs_station_code: 'DLICD4',
        regulator_licence_no: 'TASAC/ICD/0247',
        offline_gate_limit_min: 30,
        signature_mode: 'SCREEN',
        is_active: true,
        createdby: 'system',
      }
    });
  }

  let s3 = await prisma.m_site.findFirst({ where: { site_code: 'KBH1' } });
  if (!s3) {
    s3 = await prisma.m_site.create({
      data: {
        site_code: 'KBH1',
        site_name: 'Kibaha warehouse',
        company_id: 1,
        country_code: 'TZ',
        time_zone: 'Africa/Dar_es_Salaam',
        address_line1: 'Morogoro Road, Mlandizi junction',
        city: 'Kibaha',
        offline_gate_limit_min: 60,
        signature_mode: 'PAPER',
        is_active: true,
        createdby: 'system',
      }
    });
  }
  console.log('✓ Sites verified: DAR1, DAR2, KBH1');

  // 2. Seed Facilities
  const facilities = [
    { site_id: s1.site_id, facility_type: 'ICD' },
    { site_id: s1.site_id, facility_type: 'CFS' },
    { site_id: s1.site_id, facility_type: 'EMPTY_DEPOT' },
    { site_id: s2.site_id, facility_type: 'ICDV' },
    { site_id: s3.site_id, facility_type: 'WAREHOUSE' },
    { site_id: s3.site_id, facility_type: 'CFS' },
  ];
  for (const f of facilities) {
    const existing = await prisma.m_site_facility.findFirst({
      where: { site_id: f.site_id, facility_type: f.facility_type }
    });
    if (!existing) {
      await prisma.m_site_facility.create({
        data: {
          site_id: f.site_id,
          facility_type: f.facility_type,
          is_active: true,
          createdby: 'system',
        }
      });
    }
  }
  console.log('✓ Site facilities seeded');

  // 3. Seed Gates
  const gateConfigs = [
    { site_id: s1.site_id, gate_code: 'OG1', gate_name: 'Main gate (outer)', gate_kind: 'OUTER' },
    { site_id: s1.site_id, gate_code: 'IG1', gate_name: 'Inner gate (yard)', gate_kind: 'INNER' },
    { site_id: s1.site_id, gate_code: 'WB1', gate_name: 'Weighbridge', gate_kind: 'WEIGHBRIDGE' },
    { site_id: s2.site_id, gate_code: 'VG1', gate_name: 'Vehicle yard gate', gate_kind: 'OUTER' },
    { site_id: s3.site_id, gate_code: 'KG1', gate_name: 'Warehouse gate', gate_kind: 'OUTER' },
  ];
  const gateMap = {};
  for (const g of gateConfigs) {
    let gate = await prisma.m_gate.findFirst({
      where: { site_id: g.site_id, gate_code: g.gate_code }
    });
    if (!gate) {
      gate = await prisma.m_gate.create({
        data: { ...g, is_active: true, createdby: 'system' }
      });
    }
    gateMap[g.gate_code] = gate.gate_id;
  }
  console.log('✓ Gates seeded:', Object.keys(gateMap));

  // 4. Seed Gate Lanes
  const lanes = [
    { gate_id: gateMap['OG1'], lane_code: 'In 1', direction: 'IN' },
    { gate_id: gateMap['OG1'], lane_code: 'In 2', direction: 'IN' },
    { gate_id: gateMap['OG1'], lane_code: 'Out 1', direction: 'OUT' },
    { gate_id: gateMap['OG1'], lane_code: 'Out 2', direction: 'OUT' },
    { gate_id: gateMap['IG1'], lane_code: 'Inner A', direction: 'BOTH' },
    { gate_id: gateMap['WB1'], lane_code: 'Scale 1', direction: 'BOTH' },
    { gate_id: gateMap['VG1'], lane_code: 'In', direction: 'IN' },
    { gate_id: gateMap['VG1'], lane_code: 'Out', direction: 'OUT' },
    { gate_id: gateMap['KG1'], lane_code: 'Lane 1', direction: 'BOTH' },
  ];
  for (const l of lanes) {
    const existing = await prisma.m_gate_lane.findFirst({
      where: { gate_id: l.gate_id, lane_code: l.lane_code }
    });
    if (!existing) {
      await prisma.m_gate_lane.create({
        data: { ...l, is_active: true, createdby: 'system' }
      });
    }
  }
  console.log('✓ Gate lanes seeded');

  // 5. Seed Checkpoints
  const chks = [
    { site_id: s1.site_id, checkpoint_code: 'OUTER_IN', checkpoint_name: 'Outer gate in', checkpoint_kind: 'OUTER_IN', gate_id: gateMap['OG1'] },
    { site_id: s1.site_id, checkpoint_code: 'INNER_IN', checkpoint_name: 'Inner gate in', checkpoint_kind: 'INNER_IN', gate_id: gateMap['IG1'] },
    { site_id: s1.site_id, checkpoint_code: 'WEIGH_IN', checkpoint_name: 'Weigh in', checkpoint_kind: 'WEIGH_IN', gate_id: gateMap['WB1'] },
    { site_id: s1.site_id, checkpoint_code: 'INNER_OUT', checkpoint_name: 'Inner gate out', checkpoint_kind: 'INNER_OUT', gate_id: gateMap['IG1'] },
    { site_id: s1.site_id, checkpoint_code: 'WEIGH_OUT', checkpoint_name: 'Weigh out', checkpoint_kind: 'WEIGH_OUT', gate_id: gateMap['WB1'] },
    { site_id: s1.site_id, checkpoint_code: 'OUTER_OUT', checkpoint_name: 'Outer gate out', checkpoint_kind: 'OUTER_OUT', gate_id: gateMap['OG1'] },
  ];
  const chkMap = {};
  for (const c of chks) {
    let cp = await prisma.m_checkpoint.findFirst({
      where: { site_id: c.site_id, checkpoint_code: c.checkpoint_code }
    });
    if (!cp) {
      cp = await prisma.m_checkpoint.create({
        data: { ...c, is_active: true, createdby: 'system' }
      });
    }
    chkMap[c.checkpoint_code] = cp.checkpoint_id;
  }
  console.log('✓ Checkpoints seeded');

  // 6. Seed Visit Types
  const vts = [
    { site_id: s1.site_id, visit_type_code: 'TRANSFER_IN', visit_type_name: 'Transfer from port', requires_nomination: true, requires_appointment: false, checkpoints: ['OUTER_IN', 'WEIGH_IN', 'INNER_IN', 'INNER_OUT', 'OUTER_OUT'] },
    { site_id: s1.site_id, visit_type_code: 'IMPORT_PICKUP', visit_type_name: 'Import pick-up', requires_nomination: true, requires_appointment: true, checkpoints: ['OUTER_IN', 'INNER_IN', 'INNER_OUT', 'WEIGH_OUT', 'OUTER_OUT'] },
    { site_id: s1.site_id, visit_type_code: 'EXPORT_DROP', visit_type_name: 'Export drop-off', requires_nomination: true, requires_appointment: true, checkpoints: ['OUTER_IN', 'WEIGH_IN', 'INNER_IN', 'INNER_OUT', 'OUTER_OUT'] },
    { site_id: s1.site_id, visit_type_code: 'EMPTY_RETURN', visit_type_name: 'Empty return', requires_nomination: false, requires_appointment: false, checkpoints: ['OUTER_IN', 'INNER_IN', 'INNER_OUT', 'OUTER_OUT'] },
    { site_id: s1.site_id, visit_type_code: 'EMPTY_PICKUP', visit_type_name: 'Empty pick-up', requires_nomination: true, requires_appointment: false, checkpoints: ['OUTER_IN', 'INNER_IN', 'INNER_OUT', 'OUTER_OUT'] },
    { site_id: s2.site_id, visit_type_code: 'VEHICLE_DELIVERY', visit_type_name: 'Vehicle delivery', requires_nomination: true, requires_appointment: false, checkpoints: ['OUTER_IN', 'INNER_OUT', 'OUTER_OUT'] },
    { site_id: s2.site_id, visit_type_code: 'VEHICLE_RECEIPT', visit_type_name: 'Vehicle receipt (self-driven)', requires_nomination: true, requires_appointment: false, checkpoints: ['OUTER_IN', 'INNER_IN'] },
  ];
  for (const v of vts) {
    let vt = await prisma.m_visit_type.findFirst({
      where: { site_id: v.site_id, visit_type_code: v.visit_type_code }
    });
    if (!vt) {
      vt = await prisma.m_visit_type.create({
        data: {
          site_id: v.site_id,
          visit_type_code: v.visit_type_code,
          visit_type_name: v.visit_type_name,
          requires_nomination: v.requires_nomination,
          requires_appointment: v.requires_appointment,
          is_active: true,
          createdby: 'system',
        }
      });
      // checkpoints
      let seq = 1;
      for (const code of v.checkpoints) {
        if (chkMap[code]) {
          await prisma.m_visit_type_checkpoint.create({
            data: {
              visit_type_id: vt.visit_type_id,
              seq_no: seq++,
              checkpoint_id: chkMap[code],
              is_mandatory: true,
              createdby: 'system',
            }
          }).catch(() => {});
        }
      }
    }
  }
  console.log('✓ Visit types seeded');

  // 7. Seed Users & Roles
  const roles = await prisma.m_role.findMany();
  const roleCodeToId = {};
  roles.forEach(r => { roleCodeToId[r.role_code] = r.role_id; });

  const rawUsers = [
    { id: 1, name: 'Ashok Kumar', title: 'ICD administrator', email: 'ashok.k@mlimani-icd.example', mfa: true, roles: [{ role: 'ICD_ADMIN', siteId: null }] },
    { id: 2, name: 'Hamisi Juma', title: 'Gate officer', email: 'hamisi.j@mlimani-icd.example', mfa: false, roles: [{ role: 'GATE_OFFICER', siteId: 1 }] },
    { id: 3, name: 'Rose Akyoo', title: 'Gate officer', email: 'rose.a@mlimani-icd.example', mfa: false, roles: [{ role: 'GATE_OFFICER', siteId: 1 }, { role: 'GATE_OFFICER', siteId: 2 }] },
    { id: 4, name: 'Ibrahim Nassoro', title: 'Yard planner', email: 'ibrahim.n@mlimani-icd.example', mfa: false, roles: [{ role: 'YARD_OFFICER', siteId: 1 }] },
    { id: 5, name: 'Juma Mfinanga', title: 'Inspection officer', email: 'juma.m@mlimani-icd.example', mfa: false, roles: [{ role: 'INSPECTION_OFFICER', siteId: 1 }] },
    { id: 6, name: 'Rehema Kweka', title: 'Documentation & clearance', email: 'rehema.k@mlimani-icd.example', mfa: true, roles: [{ role: 'DOC_CLEARANCE', siteId: null }] },
    { id: 7, name: 'Amina Salum', title: 'Billing officer', email: 'amina.s@mlimani-icd.example', mfa: true, roles: [{ role: 'BILLING_OFFICER', siteId: null }] },
    { id: 8, name: 'Mary Temba', title: 'Cashier', email: 'mary.t@mlimani-icd.example', mfa: true, roles: [{ role: 'CASHIER', siteId: 1 }] },
    { id: 9, name: 'Joseph Nyerere', title: 'Finance manager', email: 'joseph.n@mlimani-icd.example', mfa: true, roles: [{ role: 'FINANCE_MANAGER', siteId: null }] },
    { id: 10, name: 'Daniel Kimaro', title: 'Depot supervisor', email: 'daniel.k@mlimani-icd.example', mfa: true, roles: [{ role: 'OPS_MANAGER', siteId: null }] },
    { id: 11, name: 'Grace Pallangyo', title: 'Customer service', email: 'grace.p@mlimani-icd.example', mfa: false, roles: [{ role: 'CUSTOMER_SERVICE', siteId: null }] },
    { id: 12, name: 'Ally Shabani', title: 'Weighbridge officer', email: 'ally.s@mlimani-icd.example', mfa: false, roles: [{ role: 'WEIGHBRIDGE_OFFICER', siteId: 1 }] },
    { id: 13, name: 'Neema Mushi', title: 'Relief gate officer', email: 'neema.m@mlimani-icd.example', mfa: false, roles: [{ role: 'GATE_OFFICER', siteId: 2 }] },
    { id: 14, name: 'Tumaini Lema', title: 'Former cashier', email: 'tumaini.l@mlimani-icd.example', mfa: false, active: false, roles: [{ role: 'CASHIER', siteId: 1 }] },
  ];

  for (const u of rawUsers) {
    let existing = await prisma.app_user.findFirst({ where: { email: u.email } });
    if (!existing) {
      existing = await prisma.app_user.create({
        data: {
          user_sub: `ng|${8100 + u.id}`,
          user_name: u.name,
          email: u.email,
          phone: `+255 754 000 ${String(u.id).padStart(3, '0')}`,
          preferred_language: 'en',
          is_ng_user: true,
          mfa_required: !!u.mfa,
          is_active: u.active !== false,
          createdby: 'system',
        }
      });
      console.log(`Created app_user: ${u.name}`);
    }

    // Role grants
    for (const r of u.roles) {
      const roleId = roleCodeToId[r.role];
      if (roleId) {
        const hasRole = await prisma.user_site_role.findFirst({
          where: { user_id: existing.user_id, role_id: roleId, site_id: r.siteId }
        });
        if (!hasRole) {
          await prisma.user_site_role.create({
            data: {
              user_id: existing.user_id,
              role_id: roleId,
              site_id: r.siteId,
              granted_by: 'Ashok K.',
              createdby: 'system',
            }
          });
        }
      }
    }
  }
  console.log('✓ App users & roles seeded');

  // 8. Seed Devices
  const devList = [
    { site_id: s1.site_id, device_code: 'TAB-DAR1-01', device_name: 'Gate tablet, In 1', device_kind: 'TABLET' },
    { site_id: s1.site_id, device_code: 'TAB-DAR1-02', device_name: 'Gate tablet, In 2', device_kind: 'TABLET' },
    { site_id: s1.site_id, device_code: 'TAB-DAR1-03', device_name: 'Gate tablet, Out 1', device_kind: 'TABLET' },
    { site_id: s1.site_id, device_code: 'HH-DAR1-01', device_name: 'Yard handheld 1', device_kind: 'PHONE' },
    { site_id: s1.site_id, device_code: 'HH-DAR1-02', device_name: 'Yard handheld 2', device_kind: 'PHONE' },
    { site_id: s1.site_id, device_code: 'HH-DAR1-03', device_name: 'Inspection handheld', device_kind: 'PHONE' },
    { site_id: s1.site_id, device_code: 'GA-DAR1-01', device_name: 'Gate agent PC (main gate)', device_kind: 'GATE_PC' },
    { site_id: s2.site_id, device_code: 'TAB-DAR2-01', device_name: 'Vehicle gate tablet', device_kind: 'TABLET' },
    { site_id: s2.site_id, device_code: 'KIOSK-DAR2-01', device_name: 'Driver self-service kiosk', device_kind: 'KIOSK' },
    { site_id: s1.site_id, device_code: 'TAB-DAR1-04', device_name: 'Spare gate tablet (lost)', device_kind: 'TABLET' },
  ];

  for (const d of devList) {
    const existing = await prisma.m_device.findUnique({
      where: { device_code: d.device_code }
    });
    if (!existing) {
      await prisma.m_device.create({
        data: {
          site_id: d.site_id,
          device_code: d.device_code,
          device_name: d.device_name,
          device_kind: d.device_kind,
          registered_by: 'Ashok K.',
          last_seen_at: new Date(),
          createdby: 'system',
        }
      });
    }
  }
  console.log('✓ Devices seeded');

  // 9. Seed Tariff
  const existingTariff = await prisma.tariff.findFirst({ where: { tariff_code: 'TAR-DAR-STD-2026' } });
  if (!existingTariff) {
    const tf = await prisma.tariff.create({
      data: {
        tariff_code: 'TAR-DAR-STD-2026',
        tariff_name: 'Standard Depot Tariff 2026',
        tariff_level: 'SITE',
        company_id: 1,
        site_id: s1.site_id,
        party_id: null,
        currency: 'USD',
        version_no: 1,
        effective_from: new Date('2026-01-01'),
        status: 'ACTIVE',
        createdby: 'system',
      }
    });

    // Seed Tariff Rules
    const chargeCodes = await prisma.m_charge_code.findMany();
    let sort = 10;
    for (const cc of chargeCodes.slice(0, 8)) {
      await prisma.tariff_rule.create({
        data: {
          tariff_id: tf.tariff_id,
          charge_code_id: cc.charge_code_id,
          basis: 'PER_UNIT',
          free_days: 7,
          flat_rate: 90.00,
          sort_order: sort,
          createdby: 'system',
        }
      });
      sort += 10;
    }
    console.log('✓ Standard Tariff & Rules seeded');
  }

  console.log('--- All Setup data seeded successfully! ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
