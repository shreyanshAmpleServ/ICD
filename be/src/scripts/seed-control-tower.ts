import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

export async function seedControlTower() {
  console.log('🚀 Starting Control Tower Seeder...');

  const now = new Date();
  const todayUtc = (h: number, m = 0) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0));
  const minsAgo = (mins: number) => new Date(now.getTime() - mins * 60000);
  const hoursAgo = (hrs: number) => new Date(now.getTime() - hrs * 3600000);

  let country = await prisma.m_country.findUnique({ where: { country_code: 'TZ' } });
  if (!country) {
    country = await prisma.m_country.create({
      data: {
        country_code: 'TZ',
        country_name: 'Tanzania',
        createdby: 'system',
      },
    });
  }

  let company = await prisma.m_company.findFirst({ where: { company_id: 1 } });
  if (!company) {
    const pack = await prisma.m_country_pack.findFirst();
    company = await prisma.m_company.create({
      data: {
        company_code: 'BKD',
        legal_name: 'Bandari Kavu Depots Ltd',
        country_code: 'TZ',
        country_pack_id: pack?.country_pack_id || 1,
        base_currency: 'TZS',
        tax_id: '128-406-733',
        createdby: 'system',
      },
    });
  }

  let site = await prisma.m_site.findFirst({ where: { site_code: 'DAR1' } });
  if (!site) {
    site = await prisma.m_site.create({
      data: {
        company_id: company.company_id,
        site_code: 'DAR1',
        site_name: 'Dar es Salaam main yard',
        country_code: 'TZ',
        time_zone: 'Africa/Dar_es_Salaam',
        createdby: 'system',
      },
    });
  }
  const siteId = site.site_id;

  // 2. Ensure checkpoints exist
  const checkpointsData = [
    { code: 'OUTER_IN', name: 'Outer gate in', kind: 'GATE_IN' },
    { code: 'INNER_IN', name: 'Inner gate in', kind: 'GATE_IN' },
    { code: 'INNER_OUT', name: 'Inner gate out', kind: 'GATE_OUT' },
    { code: 'OUTER_OUT', name: 'Outer gate out', kind: 'GATE_OUT' },
  ];
  const checkpoints: Record<string, any> = {};
  for (const cp of checkpointsData) {
    let row = await prisma.m_checkpoint.findFirst({
      where: { site_id: siteId, checkpoint_code: cp.code },
    });
    if (!row) {
      row = await prisma.m_checkpoint.create({
        data: {
          site_id: siteId,
          checkpoint_code: cp.code,
          checkpoint_name: cp.name,
          checkpoint_kind: cp.kind,
          createdby: 'system',
        },
      });
    }
    checkpoints[cp.code] = row;
  }

  // 3. Ensure visit types exist
  const visitTypesData = [
    { code: 'TRANSFER_IN', name: 'Transfer from port', dir: 'IN' },
    { code: 'IMPORT_PICKUP', name: 'Import pick-up', dir: 'OUT' },
  ];
  const visitTypes: Record<string, any> = {};
  for (const vt of visitTypesData) {
    let row = await prisma.m_visit_type.findFirst({
      where: { site_id: siteId, visit_type_code: vt.code },
    });
    if (!row) {
      row = await prisma.m_visit_type.create({
        data: {
          site_id: siteId,
          visit_type_code: vt.code,
          visit_type_name: vt.name,
          createdby: 'system',
        },
      });
    }
    visitTypes[vt.code] = row;
  }

  // 4. Ensure transporter parties exist
  const partiesData = [
    { code: 'SIMBA', name: 'Simba Haulage Co.' },
    { code: 'PWANI', name: 'Pwani Hardware (own truck)' },
    { code: 'KILIMANJARO', name: 'Kilimanjaro Logistics' },
  ];
  const parties: Record<string, any> = {};
  for (const p of partiesData) {
    let row = await prisma.m_party.findFirst({ where: { party_code: p.code } });
    if (!row) {
      row = await prisma.m_party.create({
        data: {
          party_code: p.code,
          party_name: p.name,
          createdby: 'system',
        },
      });
    }
    parties[p.code] = row;
  }

  // 5. Ensure trucks exist
  const trucksData = [
    { plate: 'T 902 DMB', party: 'SIMBA' },
    { plate: 'T 505 DJN', party: 'PWANI' },
    { plate: 'T 118 DPE', party: 'KILIMANJARO' },
    { plate: 'T 344 ABC', party: 'SIMBA' },
    { plate: 'T 771 XYZ', party: 'KILIMANJARO' },
    { plate: 'T 819 KLM', party: 'SIMBA' },
    { plate: 'T 205 PQR', party: 'PWANI' },
  ];
  const trucks: Record<string, any> = {};
  for (const t of trucksData) {
    let row = await prisma.m_truck.findUnique({ where: { plate_no: t.plate } });
    if (!row) {
      row = await prisma.m_truck.create({
        data: {
          plate_no: t.plate,
          plate_display: t.plate,
          transporter_party_id: parties[t.party].party_id,
          createdby: 'system',
        },
      });
    }
    trucks[t.plate] = row;
  }

  // 6. Seed Active Gate Queue & Blocked Trucks (7 on site, 2 blocked)
  const activeVisitsData = [
    {
      visitNo: 'TV-CT-001',
      plate: 'T 902 DMB',
      vt: 'TRANSFER_IN',
      status: 'HELD',
      cp: 'INNER_IN',
      arrivedMin: 34,
      party: 'SIMBA',
      remarks: 'Seal mismatch: approval requested',
    },
    {
      visitNo: 'TV-CT-002',
      plate: 'T 505 DJN',
      vt: 'IMPORT_PICKUP',
      status: 'REJECTED',
      cp: 'INNER_OUT',
      arrivedMin: 45,
      party: 'PWANI',
      remarks: 'Release order expired at 07:30',
    },
    {
      visitNo: 'TV-CT-003',
      plate: 'T 118 DPE',
      vt: 'TRANSFER_IN',
      status: 'AT_OUTER_GATE',
      cp: 'OUTER_IN',
      arrivedMin: 12,
      party: 'KILIMANJARO',
    },
    {
      visitNo: 'TV-CT-004',
      plate: 'T 344 ABC',
      vt: 'IMPORT_PICKUP',
      status: 'WORKING',
      cp: 'INNER_OUT',
      arrivedMin: 72,
      party: 'SIMBA',
    },
    {
      visitNo: 'TV-CT-005',
      plate: 'T 771 XYZ',
      vt: 'IMPORT_PICKUP',
      status: 'WORKING',
      cp: 'INNER_OUT',
      arrivedMin: 40,
      party: 'KILIMANJARO',
    },
    {
      visitNo: 'TV-CT-006',
      plate: 'T 819 KLM',
      vt: 'IMPORT_PICKUP',
      status: 'WORKING',
      cp: 'INNER_OUT',
      arrivedMin: 25,
      party: 'SIMBA',
    },
    {
      visitNo: 'TV-CT-007',
      plate: 'T 205 PQR',
      vt: 'IMPORT_PICKUP',
      status: 'CHECKED_OUT',
      cp: 'OUTER_OUT',
      arrivedMin: 8,
      party: 'PWANI',
    },
  ];

  const createdVisits: Record<string, any> = {};
  for (const v of activeVisitsData) {
    let row = await prisma.truck_visit.findFirst({
      where: { site_id: siteId, visit_no: v.visitNo },
    });
    if (!row) {
      row = await prisma.truck_visit.create({
        data: {
          site_id: siteId,
          visit_no: v.visitNo,
          visit_type_id: visitTypes[v.vt].visit_type_id,
          truck_id: trucks[v.plate].truck_id,
          transporter_party_id: parties[v.party].party_id,
          status: v.status,
          arrived_at: minsAgo(v.arrivedMin),
          admitted_at: v.status === 'ADMITTED' || v.status === 'WAITING' ? minsAgo(v.arrivedMin - 2) : null,
          remarks: v.remarks || null,
          createdby: 'system',
        },
      });
    }
    const existingCp = await prisma.visit_checkpoint_event.findFirst({
      where: { truck_visit_id: row.truck_visit_id },
    });
    if (!existingCp) {
      await prisma.visit_checkpoint_event.create({
        data: {
          truck_visit_id: row.truck_visit_id,
          checkpoint_id: checkpoints[v.cp].checkpoint_id,
          seq_no: 1,
          result: v.status === 'REJECTED' || v.status === 'HELD' ? 'FAILED' : 'PASSED',
          failure_reason: v.remarks || null,
          occurred_at: minsAgo(v.arrivedMin),
          createdby: 'system',
        },
      });
    }
    createdVisits[v.visitNo] = row;
  }

  // 7. Seed Today's Completed Gate In / Out Visits (for hourly chart & Gate in/out today KPIs)
  const completedCount = await prisma.truck_visit.count({
    where: { site_id: siteId, visit_no: { startsWith: 'TV-HIST-' } },
  });
  if (completedCount === 0) {
    const hourlyInCounts = [2, 5, 7, 6, 9];
    const hourlyOutCounts = [0, 2, 4, 6, 8];
    const hours = [6, 7, 8, 9, 10];
    let idx = 1;
    for (let hIdx = 0; hIdx < hours.length; hIdx++) {
      const hr = hours[hIdx];
      for (let i = 0; i < hourlyInCounts[hIdx]; i++) {
        await prisma.truck_visit.create({
          data: {
            site_id: siteId,
            visit_no: `TV-HIST-IN-${idx++}`,
            visit_type_id: visitTypes.TRANSFER_IN.visit_type_id,
            truck_id: trucks['T 118 DPE'].truck_id,
            transporter_party_id: parties.KILIMANJARO.party_id,
            status: 'EXITED',
            arrived_at: todayUtc(hr, i * 5),
            admitted_at: todayUtc(hr, i * 5 + 3),
            createdby: 'system',
          },
        });
      }
      for (let i = 0; i < hourlyOutCounts[hIdx]; i++) {
        await prisma.truck_visit.create({
          data: {
            site_id: siteId,
            visit_no: `TV-HIST-OUT-${idx++}`,
            visit_type_id: visitTypes.IMPORT_PICKUP.visit_type_id,
            truck_id: trucks['T 344 ABC'].truck_id,
            transporter_party_id: parties.SIMBA.party_id,
            status: 'EXITED',
            arrived_at: todayUtc(hr, i * 5),
            exited_at: todayUtc(hr, i * 5 + 10),
            createdby: 'system',
          },
        });
      }
    }
    console.log('  + Seeded today hourly gate-in and gate-out visits');
  }

  // 8. Seed Equipment
  const equipData = [
    { code: 'RS-01', name: 'Reach stacker 01', type: 'REACH_STACKER' },
    { code: 'RS-02', name: 'Reach stacker 02', type: 'REACH_STACKER' },
    { code: 'EH-01', name: 'Empty handler 01', type: 'EMPTY_HANDLER' },
    { code: 'FL-03', name: 'Forklift 03', type: 'FORKLIFT' },
    { code: 'TT-01', name: 'Terminal tractor 01', type: 'TRACTOR' },
    { code: 'WB-01', name: 'Weighbridge 01', type: 'WEIGHBRIDGE' },
  ];
  const equipMap: Record<string, any> = {};
  for (const eq of equipData) {
    let row = await prisma.m_equipment.findFirst({
      where: { site_id: siteId, equipment_code: eq.code },
    });
    if (!row) {
      row = await prisma.m_equipment.create({
        data: {
          site_id: siteId,
          equipment_code: eq.code,
          equipment_name: eq.name,
          equipment_type: eq.type,
          createdby: 'system',
        },
      });
    }
    equipMap[eq.code] = row;
  }

  // 9. Seed Pending Approvals (4 waiting)
  const perm = await prisma.m_permission.findFirst();
  if (perm) {
    const approvalsData = [
      { reqNo: 'APR-CT-001', summary: 'Seal mismatch override for T 902 DMB', reason: 'Seal verified with shipping line', hrs: 28 },
      { reqNo: 'APR-CT-002', summary: 'Storage waiver for BL-2026-8841', reason: 'Customs system outage delay', hrs: 14 },
      { reqNo: 'APR-CT-003', summary: 'Credit limit override for Simba Haulage', reason: 'Bank transfer receipt attached', hrs: 6 },
      { reqNo: 'APR-CT-004', summary: 'After-hours gate release T 344 ABC', reason: 'Priority cargo clearance', hrs: 2 },
    ];
    for (const a of approvalsData) {
      const exists = await prisma.approval_request.findUnique({ where: { request_no: a.reqNo } });
      if (!exists) {
        await prisma.approval_request.create({
          data: {
            site_id: siteId,
            request_no: a.reqNo,
            permission_code: perm.permission_code,
            entity_name: 'truck_visit',
            entity_id: createdVisits['TV-CT-001'].truck_visit_id,
            summary: a.summary,
            reason: a.reason,
            status: 'PENDING',
            requested_by_sub: 'Grace P.',
            requested_at: hoursAgo(a.hrs),
            createdby: 'system',
          },
        });
      }
    }
    console.log('  + Seeded 4 pending approvals');
  }

  // 10. Seed Exceptions (5 open: 1 Critical, 2 High, 1 Medium, 1 Low; 2 Overdue)
  let excType = await prisma.m_exception_type.findFirst({ where: { exception_code: 'SEAL_MISMATCH' } });
  if (!excType) {
    excType = await prisma.m_exception_type.create({
      data: {
        exception_code: 'SEAL_MISMATCH',
        exception_name: 'Seal or release exception',
        severity: 'HIGH',
        sla_minutes: 60,
        createdby: 'system',
      },
    });
  }

  const exceptionsData = [
    {
      caseNo: 'EX-26-00079',
      sev: 'CRITICAL',
      title: 'Truck turned back: release expired',
      raisedHrs: 3,
      overdue: true,
      visitNo: 'TV-CT-002',
    },
    {
      caseNo: 'EX-26-00080',
      sev: 'HIGH',
      title: 'Seal mismatch: approval requested',
      raisedHrs: 2,
      overdue: true,
      visitNo: 'TV-CT-001',
    },
    {
      caseNo: 'EX-26-00081',
      sev: 'HIGH',
      title: 'Reefer temperature deviation (+2.4°C)',
      raisedHrs: 1,
      overdue: false,
      visitNo: null,
    },
    {
      caseNo: 'EX-26-00082',
      sev: 'MEDIUM',
      title: 'Weighbridge variance > 500 kg',
      raisedHrs: 1,
      overdue: false,
      visitNo: null,
    },
    {
      caseNo: 'EX-26-00083',
      sev: 'LOW',
      title: 'Missing driver phone on manifest',
      raisedHrs: 1,
      overdue: false,
      visitNo: null,
    },
  ];
  for (const ex of exceptionsData) {
    const exists = await prisma.exception_case.findFirst({
      where: { site_id: siteId, case_no: ex.caseNo },
    });
    if (!exists) {
      await prisma.exception_case.create({
        data: {
          site_id: siteId,
          case_no: ex.caseNo,
          exception_type_id: excType.exception_type_id,
          severity: ex.sev,
          status: 'OPEN',
          title: ex.title,
          entity_name: ex.visitNo ? 'truck_visit' : 'yard',
          entity_id: ex.visitNo ? createdVisits[ex.visitNo].truck_visit_id : BigInt(1),
          truck_visit_id: ex.visitNo ? createdVisits[ex.visitNo].truck_visit_id : null,
          raised_by: 'Grace P.',
          raised_at: hoursAgo(ex.raisedHrs),
          assigned_to_sub: 'Grace P.',
          due_at: ex.overdue ? hoursAgo(1) : hoursAgo(-2),
          createdby: 'system',
        },
      });
    }
  }
  console.log('  + Seeded 5 open exception cases');

  console.log('✅ Control Tower Seeder completed successfully!');
}

if (require.main === module) {
  seedControlTower()
    .catch((err) => {
      console.error('❌ Control Tower Seeder failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

