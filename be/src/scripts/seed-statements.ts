import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

export async function seedStatements() {
  console.log('🚀 Starting Statements & AR Seeder...');

  // 1. Ensure Site exists
  let site = await prisma.m_site.findFirst({ where: { site_code: 'KBH1' } });
  if (!site) site = await prisma.m_site.findFirst();
  const siteId = site ? site.site_id : 1;

  // 2. Ensure Permissions exist
  for (const permCode of ['billing.invoice.view', 'finance.period.close']) {
    let perm = await prisma.m_permission.findUnique({ where: { permission_code: permCode } });
    if (!perm) {
      await prisma.m_permission.create({
        data: {
          permission_code: permCode,
          module_code: 'COMMERCIAL',
          description: `Permission ${permCode}`,
          is_approval: false,
          createdby: 'system',
        },
      });
      console.log(`  + Seeded permission: ${permCode}`);
    }
  }

  // 3. Ensure Master Parties with exact terms and credit limits
  const customerDefs = [
    { code: 'C-KILELE', name: 'Kilele Clearing & Forwarding', terms: 'CREDIT', limit: 40000.0, ccy: 'USD' },
    { code: 'C-MZIZI', name: 'Mzizi Traders Ltd', terms: 'CREDIT', limit: 25000.0, ccy: 'USD' },
    { code: 'C-PWANIHW', name: 'Pwani Hardware Wholesalers', terms: 'CASH', limit: null, ccy: null },
    { code: 'C-BAHARI', name: 'Bahari Motors Ltd', terms: 'CASH', limit: null, ccy: null },
    { code: 'C-ZAMLINK', name: 'Zamlink Distributors (Lusaka)', terms: 'CASH', limit: null, ccy: null },
    { code: 'C-NYOTA', name: 'Nyota Agro Exports', terms: 'CASH', limit: null, ccy: null },
    { code: 'C-NEWCO', name: 'Tanzanite Pharma Distributors', terms: 'CASH', limit: null, ccy: null },
    { code: 'C-KAGERA', name: 'Kagera Builders Supply', terms: 'BLOCKED', limit: null, ccy: null },
  ];

  const partyMap: Record<string, number> = {};

  for (const c of customerDefs) {
    let party = await prisma.m_party.findUnique({ where: { party_code: c.code } });
    if (!party) {
      party = await prisma.m_party.create({
        data: {
          party_code: c.code,
          party_name: c.name,
          credit_status: c.terms,
          credit_limit: c.limit,
          credit_currency: c.ccy,
          default_currency: 'USD',
          country_code: 'TZ',
          createdby: 'system',
        },
      });
      console.log(`  + Created party: ${c.name} (Code: ${c.code}, ID: ${party.party_id})`);
    } else {
      await prisma.m_party.update({
        where: { party_id: party.party_id },
        data: {
          credit_status: c.terms,
          credit_limit: c.limit,
          credit_currency: c.ccy,
        },
      });
      console.log(`  ~ Updated terms for: ${c.name} (${c.terms})`);
    }
    partyMap[c.code] = party.party_id;

    // Ensure CUSTOMER role exists
    const role = await prisma.m_party_role.findFirst({
      where: { party_id: party.party_id, role_code: 'CUSTOMER' },
    });
    if (!role) {
      await prisma.m_party_role.create({
        data: {
          party_id: party.party_id,
          role_code: 'CUSTOMER',
          createdby: 'system',
        },
      });
    }
  }

  // 4. Ensure Payment Channel exists
  let channel = await prisma.m_payment_channel.findFirst({ where: { channel_code: 'CRDB_USD' } });
  if (!channel) {
    channel = await prisma.m_payment_channel.create({
      data: {
        company_id: 1,
        channel_code: 'CRDB_USD',
        channel_name: 'CRDB Bank USD',
        method: 'BANK_TRANSFER',
        currency: 'USD',
        createdby: 'system',
      },
    });
  }

  // Helper date function (relative to today)
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  // 5. Invoices for Statements
  const statementInvoices = [
    // --- Kilele Clearing & Forwarding (Total Outstanding $2,604.84 | Overdue $694.62) ---
    {
      invoiceNo: 'INV-DAR1-26-003310',
      partyCode: 'C-KILELE',
      docKind: 'TAX_INVOICE',
      status: 'POSTED',
      invoiceDate: daysAgo(4),
      dueDate: daysAgo(-26), // Not overdue
      total: 1910.22,
      paid: 0,
      credited: 0,
    },
    {
      invoiceNo: 'INV-DAR1-26-003250',
      partyCode: 'C-KILELE',
      docKind: 'TAX_INVOICE',
      status: 'POSTED',
      invoiceDate: daysAgo(45),
      dueDate: daysAgo(15), // Overdue by 15 days ($694.62)
      total: 694.62,
      paid: 0,
      credited: 0,
    },

    // --- Mzizi Traders Ltd (Total Outstanding $2,388.13 | Overdue $615.96) ---
    {
      invoiceNo: 'INV-DAR1-26-003305',
      partyCode: 'C-MZIZI',
      docKind: 'TAX_INVOICE',
      status: 'POSTED',
      invoiceDate: daysAgo(8),
      dueDate: daysAgo(-22), // Not overdue ($1,772.17)
      total: 1772.17,
      paid: 0,
      credited: 0,
    },
    {
      invoiceNo: 'INV-DAR1-26-003240',
      partyCode: 'C-MZIZI',
      docKind: 'TAX_INVOICE',
      status: 'POSTED',
      invoiceDate: daysAgo(42),
      dueDate: daysAgo(12), // Overdue by 12 days ($615.96)
      total: 615.96,
      paid: 0,
      credited: 0,
    },

    // --- Pwani Hardware Wholesalers (Outstanding $177.00 | Current, not overdue) ---
    {
      invoiceNo: 'INV-DAR1-26-003315',
      partyCode: 'C-PWANIHW',
      docKind: 'TAX_INVOICE',
      status: 'POSTED',
      invoiceDate: daysAgo(2),
      dueDate: daysAgo(-28),
      total: 177.00,
      paid: 0,
      credited: 0,
    },
  ];

  console.log('📄 Seeding Invoices for Statement Balances...');
  for (const inv of statementInvoices) {
    const partyId = partyMap[inv.partyCode];
    if (!partyId) continue;

    const existing = await prisma.invoice.findFirst({ where: { invoice_no: inv.invoiceNo } });
    const payload = {
      company_id: 1,
      site_id: siteId,
      doc_kind: inv.docKind,
      invoice_no: inv.invoiceNo,
      status: inv.status,
      bill_to_party_id: partyId,
      currency: 'USD',
      base_currency: 'TZS',
      exchange_rate: 2600.0,
      invoice_date: inv.invoiceDate,
      due_date: inv.dueDate,
      subtotal: inv.total / 1.18,
      tax_total: inv.total - inv.total / 1.18,
      total: inv.total,
      total_base: inv.total * 2600.0,
      amount_paid: inv.paid,
      amount_credited: inv.credited,
      posted_at: inv.invoiceDate,
      createdby: 'system',
    };

    if (existing) {
      await prisma.invoice.update({
        where: { invoice_id: existing.invoice_id },
        data: payload,
      });
      console.log(`  ~ Updated invoice: ${inv.invoiceNo}`);
    } else {
      await prisma.invoice.create({
        data: payload,
      });
      console.log(`  + Created invoice: ${inv.invoiceNo} ($${inv.total})`);
    }
  }

  // 6. Payments for On-Account (Advance Credit)
  const onAccountPayments = [
    // Mzizi Traders Ltd: On account USD 692.69
    {
      receiptNo: 'RCT-DAR1-26-018840',
      partyCode: 'C-MZIZI',
      amount: 1500.00,
      allocated: 807.31, // unallocated = 692.69
      receivedAt: daysAgo(10),
    },
    // Bahari Motors Ltd: On account USD 99.25
    {
      receiptNo: 'RCT-DAR1-26-018855',
      partyCode: 'C-BAHARI',
      amount: 99.25,
      allocated: 0.00, // unallocated = 99.25
      receivedAt: daysAgo(14),
    },
    // Nyota Agro Exports: On account USD 154.31
    {
      receiptNo: 'RCT-DAR1-26-018847',
      partyCode: 'C-NYOTA',
      amount: 474.31,
      allocated: 320.00, // unallocated = 154.31
      receivedAt: daysAgo(18),
    },
    // Tanzanite Pharma Distributors: On account USD 640.00
    {
      receiptNo: 'RCT-DAR1-26-018853',
      partyCode: 'C-NEWCO',
      amount: 640.00,
      allocated: 0.00, // unallocated = 640.00
      receivedAt: daysAgo(5),
    },
  ];

  console.log('💵 Seeding On-Account Payments...');
  for (const pay of onAccountPayments) {
    const partyId = partyMap[pay.partyCode];
    if (!partyId) continue;

    const existing = await prisma.payment.findFirst({ where: { receipt_no: pay.receiptNo } });
    const payload = {
      company_id: 1,
      site_id: siteId,
      receipt_no: pay.receiptNo,
      party_id: partyId,
      payment_channel_id: channel.payment_channel_id,
      amount: pay.amount,
      currency: 'USD',
      exchange_rate: 1.0,
      amount_base: pay.amount * 2600.0,
      amount_allocated: pay.allocated,
      status: 'RECEIVED',
      received_at: pay.receivedAt,
      createdby: 'system',
    };

    if (existing) {
      await prisma.payment.update({
        where: { payment_id: existing.payment_id },
        data: payload,
      });
      console.log(`  ~ Updated payment: ${pay.receiptNo}`);
    } else {
      await prisma.payment.create({
        data: payload,
      });
      console.log(`  + Created payment: ${pay.receiptNo} (On account: $${pay.amount - pay.allocated})`);
    }
  }

  console.log('✅ Successfully seeded Statements AR master and transactions into Database!');
}

if (require.main === module && process.argv[1] && /seed/i.test(process.argv[1])) {
  seedStatements()
    .catch((err) => {
      console.error('❌ Seeder failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
