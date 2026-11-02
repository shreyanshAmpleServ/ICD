const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cc = await prisma.$queryRawUnsafe(`
    SELECT tc.TABLE_NAME, cc.CONSTRAINT_NAME, cc.CHECK_CLAUSE 
    FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_NAME IN ('appointment', 'move_order', 'visit_unit_txn', 'yard_move', 'truck_visit')
  `);
  console.log(cc);
  await prisma.$disconnect();
}

main();
