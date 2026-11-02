const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Header data (Notifications & Approvals)...');

  // 1. Seed Notifications if 0
  const notifCount = await prisma.notification.count();
  if (notifCount === 0) {
    const user = await prisma.app_user.findFirst();
    const site = await prisma.m_site.findFirst();

    const notifs = [
      {
        site_id: site?.site_id || 1,
        channel: 'IN_APP',
        recipient_user_id: user?.user_id || 1,
        subject: 'Gate Queue: 3 trucks waiting at Outer Gate',
        body: 'Trucks T 118 DPE and T 412 DKL have been waiting over 25 minutes for inspection clearance.',
        status: 'DELIVERED',
        language_code: 'en',
        link_entity: 'truck_visit',
        createdate: new Date(),
      },
      {
        site_id: site?.site_id || 1,
        channel: 'IN_APP',
        recipient_user_id: user?.user_id || 1,
        subject: 'Approval Needed: Storage fee waiver requested',
        body: 'Amina S. requested 4 days free storage waiver for container MSKU 0192834 on BL-2026-0089.',
        status: 'DELIVERED',
        language_code: 'en',
        link_entity: 'approval_request',
        createdate: new Date(Date.now() - 3600000),
      },
      {
        site_id: site?.site_id || 1,
        channel: 'IN_APP',
        recipient_user_id: user?.user_id || 1,
        subject: 'Yard Capacity Alert: Block A occupancy > 85%',
        body: 'Block A reached 88% capacity. Recommend routing inward container moves to Block B.',
        status: 'DELIVERED',
        language_code: 'en',
        link_entity: 'yard_location',
        createdate: new Date(Date.now() - 7200000),
      },
      {
        site_id: site?.site_id || 1,
        channel: 'IN_APP',
        recipient_user_id: user?.user_id || 1,
        subject: 'Customs Hold Placed: Container MSKU 8820149',
        body: 'TRA Customs officer flagged container for non-intrusive scanning verification.',
        status: 'DELIVERED',
        language_code: 'en',
        link_entity: 'unit_stay',
        read_at: new Date(Date.now() - 1800000),
        createdate: new Date(Date.now() - 10800000),
      },
    ];

    for (const n of notifs) {
      await prisma.notification.create({ data: n });
    }
    console.log(`Created ${notifs.length} notifications.`);
  }

  // 2. Seed Approval Requests if 0
  const apprvCount = await prisma.approval_request.count();
  if (apprvCount === 0) {
    const site = await prisma.m_site.findFirst();
    const apprvs = [
      {
        site_id: site?.site_id || 1,
        request_no: 'APR-26-00401',
        permission_code: 'gate.checkout.override',
        entity_name: 'truck_visit',
        entity_id: BigInt(1),
        summary: 'Seal mismatch gate-out override for T 118 DPE',
        reason: 'Seal number on paper EIR had typo; physical seal verified and matches bill of lading.',
        status: 'PENDING',
        levels_required: 1,
        current_level: 1,
        requested_by_sub: 'ng|8102',
        requested_at: new Date(),
        createdby: 'Hamisi Juma',
      },
      {
        site_id: site?.site_id || 1,
        request_no: 'APR-26-00402',
        permission_code: 'billing.waiver',
        entity_name: 'invoice',
        entity_id: BigInt(1),
        summary: 'Demurrage fee waiver for Global Forwarding Ltd',
        reason: 'Customs physical exam delayed by TRA inspection team by 4 days.',
        amount: 240.00,
        amount_currency: 'USD',
        status: 'PENDING',
        levels_required: 1,
        current_level: 1,
        requested_by_sub: 'ng|8107',
        requested_at: new Date(Date.now() - 3600000),
        createdby: 'Amina Salum',
      },
      {
        site_id: site?.site_id || 1,
        request_no: 'APR-26-00403',
        permission_code: 'weighbridge.override',
        entity_name: 'weighing',
        entity_id: BigInt(1),
        summary: 'Axle overload tolerance override for T 412 DKL',
        reason: 'Gross weight within legal gross limit (38,200 kg) but rear tandem axle +1.2% over standard distribution.',
        status: 'PENDING',
        levels_required: 1,
        current_level: 1,
        requested_by_sub: 'ng|8112',
        requested_at: new Date(Date.now() - 7200000),
        createdby: 'Ally Shabani',
      },
    ];

    for (const a of apprvs) {
      await prisma.approval_request.create({ data: a });
    }
    console.log(`Created ${apprvs.length} approval requests.`);
  }

  console.log('Finished seeding header data successfully!');
  await prisma.$disconnect();
}

main().catch(console.error);
