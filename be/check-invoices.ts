import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const invs = await prisma.invoice.findMany({
    select: { invoice_id: true, invoice_no: true, doc_kind: true, status: true, total: true },
    take: 15
  });
  console.log('Invoices in DB:', invs.map(i => ({
    id: Number(i.invoice_id),
    no: i.invoice_no,
    kind: i.doc_kind,
    status: i.status,
    total: Number(i.total)
  })));
  const count = await prisma.invoice.count();
  console.log('Total invoices in DB:', count);

  const found3333 = await prisma.invoice.findFirst({
    where: {
      OR: [
        { invoice_id: 3333 },
        { invoice_no: '3333' }
      ]
    }
  });
  console.log('Found 3333 in DB:', found3333 ? Number(found3333.invoice_id) : 'NOT FOUND');
}

run().catch(console.error).finally(() => prisma.$disconnect());
