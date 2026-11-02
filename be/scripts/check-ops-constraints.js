const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const constraints = await prisma.$queryRawUnsafe(`
    SELECT tc.TABLE_NAME, tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE 
    FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_NAME IN ('handling_job', 'handling_job_line', 'labour_contractor', 'reefer_session', 'reefer_reading', 'repair_estimate', 'repair_estimate_line', 'inspection', 'inspection_finding', 'weighing')
  `);
  console.log('Check constraints:', constraints);
}

main().catch(console.error).finally(() => prisma.$disconnect());
