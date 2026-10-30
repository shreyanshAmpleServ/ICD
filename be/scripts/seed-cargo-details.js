const path = require('path');
require(path.resolve(__dirname, '../node_modules/dotenv')).config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require(path.resolve(__dirname, '../node_modules/@prisma/client'));

const prisma = new PrismaClient();

async function seedDetails() {
  console.log('Seeding extra customs refs, exams, holds, and dg lines...');
  
  // 1. Fetch available unit stays and consignments
  const unitStays = await prisma.unit_stays.findMany({ take: 20 });
  const consignments = await prisma.consignments.findMany({ take: 10 });

  if (unitStays.length === 0 || consignments.length === 0) {
    console.log('No unit stays or consignments found to link details.');
    return;
  }

  // 2. Customs refs
  const refTypes = ['TANSAD', 'TRANSIT_BOND', 'TRANSIT_DECL', 'CUSTOMS_RELEASE', 'EXAM_ORDER', 'QUERY_NOTICE'];
  for (let i = 0; i < 12; i++) {
    const refNo = `TZ-CUST-2026-00${4180 + i}`;
    const exists = await prisma.customs_refs.findFirst({ where: { ref_no: refNo } });
    if (!exists) {
      const stay = unitStays[i % unitStays.length];
      const cons = consignments[i % consignments.length];
      const type = refTypes[i % refTypes.length];
      await prisma.customs_refs.create({
        data: {
          consignment_id: cons.consignment_id,
          unit_stay_id: i % 2 === 0 ? stay.unit_stay_id : null,
          ref_type: type,
          ref_no: refNo,
          status: i % 4 === 0 ? 'PENDING' : i % 4 === 1 ? 'ACTIVE' : 'CLEARED',
          ref_date: new Date(Date.now() - i * 86400000),
          valid_to: new Date(Date.now() + (30 - i) * 86400000),
          amount: type.includes('BOND') ? 25000 + i * 5000 : null,
          amount_currency: 'USD',
          source: i % 3 === 0 ? 'ASYCUDA' : 'MANUAL',
          lodged_at: new Date(Date.now() - i * 86400000),
          cleared_at: i % 4 === 2 ? new Date() : null,
        }
      });
      console.log(`Created customs ref: ${refNo}`);
    }
  }

  // 3. Customs exams
  const examBays = ['BAY-1', 'BAY-2', 'BAY-3', 'BAY-4'];
  const officers = ['Rehema K. (TRA)', 'Juma M. (TRA)', 'Baraka N. (TRA)', 'Fatuma S. (TRA)'];
  for (let i = 0; i < 8; i++) {
    const stay = unitStays[(i + 3) % unitStays.length];
    const exists = await prisma.customs_exams.findFirst({
      where: { unit_stay_id: stay.unit_stay_id, exam_bay: examBays[i % examBays.length] }
    });
    if (!exists) {
      await prisma.customs_exams.create({
        data: {
          site_id: 1,
          unit_stay_id: stay.unit_stay_id,
          exam_type: i % 2 === 0 ? 'PHYSICAL' : 'SCANNER',
          status: i === 0 ? 'IN_PROGRESS' : i < 4 ? 'SCHEDULED' : 'COMPLETED',
          officer_name: officers[i % officers.length],
          exam_bay: examBays[i % examBays.length],
          scheduled_date: new Date(),
          scheduled_time: `${9 + i}:00`,
          findings: i >= 4 ? 'Verified goods match declaration. Cleared.' : null,
          requested_at: new Date(Date.now() - 86400000)
        }
      });
      console.log(`Created customs exam for unit ${stay.unit_no}`);
    }
  }

  // 4. Holds
  const holdTypes = ['CUSTOMS', 'SHIPPING_LINE', 'ICD', 'POLICE', 'STANDARDS'];
  const reasons = [
    'Customs verification required for valuation check',
    'Pending freight payment confirmation from line',
    'Depot storage charges unpaid past free period',
    'Police cargo verification check',
    'TBS quality standard sample inspection'
  ];
  for (let i = 0; i < 10; i++) {
    const stay = unitStays[(i + 5) % unitStays.length];
    const ht = holdTypes[i % holdTypes.length];
    const exists = await prisma.holds.findFirst({
      where: { unit_stay_id: stay.unit_stay_id, hold_type: ht }
    });
    if (!exists) {
      await prisma.holds.create({
        data: {
          unit_stay_id: stay.unit_stay_id,
          placed_by_user_id: 1,
          hold_type: ht,
          reason: reasons[i % reasons.length],
          status: i < 7 ? 'ACTIVE' : 'LIFTED',
          authority_ref: `AUTH-${ht}-${100 + i}`,
          lift_reason: i >= 7 ? 'Payment verified and confirmed' : null,
          placed_at: new Date(Date.now() - (i + 1) * 86400000),
          lifted_at: i >= 7 ? new Date() : null
        }
      });
      console.log(`Created hold on unit ${stay.unit_no}: ${ht}`);
    }
  }

  // 5. Dangerous goods
  const dgConfigs = [
    { un: 'UN 1263', imo: '3', name: 'Paint and related material', flashpoint: '-4', marine: false, kg: 16200 },
    { un: 'UN 1993', imo: '3', name: 'Flammable liquid, n.o.s. (solvent blend)', flashpoint: '38', marine: false, kg: 18800 },
    { un: 'UN 1942', imo: '5.1', name: 'Ammonium nitrate (fertiliser grade)', flashpoint: null, marine: false, kg: 24500 },
    { un: 'UN 1789', imo: '8', name: 'Hydrochloric acid solution', flashpoint: null, marine: false, kg: 21000 },
    { un: 'UN 1075', imo: '2.1', name: 'Petroleum gases, liquefied (LPG cylinders)', flashpoint: null, marine: false, kg: 9800 },
    { un: 'UN 2588', imo: '6.1', name: 'Pesticide, solid, toxic, n.o.s.', flashpoint: null, marine: true, kg: 17400 },
    { un: 'UN 3480', imo: '9', name: 'Lithium ion batteries (rechargeable)', flashpoint: null, marine: false, kg: 12300 },
  ];

  for (let i = 0; i < dgConfigs.length; i++) {
    const cfg = dgConfigs[i];
    const stay = unitStays[(i + 2) % unitStays.length];
    const exists = await prisma.dg_lines.findFirst({
      where: { unit_stay_id: stay.unit_stay_id, un_number: cfg.un }
    });
    if (!exists) {
      await prisma.dg_lines.create({
        data: {
          unit_stay_id: stay.unit_stay_id,
          un_number: cfg.un,
          imo_class: cfg.imo,
          packing_group: 'II',
          proper_shipping_name: cfg.name,
          flashpoint_c: cfg.flashpoint,
          marine_pollutant: cfg.marine,
          gross_weight_kg: cfg.kg,
          emergency_contact: '+255 22 286 0011 (Chemtrec TZ)'
        }
      });
      // also update unit_stays.imo_class and un_number
      await prisma.unit_stays.update({
        where: { unit_stay_id: stay.unit_stay_id },
        data: { imo_class: cfg.imo, un_number: cfg.un }
      });
      console.log(`Created DG line for unit ${stay.unit_no}: ${cfg.un}`);
    }
  }

  console.log('Finished seeding cargo details successfully!');
  await prisma.$disconnect();
}

seedDetails().catch(e => {
  console.error('Error seeding details:', e);
  process.exit(1);
});

