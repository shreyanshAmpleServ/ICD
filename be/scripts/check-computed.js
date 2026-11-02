const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT t.name AS table_name, c.name AS column_name, c.definition
    FROM sys.computed_columns c
    JOIN sys.tables t ON c.object_id = t.object_id
    WHERE t.name IN ('handling_job', 'handling_job_line', 'labour_contractor', 'reefer_session', 'reefer_reading', 'repair_estimate', 'repair_estimate_line', 'inspection', 'inspection_finding', 'weighing')
  `);
  console.log('Computed columns:', cols);
}

main().catch(console.error).finally(() => prisma.$disconnect());

