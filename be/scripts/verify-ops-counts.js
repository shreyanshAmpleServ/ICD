const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = {
    m_repair_code: await prisma.m_repair_code.count(),
    m_damage_code: await prisma.m_damage_code.count(),
    labour_contractor: await prisma.labour_contractor.count(),
    truck_visit: await prisma.truck_visit.count(),
    unit_stay: await prisma.unit_stay.count(),
    handling_job: await prisma.handling_job.count(),
    handling_job_line: await prisma.handling_job_line.count(),
    reefer_session: await prisma.reefer_session.count(),
    reefer_reading: await prisma.reefer_reading.count(),
    repair_estimate: await prisma.repair_estimate.count(),
    repair_estimate_line: await prisma.repair_estimate_line.count(),
    inspection: await prisma.inspection.count(),
    inspection_finding: await prisma.inspection_finding.count(),
    weighing: await prisma.weighing.count(),
  };
  console.log('Seeded Ops Counts:', counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());

