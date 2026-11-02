import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

// Holidays map
const HOLIDAYS: Record<string, string> = {
  '2026-07-07': 'Saba Saba',
  '2026-08-08': 'Nane Nane',
  '2026-08-26': 'Maulid',
  '2026-10-14': 'Nyerere Day',
  '2026-12-09': 'Independence Day',
  '2026-12-25': 'Christmas Day',
  '2026-12-26': 'Boxing Day',
  '2027-01-01': "New Year's Day",
};

function isSunday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay() === 0;
}

export async function seedExchangeRates() {
  console.log('🚀 Starting Exchange Rates Seeder...');

  // 1. Ensure Company exists
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

  // 2. Ensure Currencies USD and TZS exist
  for (const ccy of [
    { code: 'USD', name: 'US Dollar', minor_units: 2, symbol: '$' },
    { code: 'TZS', name: 'Tanzanian Shilling', minor_units: 2, symbol: 'TSh' },
  ]) {
    const existing = await prisma.m_currency.findUnique({ where: { currency_code: ccy.code } });
    if (!existing) {
      await prisma.m_currency.create({
        data: {
          currency_code: ccy.code,
          currency_name: ccy.name,
          minor_units: ccy.minor_units,
          symbol: ccy.symbol,
          createdby: 'system',
        },
      });
      console.log(`  + Seeded currency: ${ccy.code}`);
    }
  }

  // 3. Ensure permissions exist
  for (const permCode of ['billing.rates.view', 'finance.exchange_rate.edit']) {
    const perm = await prisma.m_permission.findUnique({ where: { permission_code: permCode } });
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

  // 4. Monthly rates (July, August, September - no October so October displays "— TZS")
  const monthlyRates = [
    { date: '2026-07-01', rate: 2618.40, note: 'Bank of Tanzania month-opening mean rate' },
    { date: '2026-08-01', rate: 2641.75, note: 'Bank of Tanzania month-opening mean rate' },
    { date: '2026-09-01', rate: 2652.10, note: 'Bank of Tanzania month-opening mean rate' },
  ];

  for (const m of monthlyRates) {
    const d = new Date(m.date + 'T00:00:00Z');
    await prisma.m_exchange_rate.upsert({
      where: {
        company_id_from_currency_to_currency_rate_date: {
          company_id: 1,
          from_currency: 'USD',
          to_currency: 'TZS',
          rate_date: d,
        },
      },
      update: {
        rate: m.rate,
        rate_kind: 'MONTHLY',
        source_note: m.note,
        updatedby: 'Grace Mrema',
        updatedate: new Date(),
      },
      create: {
        company_id: 1,
        from_currency: 'USD',
        to_currency: 'TZS',
        rate_date: d,
        rate: m.rate,
        rate_kind: 'MONTHLY',
        source_note: m.note,
        createdby: 'Grace Mrema',
      },
    });
    console.log(`  + Upserted MONTHLY rate: ${m.date} -> ${m.rate}`);
  }

  // 5. Daily rates (60 days ending at 2026-10-07)
  const baseDate = new Date('2026-10-07T00:00:00Z');
  const ratesToInsert: Array<{ date: string; rate: number; note: string; user: string }> = [];

  for (let i = 59; i >= 0; i--) {
    const cur = new Date(baseDate.getTime() - i * 86400000);
    const dateStr = cur.toISOString().split('T')[0];

    // Skip Sundays and holidays
    if (isSunday(dateStr) || HOLIDAYS[dateStr]) continue;

    let rateVal: number;
    let note = 'BoT mean rate 09:00';
    let user = 'Halima Said';

    if (dateStr === '2026-10-07') {
      rateVal = 2669.96;
      note = 'BoT mean rate 09:00';
      user = 'Grace Mrema';
    } else if (dateStr === '2026-10-06') {
      rateVal = 2670.00;
      note = 'BoT mean rate 09:00';
      user = 'Grace Mrema';
    } else if (dateStr === '2026-10-05') {
      rateVal = 2670.15;
      note = 'BoT mean rate 09:00';
      user = 'Halima Said';
    } else if (dateStr === '2026-10-03') {
      // Must be exactly 2670.40 for Sat 3 Oct carry-forward on Sun 4 Oct!
      rateVal = 2670.40;
      note = 'CRDB treasury buying rate';
      user = 'Grace Mrema';
    } else if (dateStr === '2026-10-02') {
      rateVal = 2670.50;
      note = 'BoT mean rate 09:00';
      user = 'Halima Said';
    } else if (dateStr === '2026-10-01') {
      rateVal = 2669.80;
      note = 'BoT mean rate 09:00';
      user = 'Grace Mrema';
    } else {
      const t = 59 - i;
      const v = 2646 + t * 0.32 + 6.5 * Math.sin(t / 7);
      rateVal = Math.round(v * 100) / 100;
      if (i % 3 === 0) {
        user = 'Grace Mrema';
        note = 'CRDB treasury buying rate';
      }
    }

    ratesToInsert.push({ date: dateStr, rate: rateVal, note, user });
  }

  for (const r of ratesToInsert) {
    const d = new Date(r.date + 'T00:00:00Z');
    await prisma.m_exchange_rate.upsert({
      where: {
        company_id_from_currency_to_currency_rate_date: {
          company_id: 1,
          from_currency: 'USD',
          to_currency: 'TZS',
          rate_date: d,
        },
      },
      update: {
        rate: r.rate,
        rate_kind: 'DAILY',
        source_note: r.note,
        updatedby: r.user,
        updatedate: new Date(),
      },
      create: {
        company_id: 1,
        from_currency: 'USD',
        to_currency: 'TZS',
        rate_date: d,
        rate: r.rate,
        rate_kind: 'DAILY',
        source_note: r.note,
        createdby: r.user,
      },
    });
  }

  console.log(`  + Seeded ${ratesToInsert.length} daily exchange rates up to 2026-10-07.`);

  const count = await prisma.m_exchange_rate.count();
  console.log(`✅ Total m_exchange_rate in database: ${count}`);
}

seedExchangeRates()
  .catch((e) => {
    console.error('❌ Exchange rates seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

