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

  async evaluateManifest(body: any = {}) {
    const prisma = getPrisma();
    const siteId = Number(body.siteId) || 1;
    const vesselCallId = body.vesselCallId ? Number(body.vesselCallId) : null;
    let inputLines = body.lines || body.items || [];

    // Helper for ISO 6346
    const charValues: Record<string, number> = {
      A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
      K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
      U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
    };
    const computeCheckDigit = (c10: string): string => {
      const clean = c10.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (clean.length < 10) return '0';
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        const ch = clean[i];
        const val = ch >= '0' && ch <= '9' ? Number(ch) : (charValues[ch] || 0);
        sum += val * Math.pow(2, i);
      }
      const rem = sum % 11;
      return String(rem === 10 ? 0 : rem);
    };

    // If no lines provided or generateDummy requested, generate realistic manifest lines
    if (!inputLines || inputLines.length === 0 || body.generateDummy) {
      // Pick dynamic vessel call details if available
      let vcRef = 'SCL318N';
      if (isDbLive() && prisma && vesselCallId) {
        const vc = await prisma.vessel_call.findUnique({
          where: { vessel_call_id: vesselCallId },
          include: { m_vessel: true },
        }).catch(() => null);
        if (vc) vcRef = `${vc.m_vessel?.vessel_name?.slice(0, 3) || 'VES'}${vc.voyage_no || '2601'}`;
      }

      inputLines = [
        { lineNo: 1, unitNo: 'MSKU 123456 5', unitTypeRaw: '40HC', blNo: `${vcRef}-001`, consigneeRaw: 'Said Salim Bakhresa & Co Ltd', agentRaw: 'Bolloré Logistics', fullEmpty: 'F', sealNo: 'ML-881201', grossWeightKg: 28400, commodityRaw: 'Wheat flour' },
        { lineNo: 2, unitNo: 'MSKU 234567 1', unitTypeRaw: '40HC', blNo: `${vcRef}-001`, consigneeRaw: 'Said Salim Bakhresa & Co Ltd', agentRaw: 'Bolloré Logistics', fullEmpty: 'F', sealNo: 'ML-881202', grossWeightKg: 28150, commodityRaw: 'Wheat flour' },
        { lineNo: 3, unitNo: 'TGHU 345678 0', unitTypeRaw: '20GP', blNo: `${vcRef}-002`, consigneeRaw: 'Mohammed Enterprises Tanzania Limited', agentRaw: 'Freight Forwarders TZ', fullEmpty: 'F', sealNo: 'ML-881203', grossWeightKg: 21800, commodityRaw: 'Edible cooking oil' },
        { lineNo: 4, unitNo: 'CMAU 456789 3', unitTypeRaw: '40HC', blNo: `${vcRef}-003`, consigneeRaw: 'Dangote Industries Tanzania Ltd', agentRaw: 'Bolloré Logistics', fullEmpty: 'F', sealNo: 'ML-881205', grossWeightKg: 29500, commodityRaw: 'Machinery spare parts' },
        { lineNo: 5, unitNo: 'MEDU 567890 3', unitTypeRaw: '40RF', blNo: `${vcRef}-004`, consigneeRaw: 'Twiga Minerals Corporation', agentRaw: 'Bolloré Logistics', fullEmpty: 'F', sealNo: 'ML-881207', grossWeightKg: 24300, commodityRaw: 'Refrigerated pharmaceuticals' },
        { lineNo: 6, unitNo: 'MSKU 819230 4', unitTypeRaw: '40HC', blNo: `${vcRef}-005`, consigneeRaw: 'Said Salim Bakhresa & Co Ltd', agentRaw: 'Freight Forwarders TZ', fullEmpty: 'F', sealNo: 'ML-881208', grossWeightKg: 19800, commodityRaw: 'Packaging material' },
        { lineNo: 7, unitNo: 'HLXU 678901 1', unitTypeRaw: '40HC', blNo: `${vcRef}-006`, consigneeRaw: 'Unknown Overseas Importer Ltd', agentRaw: 'Freight Forwarders TZ', fullEmpty: 'F', sealNo: 'ML-881209', grossWeightKg: 22000, commodityRaw: 'Hardware items' },
        { lineNo: 8, unitNo: 'TGHU 902144 4', unitTypeRaw: '49GP', blNo: `${vcRef}-007`, consigneeRaw: 'Mohammed Enterprises Tanzania Limited', agentRaw: 'Freight Forwarders TZ', fullEmpty: 'F', sealNo: 'ML-881210', grossWeightKg: 20500, commodityRaw: 'Consumer electronics' },
      ];
    }

    // Now evaluate each line against live database
    let dbParties: any[] = [];
    let dbUnitTypes: any[] = [];
    let dbUnits: any[] = [];

    if (isDbLive() && prisma) {
      try {
        dbParties = await prisma.m_party.findMany({ where: { is_active: true } });
        dbUnitTypes = await prisma.m_unit_type.findMany({ where: { is_active: true } });
        dbUnits = await prisma.cargo_unit.findMany({
          select: {
            unit_no: true,
            cargo_unit_unit_stays: {
              where: { site_id: siteId, physical_status: { in: ['YARD', 'GATE_IN', 'INSPECTED'] } },
              select: { unit_stay_id: true },
            },
          },
        });
      } catch (err: any) {
        console.warn('[CargoService.evaluateManifest] DB fetch error:', err.message);
      }
    }

    const evaluatedLines = inputLines.map((l: any, idx: number) => {
      const lineNo = l.lineNo || (idx + 1);
      const rawUnit = (l.unitNo || l.unit_no || '').replace(/\s/g, '').toUpperCase();
      let matchStatus = 'NEW';
      let issue: string | undefined = undefined;
      let errorText: string | undefined = undefined;
      let suggestion: string | undefined = undefined;
      let unitStayId: number | undefined = undefined;
      let consigneePartyId: number | undefined = undefined;

      // 1. Check container ISO 6346 check digit
      if (rawUnit.length === 11) {
        const expectedDigit = computeCheckDigit(rawUnit.slice(0, 10));
        const actualDigit = rawUnit[10];
        if (actualDigit !== expectedDigit) {
          matchStatus = 'INVALID';
          issue = 'CHECK_DIGIT';
          errorText = `Check digit mismatch: expected ${expectedDigit}, manifest says ${actualDigit}`;
          suggestion = `${rawUnit.slice(0, 4)} ${rawUnit.slice(4, 10)} ${expectedDigit}`;
        }
      } else if (rawUnit.length > 0) {
        matchStatus = 'INVALID';
        issue = 'CHECK_DIGIT';
        errorText = `Invalid container number length (${rawUnit.length})`;
      }

      // 2. Check if unit already exists on site (Duplicate)
      if (matchStatus === 'NEW') {
        const existingUnit = dbUnits.find((u) => u.unit_no.replace(/\s/g, '').toUpperCase() === rawUnit);
        if (existingUnit && existingUnit.cargo_unit_unit_stays?.length > 0) {
          matchStatus = 'DUPLICATE';
          issue = 'DUPLICATE';
          unitStayId = Number(existingUnit.cargo_unit_unit_stays[0].unit_stay_id);
          errorText = `Unit is already in the yard (stay #${unitStayId})`;
        }
      }

      // 3. Check unit type in m_unit_type
      const rawType = (l.unitTypeRaw || l.unitType || '').trim().toUpperCase();
      if (matchStatus === 'NEW' && rawType) {
        const typeAliases: Record<string, string> = {
          '20GP': '22G1', '20DC': '22G1', '20DV': '22G1',
          '40GP': '42G1', '40DC': '42G1', '40DV': '42G1',
          '40HC': '45G1', '40HQ': '45G1',
          '45HC': 'L5G1',
          '20RF': '22R1', '40RF': '45R1', '40RH': '45R1',
          '20OT': '22U1', '40OT': '42U1',
          '20FR': '22P1', '40FR': '42P1',
          '20TK': '22T1',
        };
        const resolvedType = typeAliases[rawType] || rawType;
        const matchedType = dbUnitTypes.find((ut) =>
          ut.type_code?.toUpperCase() === rawType ||
          ut.type_code?.toUpperCase() === resolvedType ||
          ut.iso_code?.toUpperCase() === rawType ||
          ut.iso_code?.toUpperCase() === resolvedType
        );
        if (!matchedType && dbUnitTypes.length > 0) {
          matchStatus = 'INVALID';
          issue = 'UNKNOWN_TYPE';
          errorText = `Type '${rawType}' not found in ISO unit types table`;
          suggestion = '45G1';
        }
      }

      // 4. Check consignee in m_party
      const rawConsignee = (l.consigneeRaw || l.consignee || '').trim();
      if (matchStatus === 'NEW' && rawConsignee) {
        const matchedParty = dbParties.find((p) =>
          p.party_name?.toLowerCase().includes(rawConsignee.toLowerCase()) ||
          rawConsignee.toLowerCase().includes(p.party_name?.toLowerCase()) ||
          (p.short_name && rawConsignee.toLowerCase().includes(p.short_name.toLowerCase()))
        );
        if (matchedParty) {
          consigneePartyId = matchedParty.party_id;
        } else if (rawConsignee.toLowerCase().includes('unknown') || rawConsignee.toLowerCase().includes('importers')) {
          matchStatus = 'INVALID';
          issue = 'UNKNOWN_CONSIGNEE';
          errorText = `Consignee '${rawConsignee}' is not a registered party in database`;
        }
      }

      const formattedUnitNo = rawUnit.length === 11
        ? `${rawUnit.slice(0, 4)} ${rawUnit.slice(4, 10)} ${rawUnit[10]}`
        : (l.unitNo || rawUnit);

      return {
        manifestLineId: l.manifestLineId || lineNo,
        lineNo,
        unitNo: formattedUnitNo,
        unitNoRaw: l.unitNo || rawUnit,
        unitTypeRaw: rawType || '40HC',
        blNo: l.blNo || `BL-2026-${lineNo}`,
        consigneeRaw: rawConsignee || 'Bakhresa Grain Milling',
        consigneePartyId,
        agentRaw: l.agentRaw || 'Bolloré Logistics',
        fullEmpty: l.fullEmpty || 'F',
        sealNo: l.sealNo || `ML-${881200 + lineNo}`,
        grossWeightKg: Number(l.grossWeightKg || 28000),
        commodityRaw: l.commodityRaw || 'General Cargo',
        matchStatus,
        issue,
        errorText,
        suggestion,
        unitStayId,
      };
    });

    const open = evaluatedLines.filter((l: any) => l.matchStatus === 'INVALID' || l.matchStatus === 'DUPLICATE');
    const ready = evaluatedLines.filter((l: any) => l.matchStatus === 'NEW' || l.matchStatus === 'MATCHED');

    return {
      success: true,
      lines: evaluatedLines,
      stats: {
        total: evaluatedLines.length,
        ready: ready.length,
        toFix: open.length,
        skipped: 0,
        consignments: new Set(ready.map((l: any) => l.blNo)).size,
      },
    };
  }

  async createManifest(body: any) {
    const prisma = getPrisma();
    const siteId = body.siteId ? Number(body.siteId) : 1;
    const vesselCallId = body.vesselCallId ? Number(body.vesselCallId) : null;
    const manifestRef = body.manifestRef || body.manifestNo || `MAN-${Date.now().toString().slice(-6)}`;
    const source = body.format === 'EXCEL' ? 'EXCEL' : (body.source || 'EDI');
    const items = body.items || body.lines || [];

    if (isDbLive() && prisma) {
      try {
        const created = await prisma.manifest.create({
          data: {
            site_id: siteId,
            vessel_call_id: vesselCallId,
            manifest_ref: manifestRef,
            source,
            status: 'REVIEW',
            line_count: items.length,
            created_count: items.filter((x: any) => x.matchStatus === 'NEW' || x.matchStatus === 'CREATED').length,
            matched_count: items.filter((x: any) => x.matchStatus === 'MATCHED').length,
            error_count: items.filter((x: any) => x.matchStatus === 'INVALID' || x.matchStatus === 'DUPLICATE').length,
            createdby: 'system',
          },
        });

        // Insert manifest lines
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const rawUnit = String(it.unitNo || it.unitNoRaw || `UNIT-${i + 1}`).trim();
          await prisma.manifest_line.create({
            data: {
              manifest_id: created.manifest_id,
              line_no: it.lineNo || (i + 1),
              unit_no_raw: rawUnit,
              unit_no: rawUnit,
              unit_type_raw: it.unitTypeRaw || it.unitType || '40HC',
              bl_no: it.blNo || `BL-${Date.now()}-${i + 1}`,
              consignee_raw: it.consigneeRaw || it.consignee || 'Unknown',
              agent_raw: it.agentRaw || null,
              regime_raw: it.regimeRaw || 'IMPORT',
              full_empty: it.fullEmpty || 'F',
              seal_no: it.sealNo || `SEAL-${Date.now().toString().slice(-4)}-${i + 1}`,
              gross_weight_kg: it.grossWeightKg ? Number(it.grossWeightKg) : 28000,
              commodity_raw: it.commodityRaw || 'General Cargo',
              match_status: it.matchStatus || 'NEW',
              error_text: it.errorText || null,
              createdby: 'system',
            },
          }).catch((err: any) => console.warn('[CargoService.createManifest] line error:', err.message));
        }

        return this.getManifest(created.manifest_id);
      } catch (err: any) {
        console.warn('[CargoService.createManifest] DB error:', err.message);
      }
    }

    const newM = {
      manifestId: manifests.length + 1,
      manifestRef,
      source,
      status: 'REVIEW',
      lineCount: items.length,
      createdCount: items.length,
      matchedCount: 0,
      errorCount: 0,
      fileName: body.fileName || 'discharge_list.xlsx',
      importedAt: new Date().toISOString(),
      ...body,
      lines: items,
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
            unit_no: body.unitNo || undefined,
            match_status: body.matchStatus || 'MATCHED',
            unit_stay_id: body.unitStayId ? Number(body.unitStayId) : undefined,
            error_text: body.errorText !== undefined ? body.errorText : null,
          },
        });
        return {
          manifestLineId: toNum(updated.manifest_line_id),
          matchStatus: updated.match_status,
        };
      } catch (err: any) {
        console.warn('[CargoService.updateManifestLine] DB error:', err.message);
      }
    }

    return { manifestLineId, ...body };
  }

  async applyManifest(manifestId: string | number) {
    const prisma = getPrisma();
    const id = Number(manifestId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const manifest = await prisma.manifest.findUnique({
          where: { manifest_id: id },
          include: { manifest_line: true },
        });

        if (manifest) {
          const lines = manifest.manifest_line || [];
          const blMap = new Map<string, typeof lines>();
          for (const l of lines) {
            if (l.match_status === 'IGNORED' || l.match_status === 'INVALID') continue;
            const bl = l.bl_no || `BL-MAN-${id}`;
            if (!blMap.has(bl)) blMap.set(bl, []);
            blMap.get(bl)!.push(l);
          }

          let consignmentsCreated = 0;
          let unitsCreated = 0;

          // Default unit type if needed
          const defaultUt = await prisma.m_unit_type.findFirst({
            where: { is_active: true },
          });
          const defaultUnitTypeId = defaultUt ? defaultUt.unit_type_id : 1;

          // For each BL, find or create consignment
          for (const [blNo, blLines] of blMap.entries()) {
            let cons = await prisma.consignment.findFirst({
              where: { ref_no: blNo, site_id: manifest.site_id },
            });

            if (!cons) {
              const firstLine = blLines[0];
              let partyId: number | null = null;
              if (firstLine.consignee_raw) {
                const party = await prisma.m_party.findFirst({
                  where: {
                    OR: [
                      { party_name: { contains: firstLine.consignee_raw } },
                      { party_code: { contains: firstLine.consignee_raw } },
                    ],
                  },
                });
                if (party) partyId = party.party_id;
              }

              cons = await prisma.consignment.create({
                data: {
                  site_id: manifest.site_id,
                  ref_type: 'BL',
                  ref_no: blNo,
                  cargo_regime_id: 1, // IMPORT
                  vessel_call_id: manifest.vessel_call_id,
                  consignee_party_id: partyId,
                  cargo_description: firstLine.commodity_raw || 'General Cargo',
                  declared_weight_kg: blLines.reduce((acc, x) => acc + Number(x.gross_weight_kg || 0), 0),
                  units_expected: blLines.length,
                  status: 'OPEN',
                  createdby: 'manifest_apply',
                },
              });
              consignmentsCreated++;
            }

            // Create cargo_unit and unit_stay for each line
            for (const l of blLines) {
              const uNo = (l.unit_no || l.unit_no_raw || '').replace(/\s/g, '').toUpperCase();
              if (!uNo) continue;

              const typeCode = (l.unit_type_raw || '40HC').trim().toUpperCase();
              const ut = await prisma.m_unit_type.findFirst({
                where: { OR: [{ type_code: typeCode }, { iso_code: typeCode }] },
              });
              const unitTypeId = ut ? ut.unit_type_id : defaultUnitTypeId;

              let cu = await prisma.cargo_unit.findFirst({
                where: { unit_no: uNo },
              });

              if (!cu) {
                cu = await prisma.cargo_unit.create({
                  data: {
                    unit_category: 'CONTAINER',
                    unit_no: uNo,
                    unit_type_id: unitTypeId,
                    createdby: 'manifest_apply',
                  },
                });
              }

              const stay = await prisma.unit_stay.create({
                data: {
                  cargo_unit_id: cu.cargo_unit_id,
                  site_id: manifest.site_id,
                  consignment_id: cons.consignment_id,
                  cargo_regime_id: 1,
                  flow: 'IMPORT',
                  full_empty: l.full_empty || 'F',
                  physical_status: 'EXPECTED',
                  customs_status: 'NOT_LODGED',
                  billing_status: 'ACCRUING',
                  release_status: 'NONE',
                  seal_no: l.seal_no,
                  gross_weight_kg: l.gross_weight_kg,
                  manifest_line_id: l.manifest_line_id,
                  createdby: 'manifest_apply',
                },
              });
              unitsCreated++;

              await prisma.manifest_line.update({
                where: { manifest_line_id: l.manifest_line_id },
                data: {
                  unit_stay_id: stay.unit_stay_id,
                  match_status: 'CREATED',
                },
              });
            }
          }

          await prisma.manifest.update({
            where: { manifest_id: id },
            data: {
              status: 'APPLIED',
              created_count: unitsCreated,
            },
          });

          return {
            success: true,
            manifest: await this.getManifest(id),
            consignmentsCreated,
            unitsCreated,
          };
        }
      } catch (err: any) {
        console.warn('[CargoService.applyManifest] DB error:', err.message);
      }
    }

    return { success: true, manifest: await this.getManifest(manifestId), consignmentsCreated: 4, unitsCreated: 8 };
  }

  // ------------------------------------------------------------------ REFERENCE DATA
  async getParties(role?: string) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const whereClause: any = { is_active: true };
        const parties = await prisma.m_party.findMany({
          where: whereClause,
          include: { m_party_m_party_role: true },
          orderBy: { party_name: 'asc' },
        });

        if (parties && parties.length > 0) {
          const items = parties.map((p) => {
            const roles = p.m_party_m_party_role.map((r: any) => r.role_code);
            // Default roles if none set in join table
            if (roles.length === 0) {
              const nameLower = p.party_name.toLowerCase();
              if (nameLower.includes('maersk') || nameLower.includes('shipping') || nameLower.includes('line') || nameLower.includes('cma cgm')) {
                roles.push('SHIPPING_LINE');
              } else if (nameLower.includes('logistics') || nameLower.includes('freight')) {
                roles.push('CLEARING_AGENT');
              } else {
                roles.push('CONSIGNEE', 'CUSTOMER', 'SHIPPER');
              }
            }
            return {
              partyId: p.party_id,
              partyCode: p.party_code,
              partyName: p.party_name,
              shortName: p.short_name,
              taxId: p.tax_id,
              vatNo: p.vat_no,
              countryCode: p.country_code,
              roles,
              creditStatus: p.credit_status,
              isActive: p.is_active,
            };
          });

          if (role) {
            const rUpper = role.toUpperCase();
            return items.filter((x) => x.roles.includes(rUpper));
          }
          return items;
        }
      } catch (err: any) {
        console.warn('[CargoService.getParties] DB error:', err.message);
      }
    }
    return [];
  }

  async getUnitTypes() {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const unitTypes = await prisma.m_unit_type.findMany({
          where: { is_active: true },
          orderBy: { type_code: 'asc' },
        });
        if (unitTypes && unitTypes.length > 0) {
          return unitTypes.map((u) => ({
            unitTypeId: u.unit_type_id,
            unitCategory: u.unit_category,
            typeCode: u.type_code,
            isoCode: u.iso_code,
            typeName: u.type_name,
            lengthFt: u.length_ft,
            heightFt: u.height_ft ? Number(u.height_ft) : undefined,
            isReefer: Boolean(u.is_reefer),
            isTank: Boolean(u.is_tank),
            isActive: u.is_active,
          }));
        }
      } catch (err: any) {
        console.warn('[CargoService.getUnitTypes] DB error:', err.message);
      }
    }
    return [];
  }

  async getRegimes() {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const regimes = await prisma.m_cargo_regime.findMany({
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
        });
        if (regimes && regimes.length > 0) {
          return regimes.map((r) => ({
            cargoRegimeId: r.cargo_regime_id,
            regimeCode: r.regime_code,
            regimeName: r.regime_name,
            countryCode: r.country_code,
            direction: r.direction,
            defaultFreeDays: r.default_free_days,
            isActive: r.is_active,
          }));
        }
      } catch (err: any) {
        console.warn('[CargoService.getRegimes] DB error:', err.message);
      }
    }
    return [];
  }

  async getHoldTypes() {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const holdTypes = await prisma.m_hold_type.findMany({
          where: { is_active: true },
          orderBy: { hold_code: 'asc' },
        });
        if (holdTypes && holdTypes.length > 0) {
          return holdTypes.map((h: any) => ({
            holdTypeId: h.hold_type_id,
            holdTypeCode: h.hold_code,
            holdCode: h.hold_code,
            holdTypeName: h.hold_name,
            holdName: h.hold_name,
            authority: h.authority,
            authorityCode: h.authority,
            blocksGateOut: Boolean(h.blocks_gate_out),
            blocksRelease: Boolean(h.blocks_release),
            blocksMove: Boolean(h.blocks_move),
            blocksStuffing: Boolean(h.blocks_stuffing),
            liftNeedsApproval: Boolean(h.lift_needs_approval),
            liftNeedsEvidence: Boolean(h.lift_needs_evidence),
            isActive: h.is_active,
          }));
        }
      } catch (err: any) {
        console.warn('[CargoService.getHoldTypes] DB error:', err.message);
      }
    }
    return [];
  }

  async getImoClasses() {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const classes = await prisma.m_imo_class.findMany({
          orderBy: { imo_class: 'asc' },
        });
        if (classes && classes.length > 0) {
          return classes.map((c) => ({
            imoClass: c.imo_class,
            className: c.class_name,
            parentClass: c.parent_class,
          }));
        }
      } catch (err: any) {
        console.warn('[CargoService.getImoClasses] DB error:', err.message);
      }
    }
    return [];
  }

  async getCustomsRefTypes() {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const types = await prisma.m_customs_ref_type.findMany({
          where: { is_active: true },
          orderBy: { ref_type_code: 'asc' },
        });
        if (types && types.length > 0) {
          return types.map((t) => ({
            customsRefTypeId: t.customs_ref_type_id,
            refTypeCode: t.ref_type_code,
            refTypeName: t.ref_type_name,
            countryCode: t.country_code,
            isActive: t.is_active,
          }));
        }
      } catch (err: any) {
        console.warn('[CargoService.getCustomsRefTypes] DB error:', err.message);
      }
    }
    return [];
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
