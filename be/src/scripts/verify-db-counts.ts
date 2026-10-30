import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    const [
      partiesCount,
      consignmentsCount,
      unitStaysCount,
      holdsCount,
      invoicesCount,
      invoiceLinesCount,
      chargesCount,
      documentsCount,
      appointmentsCount,
      serviceRequestsCount
    ] = await Promise.all([
      prisma.parties.count(),
      prisma.consignments.count(),
      prisma.unit_stays.count(),
      prisma.holds.count(),
      prisma.invoices.count(),
      prisma.invoice_lines.count(),
      prisma.billable_charges.count(),
      prisma.documents.count(),
      prisma.appointments.count(),
      prisma.service_requests.count()
    ]);

    console.log(JSON.stringify({
      parties: partiesCount,
      consignments: consignmentsCount,
      unit_stays: unitStaysCount,
      holds: holdsCount,
      invoices: invoicesCount,
      invoice_lines: invoiceLinesCount,
      billable_charges: chargesCount,
      documents: documentsCount,
      appointments: appointmentsCount,
      service_requests: serviceRequestsCount
    }, null, 2));
  } catch (err: any) {
    console.error('Error querying DB:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
