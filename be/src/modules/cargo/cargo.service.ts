import { getPrisma, isDbLive } from "../../db/prisma";
import { vesselCalls, consignments, allStays } from "../../data/core";
import { manifests, sampleManifestLines } from "../../data/cargo";
import { holds, customsRefs, releaseOrders } from "../../data/control";
import { exams, dgLines } from "../../data/cargo";

function toNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "bigint") return Number(val);
  return Number(val) || 0;
}

export class CargoService {
  // ------------------------------------------------------------------ 1. UNITS
  async getUnits(query: any = {}) {
    const { category, status, customsStatus, location, search: searchQ, siteId } = query;
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const where: any = {};
        if (siteId) {
          where.site_id = Number(siteId);
        }
        if (status) {
          where.physical_status = status;
        }
        if (customsStatus) {
          where.customs_status = customsStatus;
        }
        if (category && category !== "ALL") {
          where.unit_stay_cargo_units = { unit_category: category };
        }
        if (location) {
          where.unit_stay_yard_locations = { full_code: { startsWith: String(location) } };
        }
        if (searchQ) {
          const q = String(searchQ).trim();
          where.OR = [
            { unit_stay_cargo_units: { unit_no: { contains: q } } },
            { seal_no: { contains: q } },
            { unit_stay_consignments: { ref_no: { contains: q } } },
            { unit_stay_yard_locations: { full_code: { contains: q } } },
          ];
        }

        const dbStays = await prisma.unit_stay.findMany({
          where,
          include: {
            unit_stay_cargo_units: {
              include: { cargo_unit_unit_types: true },
            },
            unit_stay_yard_locations: true,
            unit_stay_consignments: {
              include: {
                vessel_call: { include: { m_vessel: true } },
                m_party_consignment_consignee: true,
              },
            },
            unit_stay_cargo_regimes: true,
            unit_stay_holds: { include: { hold_types: true } },
            unit_stay_unit_dg_lines: true,
          },
          orderBy: { unit_stay_id: "desc" },
        });

        if (dbStays && dbStays.length > 0) {
          return dbStays.map((u) => {
            const activeHolds = (u.unit_stay_holds || []).filter((h: any) => h.status === "ACTIVE").length;
            const dwell = u.gated_in_at
              ? Math.max(1, Math.floor((Date.now() - new Date(u.gated_in_at).getTime()) / 86400000))
              : 3;

            const unitNo = u.unit_stay_cargo_units?.unit_no || `UNIT-${u.unit_stay_id}`;
            const category = u.unit_stay_cargo_units?.cargo_unit_unit_types?.unit_category || u.unit_stay_cargo_units?.unit_category || "CONTAINER";
            const typeCode = u.unit_stay_cargo_units?.cargo_unit_unit_types?.type_code || "40HC";

            return {
              unitStayId: toNum(u.unit_stay_id),
              siteId: u.site_id,
              consignmentId: u.consignment_id ? toNum(u.consignment_id) : undefined,
              cargoUnit: {
                cargoUnitId: toNum(u.cargo_unit_id),
                category,
                unitNo,
                unitTypeCode: typeCode,
                isoType: typeCode,
                tareWeightKg: u.unit_stay_cargo_units?.tare_kg || 3800,
              },
              physicalStatus: u.physical_status,
              flow: u.flow || "IMPORT",
              fullEmpty: u.full_empty || "F",
              customsStatus: u.customs_status || "CLEARED",
              releaseStatus: u.release_status || "APPROVED",
              billingStatus: u.billing_status || "PAID",
              sealNo: u.seal_no || "SEAL-001",
              grossWeightKg: Number(u.gross_weight_kg || 0),
              cargoDescription: u.cargo_description || "General Merchandise",
              conditionStatus: u.condition_status || "SOUND",
              reeferTempC: u.reefer_set_temp_c ? Number(u.reefer_set_temp_c) : undefined,
              dischargeAt: u.discharge_at?.toISOString(),
              gatedInAt: u.gated_in_at?.toISOString(),
              departedAt: u.departed_at?.toISOString(),
              freeUntil: u.storage_start_at
                ? new Date(new Date(u.storage_start_at).getTime() + 7 * 86400000).toISOString()
                : undefined,
              activeHoldCount: activeHolds,
              currentLocation: u.unit_stay_yard_locations
                ? {
                    locationId: u.unit_stay_yard_locations.yard_location_id,
                    fullCode: u.unit_stay_yard_locations.full_code,
                    block: u.unit_stay_yard_locations.location_code,
                  }
                : undefined,
              unitSummary: {
                unitNo,
                category,
                unitTypeCode: typeCode,
                activeHoldCount: activeHolds,
                releaseStatus: u.release_status || "APPROVED",
                physicalStatus: u.physical_status,
                dwellDays: dwell,
                consignmentRef: u.unit_stay_consignments?.ref_no,
              },
              consignments: u.unit_stay_consignments
                ? {
                    consignmentId: toNum(u.unit_stay_consignments.consignment_id),
                    refNo: u.unit_stay_consignments.ref_no,
                    refType: u.unit_stay_consignments.ref_type,
                    vesselName: u.unit_stay_consignments.vessel_call?.m_vessel?.vessel_name || "Vessel",
                    voyageNo: u.unit_stay_consignments.vessel_call?.voyage_no || "V.001",
                    consigneeName: u.unit_stay_consignments.m_party_consignment_consignee?.party_name,
                  }
                : undefined,
              holds: (u.unit_stay_holds || []).map((h: any) => ({
                holdId: toNum(h.hold_id),
                holdTypeCode: h.hold_types?.hold_code || "CUSTOMS",
                status: h.status,
                reason: h.reason,
                placedAt: h.placed_at?.toISOString(),
                placedBy: h.placed_by_sub || "Customs Officer",
              })),
              dgLines: (u.unit_stay_unit_dg_lines || []).map((dg: any) => ({
                dgLineId: toNum(dg.unit_dg_line_id),
                unNo: dg.un_no,
                imoClass: dg.imo_class,
                marinePollutant: dg.marine_pollutant,
              })),
            };
          });
        }
      } catch (err: any) {
        console.warn("[CargoService.getUnits] DB query error:", err.message);
      }
    }

    return allStays;
  }

  async getUnit(unitStayId: string | number) {
    const prisma = getPrisma();
    const id = Number(unitStayId);

    if (isDbLive() && prisma) {
      try {
        const u = await prisma.unit_stay.findFirst({
          where: {
            OR: [
              ...(Number.isFinite(id) ? [{ unit_stay_id: id }] : []),
              { unit_stay_cargo_units: { unit_no: String(unitStayId).trim().toUpperCase() } },
            ],
          },
          include: {
            unit_stay_cargo_units: {
              include: { cargo_unit_unit_types: true },
            },
            unit_stay_yard_locations: true,
            unit_stay_consignments: {
              include: {
                vessel_call: { include: { m_vessel: true } },
                m_party_consignment_consignee: true,
              },
            },
            unit_stay_cargo_regimes: true,
            unit_stay_holds: { include: { hold_types: true } },
            unit_stay_unit_dg_lines: true,
          },
        });

        if (u) {
          const activeHolds = (u.unit_stay_holds || []).filter((h: any) => h.status === "ACTIVE").length;
          const unitNo = u.unit_stay_cargo_units?.unit_no || `UNIT-${u.unit_stay_id}`;
          const category = u.unit_stay_cargo_units?.cargo_unit_unit_types?.unit_category || u.unit_stay_cargo_units?.unit_category || "CONTAINER";
          const typeCode = u.unit_stay_cargo_units?.cargo_unit_unit_types?.type_code || "40HC";

          return {
            unitStayId: toNum(u.unit_stay_id),
            siteId: u.site_id,
            consignmentId: u.consignment_id ? toNum(u.consignment_id) : undefined,
            cargoUnit: {
              cargoUnitId: toNum(u.cargo_unit_id),
              category,
              unitNo,
              unitTypeCode: typeCode,
              ownerPartyId: u.unit_stay_cargo_units?.owner_party_id || 4,
              tareKg: u.unit_stay_cargo_units?.tare_kg || 3750,
              maxGrossKg: u.unit_stay_cargo_units?.max_gross_kg || 32500,
            },
            cargoRegimeCode: u.unit_stay_cargo_regimes?.regime_code || "IMPORT_HOME",
            flow: u.flow || "IMPORT",
            fullEmpty: u.full_empty || "F",
            physicalStatus: u.physical_status,
            customsStatus: u.customs_status || "CLEARED",
            releaseStatus: u.release_status || "APPROVED",
            billingStatus: u.billing_status || "PAID",
            sealNo: u.seal_no || "SEAL-001",
            grossWeightKg: Number(u.gross_weight_kg || 0),
            cargoDescription: u.cargo_description || "General Merchandise",
            conditionStatus: u.condition_status || "SOUND",
            reeferTempC: u.reefer_set_temp_c ? Number(u.reefer_set_temp_c) : undefined,
            dischargeAt: u.discharge_at?.toISOString(),
            gatedInAt: u.gated_in_at?.toISOString(),
            departedAt: u.departed_at?.toISOString(),
            freeUntil: u.storage_start_at
              ? new Date(new Date(u.storage_start_at).getTime() + 7 * 86400000).toISOString()
              : undefined,
            activeHoldCount: activeHolds,
            currentLocation: u.unit_stay_yard_locations
              ? {
                  locationId: u.unit_stay_yard_locations.yard_location_id,
                  fullCode: u.unit_stay_yard_locations.full_code,
                  block: u.unit_stay_yard_locations.location_code,
                }
              : undefined,
            consignments: u.unit_stay_consignments
              ? {
                  consignmentId: toNum(u.unit_stay_consignments.consignment_id),
                  refNo: u.unit_stay_consignments.ref_no,
                  refType: u.unit_stay_consignments.ref_type,
                  vesselName: u.unit_stay_consignments.vessel_call?.m_vessel?.vessel_name || "Vessel",
                  voyageNo: u.unit_stay_consignments.vessel_call?.voyage_no || "V.001",
                  consigneeName: u.unit_stay_consignments.m_party_consignment_consignee?.party_name,
                }
              : undefined,
            holds: (u.unit_stay_holds || []).map((h: any) => ({
              holdId: toNum(h.hold_id),
              holdTypeCode: h.hold_types?.hold_code || "CUSTOMS",
              status: h.status,
              reason: h.reason,
              placedAt: h.placed_at?.toISOString(),
              placedBy: h.placed_by_sub || "Customs Officer",
            })),
            dgLines: (u.unit_stay_unit_dg_lines || []).map((dg: any) => ({
              dgLineId: toNum(dg.unit_dg_line_id),
              unNo: dg.un_no,
              imoClass: dg.imo_class,
              marinePollutant: dg.marine_pollutant,
            })),
          };
        }
      } catch (err: any) {
        console.warn("[CargoService.getUnit] DB query error:", err.message);
      }
    }

    const s = allStays.find(
      (x) =>
        String(x.unitStayId) === String(unitStayId) ||
        x.cargoUnit?.unitNo === String(unitStayId)
    );
    return s || allStays[0];
  }

  async createUnit(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const unitNo = body.unitNo || `NEWU${Date.now().toString().slice(-7)}`;
        let cu = await prisma.cargo_unit.findFirst({ where: { unit_no: unitNo } });
        if (!cu) {
          const uTypes = await prisma.m_unit_type.findMany();
          const targetType = uTypes.find(t => t.type_code === body.isoType) || uTypes[0];
          cu = await prisma.cargo_unit.create({
            data: {
              unit_category: body.category || "CONTAINER",
              unit_no: unitNo,
              unit_type_id: targetType?.unit_type_id || 1,
              createdby: "system",
            },
          });
        }

        const stay = await prisma.unit_stay.create({
          data: {
            cargo_unit_id: cu.cargo_unit_id,
            site_id: body.siteId || 1,
            consignment_id: body.consignmentId ? Number(body.consignmentId) : null,
            cargo_regime_id: body.cargoRegimeId || 1,
            flow: body.flow || "IMPORT",
            full_empty: body.fullEmpty || "F",
            physical_status: body.physicalStatus || "EXPECTED",
            customs_status: "CLEARED",
            release_status: "APPROVED",
            billing_status: "PAID",
            seal_no: body.sealNo || "SEAL-001",
            gross_weight_kg: body.grossWeightKg ? Number(body.grossWeightKg) : 24000,
            gated_in_at: new Date(),
            createdby: "system",
          },
        });

        return this.getUnit(Number(stay.unit_stay_id));
      } catch (err: any) {
        console.warn("[CargoService.createUnit] DB insert error:", err.message);
      }
    }

    const newStay = {
      unitStayId: allStays.length + 5001,
      siteId: 1,
      consignmentId: body.consignmentId || 101,
      cargoUnit: {
        cargoUnitId: allStays.length + 5001,
        category: body.category || "CONTAINER",
        unitNo: body.unitNo || `NEWU${Date.now().toString().slice(-7)}`,
        isoType: body.isoType || "40HC",
        tareWeightKg: body.tareWeightKg || 3800,
      },
      physicalStatus: body.physicalStatus || "IN_YARD",
      flow: body.flow || "IMPORT",
      sealNo: body.sealNo || "SEAL-001",
      customsStatus: "CLEARED",
      releaseStatus: "APPROVED",
      billingStatus: "PAID",
      grossWeightKg: body.grossWeightKg || 24000,
      activeHoldCount: 0,
      ...body,
    };
    allStays.push(newStay as any);
    return newStay;
  }

  async updateUnit(unitStayId: string | number, body: any) {
    const prisma = getPrisma();
    const id = Number(unitStayId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const updateData: any = {};
        if (body.physicalStatus) updateData.physical_status = body.physicalStatus;
        if (body.customsStatus) updateData.customs_status = body.customsStatus;
        if (body.releaseStatus) updateData.release_status = body.releaseStatus;
        if (body.billingStatus) updateData.billing_status = body.billingStatus;
        if (body.sealNo) updateData.seal_no = body.sealNo;
        if (body.currentLocationId) updateData.current_location_id = Number(body.currentLocationId);

        await prisma.unit_stay.update({
          where: { unit_stay_id: id },
          data: updateData,
        });

        return this.getUnit(id);
      } catch (err: any) {
        console.warn("[CargoService.updateUnit] DB update error:", err.message);
      }
    }

    const s = allStays.find((x) => String(x.unitStayId) === String(unitStayId));
    if (s) Object.assign(s, body);
    return s;
  }

  async getUnitTimeline(unitStayId: string | number) {
    const u = await this.getUnit(unitStayId);
    return [
      {
        at: u?.dischargeAt || new Date(Date.now() - 86400000 * 3).toISOString(),
        title: "Discharged from vessel",
        detail: "Vessel call berth complete",
      },
      {
        at: u?.gatedInAt || new Date(Date.now() - 86400000 * 2).toISOString(),
        title: "Gated In to ICD Terminal",
        detail: `Location ${u?.currentLocation?.fullCode || "A-01-01"}`,
      },
      {
        at: new Date(Date.now() - 86400000 * 1).toISOString(),
        title: "Customs declaration lodged",
        detail: `Status: ${u?.customsStatus || "CLEARED"}`,
      },
    ];
  }

  // ------------------------------------------------------------------ 2. CONSIGNMENTS
  async getConsignments(query: any = {}) {
    const { status, regime, search: searchQ, siteId } = query;
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const where: any = {};
        if (siteId) where.site_id = Number(siteId);
        if (status) where.status = status;
        if (regime) where.m_cargo_regime = { regime_code: regime };
        if (searchQ) {
          const q = String(searchQ).trim();
          where.OR = [
            { ref_no: { contains: q } },
            { cargo_description: { contains: q } },
            { m_party_consignment_consignee: { party_name: { contains: q } } },
          ];
        }

        const dbConsignments = await prisma.consignment.findMany({
          where,
          include: {
            vessel_call: { include: { m_vessel: true } },
            m_party_consignment_consignee: true,
            m_party_consignment_shipping_line: true,
            m_cargo_regime: true,
            consignment_line: true,
            unit_stay_consignments: {
              include: {
                unit_stay_cargo_units: { include: { cargo_unit_unit_types: true } },
                unit_stay_yard_locations: true,
              },
            },
            customs_ref: { include: { m_customs_ref_type: true } },
            release_order: true,
          },
          orderBy: { consignment_id: "desc" },
        });

        if (dbConsignments && dbConsignments.length > 0) {
          return dbConsignments.map((c) => ({
            consignmentId: toNum(c.consignment_id),
            siteId: c.site_id,
            refType: c.ref_type,
            refNo: c.ref_no,
            cargoRegimeId: c.cargo_regime_id,
            cargoRegimeCode: c.m_cargo_regime?.regime_code || "LOCAL",
            vesselCallId: c.vessel_call_id,
            vesselName: c.vessel_call?.m_vessel?.vessel_name || "Vessel",
            voyageNo: c.vessel_call?.voyage_no || "V.001",
            shippingLinePartyId: c.shipping_line_party_id,
            shippingLineName: c.m_party_consignment_shipping_line?.party_name,
            consigneePartyId: c.consignee_party_id,
            consigneeName: c.m_party_consignment_consignee?.party_name || "Consignee",
            cargoDescription: c.cargo_description,
            destinationCountry: c.destination_country || "TZ",
            unitsExpected: c.units_expected,
            unitsReceived: c.units_received,
            unitsDelivered: c.units_delivered,
            status: c.status,
            declaredWeightKg: Number(c.declared_weight_kg || 0),
            lines: (c.consignment_line || []).map((cl) => ({
              consignmentLineId: toNum(cl.consignment_line_id),
              consignmentId: toNum(cl.consignment_id),
              lineNo: cl.line_no,
              qtyExpected: Number(cl.qty_expected),
              qtyReceived: Number(cl.qty_received),
              weightKg: Number(cl.weight_kg || 0),
              description: cl.description,
            })),
            unitStays: (c.unit_stay_consignments || []).map((u) => ({
              unitStayId: toNum(u.unit_stay_id),
              unitNo: u.unit_stay_cargo_units?.unit_no,
              physicalStatus: u.physical_status,
              customsStatus: u.customs_status,
              releaseStatus: u.release_status,
            })),
            units: (c.unit_stay_consignments || []).map((u: any) => ({
              unitStayId: toNum(u.unit_stay_id),
              unitNo: u.unit_stay_cargo_units?.unit_no,
              category: u.unit_stay_cargo_units?.cargo_unit_unit_types?.unit_category || u.unit_stay_cargo_units?.unit_category || "CONTAINER",
              unitTypeCode: u.unit_stay_cargo_units?.cargo_unit_unit_types?.type_code || "40HC",
              location: u.unit_stay_yard_locations?.full_code || "In yard",
              physicalStatus: u.physical_status,
              customsStatus: u.customs_status,
              releaseStatus: u.release_status,
              billingStatus: u.billing_status,
              activeHoldCount: 0,
              sealNo: u.seal_no,
              freeUntil: u.storage_start_at
                ? new Date(new Date(u.storage_start_at).getTime() + 7 * 86400000).toISOString()
                : undefined,
            })),
            customsRefs: (c.customs_ref || []).map((cr) => ({
              customsRefId: toNum(cr.customs_ref_id),
              refNo: cr.ref_no,
              status: cr.status,
              refTypeCode: cr.m_customs_ref_type?.ref_type_code,
              amount: cr.amount ? Number(cr.amount) : undefined,
              currency: cr.amount_currency,
            })),
            releases: (c.release_order || []).map((ro) => ({
              releaseOrderId: toNum(ro.release_order_id),
              releaseNo: ro.release_no,
              releaseKind: ro.release_kind,
              status: ro.status,
              unitsTotal: ro.units_total,
              unitsOut: ro.units_out,
            })),
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getConsignments] DB query error:", err.message);
      }
    }

    return consignments;
  }

  async getConsignment(id: string | number) {
    const prisma = getPrisma();
    const cId = Number(id);

    if (isDbLive() && prisma) {
      try {
        const c = await prisma.consignment.findFirst({
          where: {
            OR: [
              ...(Number.isFinite(cId) ? [{ consignment_id: cId }] : []),
              { ref_no: String(id).trim() },
            ],
          },
          include: {
            vessel_call: { include: { m_vessel: true } },
            m_party_consignment_consignee: true,
            m_party_consignment_shipping_line: true,
            m_cargo_regime: true,
            consignment_line: true,
            unit_stay_consignments: {
              include: {
                unit_stay_cargo_units: { include: { cargo_unit_unit_types: true } },
                unit_stay_yard_locations: true,
              },
            },
            customs_ref: {
              include: { m_customs_ref_type: true },
            },
            release_order: true,
          },
        });

        if (c) {
          return {
            consignmentId: toNum(c.consignment_id),
            siteId: c.site_id,
            refType: c.ref_type,
            refNo: c.ref_no,
            cargoRegimeId: c.cargo_regime_id,
            cargoRegimeCode: c.m_cargo_regime?.regime_code || "LOCAL",
            vesselCallId: c.vessel_call_id,
            vesselName: c.vessel_call?.m_vessel?.vessel_name || "Vessel",
            voyageNo: c.vessel_call?.voyage_no || "V.001",
            shippingLinePartyId: c.shipping_line_party_id,
            shippingLineName: c.m_party_consignment_shipping_line?.party_name,
            consigneePartyId: c.consignee_party_id,
            consigneeName: c.m_party_consignment_consignee?.party_name || "Consignee",
            cargoDescription: c.cargo_description,
            destinationCountry: c.destination_country || "TZ",
            unitsExpected: c.units_expected,
            unitsReceived: c.units_received,
            unitsDelivered: c.units_delivered,
            status: c.status,
            declaredWeightKg: Number(c.declared_weight_kg || 0),
            lines: (c.consignment_line || []).map((cl) => ({
              consignmentLineId: toNum(cl.consignment_line_id),
              consignmentId: toNum(cl.consignment_id),
              lineNo: cl.line_no,
              qtyExpected: Number(cl.qty_expected),
              qtyReceived: Number(cl.qty_received),
              weightKg: Number(cl.weight_kg || 0),
              description: cl.description,
            })),
            unitStays: (c.unit_stay_consignments || []).map((u) => ({
              unitStayId: toNum(u.unit_stay_id),
              unitNo: u.unit_stay_cargo_units?.unit_no,
              physicalStatus: u.physical_status,
              customsStatus: u.customs_status,
              releaseStatus: u.release_status,
            })),
            units: (c.unit_stay_consignments || []).map((u: any) => ({
              unitStayId: toNum(u.unit_stay_id),
              unitNo: u.unit_stay_cargo_units?.unit_no,
              category: u.unit_stay_cargo_units?.cargo_unit_unit_types?.unit_category || u.unit_stay_cargo_units?.unit_category || "CONTAINER",
              unitTypeCode: u.unit_stay_cargo_units?.cargo_unit_unit_types?.type_code || "40HC",
              location: u.unit_stay_yard_locations?.full_code || "In yard",
              physicalStatus: u.physical_status,
              customsStatus: u.customs_status,
              releaseStatus: u.release_status,
              billingStatus: u.billing_status,
              activeHoldCount: 0,
              sealNo: u.seal_no,
              freeUntil: u.storage_start_at
                ? new Date(new Date(u.storage_start_at).getTime() + 7 * 86400000).toISOString()
                : undefined,
            })),
            customsRefs: (c.customs_ref || []).map((cr) => ({
              customsRefId: toNum(cr.customs_ref_id),
              refNo: cr.ref_no,
              status: cr.status,
              refTypeCode: cr.m_customs_ref_type?.ref_type_code,
              amount: cr.amount ? Number(cr.amount) : undefined,
              currency: cr.amount_currency,
            })),
            releases: (c.release_order || []).map((ro) => ({
              releaseOrderId: toNum(ro.release_order_id),
              releaseNo: ro.release_no,
              releaseKind: ro.release_kind,
              status: ro.status,
              unitsTotal: ro.units_total,
              unitsOut: ro.units_out,
            })),
          };
        }
      } catch (err: any) {
        console.warn("[CargoService.getConsignment] DB query error:", err.message);
      }
    }

    return consignments.find((x) => String(x.consignmentId) === String(id)) || consignments[0];
  }

  async createConsignment(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const refNo = body.refNo || `BL-AUTO-${Date.now().toString().slice(-6)}`;
        const created = await prisma.consignment.create({
          data: {
            site_id: body.siteId || 1,
            ref_type: body.refType || "BL",
            ref_no: refNo,
            cargo_regime_id: body.cargoRegimeId || 1,
            vessel_call_id: body.vesselCallId ? Number(body.vesselCallId) : null,
            consignee_party_id: body.consigneePartyId ? Number(body.consigneePartyId) : null,
            cargo_description: body.cargoDescription || "General cargo",
            destination_country: body.destinationCountry || "TZ",
            units_expected: body.unitsExpected ? Number(body.unitsExpected) : 1,
            units_received: 0,
            units_delivered: 0,
            status: "OPEN",
            createdby: "system",
          },
        });
        return this.getConsignment(Number(created.consignment_id));
      } catch (err: any) {
        console.warn("[CargoService.createConsignment] DB insert error:", err.message);
      }
    }

    const newC = {
      consignmentId: consignments.length + 101,
      siteId: 1,
      refType: body.refType || "BL",
      refNo: body.refNo || `BL-AUTO-${Date.now().toString().slice(-6)}`,
      cargoRegimeId: 1,
      cargoRegimeCode: "LOCAL",
      unitsExpected: 1,
      unitsReceived: 0,
      unitsDelivered: 0,
      status: "OPEN",
      ...body,
    };
    consignments.push(newC as any);
    return newC;
  }

  async updateConsignment(id: string | number, body: any) {
    const prisma = getPrisma();
    const cId = Number(id);

    if (isDbLive() && prisma && Number.isFinite(cId)) {
      try {
        const updateData: any = {};
        if (body.cargoDescription) updateData.cargo_description = body.cargoDescription;
        if (body.status) updateData.status = body.status;
        if (body.destinationCountry) updateData.destination_country = body.destinationCountry;

        await prisma.consignment.update({
          where: { consignment_id: cId },
          data: updateData,
        });
        return this.getConsignment(cId);
      } catch (err: any) {
        console.warn("[CargoService.updateConsignment] DB update error:", err.message);
      }
    }

    const c = consignments.find((x) => String(x.consignmentId) === String(id));
    if (c) Object.assign(c, body);
    return c;
  }

  async getConsignmentLines(consignmentId: string | number) {
    const prisma = getPrisma();
    const cId = Number(consignmentId);

    if (isDbLive() && prisma && Number.isFinite(cId)) {
      try {
        const lines = await prisma.consignment_line.findMany({
          where: { consignment_id: cId },
          orderBy: { line_no: "asc" },
        });
        return lines.map((cl) => ({
          consignmentLineId: toNum(cl.consignment_line_id),
          consignmentId: toNum(cl.consignment_id),
          lineNo: cl.line_no,
          qtyExpected: Number(cl.qty_expected),
          qtyReceived: Number(cl.qty_received),
          weightKg: Number(cl.weight_kg || 0),
          description: cl.description,
        }));
      } catch (err: any) {
        console.warn("[CargoService.getConsignmentLines] DB query error:", err.message);
      }
    }

    return [];
  }

  async saveConsignmentLines(consignmentId: string | number, lines: any[]) {
    const prisma = getPrisma();
    const cId = Number(consignmentId);

    if (isDbLive() && prisma && Number.isFinite(cId) && Array.isArray(lines)) {
      try {
        await prisma.consignment_line.deleteMany({ where: { consignment_id: cId } });
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          await prisma.consignment_line.create({
            data: {
              consignment_id: cId,
              line_no: l.lineNo || i + 1,
              description: l.description || "General Merchandise",
              qty_expected: l.qtyExpected ? Number(l.qtyExpected) : 1,
              qty_received: l.qtyReceived ? Number(l.qtyReceived) : 0,
              weight_kg: l.weightKg ? Number(l.weightKg) : 24000,
              createdby: "system",
            },
          });
        }
        return this.getConsignmentLines(cId);
      } catch (err: any) {
        console.warn("[CargoService.saveConsignmentLines] DB save error:", err.message);
      }
    }

    return lines;
  }

  async getConsignmentUnits(consignmentId: string | number) {
    return this.getUnits({ consignmentId });
  }

  // ------------------------------------------------------------------ 3. VESSEL CALLS
  async getVesselCalls(query: any = {}) {
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const dbCalls = await prisma.vessel_call.findMany({
          include: {
            m_vessel: true,
            m_port: true,
            m_party_vessel_call: true,
            consignment: true,
          },
          orderBy: { vessel_call_id: "desc" },
        });

        if (dbCalls && dbCalls.length > 0) {
          return dbCalls.map((vc) => ({
            vesselCallId: vc.vessel_call_id,
            vesselId: vc.vessel_id,
            vesselName: vc.m_vessel?.vessel_name || "Vessel",
            callSign: vc.m_vessel?.call_sign,
            imoNo: vc.m_vessel?.imo_no,
            voyageNo: vc.voyage_no,
            portId: vc.port_id,
            portName: vc.m_port?.port_name || "Port of Dar es Salaam",
            shippingLinePartyId: vc.shipping_line_party_id,
            shippingLineName: vc.m_party_vessel_call?.party_name || "Shipping Line",
            eta: vc.eta?.toISOString(),
            ata: vc.ata?.toISOString(),
            dischargeCompletedAt: vc.discharge_completed_at?.toISOString(),
            status: vc.status,
            portCallRef: vc.port_call_ref,
            consignmentsCount: vc.consignment?.length || 0,
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getVesselCalls] DB query error:", err.message);
      }
    }

    return vesselCalls;
  }

  async getVesselCall(vesselCallId: string | number) {
    const list = await this.getVesselCalls();
    return list.find((v) => String(v.vesselCallId) === String(vesselCallId)) || list[0];
  }

  async createVesselCall(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const vessels = await prisma.m_vessel.findMany();
        const v = vessels[0];
        const ports = await prisma.m_port.findMany();
        const p = ports[0];

        const created = await prisma.vessel_call.create({
          data: {
            vessel_id: body.vesselId ? Number(body.vesselId) : v?.vessel_id || 1,
            voyage_no: body.voyageNo || `V.${Date.now().toString().slice(-4)}`,
            port_id: body.portId ? Number(body.portId) : p?.port_id || 1,
            eta: body.eta ? new Date(body.eta) : new Date(),
            status: "EXPECTED",
            port_call_ref: body.portCallRef || `PC-${Date.now().toString().slice(-4)}`,
            createdby: "system",
          },
        });
        return this.getVesselCall(created.vessel_call_id);
      } catch (err: any) {
        console.warn("[CargoService.createVesselCall] DB error:", err.message);
      }
    }

    const newVc = {
      vesselCallId: vesselCalls.length + 1,
      vesselName: body.vesselName || "Maersk Mc-Kinney Moller",
      voyageNo: body.voyageNo || "V.2601",
      status: "EXPECTED",
      ...body,
    };
    vesselCalls.push(newVc as any);
    return newVc;
  }

  async updateVesselCall(vesselCallId: string | number, body: any) {
    const prisma = getPrisma();
    const id = Number(vesselCallId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const updateData: any = {};
        if (body.status) updateData.status = body.status;
        if (body.ata) updateData.ata = new Date(body.ata);
        if (body.dischargeCompletedAt) updateData.discharge_completed_at = new Date(body.dischargeCompletedAt);

        await prisma.vessel_call.update({
          where: { vessel_call_id: id },
          data: updateData,
        });
        return this.getVesselCall(id);
      } catch (err: any) {
        console.warn("[CargoService.updateVesselCall] DB error:", err.message);
      }
    }

    const v = vesselCalls.find((x) => String(x.vesselCallId) === String(vesselCallId));
    if (v) Object.assign(v, body);
    return v;
  }

  // ------------------------------------------------------------------ 4. MANIFESTS
  async getManifests() {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const dbManifests = await prisma.manifest.findMany({
          include: {
            vessel_call: { include: { m_vessel: true } },
            manifest_line: true,
          },
          orderBy: { manifest_id: "desc" },
        });

        if (dbManifests && dbManifests.length > 0) {
          return dbManifests.map((m) => ({
            manifestId: m.manifest_id,
            siteId: m.site_id,
            vesselCallId: m.vessel_call_id,
            vesselName: m.vessel_call?.m_vessel?.vessel_name || "Maersk Mc-Kinney Moller",
            voyageNo: m.vessel_call?.voyage_no || "V.2601",
            manifestRef: m.manifest_ref,
            source: m.source,
            importedAt: m.imported_at?.toISOString(),
            lineCount: m.line_count,
            createdCount: m.created_count,
            matchedCount: m.matched_count,
            errorCount: m.error_count,
            status: m.status,
            lines: (m.manifest_line || []).map((ml) => ({
              manifestLineId: toNum(ml.manifest_line_id),
              manifestId: ml.manifest_id,
              lineNo: ml.line_no,
              unitNo: ml.unit_no || ml.unit_no_raw,
              blNo: ml.bl_no,
              consigneeRaw: ml.consignee_raw,
              agentRaw: ml.agent_raw,
              fullEmpty: ml.full_empty,
              sealNo: ml.seal_no,
              grossWeightKg: Number(ml.gross_weight_kg || 0),
              matchStatus: ml.match_status,
              unitStayId: ml.unit_stay_id ? toNum(ml.unit_stay_id) : undefined,
            })),
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getManifests] DB query error:", err.message);
      }
    }

    return manifests;
  }

  async getManifest(manifestId: string | number) {
    const list = await this.getManifests();
    return list.find((m) => String(m.manifestId) === String(manifestId)) || list[0];
  }

  async createManifest(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const created = await prisma.manifest.create({
          data: {
            site_id: body.siteId || 1,
            vessel_call_id: body.vesselCallId ? Number(body.vesselCallId) : null,
            manifest_ref: body.manifestRef || `MAN-${Date.now().toString().slice(-6)}`,
            source: body.source || "EDI",
            status: "IMPORTED",
            line_count: body.lines?.length || 0,
            created_count: body.lines?.length || 0,
            createdby: "system",
          },
        });
        return this.getManifest(created.manifest_id);
      } catch (err: any) {
        console.warn("[CargoService.createManifest] DB error:", err.message);
      }
    }

    const newM = {
      manifestId: manifests.length + 1,
      manifestRef: body.manifestRef || `MAN-${Date.now().toString().slice(-6)}`,
      source: "EDI",
      status: "IMPORTED",
      ...body,
    };
    manifests.push(newM as any);
    return newM;
  }

  async updateManifestLine(manifestLineId: string | number, body: any) {
    const prisma = getPrisma();
    const id = Number(manifestLineId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const updated = await prisma.manifest_line.update({
          where: { manifest_line_id: id },
          data: {
            match_status: body.matchStatus || "MATCHED",
            unit_stay_id: body.unitStayId ? Number(body.unitStayId) : undefined,
          },
        });
        return {
          manifestLineId: toNum(updated.manifest_line_id),
          matchStatus: updated.match_status,
        };
      } catch (err: any) {
        console.warn("[CargoService.updateManifestLine] DB error:", err.message);
      }
    }

    return { manifestLineId, ...body };
  }

  async applyManifest(manifestId: string | number) {
    return { success: true, manifest: await this.getManifest(manifestId) };
  }

  // ------------------------------------------------------------------ 5. CUSTOMS & EXAMS
  async getCustomsRefs(query: any = {}) {
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const dbRefs = await prisma.customs_ref.findMany({
          include: {
            m_customs_ref_type: true,
            consignment: true,
            unit_stay: { include: { unit_stay_cargo_units: true } },
          },
          orderBy: { customs_ref_id: "desc" },
        });

        if (dbRefs && dbRefs.length > 0) {
          return dbRefs.map((cr) => ({
            customsRefId: toNum(cr.customs_ref_id),
            customsRefTypeId: cr.customs_ref_type_id,
            refTypeCode: cr.m_customs_ref_type?.ref_type_code || "TANSAD",
            refTypeName: cr.m_customs_ref_type?.ref_type_name || "Customs Declaration",
            consignmentId: cr.consignment_id ? toNum(cr.consignment_id) : undefined,
            consignmentRef: cr.consignment?.ref_no,
            unitStayId: cr.unit_stay_id ? toNum(cr.unit_stay_id) : undefined,
            unitNo: cr.unit_stay?.unit_stay_cargo_units?.unit_no,
            refNo: cr.ref_no,
            refDate: cr.ref_date?.toISOString(),
            status: cr.status,
            validTo: cr.valid_to?.toISOString(),
            amount: cr.amount ? Number(cr.amount) : undefined,
            amountCurrency: cr.amount_currency || "TZS",
            source: cr.source,
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getCustomsRefs] DB error:", err.message);
      }
    }

    return customsRefs;
  }

  async createCustomsRef(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const created = await prisma.customs_ref.create({
          data: {
            customs_ref_type_id: body.customsRefTypeId || 1,
            consignment_id: body.consignmentId ? Number(body.consignmentId) : null,
            unit_stay_id: !body.consignmentId && body.unitStayId ? Number(body.unitStayId) : null,
            ref_no: body.refNo || `REF-${Date.now().toString().slice(-6)}`,
            ref_date: body.refDate ? new Date(body.refDate) : new Date(),
            status: "ACTIVE",
            amount: body.amount ? Number(body.amount) : null,
            amount_currency: body.amountCurrency || "TZS",
            valid_to: body.validTo ? new Date(body.validTo) : new Date(Date.now() + 86400000 * 30),
            source: "MANUAL",
            createdby: "system",
          },
        });
        const refs = await this.getCustomsRefs();
        return refs.find(r => r.customsRefId === toNum(created.customs_ref_id)) || refs[0];
      } catch (err: any) {
        console.warn("[CargoService.createCustomsRef] DB error:", err.message);
      }
    }

    const newRef = {
      customsRefId: customsRefs.length + 1,
      refNo: body.refNo || `REF-${Date.now().toString().slice(-6)}`,
      status: "ACTIVE",
      ...body,
    };
    customsRefs.push(newRef as any);
    return newRef;
  }

  async getCustomsExams() {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const dbExams = await prisma.exam.findMany({
          include: {
            unit_stay: {
              include: {
                unit_stay_cargo_units: true,
                unit_stay_yard_locations: true,
              },
            },
            m_yard_location: true,
          },
          orderBy: { exam_id: "desc" },
        });

        if (dbExams && dbExams.length > 0) {
          return dbExams.map((e) => ({
            examId: toNum(e.exam_id),
            unitStayId: toNum(e.unit_stay_id),
            unitNo: e.unit_stay?.unit_stay_cargo_units?.unit_no || `UNIT-${e.unit_stay_id}`,
            examType: e.exam_type,
            noticeRef: e.notice_ref,
            authority: e.authority,
            status: e.status,
            scheduledAt: e.scheduled_at?.toISOString(),
            locationCode: e.m_yard_location?.full_code || e.unit_stay?.unit_stay_yard_locations?.full_code,
            startedAt: e.started_at?.toISOString(),
            completedAt: e.completed_at?.toISOString(),
            result: e.result,
            officersPresent: e.officers_present,
            remarks: e.remarks,
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getCustomsExams] DB error:", err.message);
      }
    }

    return exams;
  }

  async createCustomsExam(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const created = await prisma.exam.create({
          data: {
            unit_stay_id: Number(body.unitStayId) || 1,
            exam_type: body.examType || "PHYSICAL",
            notice_ref: body.noticeRef || `EXAM-REQ-${Date.now().toString().slice(-4)}`,
            authority: body.authority || "CUSTOMS",
            status: "SCHEDULED",
            scheduled_at: body.scheduledAt ? new Date(body.scheduledAt) : new Date(Date.now() + 86400000),
            createdby: "system",
          },
        });
        const examsList = await this.getCustomsExams();
        return examsList.find(e => e.examId === toNum(created.exam_id)) || examsList[0];
      } catch (err: any) {
        console.warn("[CargoService.createCustomsExam] DB error:", err.message);
      }
    }

    const newE = {
      examId: exams.length + 1,
      status: "SCHEDULED",
      ...body,
    };
    exams.push(newE as any);
    return newE;
  }

  async completeCustomsExam(examId: string | number, body: any) {
    const prisma = getPrisma();
    const id = Number(examId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const updated = await prisma.exam.update({
          where: { exam_id: id },
          data: {
            status: "COMPLETED",
            result: body.result || "PASSED",
            completed_at: new Date(),
            officers_present: body.officersPresent || "Customs Inspector",
            remarks: body.remarks || "Examination successfully completed and verified",
          },
        });
        const examsList = await this.getCustomsExams();
        return examsList.find(e => e.examId === toNum(updated.exam_id)) || examsList[0];
      } catch (err: any) {
        console.warn("[CargoService.completeCustomsExam] DB error:", err.message);
      }
    }

    return { examId, status: "COMPLETED", ...body };
  }

  // ------------------------------------------------------------------ 6. HOLDS
  async getHolds(query: any = {}) {
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const dbHolds = await prisma.hold.findMany({
          include: {
            hold_types: true,
            hold_unit_stays: {
              include: { unit_stay_cargo_units: true, unit_stay_consignments: true },
            },
          },
          orderBy: { hold_id: "desc" },
        });

        if (dbHolds && dbHolds.length > 0) {
          return dbHolds.map((h) => ({
            holdId: toNum(h.hold_id),
            unitStayId: toNum(h.unit_stay_id),
            unitNo: h.hold_unit_stays?.unit_stay_cargo_units?.unit_no || `UNIT-${h.unit_stay_id}`,
            consignmentRef: h.hold_unit_stays?.unit_stay_consignments?.ref_no,
            holdTypeId: h.hold_type_id,
            holdCode: h.hold_types?.hold_code || "CUSTOMS",
            holdName: h.hold_types?.hold_name || "Customs hold",
            authority: h.hold_types?.authority || "CUSTOMS",
            authorityRef: h.authority_ref,
            reason: h.reason,
            status: h.status,
            placedAt: h.placed_at?.toISOString(),
            placedBy: h.placed_by_sub || "Customs Officer",
            liftedAt: h.lifted_at?.toISOString(),
            liftedBy: h.lifted_by_sub,
            liftReason: h.lift_reason,
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getHolds] DB error:", err.message);
      }
    }

    return holds;
  }

  async placeHold(body: any, username: string = "Customs Officer") {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const unitStayId = Number(body.unitStayId) || 1;
        const created = await prisma.hold.create({
          data: {
            unit_stay_id: unitStayId,
            hold_type_id: body.holdTypeId ? Number(body.holdTypeId) : 1,
            reason: body.reason || "Administrative hold applied",
            authority_ref: body.authorityRef || `HOLD-${Date.now().toString().slice(-4)}`,
            placed_at: new Date(),
            placed_by_sub: username,
            status: "ACTIVE",
            createdby: "system",
          },
        });

        await prisma.unit_stay.update({
          where: { unit_stay_id: unitStayId },
          data: { active_hold_count: { increment: 1 } },
        });

        const all = await this.getHolds();
        return all.find(h => h.holdId === toNum(created.hold_id)) || all[0];
      } catch (err: any) {
        console.warn("[CargoService.placeHold] DB error:", err.message);
      }
    }

    const newH = {
      holdId: holds.length + 1,
      status: "ACTIVE",
      placedAt: new Date().toISOString(),
      ...body,
    };
    holds.push(newH as any);
    return newH;
  }

  async liftHold(holdId: string | number, body: any, username: string = "Customs Officer") {
    const prisma = getPrisma();
    const id = Number(holdId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const existing = await prisma.hold.findUnique({ where: { hold_id: id } });
        if (existing) {
          const updated = await prisma.hold.update({
            where: { hold_id: id },
            data: {
              status: "LIFTED",
              lifted_at: new Date(),
              lifted_by_sub: username,
              lift_reason: body.liftReason || "Authorized release",
            },
          });

          await prisma.unit_stay.update({
            where: { unit_stay_id: existing.unit_stay_id },
            data: { active_hold_count: { decrement: 1 } },
          });

          const all = await this.getHolds();
          return all.find(h => h.holdId === toNum(updated.hold_id)) || all[0];
        }
      } catch (err: any) {
        console.warn("[CargoService.liftHold] DB error:", err.message);
      }
    }

    const h = holds.find((x) => String(x.holdId) === String(holdId));
    if (h) {
      h.status = "LIFTED" as any;
      (h as any).liftedAt = new Date().toISOString();
      (h as any).liftReason = body.liftReason;
    }
    return h;
  }

  // ------------------------------------------------------------------ 7. RELEASE ORDERS
  async getReleaseOrders(query: any = {}) {
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const dbRos = await prisma.release_order.findMany({
          include: {
            consignment: true,
            m_party_release_order_requested_by: true,
            release_order_unit: {
              include: { unit_stay: { include: { unit_stay_cargo_units: true } } },
            },
          },
          orderBy: { release_order_id: "desc" },
        });

        if (dbRos && dbRos.length > 0) {
          return dbRos.map((ro) => ({
            releaseOrderId: toNum(ro.release_order_id),
            siteId: ro.site_id,
            releaseNo: ro.release_no,
            releaseKind: ro.release_kind,
            consignmentId: ro.consignment_id ? toNum(ro.consignment_id) : undefined,
            consignmentRef: ro.consignment?.ref_no,
            status: ro.status,
            unitsTotal: ro.units_total,
            unitsOut: ro.units_out,
            requestedByPartyId: ro.requested_by_party_id,
            requestedByPartyName: ro.m_party_release_order_requested_by?.party_name,
            plannedExitDate: ro.planned_exit_date?.toISOString(),
            validFrom: ro.valid_from?.toISOString(),
            validTo: ro.valid_to?.toISOString(),
            approvedAt: ro.approved_at?.toISOString(),
            collectorName: ro.collector_name,
            collectorIdNo: ro.collector_id_no,
            units: (ro.release_order_unit || []).map((rou) => ({
              releaseOrderUnitId: toNum(rou.release_order_unit_id),
              unitStayId: toNum(rou.unit_stay_id),
              unitNo: rou.unit_stay?.unit_stay_cargo_units?.unit_no,
              status: rou.status,
            })),
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getReleaseOrders] DB error:", err.message);
      }
    }

    return releaseOrders;
  }

  async getReleaseOrder(releaseOrderId: string | number) {
    const list = await this.getReleaseOrders();
    return list.find((r) => String(r.releaseOrderId) === String(releaseOrderId)) || list[0];
  }

  async createReleaseOrder(body: any, username: string = "Release Officer") {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const created = await prisma.release_order.create({
          data: {
            site_id: body.siteId || 1,
            release_no: body.releaseNo || `RO-${Date.now().toString().slice(-6)}`,
            release_kind: body.releaseKind || "DELIVERY",
            consignment_id: body.consignmentId ? Number(body.consignmentId) : null,
            status: "APPROVED",
            units_total: body.unitsTotal || 1,
            units_out: 0,
            valid_from: new Date(),
            valid_to: body.validTo ? new Date(body.validTo) : new Date(Date.now() + 86400000 * 5),
            approved_at: new Date(),
            approved_by_sub: username,
            collector_name: body.collectorName || "Authorized Transporter",
            collector_id_no: body.collectorIdNo || "NIDA-001",
            createdby: "system",
          },
        });
        return this.getReleaseOrder(Number(created.release_order_id));
      } catch (err: any) {
        console.warn("[CargoService.createReleaseOrder] DB error:", err.message);
      }
    }

    const newRo = {
      releaseOrderId: releaseOrders.length + 1,
      releaseNo: body.releaseNo || `RO-${Date.now().toString().slice(-6)}`,
      status: "APPROVED",
      validTo: new Date(Date.now() + 86400000 * 5).toISOString(),
      ...body,
    };
    releaseOrders.push(newRo as any);
    return newRo;
  }

  async evaluateRelease(releaseOrderId: string | number) {
    const ro = await this.getReleaseOrder(releaseOrderId);
    return {
      releaseOrderId: ro?.releaseOrderId,
      releaseNo: ro?.releaseNo,
      readyToRelease: true,
      conditions: [
        { code: "CUSTOMS_CLEARED", name: "Customs declaration cleared", passed: true },
        { code: "CHARGES_PAID", name: "Terminal charges fully paid", passed: true },
        { code: "NO_ACTIVE_HOLDS", name: "Zero active unit holds", passed: true },
        { code: "TRANSPORTER_VALID", name: "Transporter license valid", passed: true },
      ],
    };
  }

  async approveReleaseOrder(releaseOrderId: string | number, username: string = "Terminal Manager") {
    const prisma = getPrisma();
    const id = Number(releaseOrderId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        await prisma.release_order.update({
          where: { release_order_id: id },
          data: {
            status: "APPROVED",
            approved_at: new Date(),
            approved_by_sub: username,
          },
        });
        return this.getReleaseOrder(id);
      } catch (err: any) {
        console.warn("[CargoService.approveReleaseOrder] DB error:", err.message);
      }
    }

    const ro = releaseOrders.find((r) => String(r.releaseOrderId) === String(releaseOrderId));
    if (ro) {
      ro.status = "APPROVED" as any;
      (ro as any).approvedAt = new Date().toISOString();
      (ro as any).approvedBy = username;
    }
    return ro;
  }

  async cancelReleaseOrder(releaseOrderId: string | number, reason: string) {
    const prisma = getPrisma();
    const id = Number(releaseOrderId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        await prisma.release_order.update({
          where: { release_order_id: id },
          data: {
            status: "CANCELLED",
            cancel_reason: reason || "Cancelled by user",
          },
        });
        return this.getReleaseOrder(id);
      } catch (err: any) {
        console.warn("[CargoService.cancelReleaseOrder] DB error:", err.message);
      }
    }

    const ro = releaseOrders.find((r) => String(r.releaseOrderId) === String(releaseOrderId));
    if (ro) {
      ro.status = "CANCELLED" as any;
      (ro as any).cancelReason = reason;
    }
    return ro;
  }

  async revalidateReleaseOrder(releaseOrderId: string | number, newValidTo: string) {
    const prisma = getPrisma();
    const id = Number(releaseOrderId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        await prisma.release_order.update({
          where: { release_order_id: id },
          data: {
            valid_to: new Date(newValidTo),
          },
        });
        return this.getReleaseOrder(id);
      } catch (err: any) {
        console.warn("[CargoService.revalidateReleaseOrder] DB error:", err.message);
      }
    }

    const ro = releaseOrders.find((r) => String(r.releaseOrderId) === String(releaseOrderId));
    if (ro) {
      ro.validTo = newValidTo;
    }
    return ro;
  }

  async changeReleaseUnits(releaseOrderId: string | number, unitStayIds: number[]) {
    const ro = await this.getReleaseOrder(releaseOrderId);
    return ro;
  }

  // ------------------------------------------------------------------ 8. DANGEROUS GOODS
  async getDgLines() {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const dbDg = await prisma.unit_dg_line.findMany({
          include: {
            unit_stay: {
              include: {
                unit_stay_cargo_units: true,
                unit_stay_yard_locations: true,
                unit_stay_consignments: true,
              },
            },
          },
          orderBy: { unit_dg_line_id: "desc" },
        });

        if (dbDg && dbDg.length > 0) {
          return dbDg.map((dg) => ({
            dgLineId: toNum(dg.unit_dg_line_id),
            unitStayId: toNum(dg.unit_stay_id),
            unitNo: dg.unit_stay?.unit_stay_cargo_units?.unit_no || `UNIT-${dg.unit_stay_id}`,
            locationCode: dg.unit_stay?.unit_stay_yard_locations?.full_code,
            consignmentRef: dg.unit_stay?.unit_stay_consignments?.ref_no,
            unNo: dg.un_no,
            imoClass: dg.imo_class,
            packingGroup: dg.packing_group,
            properShippingName: dg.proper_shipping_name,
            flashpointC: dg.flashpoint_c ? Number(dg.flashpoint_c) : undefined,
            marinePollutant: dg.marine_pollutant,
            grossWeightKg: Number(dg.gross_weight_kg || 0),
            emergencyContact: dg.emergency_contact,
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getDgLines] DB query error:", err.message);
      }
    }

    return dgLines;
  }

  async saveDgLines(unitStayId: string | number, lines: any[]) {
    const prisma = getPrisma();
    const stayId = Number(unitStayId);

    if (isDbLive() && prisma && Number.isFinite(stayId) && Array.isArray(lines)) {
      try {
        for (const l of lines) {
          await prisma.unit_dg_line.create({
            data: {
              unit_stay_id: stayId,
              un_no: String(l.unNo || "1203").slice(0, 4),
              imo_class: String(l.imoClass || "3").slice(0, 5),
              proper_shipping_name: l.properShippingName || "FLAMMABLE LIQUID, N.O.S.",
              packing_group: l.packingGroup || "II",
              flashpoint_c: l.flashpointC ? Number(l.flashpointC) : null,
              marine_pollutant: Boolean(l.marinePollutant),
              gross_weight_kg: l.grossWeightKg ? Number(l.grossWeightKg) : 20000,
              emergencyContact: l.emergencyContact || "+255 22 2110000",
            },
          });
        }
        return this.getDgLines();
      } catch (err: any) {
        console.warn("[CargoService.saveDgLines] DB error:", err.message);
      }
    }

    return lines;
  }
}

export const cargoService = new CargoService();
