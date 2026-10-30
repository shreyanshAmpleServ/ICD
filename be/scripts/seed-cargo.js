require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load seed data from compiled modules
const { vesselCalls, consignments, allStays } = require('../dist/data/core');
const { manifests, sampleManifestLines, dgLines, allCustomsRefs, exams, examsWaiting, allReleaseOrders } = require('../dist/data/cargo');
const { holds } = require('../dist/data/control');

async function seedCargo() {
  console.log('Seeding Cargo master & operational data...');

  const allVessels = await prisma.vessels.findMany();
  const defaultVesselId = allVessels[0]?.vessel_id || 1;
  const vesselIdSet = new Set(allVessels.map(v => v.vessel_id));

  const allPorts = await prisma.ports.findMany();
  const defaultPortId = allPorts[0]?.port_id || 1;

  const allParties = await prisma.parties.findMany();
  const defaultPartyId = allParties[0]?.party_id || 1;
  const partyIdSet = new Set(allParties.map(p => p.party_id));

  const allUnitTypes = await prisma.unit_types.findMany();
  const defaultUnitTypeId = allUnitTypes[0]?.unit_type_id || 1;
  const unitTypeMap = new Map(allUnitTypes.map(ut => [ut.type_code, ut.unit_type_id]));

  // 1. Vessel Calls
  console.log('--- Seeding vessel calls ---');
  for (const vc of vesselCalls) {
    const existing = await prisma.vessel_calls.findFirst({
      where: { voyage_no: vc.voyageNo }
    });

    const vId = vesselIdSet.has(vc.vesselId) ? vc.vesselId : defaultVesselId;
    const pId = vc.portId || defaultPortId;
    const sPartyId = partyIdSet.has(vc.shippingLinePartyId) ? vc.shippingLinePartyId : defaultPartyId;

    const vcData = {
      vessel_id: vId,
      site_id: vc.siteId || 1,
      port_id: pId,
      shipping_line_party_id: sPartyId,
      voyage_no: vc.voyageNo,
      eta: vc.eta ? new Date(vc.eta) : null,
      ata: vc.ata ? new Date(vc.ata) : null,
      status: vc.status || 'EXPECTED',
      discharge_completed_at: vc.dischargeCompletedAt ? new Date(vc.dischargeCompletedAt) : null,
      gate_cutoff_at: vc.gateCutoffAt ? new Date(vc.gateCutoffAt) : null,
      doc_cutoff_at: vc.docCutoffAt ? new Date(vc.docCutoffAt) : null,
      vgm_cutoff_at: vc.vgmCutoffAt ? new Date(vc.vgmCutoffAt) : null,
      port_call_ref: vc.portCallRef || `PC-DAR-${vc.voyageNo}`
    };

    if (!existing) {
      await prisma.vessel_calls.create({ data: vcData });
      console.log(`Created vessel call: ${vc.voyageNo}`);
    } else {
      await prisma.vessel_calls.update({
        where: { vessel_call_id: existing.vessel_call_id },
        data: vcData
      });
    }
  }

  // 2. Consignments & Consignment Lines
  console.log('--- Seeding consignments ---');
  const dbVesselCalls = await prisma.vessel_calls.findMany();
  const defaultVcId = dbVesselCalls[0]?.vessel_call_id || 1;
  const vcIdSet = new Set(dbVesselCalls.map(v => v.vessel_call_id));

  for (const c of consignments) {
    let existing = await prisma.consignments.findFirst({
      where: { ref_no: c.refNo }
    });

    const vcId = vcIdSet.has(c.vesselCallId) ? c.vesselCallId : defaultVcId;
    const consPartyId = partyIdSet.has(c.consigneePartyId) ? c.consigneePartyId : defaultPartyId;
    const billPartyId = partyIdSet.has(c.billToPartyId) ? c.billToPartyId : consPartyId;
    const agentPartyId = partyIdSet.has(c.agentPartyId) ? c.agentPartyId : null;
    const linePartyId = partyIdSet.has(c.shippingLinePartyId) ? c.shippingLinePartyId : defaultPartyId;

    const cData = {
      site_id: c.siteId || 1,
      cargo_regime_id: c.cargoRegimeCode === 'TRANSIT' ? 2 : 1,
      vessel_call_id: vcId,
      shipping_line_party_id: linePartyId,
      consignee_party_id: consPartyId,
      bill_to_party_id: billPartyId,
      agent_party_id: agentPartyId,
      ref_type: c.refType || 'BL',
      ref_no: c.refNo,
      status: c.status || 'OPEN',
      cargo_description: c.cargoDescription || 'General Cargo',
      units_expected: c.unitsExpected || 1,
      units_received: c.unitsReceived || 1,
      units_delivered: c.unitsDelivered || 0,
      destination_country: c.destinationCountry || 'Tanzania'
    };

    if (!existing) {
      existing = await prisma.consignments.create({ data: cData });
      console.log(`Created consignment: ${c.refNo}`);
    } else {
      await prisma.consignments.update({
        where: { consignment_id: existing.consignment_id },
        data: cData
      });
    }

    // Consignment lines
    const lineCount = await prisma.consignment_lines.count({
      where: { consignment_id: existing.consignment_id }
    });
    if (lineCount === 0) {
      await prisma.consignment_lines.create({
        data: {
          consignment_id: existing.consignment_id,
          line_no: 1,
          package_type: 'PK',
          package_count: 450,
          goods_description: c.cargoDescription || 'Ceramic Floor Tiles',
          gross_weight_kg: 28450,
          volume_cbm: 32.5,
          commodity_code: 'TILES',
          hs_code: '6907.21'
        }
      });
    }
  }

  // 3. Manifests & Manifest Lines
  console.log('--- Seeding manifests ---');
  for (const m of manifests) {
    let existing = await prisma.manifests.findFirst({
      where: { manifest_ref: m.manifestRef }
    });

    const vcId = vcIdSet.has(m.vesselCallId) ? m.vesselCallId : defaultVcId;

    const mData = {
      vessel_call_id: vcId,
      shipping_line_party_id: defaultPartyId,
      manifest_ref: m.manifestRef,
      line_count: m.lineCount || 342,
      status: m.status || 'VALIDATING',
      file_name: m.fileName || 'manifest.xlsx',
      source: m.source || 'EXCEL',
      created_count: m.createdCount || 0,
      matched_count: m.matchedCount || 0,
      error_count: m.errorCount || 0,
      imported_at: m.importedAt ? new Date(m.importedAt) : new Date()
    };

    if (!existing) {
      existing = await prisma.manifests.create({ data: mData });
      console.log(`Created manifest: ${m.manifestRef}`);
    } else {
      await prisma.manifests.update({
        where: { manifest_id: existing.manifest_id },
        data: mData
      });
    }

    // Manifest lines
    const mLinesCount = await prisma.manifest_lines.count({
      where: { manifest_id: existing.manifest_id }
    });
    if (mLinesCount === 0) {
      for (const ml of sampleManifestLines.slice(0, 5)) {
        await prisma.manifest_lines.create({
          data: {
            manifest_id: existing.manifest_id,
            line_no: ml.lineNo || 1,
            unit_no: ml.unitNo || 'MSKU 123456 7',
            bl_no: ml.blNo || 'BL-DAR-2026-9901',
            consignee_raw: ml.consigneeRaw || 'Twiga Cement Ltd',
            full_empty: ml.fullEmpty || 'F',
            seal_no: ml.sealNo || 'ML-TZ-98214',
            gross_weight_kg: ml.grossWeightKg || 28400,
            match_status: ml.matchStatus || 'NEW',
            unit_type_raw: ml.unitTypeRaw || '40HC',
            commodity_raw: ml.commodityRaw || 'General Cargo',
            error_text: ml.errorText || null,
            issue: ml.issue || null
          }
        });
      }
    }
  }

  // 4. Units & Stays
  console.log('--- Seeding unit stays & cargo units ---');
  const dbConsignments = await prisma.consignments.findMany();
  const defaultConsignmentId = dbConsignments[0]?.consignment_id || 1;
  const consignmentIdSet = new Set(dbConsignments.map(c => c.consignment_id));

  for (const s of allStays) {
    const unitNo = s.cargoUnit?.unitNo;
    if (!unitNo) continue;

    let existing = await prisma.unit_stays.findFirst({
      where: { unit_no: unitNo }
    });

    const utId = unitTypeMap.get(s.cargoUnit?.unitTypeCode) || defaultUnitTypeId;
    const cid = consignmentIdSet.has(s.consignmentId) ? s.consignmentId : defaultConsignmentId;

    const sData = {
      site_id: s.siteId || 1,
      unit_type_id: utId,
      consignment_id: cid,
      cargo_regime_id: s.cargoRegimeCode === 'TRANSIT' ? 2 : 1,
      yard_location_id: s.currentLocation?.locationId || 1,
      unit_no: unitNo,
      flow: s.flow || 'IMPORT',
      full_empty: s.fullEmpty || 'F',
      physical_status: s.physicalStatus || 'IN_YARD',
      customs_status: s.customsStatus || 'CLEARED',
      billing_status: s.billingStatus || 'PAID',
      release_status: s.releaseStatus || 'READY',
      seal_no: s.sealNo || 'SEAL-001',
      gross_weight_kg: s.grossWeightKg || 24000,
      cargo_description: s.cargoDescription || 'General Goods',
      condition_status: s.conditionStatus || 'SOUND',
      discharge_at: s.dischargeAt ? new Date(s.dischargeAt) : null,
      gated_in_at: s.gatedInAt ? new Date(s.gatedInAt) : null,
      free_until: s.freeUntil ? new Date(s.freeUntil) : null,
      destination_country: s.destinationCountry || 'Tanzania',
      reefer_temp_c: s.reeferSetTempC || null,
      imo_class: s.imoClass || null,
      un_number: s.unNumber || null
    };

    if (!existing) {
      await prisma.unit_stays.create({ data: sData });
      console.log(`Created unit stay: ${unitNo}`);
    } else {
      await prisma.unit_stays.update({
        where: { unit_stay_id: existing.unit_stay_id },
        data: sData
      });
    }

    // Cargo unit entry
    const cu = await prisma.cargo_units.findFirst({ where: { unit_no: unitNo } });
    if (!cu) {
      await prisma.cargo_units.create({
        data: {
          unit_no: unitNo,
          category: s.cargoUnit?.category || 'CONTAINER',
          unit_type_code: s.cargoUnit?.unitTypeCode || '40HC',
          make: s.cargoUnit?.make || null,
          model: s.cargoUnit?.model || null,
          tare_kg: s.cargoUnit?.tareWeightKg || 3800
        }
      });
    }
  }

  // 5. Holds
  console.log('--- Seeding holds ---');
  for (const h of holds) {
    const s = await prisma.unit_stays.findFirst({
      where: { unit_stay_id: h.unitStayId }
    });
    if (!s) continue;

    const existing = await prisma.holds.findFirst({
      where: {
        unit_stay_id: s.unit_stay_id,
        hold_type: h.holdTypeCode
      }
    });

    if (!existing) {
      await prisma.holds.create({
        data: {
          unit_stay_id: s.unit_stay_id,
          placed_by_user_id: 1,
          hold_type: h.holdTypeCode,
          reason: h.reason || 'Hold placed per protocol',
          status: h.status || 'ACTIVE',
          authority_ref: h.authorityRef || null,
          lift_reason: h.liftReason || null,
          placed_at: h.placedAt ? new Date(h.placedAt) : new Date(),
          lifted_at: h.liftedAt ? new Date(h.liftedAt) : null
        }
      });
      console.log(`Created hold on unit ${s.unit_no}: ${h.holdTypeCode}`);
    }
  }

  // 6. Release Orders
  console.log('--- Seeding release orders ---');
  for (const ro of allReleaseOrders) {
    const existing = await prisma.release_orders.findFirst({
      where: { release_no: ro.releaseNo }
    });

    const cid = consignmentIdSet.has(ro.consignmentId) ? ro.consignmentId : defaultConsignmentId;
    const reqPartyId = partyIdSet.has(ro.transporterPartyId) ? ro.transporterPartyId : defaultPartyId;

    const roData = {
      site_id: 1,
      consignment_id: cid,
      requested_by_party_id: reqPartyId,
      approved_by_user_id: 1,
      release_no: ro.releaseNo,
      status: ro.status || 'ISSUED',
      release_kind: ro.releaseKind || 'DELIVERY',
      collector_name: ro.collectorName || 'Baraka Mwita',
      collector_id_type: ro.collectorIdType || 'Driving licence',
      collector_id_no: ro.collectorIdNo || 'DL-TZ-98442',
      planned_exit_date: ro.plannedExitDate ? new Date(ro.plannedExitDate) : new Date(Date.now() + 86400000),
      transporter_party_id: reqPartyId,
      units_total: ro.unitsTotal || 1,
      units_out: ro.unitsOut || 0,
      requested_at: ro.requestedAt ? new Date(ro.requestedAt) : new Date(),
      issued_at: new Date(),
      expires_at: ro.validTo ? new Date(ro.validTo) : new Date(Date.now() + 7 * 86400000)
    };

    if (!existing) {
      const created = await prisma.release_orders.create({ data: roData });
      console.log(`Created release order: ${ro.releaseNo}`);
      
      // Link release order units
      if (ro.units && ro.units.length > 0) {
        for (const u of ro.units) {
          const stay = await prisma.unit_stays.findFirst({
            where: { unit_no: u.unitNo }
          });
          if (stay) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO release_order_units (release_order_id, unit_stay_id, status) VALUES (${created.release_order_id}, ${stay.unit_stay_id}, '${u.status || 'PENDING'}')`
            );
          }
        }
      }
    }
  }

  // 7. Customs References & Exams
  console.log('--- Seeding customs refs & exams ---');
  for (const cr of allCustomsRefs) {
    const existing = await prisma.customs_refs.findFirst({
      where: { ref_no: cr.refNo }
    });

    const cid = consignmentIdSet.has(cr.consignmentId) ? cr.consignmentId : defaultConsignmentId;
    let validUnitStayId = null;
    if (cr.unitStayId) {
      const stayExists = await prisma.unit_stays.findFirst({ where: { unit_stay_id: cr.unitStayId } });
      if (stayExists) validUnitStayId = cr.unitStayId;
    }

    if (!existing) {
      await prisma.customs_refs.create({
        data: {
          consignment_id: cid,
          unit_stay_id: validUnitStayId,
          ref_type: cr.refTypeCode || 'TANSAD',
          ref_no: cr.refNo,
          status: cr.status || 'CLEARED',
          ref_date: cr.refDate ? new Date(cr.refDate) : new Date(),
          valid_to: cr.validTo ? new Date(cr.validTo) : null,
          amount: cr.amount ? Number(cr.amount) : null,
          amount_currency: cr.amountCurrency || 'USD',
          source: cr.source || 'MANUAL',
          lodged_at: cr.refDate ? new Date(cr.refDate) : new Date(),
          cleared_at: cr.status === 'CLEARED' ? new Date() : null
        }
      });
      console.log(`Created customs ref: ${cr.refNo}`);
    }
  }

  const allExams = [...exams, ...examsWaiting];
  for (const ex of allExams) {
    const stay = await prisma.unit_stays.findFirst({
      where: { unit_stay_id: ex.unitStayId }
    });
    if (!stay) continue;

    const existing = await prisma.customs_exams.findFirst({
      where: {
        unit_stay_id: stay.unit_stay_id,
        exam_bay: ex.bay || null
      }
    });

    if (!existing) {
      await prisma.customs_exams.create({
        data: {
          site_id: 1,
          unit_stay_id: stay.unit_stay_id,
          exam_type: 'PHYSICAL',
          status: ex.status || 'REQUESTED',
          officer_name: ex.officer || 'TRA Officer',
          exam_bay: ex.bay || 'BAY-1',
          scheduled_date: ex.date ? new Date(ex.date) : new Date(),
          scheduled_time: ex.slot || '10:00',
          findings: ex.findings || null,
          requested_at: new Date()
        }
      });
      console.log(`Created customs exam for unit ${stay.unit_no}`);
    }
  }

  // 8. Dangerous Goods Lines
  console.log('--- Seeding dangerous goods lines ---');
  for (const dg of dgLines) {
    const stay = await prisma.unit_stays.findFirst({
      where: { unit_stay_id: dg.unitStayId }
    });
    if (!stay) continue;

    const existing = await prisma.dg_lines.findFirst({
      where: {
        unit_stay_id: stay.unit_stay_id,
        un_number: dg.unNo
      }
    });

    if (!existing) {
      await prisma.dg_lines.create({
        data: {
          unit_stay_id: stay.unit_stay_id,
          un_number: dg.unNo,
          imo_class: dg.imoClass,
          packing_group: dg.packingGroup || 'II',
          proper_shipping_name: dg.properShippingName || 'Hazardous Cargo',
          flashpoint_c: dg.flashpointC ? String(dg.flashpointC) : null,
          marine_pollutant: !!dg.marinePollutant,
          gross_weight_kg: dg.grossWeightKg || 20000,
          emergency_contact: dg.emergencyContact || '+255 22 286 0011'
        }
      });
      console.log(`Created DG line for unit ${stay.unit_no}: UN ${dg.unNo}`);
    }
  }

  console.log('All Cargo data successfully seeded into database!');
  await prisma.$disconnect();
}

seedCargo().catch(e => {
  console.error('Seeding error:', e);
  process.exit(1);
});
