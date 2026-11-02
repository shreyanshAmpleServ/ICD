import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { invoices as mockInvoices } from '../data/money';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

export async function seedInvoices() {
  console.log('🚀 Starting Invoices Seeder...');

  // 1. Ensure Charge Codes exist
  const chargeCodeMap: Record<string, number> = {};
  const chargeCodes = [
    { code: 'LIFT_ON_OFF', name: 'Lift on / lift off', group: 'HANDLING' },
    { code: 'STORAGE_IMPORT', name: 'Storage, import container', group: 'STORAGE' },
    { code: 'STORAGE_TRANSIT', name: 'Storage, transit container', group: 'STORAGE' },
    { code: 'CFS_HANDLING', name: 'CFS cargo handling', group: 'HANDLING' },
    { code: 'DISB_PORT', name: 'Port disbursement charges', group: 'DISBURSEMENT' },
    { code: 'DISB_HANDLING_FEE', name: 'Disbursement handling fee', group: 'DISBURSEMENT' },
    { code: 'WEIGHING', name: 'Weighbridge ticket', group: 'HANDLING' },
    { code: 'DOC_FEE', name: 'Documentation fee', group: 'DOCUMENTATION' },
  ];

  for (const c of chargeCodes) {
    let row = await prisma.m_charge_code.findUnique({ where: { charge_code: c.code } });
    if (!row) {
      row = await prisma.m_charge_code.create({
        data: {
          charge_code: c.code,
          charge_name: c.name,
          charge_group: c.group,
          default_tax_code: 'VAT18',
          createdby: 'system',
        },
      });
      console.log(`  + Seeded charge code: ${c.code}`);
    }
    chargeCodeMap[c.code] = row.charge_code_id;
  }

  const defaultChargeCodeId = Object.values(chargeCodeMap)[0] || 1;

  // 2. Loop through all 29 mock invoices
  console.log(`📦 Seeding ${mockInvoices.length} invoices with lines and fiscal receipts...`);
  let count = 0;

  for (const inv of mockInvoices) {
    const invId = BigInt(inv.invoiceId);

    // Upsert Invoice Header
    await prisma.invoice.upsert({
      where: { invoice_id: invId },
      update: {
        doc_kind: inv.docKind,
        invoice_no: inv.invoiceNo,
        status: inv.status,
        site_id: inv.siteId ?? 1,
        bill_to_party_id: inv.billToPartyId,
        consignment_id: inv.consignmentId ? BigInt(inv.consignmentId) : null,
        currency: inv.currency,
        base_currency: inv.baseCurrency || 'TZS',
        exchange_rate: Number(inv.exchangeRate || 1),
        exchange_rate_date: inv.exchangeRateDate ? new Date(inv.exchangeRateDate) : null,
        invoice_date: new Date(inv.invoiceDate),
        due_date: inv.dueDate ? new Date(inv.dueDate) : null,
        service_to_date: inv.serviceToDate ? new Date(inv.serviceToDate) : null,
        subtotal: Number(inv.subtotal || 0),
        tax_total: Number(inv.taxTotal || 0),
        total: Number(inv.total || 0),
        total_base: Number(inv.totalBase || 0),
        amount_paid: Number(inv.amountPaid || 0),
        amount_credited: Number(inv.amountCredited || 0),
        proforma_invoice_id: inv.proformaInvoiceId ? BigInt(inv.proformaInvoiceId) : null,
        original_invoice_id: inv.originalInvoiceId ? BigInt(inv.originalInvoiceId) : null,
        reason: inv.reason || null,
        posted_at: inv.postedAt ? new Date(inv.postedAt) : null,
        createdby: inv.createdBy || 'Neema Mushi',
      },
      create: {
        invoice_id: invId,
        company_id: 1,
        site_id: inv.siteId ?? 1,
        doc_kind: inv.docKind,
        invoice_no: inv.invoiceNo,
        status: inv.status,
        bill_to_party_id: inv.billToPartyId,
        consignment_id: inv.consignmentId ? BigInt(inv.consignmentId) : null,
        currency: inv.currency,
        base_currency: inv.baseCurrency || 'TZS',
        exchange_rate: Number(inv.exchangeRate || 1),
        exchange_rate_date: inv.exchangeRateDate ? new Date(inv.exchangeRateDate) : null,
        invoice_date: new Date(inv.invoiceDate),
        due_date: inv.dueDate ? new Date(inv.dueDate) : null,
        service_to_date: inv.serviceToDate ? new Date(inv.serviceToDate) : null,
        subtotal: Number(inv.subtotal || 0),
        tax_total: Number(inv.taxTotal || 0),
        total: Number(inv.total || 0),
        total_base: Number(inv.totalBase || 0),
        amount_paid: Number(inv.amountPaid || 0),
        amount_credited: Number(inv.amountCredited || 0),
        proforma_invoice_id: inv.proformaInvoiceId ? BigInt(inv.proformaInvoiceId) : null,
        original_invoice_id: inv.originalInvoiceId ? BigInt(inv.originalInvoiceId) : null,
        reason: inv.reason || null,
        posted_at: inv.postedAt ? new Date(inv.postedAt) : null,
        createdby: inv.createdBy || 'Neema Mushi',
      },
    });

    // Clean and insert Invoice Lines
    await prisma.invoice_line.deleteMany({ where: { invoice_id: invId } });

    if (inv.lines && inv.lines.length > 0) {
      for (const line of inv.lines) {
        const cId = (line.chargeCode && chargeCodeMap[line.chargeCode]) || defaultChargeCodeId;
        await prisma.invoice_line.create({
          data: {
            invoice_id: invId,
            line_no: line.lineNo || 1,
            line_doc_kind: inv.docKind,
            charge_code_id: cId,
            description: line.description || 'Logistics service charge',
            service_from: line.serviceFrom ? new Date(line.serviceFrom) : null,
            service_to: line.serviceTo ? new Date(line.serviceTo) : null,
            quantity: Number(line.quantity || 1),
            uom: line.uom || 'UNIT',
            unit_rate: Number(line.unitRate || line.amount || 0),
            amount: Number(line.amount || 0),
            tax_rate_pct: Number(line.taxRatePct || (line as any).taxPct || 0),
            tax_amount: Number(line.taxAmount || 0),
            line_total: Number(line.lineTotal || (Number(line.amount || 0) + Number(line.taxAmount || 0))),
            createdby: 'Neema Mushi',
          },
        });
      }
    }

    // Upsert Fiscal Receipt
    if (inv.fiscalReceipt) {
      await prisma.fiscal_receipt.upsert({
        where: { invoice_id: invId },
        update: {
          provider: inv.fiscalReceipt.provider,
          status: inv.fiscalReceipt.status,
          receipt_no: inv.fiscalReceipt.receiptNo,
          verification_code: inv.fiscalReceipt.verificationCode,
          verification_url: inv.fiscalReceipt.verificationUrl,
          issued_at: inv.fiscalReceipt.issuedAt ? new Date(inv.fiscalReceipt.issuedAt) : null,
          attempts: inv.fiscalReceipt.attempts || 1,
          last_error: inv.fiscalReceipt.lastError || null,
        },
        create: {
          invoice_id: invId,
          provider: inv.fiscalReceipt.provider,
          status: inv.fiscalReceipt.status,
          receipt_no: inv.fiscalReceipt.receiptNo,
          verification_code: inv.fiscalReceipt.verificationCode,
          verification_url: inv.fiscalReceipt.verificationUrl,
          issued_at: inv.fiscalReceipt.issuedAt ? new Date(inv.fiscalReceipt.issuedAt) : null,
          attempts: inv.fiscalReceipt.attempts || 1,
          last_error: inv.fiscalReceipt.lastError || null,
          createdby: 'system',
        },
      });
    }

    count++;
  }

  console.log(`✅ Successfully seeded ${count} invoices with lines & fiscal receipts.`);
}

if (require.main === module) {
  seedInvoices()
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
