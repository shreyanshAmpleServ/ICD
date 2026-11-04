import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { refunds as mockRefunds } from '../data/money';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

export async function seedRefunds() {
  console.log('🚀 Starting Refunds Seeder...');

  // 1. Ensure Permission exists for refund maker-checker
  const permCode = 'payment.refund';
  let perm = await prisma.m_permission.findUnique({
    where: { permission_code: permCode },
  });

  if (!perm) {
    perm = await prisma.m_permission.create({
      data: {
        permission_code: permCode,
        module_code: 'COMMERCIAL',
        description: 'Approve and issue payment refunds',
        is_approval: true,
        supports_limit: true,
        createdby: 'system',
      },
    });
    console.log(`  + Seeded permission: ${permCode}`);
  }

  // 2. Fetch or identify fallback payments to link refunds to
  const existingPayments = await prisma.payment.findMany({
    take: 10,
    orderBy: { payment_id: 'asc' },
  });

  let defaultPaymentId: bigint | null = existingPayments.length > 0 ? existingPayments[0].payment_id : null;

  if (!defaultPaymentId) {
    // Ensure valid party exists
    let partyRow = await prisma.m_party.findFirst();
    if (!partyRow) {
      partyRow = await prisma.m_party.create({
        data: {
          company_id: 1,
          party_code: 'C-TZN',
          party_name: 'Tanzanite Pharma Distributors',
          party_type: 'CUSTOMER',
          country_code: 'TZ',
          createdby: 'system',
        },
      });
      console.log(`  + Seeded party: ${partyRow.party_name} (ID: ${partyRow.party_id})`);
    }

    // Ensure valid payment channel exists
    let channelRow = await prisma.m_payment_channel.findFirst();
    if (!channelRow) {
      channelRow = await prisma.m_payment_channel.create({
        data: {
          company_id: 1,
          channel_code: 'CRDB_USD',
          channel_name: 'CRDB Bank USD',
          method: 'BANK_TRANSFER',
          currency: 'USD',
          createdby: 'system',
        },
      });
      console.log(`  + Seeded payment channel: ${channelRow.channel_code}`);
    }

    // Create a foundational payment record
    const defaultPay = await prisma.payment.create({
      data: {
        company_id: 1,
        site_id: 1,
        receipt_no: 'RCT-DAR1-26-018800',
        party_id: partyRow.party_id,
        payment_channel_id: channelRow.payment_channel_id,
        amount: 2500,
        currency: 'USD',
        amount_base: 2500,
        amount_allocated: 0,
        status: 'RECEIVED',
        received_at: new Date(),
        createdby: 'system',
      },
    });
    defaultPaymentId = defaultPay.payment_id;
    console.log(`  + Seeded baseline payment for refunds: ID ${defaultPaymentId}`);
  }

  console.log(`💸 Seeding ${mockRefunds.length} Refunds into Database...`);
  let seededCount = 0;

  for (let idx = 0; idx < mockRefunds.length; idx++) {
    const r = mockRefunds[idx];
    const refundNo = r.refundNo;

    // Check if refund already exists in DB
    const existingRefund = await prisma.refund.findUnique({
      where: { refund_no: refundNo },
    });

    if (existingRefund) {
      console.log(`  ✓ Refund ${refundNo} already exists in DB.`);
      continue;
    }

    // Try to match corresponding payment or use available payment
    const paymentId = existingPayments[idx % existingPayments.length]?.payment_id || defaultPaymentId;
    const reqAmount = Number(r.amount);
    const levelsNeeded = reqAmount >= 500 ? 2 : 1;
    const reqSeq = refundNo.replace(/[^0-9]/g, '').slice(-6);
    const requester = r.requestedBy || 'Neema Mushi';

    // 1. Create or upsert approval_request
    const appReqNo = `APR-26-${reqSeq}`;
    let appReq = await prisma.approval_request.findUnique({
      where: { request_no: appReqNo },
    });

    if (!appReq) {
      appReq = await prisma.approval_request.create({
        data: {
          site_id: 1,
          request_no: appReqNo,
          permission_code: permCode,
          entity_name: 'refund',
          entity_id: paymentId,
          summary: `Refund of ${r.currency} ${r.amount} - ${r.refundNo}`,
          reason: r.reason,
          amount: reqAmount,
          amount_currency: r.currency,
          levels_required: levelsNeeded,
          current_level: r.status === 'PENDING_L2' ? 2 : 1,
          status:
            r.status === 'APPROVED' || r.status === 'PAID'
              ? 'APPROVED'
              : r.status === 'REJECTED' || r.status === 'CANCELLED'
              ? 'REJECTED'
              : 'PENDING',
          requested_by_sub: requester,
          requested_at: r.requestedAt ? new Date(r.requestedAt) : new Date(),
          createdby: requester,
        },
      });
      console.log(`  + Created approval request ${appReqNo}`);
    }

    // 2. Seed Approval Steps if defined (CK_approval_step_decision: 'APPROVE' or 'REJECT', CK_approval_step_not_self: decider != requester)
    if (r.levels && r.levels.length > 0) {
      for (const lvl of r.levels) {
        if (lvl.decision) {
          const stepExists = await prisma.approval_step.findFirst({
            where: {
              approval_request_id: appReq.approval_request_id,
              level_no: lvl.level,
            },
          });

          if (!stepExists) {
            let decider = lvl.who || (lvl.level === 1 ? 'Grace Mrema' : 'Peter Lyimo');
            if (decider === requester) {
              decider = lvl.level === 1 ? 'Grace Mrema' : 'Peter Lyimo';
            }

            const stepDecision =
              (lvl.decision as string) === 'REJECTED' || (lvl.decision as string) === 'REJECT' ? 'REJECT' : 'APPROVE';

            await prisma.approval_step.create({
              data: {
                approval_request_id: appReq.approval_request_id,
                level_no: lvl.level,
                decision: stepDecision,
                decided_by_sub: decider,
                requested_by_sub: requester,
                decided_at: lvl.at ? new Date(lvl.at) : new Date(),
                createdby: decider,
              },
            });
          }
        }
      }
    }

    // 3. Create Refund row in DB conforming to CK_refund_status ('APPROVED', 'PAID', 'CANCELLED')
    const dbStatus = r.status === 'PAID' ? 'PAID' : r.status === 'CANCELLED' ? 'CANCELLED' : 'APPROVED';

    await prisma.refund.create({
      data: {
        payment_id: paymentId,
        refund_no: refundNo,
        currency: r.currency,
        amount: reqAmount,
        reason: r.reason,
        approval_request_id: appReq.approval_request_id,
        status: dbStatus,
        paid_at: r.paidAt ? new Date(r.paidAt) : null,
        paid_reference: r.paidReference || null,
        createdby: requester,
        createdate: r.requestedAt ? new Date(r.requestedAt) : new Date(),
      },
    });

    seededCount++;
    console.log(`  + Successfully seeded refund: ${refundNo} (${r.currency} ${r.amount} - DB status: ${dbStatus})`);
  }

  console.log(`✅ Finished seeding refunds: ${seededCount} new records saved to DB.`);
}

// Allow direct CLI execution: node seed-refunds.js or ts-node seed-refunds.ts
if (require.main === module && process.argv[1] && /seed/i.test(process.argv[1])) {
  seedRefunds()
    .catch((err) => {
      console.error('❌ Error seeding refunds:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
