const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dc = await prisma.m_damage_code.findMany();
  console.log('Damage codes:', dc);
  const rc = await prisma.m_repair_code.findMany();
  console.log('Repair codes:', rc);
  const templates = await prisma.m_inspection_template.findMany({ include: { m_inspection_item: true } });
  console.log('Templates:', templates.map(t => ({ id: t.inspection_template_id, code: t.template_code, items: t.m_inspection_item.length })));
}

main().catch(console.error).finally(() => prisma.$disconnect());

