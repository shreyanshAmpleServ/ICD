import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

export async function seedTariffs() {
  console.log('🚀 Starting Tariffs Seeder...');

  // 1. Ensure Company exists
  let company = await prisma.m_company.findFirst({ where: { company_id: 1 } });
  if (!company) {
    company = await prisma.m_company.findFirst();
  }
  const companyId = company ? company.company_id : 1;

  // 2. Ensure Sites exist
  const sitesDef = [
    { site_code: 'DAR1', site_name: 'DAR1 main yard' },
    { site_code: 'DAR2', site_name: 'DAR2 vehicle yard' },
    { site_code: 'KBH1', site_name: 'KBH1 warehouse' },
  ];
  const siteMap: Record<string, number> = {};
  for (const s of sitesDef) {
    let site = await prisma.m_site.findFirst({ where: { site_code: s.site_code } });
    if (!site) {
      site = await prisma.m_site.create({
        data: {
          site_code: s.site_code,
          site_name: s.site_name,
          company_id: companyId,
          country_code: 'TZ',
          time_zone: 'Africa/Dar_es_Salaam',
          createdby: 'system',
        },
      });
      console.log(`  + Created site: ${s.site_code} (ID: ${site.site_id})`);
    }
    siteMap[s.site_code] = site.site_id;
  }

  // 3. Ensure Regime exists
  let transitRegime = await prisma.m_cargo_regime.findFirst({ where: { regime_code: 'TRANSIT' } });
  if (!transitRegime) {
    transitRegime = await prisma.m_cargo_regime.create({
      data: {
        regime_code: 'TRANSIT',
        regime_name: 'Transit cargo (Zambia, DRC, Rwanda, Uganda)',
        is_active: true,
        createdby: 'system',
      },
    });
    console.log(`  + Created cargo regime: TRANSIT (ID: ${transitRegime.cargo_regime_id})`);
  }
  const transitRegimeId = transitRegime.cargo_regime_id;

  // 4. Ensure Parties exist (Line & Customer)
  let bmlParty = await prisma.m_party.findFirst({ where: { party_code: 'L-BML' } });
  if (!bmlParty) {
    bmlParty = await prisma.m_party.findFirst({ where: { party_name: { contains: 'Blue Meridian' } } });
  }
  if (!bmlParty) {
    bmlParty = await prisma.m_party.create({
      data: {
        party_code: 'L-BML',
        party_name: 'Blue Meridian Line',
        credit_status: 'CASH',
        country_code: 'TZ',
        createdby: 'system',
      },
    });
    console.log(`  + Created party: Blue Meridian Line (ID: ${bmlParty.party_id})`);
  }

  let kileleParty = await prisma.m_party.findFirst({ where: { party_code: 'C-KILELE' } });
  if (!kileleParty) {
    kileleParty = await prisma.m_party.findFirst({ where: { party_name: { contains: 'Kilele' } } });
  }
  if (!kileleParty) {
    kileleParty = await prisma.m_party.create({
      data: {
        party_code: 'C-KILELE',
        party_name: 'Kilele Clearing & Forwarding',
        credit_status: 'CREDIT',
        credit_limit: 40000.0,
        credit_currency: 'USD',
        country_code: 'TZ',
        createdby: 'system',
      },
    });
    console.log(`  + Created party: Kilele Clearing & Forwarding (ID: ${kileleParty.party_id})`);
  }

  // 5. Ensure Currency exists
  let usdCurrency = await prisma.m_currency.findUnique({ where: { currency_code: 'USD' } });
  if (!usdCurrency) {
    usdCurrency = await prisma.m_currency.create({
      data: {
        currency_code: 'USD',
        currency_name: 'US Dollar',
        minor_units: 2,
        is_active: true,
        createdby: 'system',
      },
    });
    console.log('  + Created currency: USD');
  }

  // 6. Ensure Charge Codes exist
  const chargeDefs = [
    { code: 'LIFT_ON_OFF', name: 'Lift On / Lift Off', group: 'HANDLING' },
    { code: 'STORAGE_IMPORT', name: 'Import Container Storage', group: 'STORAGE' },
    { code: 'STORAGE_EMPTY', name: 'Empty Container Storage', group: 'STORAGE' },
    { code: 'STORAGE_TRANSIT', name: 'Transit Cargo Storage', group: 'STORAGE' },
    { code: 'STORAGE_VEHICLE', name: 'Vehicle Yard Storage', group: 'STORAGE' },
    { code: 'REEFER_POWER', name: 'Reefer Monitoring & Power', group: 'REEFER' },
    { code: 'EXAM_HANDLING', name: 'Customs Examination Handling', group: 'HANDLING' },
    { code: 'HAZ_SURCHARGE', name: 'Hazardous Cargo Surcharge', group: 'SPECIAL' },
    { code: 'CFS_HANDLING', name: 'CFS De-stuffing / Handling', group: 'HANDLING' },
    { code: 'DOC_FEE', name: 'Documentation Fee', group: 'DOCUMENTATION' },
    { code: 'VEH_HANDLING', name: 'Vehicle Yard Handling', group: 'VEHICLE' },
  ];

  const chargeCodeMap: Record<string, number> = {};
  for (const c of chargeDefs) {
    let row = await prisma.m_charge_code.findUnique({ where: { charge_code: c.code } });
    if (!row) {
      row = await prisma.m_charge_code.create({
        data: {
          charge_code: c.code,
          charge_name: c.name,
          charge_group: c.group,
          is_active: true,
          createdby: 'system',
        },
      });
      console.log(`  + Created charge code: ${c.code} (ID: ${row.charge_code_id})`);
    }
    chargeCodeMap[c.code] = row.charge_code_id;
  }

  // 7. Ensure Approval Request exists for TRF-KILELE-26
  let kileleApproval = await prisma.approval_request.findFirst({
    where: { request_no: 'APR-2026-TRF-001' },
  });
  if (!kileleApproval) {
    kileleApproval = await prisma.approval_request.create({
      data: {
        request_no: 'APR-2026-TRF-001',
        permission_code: 'billing.tariff.change',
        entity_name: 'tariff',
        entity_id: BigInt(71),
        summary: 'Kilele contract rates 2026/27 approval request',
        reason: 'Volume contract: 10 free days, Sundays and holidays do not count.',
        status: 'PENDING',
        requested_by_sub: 'usr_neema',
        createdby: 'Neema Mushi',
      },
    });
    console.log(`  + Created approval request for Kilele: ${kileleApproval.request_no}`);
  }

  // 8. Helper rule definitions
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const sl = (...rows: [number, number | null, number][]) =>
    rows.map(([f, t, r]) => ({ fromQty: f, toQty: t, rate: r }));

  const siteRules = (storageUp = 1, vat = 'VAT18') => {
    const s = (v: number) => r2(v * storageUp);
    return [
      { chargeCode: 'LIFT_ON_OFF', basis: 'PER_MOVE', unitCategory: 'CONTAINER', lengthFt: 20, flatRate: 60.0, taxCode: vat, sortOrder: 1 },
      { chargeCode: 'LIFT_ON_OFF', basis: 'PER_MOVE', unitCategory: 'CONTAINER', lengthFt: 40, flatRate: 90.0, taxCode: vat, sortOrder: 2 },
      { chargeCode: 'STORAGE_IMPORT', basis: 'PER_UNIT_DAY', unitCategory: 'CONTAINER', lengthFt: 20, fullEmpty: 'F', clockStart: 'DISCHARGE', freeDays: 7, taxCode: vat, slabs: sl([1, 7, 0], [8, 14, s(8)], [15, 30, s(12)], [31, null, s(20)]), sortOrder: 3 },
      { chargeCode: 'STORAGE_IMPORT', basis: 'PER_UNIT_DAY', unitCategory: 'CONTAINER', lengthFt: 40, fullEmpty: 'F', clockStart: 'DISCHARGE', freeDays: 7, taxCode: vat, slabs: sl([1, 7, 0], [8, 14, s(16)], [15, 30, s(24)], [31, null, s(40)]), sortOrder: 4 },
      { chargeCode: 'STORAGE_EMPTY', basis: 'PER_TEU_DAY', unitCategory: 'CONTAINER', fullEmpty: 'E', clockStart: 'GATE_IN', freeDays: 5, taxCode: vat, slabs: sl([1, 5, 0], [6, null, s(3)]), sortOrder: 5 },
      { chargeCode: 'REEFER_POWER', basis: 'PER_KWH', unitCategory: 'CONTAINER', isReefer: true, flatRate: 0.42, minCharge: 15.0, taxCode: vat, sortOrder: 6 },
      { chargeCode: 'EXAM_HANDLING', basis: 'PER_UNIT', unitCategory: 'CONTAINER', lengthFt: 20, flatRate: 80.0, taxCode: vat, sortOrder: 7 },
      { chargeCode: 'EXAM_HANDLING', basis: 'PER_UNIT', unitCategory: 'CONTAINER', lengthFt: 40, flatRate: 120.0, taxCode: vat, sortOrder: 8 },
      { chargeCode: 'HAZ_SURCHARGE', basis: 'PER_UNIT', isHazardous: true, flatRate: 75.0, taxCode: vat, sortOrder: 9 },
      { chargeCode: 'CFS_HANDLING', basis: 'PER_TONNE', unitCategory: 'LOT', flatRate: 12.0, minCharge: 25.0, taxCode: vat, sortOrder: 10 },
      { chargeCode: 'DOC_FEE', basis: 'FLAT', flatRate: 50.0, taxCode: vat, sortOrder: 11 },
    ];
  };

  const vehicleRules = (vat = 'VAT18', free = 7) => [
    { chargeCode: 'VEH_HANDLING', basis: 'PER_UNIT', unitCategory: 'VEHICLE', flatRate: 45.0, taxCode: vat, sortOrder: 1 },
    { chargeCode: 'STORAGE_VEHICLE', basis: 'PER_UNIT_DAY', unitCategory: 'VEHICLE', vehicleClass: 'CAR_SUV', clockStart: 'DISCHARGE', freeDays: free, taxCode: vat, slabs: sl([1, free, 0], [free + 1, 14 + free - 7, 10], [15 + free - 7, null, 15]), sortOrder: 2 },
    { chargeCode: 'STORAGE_VEHICLE', basis: 'PER_UNIT_DAY', unitCategory: 'VEHICLE', vehicleClass: 'TRUCK_LIGHT', clockStart: 'DISCHARGE', freeDays: free, taxCode: vat, slabs: sl([1, free, 0], [free + 1, 14 + free - 7, 15], [15 + free - 7, null, 25]), sortOrder: 3 },
    { chargeCode: 'STORAGE_VEHICLE', basis: 'PER_UNIT_DAY', unitCategory: 'VEHICLE', vehicleClass: 'TRACTOR', clockStart: 'DISCHARGE', freeDays: free, taxCode: vat, slabs: sl([1, free, 0], [free + 1, 14 + free - 7, 15], [15 + free - 7, null, 25]), sortOrder: 4 },
    { chargeCode: 'DOC_FEE', basis: 'FLAT', flatRate: 35.0, taxCode: vat, sortOrder: 5 },
  ];

  const transitRules = () => [
    { chargeCode: 'LIFT_ON_OFF', basis: 'PER_MOVE', unitCategory: 'CONTAINER', lengthFt: 20, flatRate: 60.0, taxCode: 'VAT0', sortOrder: 1 },
    { chargeCode: 'LIFT_ON_OFF', basis: 'PER_MOVE', unitCategory: 'CONTAINER', lengthFt: 40, flatRate: 90.0, taxCode: 'VAT0', sortOrder: 2 },
    { chargeCode: 'STORAGE_TRANSIT', basis: 'PER_UNIT_DAY', unitCategory: 'CONTAINER', lengthFt: 20, clockStart: 'DISCHARGE', freeDays: 14, taxCode: 'VAT0', slabs: sl([1, 14, 0], [15, 30, 10], [31, null, 20]), sortOrder: 3 },
    { chargeCode: 'STORAGE_TRANSIT', basis: 'PER_UNIT_DAY', unitCategory: 'CONTAINER', lengthFt: 40, clockStart: 'DISCHARGE', freeDays: 14, taxCode: 'VAT0', slabs: sl([1, 14, 0], [15, 30, 20], [31, null, 40]), sortOrder: 4 },
    { chargeCode: 'EXAM_HANDLING', basis: 'PER_UNIT', unitCategory: 'CONTAINER', flatRate: 100.0, taxCode: 'VAT0', sortOrder: 5 },
    { chargeCode: 'VEH_HANDLING', basis: 'PER_UNIT', unitCategory: 'VEHICLE', flatRate: 45.0, taxCode: 'VAT0', sortOrder: 6 },
    { chargeCode: 'STORAGE_VEHICLE', basis: 'PER_UNIT_DAY', unitCategory: 'VEHICLE', vehicleClass: 'CAR_SUV', clockStart: 'DISCHARGE', freeDays: 14, taxCode: 'VAT0', slabs: sl([1, 14, 0], [15, 21, 10], [22, null, 15]), sortOrder: 7 },
    { chargeCode: 'STORAGE_VEHICLE', basis: 'PER_UNIT_DAY', unitCategory: 'VEHICLE', vehicleClass: 'TRUCK_LIGHT', clockStart: 'DISCHARGE', freeDays: 14, taxCode: 'VAT0', slabs: sl([1, 14, 0], [15, 21, 15], [22, null, 25]), sortOrder: 8 },
    { chargeCode: 'STORAGE_VEHICLE', basis: 'PER_UNIT_DAY', unitCategory: 'VEHICLE', vehicleClass: 'TRACTOR', clockStart: 'DISCHARGE', freeDays: 14, taxCode: 'VAT0', slabs: sl([1, 14, 0], [15, 21, 15], [22, null, 25]), sortOrder: 9 },
    { chargeCode: 'DOC_FEE', basis: 'FLAT', flatRate: 50.0, taxCode: 'VAT0', sortOrder: 10 },
  ];

  // 9. All 8 Tariffs Definitions
  const tariffsData = [
    {
      tariffCode: 'TRF-DAR1-STD',
      tariffName: 'Main yard standard tariff',
      tariffLevel: 'SITE',
      siteId: siteMap['DAR1'],
      currency: 'USD',
      versionNo: 3,
      effectiveFrom: new Date('2026-07-01'),
      effectiveTo: null,
      status: 'ACTIVE',
      regulatorRef: 'Published tariff book 2026/27',
      remarks: 'Free days count Sundays and public holidays.',
      createdby: 'Grace Mrema',
      updatedby: 'Grace Mrema',
      rules: siteRules(),
    },
    {
      tariffCode: 'TRF-DAR1-STD',
      tariffName: 'Main yard standard tariff',
      tariffLevel: 'SITE',
      siteId: siteMap['DAR1'],
      currency: 'USD',
      versionNo: 4,
      effectiveFrom: new Date('2027-01-01'),
      effectiveTo: null,
      status: 'DRAFT',
      remarks: 'Storage slabs up 10% from 1 Jan 2027. Handling unchanged.',
      createdby: 'Neema Mushi',
      updatedby: 'Neema Mushi',
      rules: siteRules(1.1),
    },
    {
      tariffCode: 'TRF-DAR1-STD',
      tariffName: 'Main yard standard tariff',
      tariffLevel: 'SITE',
      siteId: siteMap['DAR1'],
      currency: 'USD',
      versionNo: 2,
      effectiveFrom: new Date('2025-07-01'),
      effectiveTo: new Date('2026-06-30'),
      status: 'RETIRED',
      createdby: 'Grace Mrema',
      updatedby: 'Grace Mrema',
      rules: siteRules(0.9),
    },
    {
      tariffCode: 'TRF-TRANSIT',
      tariffName: 'Transit cargo (Zambia, DRC, Rwanda, Uganda)',
      tariffLevel: 'REGIME',
      cargoRegimeId: transitRegimeId,
      currency: 'USD',
      versionNo: 2,
      effectiveFrom: new Date('2026-07-01'),
      effectiveTo: null,
      status: 'ACTIVE',
      remarks: '14 free days. Services zero-rated for VAT: verify with tax adviser.',
      createdby: 'Grace Mrema',
      updatedby: 'Grace Mrema',
      rules: transitRules(),
    },
    {
      tariffCode: 'TRF-DAR2-VEH',
      tariffName: 'Vehicle yard standard tariff',
      tariffLevel: 'SITE',
      siteId: siteMap['DAR2'],
      currency: 'USD',
      versionNo: 1,
      effectiveFrom: new Date('2026-07-01'),
      effectiveTo: null,
      status: 'ACTIVE',
      createdby: 'Grace Mrema',
      updatedby: 'Grace Mrema',
      rules: vehicleRules(),
    },
    {
      tariffCode: 'TRF-BML-EMPTY',
      tariffName: 'Blue Meridian Line empties',
      tariffLevel: 'LINE',
      partyId: bmlParty.party_id,
      currency: 'USD',
      versionNo: 1,
      effectiveFrom: new Date('2026-04-01'),
      effectiveTo: null,
      status: 'ACTIVE',
      createdby: 'Grace Mrema',
      updatedby: 'Grace Mrema',
      rules: [
        { chargeCode: 'LIFT_ON_OFF', basis: 'PER_MOVE', unitCategory: 'CONTAINER', fullEmpty: 'E', flatRate: 35.0, sortOrder: 1 },
        { chargeCode: 'STORAGE_EMPTY', basis: 'PER_TEU_DAY', unitCategory: 'CONTAINER', fullEmpty: 'E', clockStart: 'GATE_IN', freeDays: 10, slabs: sl([1, 10, 0], [11, null, 2.5]), sortOrder: 2 },
      ],
    },
    {
      tariffCode: 'TRF-KILELE-26',
      tariffName: 'Kilele contract rates 2026/27',
      tariffLevel: 'CUSTOMER',
      partyId: kileleParty.party_id,
      currency: 'USD',
      versionNo: 1,
      effectiveFrom: new Date('2026-11-01'),
      effectiveTo: new Date('2027-10-31'),
      status: 'PENDING_APPROVAL',
      approvalRequestId: kileleApproval.approval_request_id,
      remarks: 'Waiting for Grace Mrema (finance manager) since 5 Oct',
      createdby: 'Neema Mushi',
      updatedby: 'Neema Mushi',
      rules: [
        { chargeCode: 'LIFT_ON_OFF', basis: 'PER_MOVE', unitCategory: 'CONTAINER', lengthFt: 20, flatRate: 55.0, sortOrder: 1 },
        { chargeCode: 'LIFT_ON_OFF', basis: 'PER_MOVE', unitCategory: 'CONTAINER', lengthFt: 40, flatRate: 80.0, sortOrder: 2 },
        { chargeCode: 'STORAGE_IMPORT', basis: 'PER_UNIT_DAY', unitCategory: 'CONTAINER', lengthFt: 20, fullEmpty: 'F', clockStart: 'DISCHARGE', freeDays: 10, freeExclSundays: true, freeExclHolidays: true, slabs: sl([1, 10, 0], [11, 30, 7], [31, null, 15]), sortOrder: 3 },
        { chargeCode: 'STORAGE_IMPORT', basis: 'PER_UNIT_DAY', unitCategory: 'CONTAINER', lengthFt: 40, fullEmpty: 'F', clockStart: 'DISCHARGE', freeDays: 10, freeExclSundays: true, freeExclHolidays: true, slabs: sl([1, 10, 0], [11, 30, 14], [31, null, 30]), sortOrder: 4 },
      ],
    },
    {
      tariffCode: 'TRF-KBH1-WH',
      tariffName: 'Kibaha warehouse tariff',
      tariffLevel: 'SITE',
      siteId: siteMap['KBH1'],
      currency: 'USD',
      versionNo: 1,
      effectiveFrom: new Date('2026-07-01'),
      effectiveTo: null,
      status: 'ACTIVE',
      createdby: 'Grace Mrema',
      updatedby: 'Grace Mrema',
      rules: [
        { chargeCode: 'CFS_HANDLING', basis: 'PER_TONNE', unitCategory: 'LOT', flatRate: 10.0, minCharge: 20.0, sortOrder: 1 },
        { chargeCode: 'DOC_FEE', basis: 'FLAT', flatRate: 30.0, sortOrder: 2 },
      ],
    },
  ];

  // 10. Seed Tariffs, Rules, and Slabs
  console.log(`\n📦 Seeding ${tariffsData.length} Tariffs into database...`);

  for (const t of tariffsData) {
    let tariffRecord = await prisma.tariff.findFirst({
      where: {
        tariff_code: t.tariffCode,
        version_no: t.versionNo,
      },
    });

    if (!tariffRecord) {
      tariffRecord = await prisma.tariff.create({
        data: {
          tariff_code: t.tariffCode,
          tariff_name: t.tariffName,
          tariff_level: t.tariffLevel,
          company_id: companyId,
          site_id: t.siteId ?? null,
          party_id: t.partyId ?? null,
          cargo_regime_id: t.cargoRegimeId ?? null,
          currency: t.currency,
          version_no: t.versionNo,
          effective_from: t.effectiveFrom,
          effective_to: t.effectiveTo ?? null,
          status: t.status,
          approval_request_id: (t as any).approvalRequestId ?? null,
          regulator_ref: (t as any).regulatorRef ?? null,
          remarks: t.remarks ?? null,
          createdby: t.createdby,
          updatedby: t.updatedby,
        },
      });
      console.log(`  + Created Tariff: ${t.tariffCode} v${t.versionNo} - ${t.tariffName} (ID: ${tariffRecord.tariff_id})`);
    } else {
      await prisma.tariff.update({
        where: { tariff_id: tariffRecord.tariff_id },
        data: {
          tariff_name: t.tariffName,
          tariff_level: t.tariffLevel,
          company_id: companyId,
          site_id: t.siteId ?? null,
          party_id: t.partyId ?? null,
          cargo_regime_id: t.cargoRegimeId ?? null,
          currency: t.currency,
          effective_from: t.effectiveFrom,
          effective_to: t.effectiveTo ?? null,
          status: t.status,
          approval_request_id: (t as any).approvalRequestId ?? null,
          regulator_ref: (t as any).regulatorRef ?? null,
          remarks: t.remarks ?? null,
          updatedby: t.updatedby,
        },
      });
      console.log(`  ✓ Updated Tariff: ${t.tariffCode} v${t.versionNo} - ${t.tariffName} (ID: ${tariffRecord.tariff_id})`);
    }

    // Now seed rules for this tariff
    for (const r of t.rules) {
      const chargeCodeId = chargeCodeMap[r.chargeCode];
      if (!chargeCodeId) continue;

      let ruleRecord = await prisma.tariff_rule.findFirst({
        where: {
          tariff_id: tariffRecord.tariff_id,
          charge_code_id: chargeCodeId,
          sort_order: r.sortOrder,
        },
      });

      if (!ruleRecord) {
        ruleRecord = await prisma.tariff_rule.create({
          data: {
            tariff_id: tariffRecord.tariff_id,
            charge_code_id: chargeCodeId,
            basis: r.basis,
            unit_category: (r as any).unitCategory ?? null,
            length_ft: (r as any).lengthFt ?? null,
            vehicle_class: (r as any).vehicleClass ?? null,
            full_empty: (r as any).fullEmpty ?? null,
            is_reefer: (r as any).isReefer ?? null,
            is_hazardous: (r as any).isHazardous ?? null,
            clock_start: (r as any).clockStart ?? null,
            free_days: (r as any).freeDays ?? null,
            free_excl_sundays: (r as any).freeExclSundays ?? false,
            free_excl_holidays: (r as any).freeExclHolidays ?? false,
            flat_rate: (r as any).flatRate ?? null,
            min_charge: (r as any).minCharge ?? null,
            tax_code: (r as any).taxCode ?? 'VAT18',
            sort_order: r.sortOrder,
            createdby: t.createdby,
            updatedby: t.updatedby,
          },
        });
      }

      // If rule has slabs, seed them
      if ((r as any).slabs && Array.isArray((r as any).slabs)) {
        for (const s of (r as any).slabs) {
          const existingSlab = await prisma.tariff_slab.findFirst({
            where: {
              tariff_rule_id: ruleRecord.tariff_rule_id,
              from_qty: s.fromQty,
            },
          });
          if (!existingSlab) {
            await prisma.tariff_slab.create({
              data: {
                tariff_rule_id: ruleRecord.tariff_rule_id,
                from_qty: s.fromQty,
                to_qty: s.toQty ?? null,
                rate: s.rate,
                createdby: t.createdby,
                updatedby: t.updatedby,
              },
            });
          }
        }
      }
    }
  }

  const count = await prisma.tariff.count();
  console.log(`\n🎉 Tariffs seeding complete! Total Tariffs in DB: ${count}`);
}

if (require.main === module && process.argv[1] && /seed/i.test(process.argv[1])) {
  seedTariffs()
    .catch((err) => {
      console.error('❌ Error seeding tariffs:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
