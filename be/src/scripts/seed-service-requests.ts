import { PrismaClient } from '@prisma/client';
import { serviceRequests } from '../data/insight';
import { parties as mockParties } from '../data/core';

const prisma = new PrismaClient();

export async function seedAllServiceRequests() {
  console.log('Seeding all service requests into database...');
  const site = await prisma.sites.findFirst();
  const siteId = site?.site_id || 1;

  // Map mock partyIds to actual DB parties or create missing parties
  for (const sr of serviceRequests) {
    const mockParty = mockParties.find((p) => p.partyId === sr.partyId);
    const partyName = sr.partyName || mockParty?.partyName || `Party ${sr.partyId}`;
    const partyCode = mockParty?.partyCode || `P-${sr.partyId}`;

    let dbParty = await prisma.parties.findFirst({
      where: {
        OR: [
          { party_name: partyName },
          { party_code: partyCode },
        ],
      },
    });

    if (!dbParty) {
      dbParty = await prisma.parties.create({
        data: {
          party_name: partyName,
          party_code: partyCode,
          credit_limit: 10000,
          credit_status: 'CREDIT',
          is_active: true,
        },
      });
      console.log(`Created party: ${partyName} (ID: ${dbParty.party_id})`);
    }

    // Check if this service request already exists in DB
    const existing = await prisma.service_requests.findFirst({
      where: {
        party_id: dbParty.party_id,
        request_type: sr.requestKind || 'DELIVERY',
        details_json: { contains: sr.requestNo },
      },
    });

    const detailsJson = JSON.stringify({
      serviceRequestId: sr.serviceRequestId,
      requestNo: sr.requestNo,
      requestKind: sr.requestKind,
      partyId: dbParty.party_id,
      partyName: dbParty.party_name,
      subject: sr.subject,
      details: sr.details,
      status: sr.status,
      createdAt: sr.createdAt,
      slaDueAt: sr.slaDueAt,
      messages: sr.messages || [],
      consignmentId: sr.consignmentId,
      consignmentRef: sr.consignmentRef,
      unitStayId: sr.unitStayId,
      unitNo: sr.unitNo,
      assignedTo: sr.assignedTo,
      payload: sr.payload,
      createdBy: (sr as any).createdBy,
      closedAt: (sr as any).closedAt,
      respondedAt: (sr as any).respondedAt,
      resultEntity: (sr as any).resultEntity,
      resultId: (sr as any).resultId,
    });

    if (!existing) {
      await prisma.service_requests.create({
        data: {
          site_id: siteId,
          party_id: dbParty.party_id,
          request_type: sr.requestKind,
          status: sr.status || 'SUBMITTED',
          details_json: detailsJson,
          created_at: sr.createdAt ? new Date(sr.createdAt) : new Date(),
        },
      });
      console.log(`Created service request: ${sr.requestNo} (${sr.subject})`);
    } else {
      // Update details_json to ensure all mock data fields are saved
      await prisma.service_requests.update({
        where: { service_request_id: existing.service_request_id },
        data: {
          status: sr.status || existing.status,
          details_json: detailsJson,
        },
      });
      console.log(`Updated existing service request: ${sr.requestNo}`);
    }
  }

  const count = await prisma.service_requests.count();
  console.log(`✅ Total service_requests in DB: ${count}`);
}

if (require.main === module) {
  seedAllServiceRequests()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
