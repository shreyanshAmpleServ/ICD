require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { vessels: seedVessels } = require('../dist/data/admin');

async function seedMissingVessels() {
  console.log('Seed vessels count:', seedVessels.length);
  for (const v of seedVessels) {
    const existing = await prisma.vessels.findFirst({
      where: { imo_no: v.imoNumber || v.imoNo }
    });
    if (!existing) {
      await prisma.vessels.create({
        data: {
          vessel_name: v.vesselName,
          imo_no: v.imoNumber || v.imoNo || `900${v.vesselId}`,
          call_sign: v.callSign || `CS${v.vesselId}`,
          operator_party_id: v.operatorPartyId || 1,
          is_active: v.isActive !== false
        }
      });
      console.log('Added vessel:', v.vesselName);
    }
  }
  const allV = await prisma.vessels.findMany();
  console.log('Total vessels now:', allV.length);
  await prisma.$disconnect();
}

seedMissingVessels().catch(e => {
  console.error(e);
  process.exit(1);
});

