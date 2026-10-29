import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

export async function seedCargoAndMoney() {
  console.log('🌱 Seeding Cargo & Money sections in MSSQL ICD_New...');

  // 1. Fetch foundation records
  const comp = await prisma.companies.findFirst({ where: { company_code: 'DCC' } });
  const site = await prisma.sites.findFirst({ where: { site_code: 'DAR1' } });
  const user = await prisma.users.findFirst({ where: { user_name: 'Ashok Kumar' } });
  const lineMaersk = await prisma.parties.findFirst({ where: { party_code: 'MSK' } });
  const lineCma = await prisma.parties.findFirst({ where: { party_code: 'CMA' } });
  const agentBollore = await prisma.parties.findFirst({ where: { party_code: 'BOL' } });
  const consigneeTwiga = await prisma.parties.findFirst({ where: { party_code: 'TWI' } });
  const regimeImport = await prisma.cargo_regimes.findFirst({ where: { regime_code: 'IMPORT' } });
  const regimeTransit = await prisma.cargo_regimes.findFirst({ where: { regime_code: 'TRANSIT' } });
  const ut40 = await prisma.unit_types.findFirst({ where: { type_code: '40HC' } });
  const locA01 = await prisma.yard_locations.findFirst({ where: { full_code: 'A-01-01-1' } });

  if (!comp || !site || !user || !lineMaersk) {
    throw new Error('Base seed must be present before running Cargo & Money seed.');
  }

  // 2. Ports
  let port = await prisma.ports.findFirst({ where: { port_code: 'DAR' } });
  if (!port) {
    port = await prisma.ports.create({
      data: {
        port_code: 'DAR',
        port_name: 'Port of Dar es Salaam',
        country_code: 'TZ',
        port_kind: 'SEAPORT',
        is_active: true
      }
    });
  }

  // 3. Vessels & Vessel Calls
  let v1 = await prisma.vessels.findFirst({ where: { imo_no: '9812401' } });
  if (!v1) {
    v1 = await prisma.vessels.create({
      data: {
        vessel_name: 'MV Maersk Karachi',
        imo_no: '9812401',
        call_sign: '5LDF8',
        operator_party_id: lineMaersk.party_id,
        is_active: true
      }
    });
  }

  let v2 = await prisma.vessels.findFirst({ where: { imo_no: '9744110' } });
  if (!v2) {
    v2 = await prisma.vessels.create({
      data: {
        vessel_name: 'CMA CGM Jules Verne',
        imo_no: '9744110',
        call_sign: 'FMCV',
        operator_party_id: lineCma?.party_id || lineMaersk.party_id,
        is_active: true
      }
    });
  }

  let vc1 = await prisma.vessel_calls.findFirst({ where: { voyage_no: '2601W' } });
  if (!vc1) {
    vc1 = await prisma.vessel_calls.create({
      data: {
        site_id: site.site_id,
        vessel_id: v1.vessel_id,
        port_id: port.port_id,
        shipping_line_party_id: lineMaersk.party_id,
        voyage_no: '2601W',
        status: 'BERTHED',
        eta: new Date(Date.now() - 48 * 3600000),
        ata: new Date(Date.now() - 36 * 3600000)
      }
    });
  }

  let vc2 = await prisma.vessel_calls.findFirst({ where: { voyage_no: '0912S' } });
  if (!vc2) {
    vc2 = await prisma.vessel_calls.create({
      data: {
        site_id: site.site_id,
        vessel_id: v2.vessel_id,
        port_id: port.port_id,
        shipping_line_party_id: lineCma?.party_id || lineMaersk.party_id,
        voyage_no: '0912S',
        status: 'SCHEDULED',
        eta: new Date(Date.now() + 72 * 3600000)
      }
    });
  }
  console.log('✅ Vessels & Calls seeded: MV Maersk Karachi, CMA CGM Jules Verne');

  // 4. Manifests & Lines
  let man1 = await prisma.manifests.findFirst({ where: { manifest_ref: 'MAN-DAR1-2026-0041' } });
  if (!man1) {
    man1 = await prisma.manifests.create({
      data: {
        vessel_call_id: vc1.vessel_call_id,
        shipping_line_party_id: lineMaersk.party_id,
        manifest_ref: 'MAN-DAR1-2026-0041',
        line_count: 342,
        status: 'PROCESSED',
        imported_at: new Date(Date.now() - 30 * 3600000)
      }
    });

    await prisma.manifest_lines.create({
      data: {
        manifest_id: man1.manifest_id,
        line_no: 1,
        unit_no: 'MSKU 882014 9',
        bl_no: 'BL-DAR-2026-9901',
        consignee_raw: 'Twiga Cement Ltd',
        full_empty: 'F',
        seal_no: 'ML-TZ-98214',
        gross_weight_kg: 28400.00,
        match_status: 'MATCHED'
      }
    });

    await prisma.manifest_lines.create({
      data: {
        manifest_id: man1.manifest_id,
        line_no: 2,
        unit_no: 'MRKU 449120 3',
        bl_no: 'BL-DAR-2026-9902',
        consignee_raw: 'Bakhresa Flour Mills',
        full_empty: 'F',
        seal_no: 'ML-TZ-98215',
        gross_weight_kg: 26150.00,
        match_status: 'MATCHED'
      }
    });
  }
  console.log('✅ Manifests seeded: MAN-DAR1-2026-0041');

  // 5. Consignments & Unit Stays
  let cons = await prisma.consignments.findFirst({ where: { ref_no: 'BL-DAR-2026-9901' } });
  if (!cons) {
    cons = await prisma.consignments.create({
      data: {
        site_id: site.site_id,
        vessel_call_id: vc1.vessel_call_id,
        cargo_regime_id: regimeImport?.cargo_regime_id || 1,
        shipping_line_party_id: lineMaersk.party_id,
        consignee_party_id: consigneeTwiga?.party_id || lineMaersk.party_id,
        bill_to_party_id: consigneeTwiga?.party_id || lineMaersk.party_id,
        agent_party_id: agentBollore?.party_id || lineMaersk.party_id,
        ref_type: 'BL',
        ref_no: 'BL-DAR-2026-9901',
        status: 'OPEN'
      }
    });
  }

  let stay = await prisma.unit_stays.findFirst({ where: { unit_no: 'MSKU 882014 9' } });
  if (!stay) {
    stay = await prisma.unit_stays.create({
      data: {
        site_id: site.site_id,
        unit_type_id: ut40?.unit_type_id || 1,
        consignment_id: cons.consignment_id,
        cargo_regime_id: regimeImport?.cargo_regime_id || 1,
        yard_location_id: locA01?.yard_location_id,
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
  }

  // 6. Customs Declarations & Exams
  const customRef1 = await prisma.customs_refs.findFirst({ where: { ref_no: 'TANSAD-DAR1-2026-09412' } });
  if (!customRef1) {
    await prisma.customs_refs.create({
      data: {
        consignment_id: cons.consignment_id,
        unit_stay_id: stay.unit_stay_id,
        ref_type: 'TANSAD',
        ref_no: 'TANSAD-DAR1-2026-09412',
        status: 'CLEARED',
        lodged_at: new Date(Date.now() - 40 * 3600000),
        cleared_at: new Date(Date.now() - 8 * 3600000)
      }
    });
  }

  const customExam1 = await prisma.customs_exams.findFirst({ where: { unit_stay_id: stay.unit_stay_id } });
  if (!customExam1) {
    await prisma.customs_exams.create({
      data: {
        site_id: site.site_id,
        unit_stay_id: stay.unit_stay_id,
        exam_type: 'PHYSICAL',
        status: 'PASSED',
        officer_name: 'TRA Inspector J. Mwamba',
        requested_at: new Date(Date.now() - 20 * 3600000),
        completed_at: new Date(Date.now() - 2 * 3600000)
      }
    });
  }
  console.log('✅ Customs & Exams seeded: TANSAD-DAR1-2026-09412');

  // 7. Holds
  let hold1 = await prisma.holds.findFirst({ where: { unit_stay_id: stay.unit_stay_id } });
  if (!hold1) {
    hold1 = await prisma.holds.create({
      data: {
        unit_stay_id: stay.unit_stay_id,
        placed_by_user_id: user.user_id,
        hold_type: 'CUSTOMS',
        reason: 'Random Physical Verification Audit',
        status: 'ACTIVE',
        placed_at: new Date(Date.now() - 12 * 3600000)
      }
    });
  }
  console.log('✅ Holds seeded: CUSTOMS hold on MSKU 882014 9');

  // 8. Release Orders
  let ro1 = await prisma.release_orders.findFirst({ where: { release_no: 'RO-DAR1-26-001942' } });
  if (!ro1) {
    ro1 = await prisma.release_orders.create({
      data: {
        site_id: site.site_id,
        consignment_id: cons.consignment_id,
        requested_by_party_id: agentBollore?.party_id || lineMaersk.party_id,
        approved_by_user_id: user.user_id,
        release_no: 'RO-DAR1-26-001942',
        status: 'ISSUED',
        issued_at: new Date(Date.now() - 4 * 3600000),
        expires_at: new Date(Date.now() + 72 * 3600000)
      }
    });
  }
  console.log('✅ Release Orders seeded: RO-DAR1-26-001942');

  // 9. Dangerous Goods (DG Lines)
  let dg1 = await prisma.dg_lines.findFirst({ where: { un_number: 'UN 1203' } });
  if (!dg1) {
    dg1 = await prisma.dg_lines.create({
      data: {
        unit_stay_id: stay.unit_stay_id,
        un_number: 'UN 1203',
        imo_class: '3',
        packing_group: 'II',
        proper_shipping_name: 'GASOLINE / MOTOR SPIRIT'
      }
    });
  }
  console.log('✅ Dangerous Goods seeded: UN 1203 (Class 3)');

  // 10. Tariffs & Tariff Rules
  let tariff1 = await prisma.tariffs.findFirst({ where: { tariff_code: 'TAR-ICD-2026' } });
  if (!tariff1) {
    tariff1 = await prisma.tariffs.create({
      data: {
        company_id: comp.company_id,
        site_id: site.site_id,
        tariff_code: 'TAR-ICD-2026',
        tariff_name: 'Standard Inland Terminal Tariff 2026',
        valid_from: new Date('2026-01-01'),
        valid_to: new Date('2026-12-31'),
        is_active: true
      }
    });

    await prisma.tariff_rules.create({
      data: {
        tariff_id: tariff1.tariff_id,
        charge_code: 'STORAGE_DEMURRAGE',
        calculation_basis: 'PER_DAY',
        base_rate: 35.00,
        currency: 'USD',
        free_days: 7
      }
    });

    await prisma.tariff_rules.create({
      data: {
        tariff_id: tariff1.tariff_id,
        charge_code: 'GATE_LIFT_ON_OFF',
        calculation_basis: 'FLAT',
        base_rate: 55.00,
        currency: 'USD',
        free_days: 0
      }
    });
  }
  console.log('✅ Tariffs seeded: TAR-ICD-2026 with rules');

  // 11. Exchange Rates
  const exRate1 = await prisma.exchange_rates.findFirst({ where: { quote_currency: 'TZS', is_current: true } });
  if (!exRate1) {
    await prisma.exchange_rates.create({
      data: {
        company_id: comp.company_id,
        base_currency: 'USD',
        quote_currency: 'TZS',
        rate: 2650.0000,
        is_current: true
      }
    });
  }
  console.log('✅ Exchange Rates seeded: USD/TZS @ 2650.00');

  // 12. Cashier Shifts & Payments
  let shift1 = await prisma.cashier_shifts.findFirst({ where: { status: 'OPEN' } });
  if (!shift1) {
    shift1 = await prisma.cashier_shifts.create({
      data: {
        site_id: site.site_id,
        cashier_user_id: user.user_id,
        opening_balance: 500000.00,
        status: 'OPEN'
      }
    });
  }

  let pay1 = await prisma.payments.findFirst({ where: { payment_ref: 'PAY-2026-00812' } });
  if (!pay1) {
    pay1 = await prisma.payments.create({
      data: {
        site_id: site.site_id,
        cashier_shift_id: shift1.cashier_shift_id,
        party_id: consigneeTwiga?.party_id || lineMaersk.party_id,
        payment_ref: 'PAY-2026-00812',
        payment_channel: 'BANK_TRANSFER',
        amount: 165.20,
        currency: 'USD',
        status: 'COMPLETED'
      }
    });
  }
  console.log('✅ Cashier Shifts & Payments seeded: PAY-2026-00812');

  // 13. Billable Charges & Invoices
  let chg1 = await prisma.billable_charges.findFirst({ where: { charge_code: 'STORAGE_DEMURRAGE' } });
  if (!chg1) {
    chg1 = await prisma.billable_charges.create({
      data: {
        site_id: site.site_id,
        consignment_id: cons.consignment_id,
        bill_to_party_id: consigneeTwiga?.party_id || lineMaersk.party_id,
        unit_stay_id: stay.unit_stay_id,
        charge_code: 'STORAGE_DEMURRAGE',
        charge_name: 'Yard Storage Fee (4 Days)',
        quantity: 4.00,
        unit_price: 35.00,
        amount: 140.00,
        currency: 'USD',
        status: 'INVOICED'
      }
    });
  }

  let inv = await prisma.invoices.findFirst({ where: { invoice_no: 'INV-2026-003318' } });
  if (!inv) {
    inv = await prisma.invoices.create({
      data: {
        site_id: site.site_id,
        consignment_id: cons.consignment_id,
        bill_to_party_id: consigneeTwiga?.party_id || lineMaersk.party_id,
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
        invoice_id: inv.invoice_id,
        charge_id: chg1.charge_id,
        unit_stay_id: stay.unit_stay_id,
        line_no: 1,
        description: 'Yard Storage Fee (4 Days)',
        quantity: 4.00,
        unit_price: 35.00,
        amount: 140.00
      }
    });
  }
  console.log('✅ Invoices & Lines seeded: INV-2026-003318');

  // 14. Refunds & Disbursements
  const ref1 = await prisma.refunds.findFirst({ where: { invoice_id: inv.invoice_id } });
  if (!ref1) {
    await prisma.refunds.create({
      data: {
        site_id: site.site_id,
        invoice_id: inv.invoice_id,
        payment_id: pay1.payment_id,
        refund_amount: 35.00,
        status: 'APPROVED'
      }
    });
  }

  const disb1 = await prisma.disbursements.findFirst({ where: { site_id: site.site_id } });
  if (!disb1) {
    await prisma.disbursements.create({
      data: {
        site_id: site.site_id,
        party_id: agentBollore?.party_id || lineMaersk.party_id,
        amount: 520.00,
        currency: 'USD',
        status: 'APPROVED'
      }
    });
  }
  console.log('✅ Refunds & Disbursements seeded');

  console.log('🎉 Cargo & Money database seeding completed successfully!');
}

if (require.main === module) {
  seedCargoAndMoney()
    .catch((e) => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
