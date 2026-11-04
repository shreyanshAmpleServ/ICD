import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { channels as mockChannels, shifts as mockShifts, payments as mockPayments } from '../data/money';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

export async function seedCashier() {
  console.log('🚀 Starting Cashier & Payments Seeder...');

  // 1. Ensure Payment Channels exist
  console.log('💳 Seeding Payment Channels...');
  const channelMap: Record<string, number> = {};

  for (const ch of mockChannels) {
    let row = await (prisma as any).m_payment_channel.findFirst({
      where: { channel_code: ch.channelCode },
    });

    if (!row) {
      row = await (prisma as any).m_payment_channel.create({
        data: {
          company_id: 1,
          channel_code: ch.channelCode,
          channel_name: ch.channelName,
          method: ch.method,
          provider: ch.provider || null,
          currency: ch.currency,
          gl_account: ch.glAccount || null,
          reference_pattern: ch.referencePattern || null,
          is_active: ch.isActive ?? true,
          createdby: 'system',
        },
      });
      console.log(`  + Seeded payment channel: ${ch.channelCode} (${ch.channelName})`);
    }
    channelMap[ch.channelCode] = row.payment_channel_id;
  }

  // 2. Seed Cashier Shifts
  console.log('💼 Seeding Cashier Shifts...');
  const shiftMap: Record<number, bigint> = {};

  for (const s of mockShifts) {
    let row = await (prisma as any).cashier_shift.findFirst({
      where: {
        site_id: 1,
        cashier_sub: s.cashier,
        currency: s.currency,
        status: s.status,
      },
    });

    if (!row) {
      row = await (prisma as any).cashier_shift.create({
        data: {
          site_id: 1,
          cashier_sub: s.cashier,
          currency: s.currency,
          opened_at: s.openedAt ? new Date(s.openedAt) : new Date(),
          closed_at: s.closedAt ? new Date(s.closedAt) : null,
          opening_float: Number(s.openingFloat || 0),
          expected_cash: Number(s.expectedCash || s.openingFloat || 0),
          counted_cash: s.countedCash ? Number(s.countedCash) : null,
                    status: s.status || 'OPEN',
          createdby: s.cashier || 'system',
        },
      });
      console.log(`  + Seeded cashier shift: ID ${row.cashier_shift_id} (${s.cashier} - ${s.currency} - ${s.status})`);
    }
    shiftMap[s.cashierShiftId] = row.cashier_shift_id;
  }

  const defaultShiftId = Object.values(shiftMap)[0] || null;

  // 3. Seed Payments and Allocations
  console.log(`💰 Seeding ${mockPayments.length} Payments & Allocations...`);
  let paymentsCount = 0;
  let allocationsCount = 0;

  for (const p of mockPayments) {
    const channelId = channelMap[p.channelCode] || Object.values(channelMap)[0] || 1;

    let existing = await (prisma as any).payment.findFirst({
      where: { receipt_no: p.receiptNo },
    });

    let paymentId: bigint;

    if (!existing) {
      const created = await (prisma as any).payment.create({
        data: {
          company_id: 1,
          site_id: p.siteId || 1,
          receipt_no: p.receiptNo,
          party_id: p.partyId,
          payment_channel_id: channelId,
          external_ref: p.externalRef || null,
          currency: p.currency,
          amount: Number(p.amount),
          exchange_rate: Number(p.exchangeRate || 1),
          amount_base: Number(p.amountBase || p.amount),
          amount_allocated: Number(p.amountAllocated || 0),
                    received_at: p.receivedAt ? new Date(p.receivedAt) : new Date(),
          value_date: p.valueDate ? new Date(p.valueDate) : null,
          status: p.status || 'RECEIVED',
          cashier_shift_id: defaultShiftId,
          createdby: p.cashier || 'Ashok Kumar',
        },
      });
      paymentId = created.payment_id;
      paymentsCount++;
    } else {
      paymentId = existing.payment_id;
    }

    // Seed Allocations for this payment
    if (p.allocations && p.allocations.length > 0) {
      for (const a of p.allocations) {
        // Find existing invoice or fallback
        const invRow = await (prisma as any).invoice.findFirst({
          where: {
            OR: [
              { invoice_id: BigInt(a.invoiceId) },
              { invoice_no: a.invoiceNo },
            ],
          },
        });

        if (invRow) {
          const allocExists = await (prisma as any).payment_allocation.findFirst({
            where: {
              payment_id: paymentId,
              invoice_id: invRow.invoice_id,
            },
          });

          if (!allocExists) {
            await (prisma as any).payment_allocation.create({
              data: {
                payment_id: paymentId,
                invoice_id: invRow.invoice_id,
                amount: Number(a.amount),
                amount_invoice_ccy: Number(a.amountInvoiceCcy || a.amount),
                fx_difference_base: Number(a.fxDifferenceBase || 0),
                allocated_at: a.allocatedAt ? new Date(a.allocatedAt) : new Date(),
                createdby: p.cashier || 'Ashok Kumar',
              },
            });
            allocationsCount++;
          }
        }
      }
    }
  }

  console.log(`✅ Cashier Seeding Complete!`);
  console.log(`   - Payment Channels: ${Object.keys(channelMap).length}`);
  console.log(`   - Cashier Shifts:   ${Object.keys(shiftMap).length}`);
  console.log(`   - Payments Seeded:  ${paymentsCount}`);
  console.log(`   - Allocations:      ${allocationsCount}`);
}

if (require.main === module && process.argv[1] && /seed/i.test(process.argv[1])) {
  seedCashier()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('❌ Seeder failed:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
