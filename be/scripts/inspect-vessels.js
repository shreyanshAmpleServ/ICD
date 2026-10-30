require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function show() {
  const vessels = await prisma.vessels.findMany();
  console.log('VESSELS:', vessels);
  const ports = await prisma.ports.findMany();
  console.log('PORTS:', ports);
  const parties = await prisma.parties.findMany();
  console.log('PARTIES:', parties.map(p => ({ id: p.party_id, code: p.party_code, name: p.party_name })));
  await prisma.$disconnect();
}

show().catch(e => {
  console.error(e);
  process.exit(1);
});

