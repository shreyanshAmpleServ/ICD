import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import {
  portalUnits,
  invoicesOf,
  portalDocs,
  appointments as mockAppts,
  serviceRequests as mockRequests,
  PORTAL_PARTY,
} from '../data/insight';
import { consignments as mockConsignments } from '../data/core';

dotenv.config();

const prisma = new PrismaClient();

export async function seedPortalData() {
  console.log('🌱 Starting Customer Portal Data Seed...');

  // 1. Ensure Sites & Users exist
  const siteDar1 = await prisma.sites.findFirst({ where: { site_code: 'DAR1' } });
  const siteId = siteDar1?.site_id || 1;

  let adminUser = await prisma.users.findFirst();
  if (!adminUser) {
    adminUser = await prisma.users.create({
      data: {
        user_name: 'Ashok Kumar',
        user_sub: 'ng|8101',
        email: 'ashok.k@mlimani-icd.example',
        default_site_id: siteId,
        is_active: true,
      },
    });
  }
  const userId = adminUser.user_id;

  // 2. Ensure Customer Party 2 is Kilele Clearing & Forwarding
  let partyKilele = await prisma.parties.findUnique({ where: { party_id: PORTAL_PARTY } });
  if (partyKilele) {
    // If party 2 was CMA, update party 2 to be Kilele Clearing & Forwarding
    partyKilele = await prisma.parties.update({
      where: { party_id: PORTAL_PARTY },
      data: {
        party_code: 'C-KILELE',
        party_name: 'Kilele Clearing & Forwarding',
        short_name: 'Kilele',
        country_code: 'TZ',
        credit_status: 'CREDIT',
        credit_limit: 40000,
        is_active: true,
      },
    });
    console.log('✅ Party 2 updated to Kilele Clearing & Forwarding');
  } else {
    // In MSSQL with IDENTITY, create party
    partyKilele = await prisma.parties.upsert({
      where: { party_code: 'C-KILELE' },
      update: {
        party_name: 'Kilele Clearing & Forwarding',
        credit_status: 'CREDIT',
        credit_limit: 40000,
      },
      create: {
        party_code: 'C-KILELE',
        party_name: 'Kilele Clearing & Forwarding',
        short_name: 'Kilele',
        country_code: 'TZ',
        credit_status: 'CREDIT',
        credit_limit: 40000,
        is_active: true,
      },
    });
    console.log('✅ Party Kilele created with id:', partyKilele.party_id);
  }

  // Ensure CMA still exists as a shipping line party if needed
  await prisma.parties.upsert({
    where: { party_code: 'CMA-LINE' },
    update: {},
    create: {
      party_code: 'CMA-LINE',
      party_name: 'CMA CGM Shipping Agency',
      short_name: 'CMA CGM',
      country_code: 'TZ',
      credit_status: 'CREDIT',
      credit_limit: 120000,
      is_active: true,
    },
  });

  // Ensure Transporter Parties exist
  const pUpepo = await prisma.parties.upsert({
    where: { party_code: 'T-UPEPO' },
    update: {},
    create: {
      party_code: 'T-UPEPO',
      party_name: 'Upepo Transporters Ltd',
      short_name: 'Upepo',
      country_code: 'TZ',
      credit_status: 'CASH',
      is_active: true,
    },
  });

  const pSimba = await prisma.parties.upsert({
    where: { party_code: 'T-SIMBA' },
    update: {},
    create: {
      party_code: 'T-SIMBA',
      party_name: 'Simba Haulage Co.',
      short_name: 'Simba',
      country_code: 'TZ',
      credit_status: 'CASH',
      is_active: true,
    },
  });

  // Ensure Unit Types exist
  const ut20 = await prisma.unit_types.upsert({
    where: { type_code: '20GP' },
    update: {},
    create: { type_code: '20GP', type_name: '20ft General Purpose', category: 'CONTAINER', length_ft: 20, teu: 1.0, is_reefer: false, is_active: true },
  });

  const ut40 = await prisma.unit_types.upsert({
    where: { type_code: '40HC' },
    update: {},
    create: { type_code: '40HC', type_name: '40ft High Cube', category: 'CONTAINER', length_ft: 40, teu: 2.0, is_reefer: false, is_active: true },
  });

  const ut40Rf = await prisma.unit_types.upsert({
    where: { type_code: '40RF' },
    update: {},
    create: { type_code: '40RF', type_name: '40ft High Cube Reefer', category: 'CONTAINER', length_ft: 40, teu: 2.0, is_reefer: true, is_active: true },
  });

  // Ensure Cargo Regimes exist
  const regimeImport = await prisma.cargo_regimes.upsert({
    where: { regime_code: 'IMPORT' },
    update: {},
    create: { regime_code: 'IMPORT', regime_name: 'Local Home Consumption (Imports)', requires_customs: true },
  });

  const regimeTransit = await prisma.cargo_regimes.upsert({
    where: { regime_code: 'TRANSIT' },
    update: {},
    create: { regime_code: 'TRANSIT', regime_name: 'Transit Cargo', requires_customs: true },
  });

  // 3. Seed Consignments for Portal Party (partyKilele.party_id)
  const targetPartyId = partyKilele.party_id;
  const consList = [
    { ref_no: 'BMLU2409881', regime: regimeImport.cargo_regime_id, desc: 'Ceramic floor tiles' },
    { ref_no: 'BMLU2409902', regime: regimeImport.cargo_regime_id, desc: 'Hand tools and fittings' },
    { ref_no: 'IOSL0926S0441', regime: regimeTransit.cargo_regime_id, desc: 'Copper cable drums' },
    { ref_no: 'IOSL0926S0457', regime: regimeImport.cargo_regime_id, desc: 'Cement additives' },
    { ref_no: 'HTZ112-0087', regime: regimeImport.cargo_regime_id, desc: 'Used passenger vehicles (Ro-Ro)' },
    { ref_no: 'HTZ112-0093', regime: regimeTransit.cargo_regime_id, desc: 'Tractors and trailers (Ro-Ro)' },
    { ref_no: 'BMLU2410017', regime: regimeImport.cargo_regime_id, desc: 'Pharmaceutical products' },
    { ref_no: 'IOSL0926S0470', regime: regimeImport.cargo_regime_id, desc: 'Mixed consolidated cargo (LCL)' },
  ];

  const dbConsignments: Record<string, any> = {};
  for (const c of consList) {
    const cons = await prisma.consignments.upsert({
      where: { ref_no: c.ref_no },
      update: {
        agent_party_id: targetPartyId,
        bill_to_party_id: targetPartyId,
      },
      create: {
        site_id: siteId,
        cargo_regime_id: c.regime,
        ref_no: c.ref_no,
        ref_type: 'BL',
        agent_party_id: targetPartyId,
        bill_to_party_id: targetPartyId,
        status: 'OPEN',
      },
    });
    dbConsignments[c.ref_no] = cons;
  }
  console.log(`✅ Seeded ${Object.keys(dbConsignments).length} consignments for portal party`);

  // 4. Seed Unit Stays for Portal Party
  // Get sample of portal units from mock data
  const rawUnits = portalUnits(PORTAL_PARTY);
  console.log(`Found ${rawUnits.length} mock portal units. Seeding top representative units into DB...`);

  // Seed hero unit + first 30 distinct portal units
  const unitsToSeed = rawUnits.slice(0, 35);
  let seededUnitsCount = 0;

  for (const u of unitsToSeed) {
    const consRef = u.unitSummary?.consignmentRef || 'BMLU2409881';
    const cons = dbConsignments[consRef] || dbConsignments['BMLU2409881'];
    const isReefer = u.cargoUnit?.unitTypeCode?.includes('RF') || u.cargoUnit?.unitTypeCode?.includes('RH');
    const is20 = u.cargoUnit?.unitTypeCode?.startsWith('2');
    const typeId = isReefer ? ut40Rf.unit_type_id : is20 ? ut20.unit_type_id : ut40.unit_type_id;

    // Check if unit stay exists
    let dbStay = await prisma.unit_stays.findFirst({
      where: { unit_no: u.cargoUnit.unitNo, physical_status: { not: 'DEPARTED' } },
    });

    if (!dbStay) {
      dbStay = await prisma.unit_stays.create({
        data: {
          site_id: siteId,
          consignment_id: cons.consignment_id,
          unit_type_id: typeId,
          cargo_regime_id: cons.cargo_regime_id,
          unit_no: u.cargoUnit.unitNo,
          flow: u.flow || 'IMPORT',
          full_empty: u.fullEmpty || 'F',
          physical_status: u.physicalStatus || 'IN_YARD',
          customs_status: u.customsStatus || 'UNDER_EXAM',
          billing_status: u.billingStatus || 'ACCRUING',
          release_status: u.releaseStatus || 'REQUESTED',
          seal_no: u.sealNo || 'ML-7729104',
          gross_weight_kg: u.grossWeightKg ? Number(u.grossWeightKg) : 24000,
          arrived_at: (u as any).arrivedAt ? new Date((u as any).arrivedAt) : u.gatedInAt ? new Date(u.gatedInAt) : new Date(Date.now() - 5 * 86400000),
        },
      });

      // If active holds in mock, insert active hold
      if (u.activeHoldCount && u.activeHoldCount > 0) {
        await prisma.holds.create({
          data: {
            unit_stay_id: dbStay.unit_stay_id,
            placed_by_user_id: userId,
            hold_type: 'CUSTOMS',
            reason: 'Customs physical examination scheduled',
            status: 'ACTIVE',
            placed_at: new Date(Date.now() - 48 * 3600000),
          },
        });
      }

      seededUnitsCount++;
    }
  }
  console.log(`✅ Seeded ${seededUnitsCount} active unit stays with holds`);

  // 5. Seed Invoices & Invoice Lines for Portal Party
  const mockInvs = invoicesOf(PORTAL_PARTY);
  console.log(`Seeding ${mockInvs.length} invoices for party ${targetPartyId}...`);

  for (const inv of mockInvs) {
    const consRef = inv.consignmentRef || 'BMLU2409881';
    const cons = dbConsignments[consRef] || dbConsignments['BMLU2409881'];

    // Ensure billable charge exists to link
    const charge = await prisma.billable_charges.create({
      data: {
        site_id: siteId,
        consignment_id: cons.consignment_id,
        bill_to_party_id: targetPartyId,
        charge_code: 'STORAGE_DEMURRAGE',
        charge_name: 'Container Terminal Storage & Demurrage',
        quantity: 1,
        unit_price: Number(inv.subtotal),
        amount: Number(inv.subtotal),
        currency: inv.currency || 'USD',
        status: inv.status === 'PAID' ? 'PAID' : 'BILLED',
      },
    });

    const dbInv = await prisma.invoices.upsert({
      where: { invoice_no: inv.invoiceNo },
      update: {
        total_amount: Number(inv.total),
        subtotal: Number(inv.subtotal),
        tax_amount: Number(inv.taxTotal),
        status: inv.status || 'ISSUED',
      },
      create: {
        site_id: siteId,
        consignment_id: cons.consignment_id,
        bill_to_party_id: targetPartyId,
        invoice_no: inv.invoiceNo || `INV-DAR1-26-00${inv.invoiceId}`,
        invoice_type: inv.docKind === 'PROFORMA' ? 'PROFORMA' : 'COMMERCIAL',
        status: inv.status || 'ISSUED',
        currency: inv.currency || 'USD',
        subtotal: Number(inv.subtotal),
        tax_amount: Number(inv.taxTotal),
        total_amount: Number(inv.total),
        created_at: inv.invoiceDate ? new Date(inv.invoiceDate) : new Date(),
      },
    });

    // Create line item if none exist
    const existingLines = await prisma.invoice_lines.findMany({ where: { invoice_id: dbInv.invoice_id } });
    if (existingLines.length === 0) {
      await prisma.invoice_lines.create({
        data: {
          invoice_id: dbInv.invoice_id,
          charge_id: charge.charge_id,
          line_no: 1,
          description: `ICD Terminal & Storage Services (${inv.docKind})`,
          quantity: 1,
          unit_price: Number(inv.subtotal),
          amount: Number(inv.subtotal),
        },
      });
    }
  }
  console.log(`✅ Seeded ${mockInvs.length} invoices with line items`);

  // 6. Seed Documents
  console.log(`Seeding ${portalDocs.length} documents...`);
  for (const doc of portalDocs) {
    const existing = await prisma.documents.findFirst({
      where: { file_name: doc.fileName },
    });
    if (!existing) {
      await prisma.documents.create({
        data: {
          site_id: siteId,
          doc_type_code: doc.docTypeCode,
          entity_name: doc.entityName,
          entity_id: doc.entityId,
          file_name: doc.fileName || 'document.pdf',
          size_bytes: doc.sizeBytes || 0,
          status: doc.status || 'ACTIVE',
          created_at: doc.capturedAt ? new Date(doc.capturedAt) : new Date(),
        },
      });
    }
  }
  console.log(`✅ Seeded portal documents`);

  // 7. Seed Appointments
  const visitPickup = await prisma.visit_types.findFirst({ where: { visit_code: 'IMPORT_PICKUP' } });
  const visitVehicle = await prisma.visit_types.findFirst({ where: { visit_code: 'VEHICLE_DELIVERY' } });

  console.log(`Seeding ${mockAppts.length} appointments...`);
  for (const a of mockAppts) {
    const vtId = a.visitTypeCode === 'VEHICLE_DELIVERY'
      ? (visitVehicle?.visit_type_id || 7)
      : (visitPickup?.visit_type_id || 3);

    await prisma.appointments.upsert({
      where: { appointment_no: a.appointmentNo },
      update: {
        truck_plate: a.plate,
        slot_start: new Date(a.slotStart),
        slot_end: new Date(a.slotEnd),
        status: a.status || 'BOOKED',
      },
      create: {
        site_id: siteId,
        visit_type_id: vtId,
        transporter_party_id: pUpepo.party_id,
        appointment_no: a.appointmentNo || `APT-26-0${a.appointmentId}`,
        truck_plate: a.plate,
        slot_start: new Date(a.slotStart),
        slot_end: new Date(a.slotEnd),
        status: a.status || 'BOOKED',
        created_at: new Date(),
      },
    });
  }
  console.log(`✅ Seeded appointments`);

  // 8. Seed Service Requests
  const pReqs = mockRequests.filter((s) => s.partyId === PORTAL_PARTY);
  console.log(`Seeding ${pReqs.length} service requests for party ${targetPartyId}...`);

  for (const r of pReqs) {
    const existing = await prisma.service_requests.findFirst({
      where: {
        party_id: targetPartyId,
        request_type: r.requestKind || 'DELIVERY',
      },
    });
    if (!existing) {
      await prisma.service_requests.create({
        data: {
          site_id: siteId,
          party_id: targetPartyId,
          request_type: r.requestKind,
          status: r.status,
          details_json: JSON.stringify({
            serviceRequestId: r.serviceRequestId,
            requestNo: r.requestNo,
            requestKind: r.requestKind,
            subject: r.subject,
            details: r.details,
            status: r.status,
            createdAt: r.createdAt,
            slaDueAt: r.slaDueAt,
            messages: r.messages,
            consignmentRef: r.consignmentRef,
            unitNo: r.unitNo,
            assignedTo: r.assignedTo,
            payload: r.payload,
          }),
          created_at: r.createdAt ? new Date(r.createdAt) : new Date(),
        },
      });
    }
  }
  console.log(`✅ Seeded service requests`);

  console.log('🎉 Customer Portal DB seeding complete!');
}

if (require.main === module) {
  seedPortalData()
    .catch((err) => {
      console.error('❌ Portal seed error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
