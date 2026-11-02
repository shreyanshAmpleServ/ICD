const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.$queryRawUnsafe(`
    SELECT CONSTRAINT_NAME, CHECK_CLAUSE FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_NAME LIKE '%unit_stay%'
  `);
  console.log(c);
}

main().catch(console.error).finally(() => prisma.$disconnect());

