const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showColumns() {
  const tables = ['vessel_calls', 'manifests', 'manifest_lines', 'consignments', 'consignment_lines', 'unit_stays', 'holds', 'release_orders', 'customs_refs', 'customs_exams', 'dg_lines'];
  for (const t of tables) {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${t}'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('=== TABLE: ' + t + ' ===');
    console.log(cols.map(c => `${c.COLUMN_NAME} (${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH})` : ''}) ${c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`).join(', '));
  }
  await prisma.$disconnect();
}

showColumns().catch(e => {
  console.error(e);
  process.exit(1);
});

