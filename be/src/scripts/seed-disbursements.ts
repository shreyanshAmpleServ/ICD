import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { disbursements as mockDisbursements } from '../data/money';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

export async function seedDisbursements() {
  console.log('🚀 Starting Disbursements Seeder...');

  // 1. Ensure Site exists
  let site = await prisma.m_site.findFirst({ where: { site_code: 'DAR1' } });
  if (!site) {
    site = await prisma.m_site.findFirst();
  }
  const siteId = site ? site.site_id : 1;

  // 2. Ensure Permissions exist
  const permCode = 'finance.disbursement.record';
  let perm = await prisma.m_permission.findUnique({ where: { permission_code: permCode } });
  if (!perm) {
    perm = await prisma.m_permission.create({
      data: {
        permission_code: permCode,
        module_code: 'COMMERCIAL',
        description: 'Record and manage customer disbursements',
        is_approval: false,
        supports_limit: true,
        createdby: 'system',
      },
    });
    console.log(`  + Seeded permission: ${permCode}`);
  }

  // 3. Ensure Charge Codes exist
  const chargeDefs = [
    { code: 'DISB_PORT', name: 'Port charges (paid on your behalf)', group: 'DISBURSEMENT' },
    { code: 'DISB_LINE', name: 'Shipping line charges (paid on your behalf)', group: 'DISBURSEMENT' },
    { code: 'DISB_DUTY', name: 'Customs duty (paid on your behalf)', group: 'DISBURSEMENT' },
    { code: 'DISB_HANDLING_FEE', name: 'Disbursement handling fee', group: 'DISBURSEMENT' },
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
          is_disbursement: true,
          default_tax_code: 'VAT18',
          createdby: 'system',
        },
      });
      console.log(`  + Seeded charge code: ${c.code}`);
    }
    chargeCodeMap[c.code] = row.charge_code_id;
  }

  // 4. Ensure Parties exist (both Customers and Payees)
  const partyDefs = [
    { code: 'MTL', name: 'Mzizi Traders Ltd', type: 'CUSTOMER' },
    { code: 'KCF', name: 'Kilele Clearing & Forwarding', type: 'CUSTOMER' },
    { code: 'BML', name: 'Blue Meridian Line', type: 'SHIPPING_LINE' },
    { code: 'IOSL', name: 'Indian Ocean Shipping', type: 'SHIPPING_LINE' },
    { code: 'PHW', name: 'Pwani Hardware Wholesalers', type: 'CUSTOMER' },
    { code: 'KBS', name: 'Kagera Builders Supply', type: 'CUSTOMER' },
    { code: 'PA_DSM', name: 'Port authority, Dar es Salaam port', type: 'VENDOR' },
    { code: 'TRA_CUST', name: 'TRA customs (duty and taxes)', type: 'AUTHORITY' },
  ];

  const partyCodeToId: Record<string, number> = {};
  for (const p of partyDefs) {
    let existing = await prisma.m_party.findUnique({ where: { party_code: p.code } });
    if (!existing) {
      existing = await prisma.m_party.create({
        data: {
          party_code: p.code,
          party_name: p.name,
          country_code: 'TZ',
          disbursement_service: true,
          createdby: 'system',
        },
      });
      console.log(`  + Seeded party: ${p.name} (Code: ${p.code}, ID: ${existing.party_id})`);
    }
    partyCodeToId[p.code] = existing.party_id;
  }

  // Helper map from mock party ids to real IDs
  const mockPartyIdMap: Record<number, number> = {
    1: partyCodeToId['MTL'],
    2: partyCodeToId['KCF'],
    4: partyCodeToId['BML'],
    5: partyCodeToId['IOSL'],
    11: partyCodeToId['PHW'],
    14: partyCodeToId['KBS'],
  };

  const resolvePayeeId = (payeeName: string, payeePartyId?: number): number => {
    if (payeePartyId && mockPartyIdMap[payeePartyId]) return mockPartyIdMap[payeePartyId];
    if (payeeName.toLowerCase().includes('port authority')) return partyCodeToId['PA_DSM'];
    if (payeeName.toLowerCase().includes('tra customs')) return partyCodeToId['TRA_CUST'];
    if (payeeName.toLowerCase().includes('indian ocean')) return partyCodeToId['IOSL'];
    if (payeeName.toLowerCase().includes('blue meridian')) return partyCodeToId['BML'];
    return partyCodeToId['PA_DSM'];
  };

  // 5. Ensure Consignments exist
  const consignmentDefs = [
    { refNo: 'BMLU2409881', billToCode: 'KCF' },
    { refNo: 'BMLU2409902', billToCode: 'PHW' },
    { refNo: 'IOSL0926S0441', billToCode: 'KCF' },
    { refNo: 'IOSL0926S0457', billToCode: 'KBS' },
    { refNo: 'IOSL0926S0470', billToCode: 'MTL' },
  ];

  const refNoToConsignmentId: Record<string, bigint> = {};
  for (const c of consignmentDefs) {
    let existing = await prisma.consignment.findFirst({ where: { ref_no: c.refNo } });
    if (!existing) {
      existing = await prisma.consignment.create({
        data: {
          site_id: siteId,
          ref_type: 'BL',
          ref_no: c.refNo,
          bill_to_party_id: partyCodeToId[c.billToCode] || 1,
          cargo_regime_id: 1,
          createdby: 'system',
        },
      });
      console.log(`  + Seeded consignment: ${c.refNo} (ID: ${existing.consignment_id})`);
    }
    refNoToConsignmentId[c.refNo] = existing.consignment_id;
  }

  const mockConsignmentMap: Record<number, bigint> = {
    101: refNoToConsignmentId['BMLU2409881'],
    102: refNoToConsignmentId['BMLU2409902'],
    103: refNoToConsignmentId['IOSL0926S0441'],
    104: refNoToConsignmentId['IOSL0926S0457'],
    109: refNoToConsignmentId['IOSL0926S0470'],
  };

  // 6. Ensure Approval Request exists for Written-off disbursement (DSB-DAR1-26-0176)
  const writeOffAppNo = 'APR-DAR1-26-DISB-0176';
  let writeOffApp = await prisma.approval_request.findUnique({ where: { request_no: writeOffAppNo } });
  if (!writeOffApp) {
    writeOffApp = await prisma.approval_request.create({
      data: {
        site_id: siteId,
        request_no: writeOffAppNo,
        permission_code: permCode,
        entity_name: 'disbursement',
        entity_id: BigInt(176),
        summary: 'Write off unrecoverable port storage charges for Kagera Builders Supply',
        reason: 'Consignment storage exceeded recovery threshold and cleared under waiver',
        amount: 210.0,
        amount_currency: 'USD',
        levels_required: 1,
        current_level: 1,
        status: 'APPROVED',
        requested_by_sub: 'usr_joseph',
        decided_at: new Date(),
        applied_at: new Date(),
        createdby: 'system',
      },
    });
    console.log(`  + Seeded write-off approval request: ${writeOffAppNo}`);
  }

  // 7. Seed Disbursements
  console.log(`💳 Seeding ${mockDisbursements.length} Disbursements into Database...`);
  let seededCount = 0;

  for (const d of mockDisbursements) {
    const payeeId = resolvePayeeId(d.payeeName, d.payeePartyId);
    const billToId = mockPartyIdMap[d.billToPartyId] || partyCodeToId['KCF'];
    const chargeCodeId = chargeCodeMap[d.chargeCode] || Object.values(chargeCodeMap)[0] || 1;
    const consignmentId = mockConsignmentMap[d.consignmentId] || Object.values(refNoToConsignmentId)[0];
    const writeOffId = d.status === 'WRITTEN_OFF' ? writeOffApp.approval_request_id : null;

    let existing = d.payeeReceiptNo
      ? await prisma.disbursement.findFirst({ where: { payee_receipt_no: d.payeeReceiptNo } })
      : await prisma.disbursement.findFirst({ where: { description: d.description } });

    const payload = {
      site_id: siteId,
      consignment_id: consignmentId,
      bill_to_party_id: billToId,
      payee_party_id: payeeId,
      charge_code_id: chargeCodeId,
      description: d.description,
      currency: d.currency,
      amount_paid: parseFloat(d.amountPaid),
      paid_at: new Date(d.paidAt),
      payee_receipt_no: d.payeeReceiptNo,
      rebill_mode: d.rebillMode,
      handling_fee: parseFloat(d.handlingFee || '0'),
      status: d.status,
      write_off_approval_request_id: writeOffId,
      createdby: d.recordedBy || 'Halima Said',
    };

    let actualDisbId: bigint;

    if (existing) {
      const updated = await prisma.disbursement.update({
        where: { disbursement_id: existing.disbursement_id },
        data: payload,
      });
      actualDisbId = updated.disbursement_id;
      console.log(`  ~ Updated disbursement: ${d.disbNo} (DB ID: ${actualDisbId})`);
    } else {
      const created = await prisma.disbursement.create({
        data: payload,
      });
      actualDisbId = created.disbursement_id;
      console.log(`  + Created disbursement: ${d.disbNo} (DB ID: ${actualDisbId})`);
    }

    // 8. Link to Invoice Line if INVOICED
    if (d.status === 'INVOICED' && d.invoiceId) {
      const invId = BigInt(d.invoiceId);
      const invoiceRow = await prisma.invoice.findUnique({ where: { invoice_id: invId } });
      if (invoiceRow) {
        const existingLine = await prisma.invoice_line.findFirst({
          where: { disbursement_id: actualDisbId },
        });

        if (!existingLine) {
          const maxLine = await prisma.invoice_line.findFirst({
            where: { invoice_id: invId },
            orderBy: { line_no: 'desc' },
          });
          const nextLineNo = (maxLine?.line_no ?? 0) + 1;

          await prisma.invoice_line.create({
            data: {
              invoice_id: invId,
              line_no: nextLineNo,
              line_doc_kind: 'ORIGINAL',
              disbursement_id: actualDisbId,
              charge_code_id: chargeCodeId,
              description: `${d.description} (Rebill)`,
              currency: d.currency,
              unit_price: parseFloat(d.amountPaid) + parseFloat(d.handlingFee || '0'),
              quantity: 1,
              tax_code: 'VAT18',
              tax_rate_pct: 18.0,
              amount_ex_tax: parseFloat(d.amountPaid) + parseFloat(d.handlingFee || '0'),
              tax_amount: (parseFloat(d.amountPaid) + parseFloat(d.handlingFee || '0')) * 0.18,
              total_amount: (parseFloat(d.amountPaid) + parseFloat(d.handlingFee || '0')) * 1.18,
              is_rebill: true,
              createdby: 'system',
            },
          });
          console.log(`    -> Linked to invoice #${invId} (Line ${nextLineNo})`);
        }
      }
    }

    seededCount++;
  }

  console.log(`✅ Successfully seeded ${seededCount} disbursements into Database!`);
}

// Standalone execution
if (require.main === module) {
  seedDisbursements()
    .catch((err) => {
      console.error('❌ Seeder failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
