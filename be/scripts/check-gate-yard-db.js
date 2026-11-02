const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('truck_visit count:', await prisma.truck_visit.count());
  console.log('visit_unit_txn count:', await prisma.visit_unit_txn.count());
  console.log('appointment count:', await prisma.appointment.count());
  console.log('m_yard_location count:', await prisma.m_yard_location.count());
  console.log('move_order count:', await prisma.move_order.count());
  console.log('yard_move count:', await prisma.yard_move.count());
  console.log('m_gate count:', await prisma.m_gate.count());
  console.log('m_gate_lane count:', await prisma.m_gate_lane.count());
  await prisma.$disconnect();
}

check().catch(console.error);

