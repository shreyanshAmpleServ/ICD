import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { glPostings, periods } from '../data/money';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

export async function seedLedger() {
  console.log('🚀 Starting Ledger & Accounting Periods Seeder...');

  // 1. Ensure company 1 exists
  let company = await prisma.m_company.findFirst({ where: { company_id: 1 } });
  if (!company) {
    company = await prisma.m_company.create({
      data: {
        company_id: 1,
        company_code: 'BKD',
        company_name: 'Bandari Kavu Depots Ltd',
        tax_id: '128-406-733',
        currency: 'TZS',
        createdby: 'system',
      },
    });
    console.log('  + Created company 1: Bandari Kavu Depots Ltd');
  }

  // 2. Ensure permission exists
  const perm = await prisma.m_permission.findUnique({ where: { permission_code: 'finance.period.close' } });
  if (!perm) {
    await prisma.m_permission.create({
      data: {
        permission_code: 'finance.period.close',
        module_code: 'COMMERCIAL',
        description: 'Permission to view ledger postings and close periods',
        is_approval: false,
        createdby: 'system',
      },
    });
    console.log('  + Seeded permission: finance.period.close');
  }

  // 3. Seed Accounting Periods
  for (const p of periods) {
    const existing = await prisma.accounting_period.findFirst({
      where: { company_id: 1, period_key: p.periodKey },
    });

    if (existing) {
      await prisma.accounting_period.update({
        where: { accounting_period_id: existing.accounting_period_id },
        data: {
          period_start: new Date(p.periodStart + 'T00:00:00Z'),
          period_end: new Date(p.periodEnd + 'T00:00:00Z'),
          status: p.status,
          closed_at: (p as any).closedAt ? new Date((p as any).closedAt) : null,
          closed_by_sub: (p as any).closedBy || null,
          updatedby: 'system',
          updatedate: new Date(),
        },
      });
    } else {
      await prisma.accounting_period.create({
        data: {
          company_id: 1,
          period_key: p.periodKey,
          period_start: new Date(p.periodStart + 'T00:00:00Z'),
          period_end: new Date(p.periodEnd + 'T00:00:00Z'),
          status: p.status,
          closed_at: (p as any).closedAt ? new Date((p as any).closedAt) : null,
          closed_by_sub: (p as any).closedBy || null,
          createdby: 'system',
        },
      });
    }
  }
  console.log(`  + Seeded ${periods.length} accounting periods.`);

  // 4. Seed GL Postings (38 records: 30 POSTED, 6 PENDING, 2 FAILED)
  // Clear existing postings to ensure exact match with UI numbers
  await prisma.gl_posting.deleteMany({});

  for (const g of glPostings) {
    await prisma.gl_posting.create({
      data: {
        company_id: 1,
        source_entity: g.sourceEntity,
        source_id: BigInt(g.sourceId),
        destination: g.destination,
        posting_date: new Date(g.postingDate + 'T00:00:00Z'),
        status: g.status,
        journal_json: JSON.stringify(g.journalLines),
        external_ref: g.externalRef || null,
        attempts: g.attempts,
        last_error: g.lastError || null,
        posted_at: g.postedAt ? new Date(g.postedAt) : null,
        createdby: 'system',
      },
    });
  }
  console.log(`  + Seeded ${glPostings.length} GL postings.`);

  const postedCount = await prisma.gl_posting.count({ where: { status: 'POSTED' } });
  const pendingCount = await prisma.gl_posting.count({ where: { status: 'PENDING' } });
  const failedCount = await prisma.gl_posting.count({ where: { status: 'FAILED' } });
  const openPeriodCount = await prisma.accounting_period.count({ where: { status: 'OPEN' } });

  console.log('✅ Ledger Seeding Complete!');
  console.log(`   - Total Postings in DB: ${postedCount + pendingCount + failedCount}`);
  console.log(`   - Posted to NG: ${postedCount}`);
  console.log(`   - Queued (Pending): ${pendingCount}`);
  console.log(`   - Failed: ${failedCount}`);
  console.log(`   - Open periods: ${openPeriodCount}`);
}

seedLedger()
  .catch((e) => {
    console.error('❌ Ledger seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
