import { getPrisma, isDbLive } from "../../db/prisma";
import { vesselCalls, consignments, allStays } from "../../data/core";
import { manifests, sampleManifestLines } from "../../data/cargo";
import { holds, customsRefs, releaseOrders } from "../../data/control";
import { exams } from "../../data/cargo";
import { dgLines } from "../../data/cargo";

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
          where.unit_types = { category };
        }
        if (location) {
          where.yard_locations = { full_code: { startsWith: String(location) } };
        }
        if (searchQ) {
          const q = String(searchQ).trim().replace(/\s/g, "");
          where.OR = [
            { unit_no: { contains: q } },
            { seal_no: { contains: q } },
            { consignments: { ref_no: { contains: q } } },
            { yard_locations: { full_code: { contains: q } } },
          ];
        }

        const dbStays = await prisma.unit_stays.findMany({
          where,
          include: {
            unit_types: true,
            yard_locations: true,
            consignments: {
              include: {
                vessel_calls: { include: { vessels: true } },
                parties_consignments_consignee_party_idToparties: true,
              },
            },
            cargo_regimes: true,
            holds: true,
          },
          orderBy: { unit_stay_id: "desc" },
        });

        if (dbStays && dbStays.length > 0) {
          return dbStays.map((u) => {
            const activeHolds = (u.holds || []).filter((h) => h.status === "ACTIVE").length;
            const dwell = u.arrived_at
              ? Math.max(1, Math.floor((Date.now() - new Date(u.arrived_at).getTime()) / 86400000))
              : 4;

            return {
              unitStayId: u.unit_stay_id,
              siteId: u.site_id,
              consignmentId: u.consignment_id,
              cargoUnit: {
                cargoUnitId: u.unit_stay_id,
                category: u.unit_types?.category || "CONTAINER",
                unitNo: u.unit_no,
                unitTypeCode: u.unit_types?.type_code || "40HC",
                isoType: u.unit_types?.type_code || "40HC",
                tareWeightKg: 3800,
              },
              physicalStatus: u.physical_status,
              flow: u.flow || "IMPORT",
              fullEmpty: u.full_empty || "F",
              customsStatus: u.customs_status || "CLEARED",
              releaseStatus: u.release_status || "PENDING_CHARGES",
              billingStatus: u.billing_status || "PAID",
              sealNo: u.seal_no || "SEAL-001",
              grossWeightKg: Number(u.gross_weight_kg || 0),
              cargoDescription: u.cargo_description || "General Merchandise",
              conditionStatus: u.condition_status || "SOUND",
              reeferTempC: u.reefer_temp_c ? Number(u.reefer_temp_c) : undefined,
              imoClass: u.imo_class || undefined,
              unNumber: u.un_number || undefined,
              destinationCountry: u.destination_country || "Tanzania",
              dischargeAt: u.discharge_at?.toISOString(),
              gatedInAt: u.gated_in_at?.toISOString() || u.arrived_at?.toISOString(),
              freeUntil: u.free_until?.toISOString(),
              activeHoldCount: activeHolds,
              currentLocation: u.yard_locations
                ? {
                    locationId: u.yard_locations.yard_location_id,
                    fullCode: u.yard_locations.full_code,
                    zone: u.yard_locations.full_code.split("-")[0] || "A",
                  }
                : undefined,
              unitSummary: {
                unitNo: u.unit_no,
                category: u.unit_types?.category || "CONTAINER",
                activeHoldCount: activeHolds,
                releaseStatus: u.release_status,
                physicalStatus: u.physical_status,
                dwellDays: dwell,
                consignmentRef: u.consignments?.ref_no,
              },
              arrivedAt: u.arrived_at?.toISOString(),
            };
          });
        }
      } catch (err: any) {
        console.warn("[CargoService.getUnits] DB query fallback:", err.message);
      }
    }

    // In-memory fallback
    let items = allStays as any[];
    if (category && category !== "ALL") items = items.filter((s) => s.cargoUnit?.category === category);
    if (status) items = items.filter((s) => s.physicalStatus === status);
    if (customsStatus) items = items.filter((s) => s.customsStatus === customsStatus);
    if (location) items = items.filter((s) => s.currentLocation?.fullCode?.startsWith(String(location)));
    if (searchQ) {
      const q = String(searchQ).toLowerCase();
      items = items.filter(
        (s) =>
          s.cargoUnit?.unitNo.toLowerCase().includes(q) ||
          s.sealNo?.toLowerCase().includes(q) ||
          s.currentLocation?.fullCode?.toLowerCase().includes(q)
      );
    }
    return items;
  }

  async getUnit(unitStayId: string | number) {
    const prisma = getPrisma();
    const id = Number(unitStayId);

    if (isDbLive() && prisma) {
      try {
        const u = await prisma.unit_stays.findFirst({
          where: {
            OR: [
              ...(Number.isFinite(id) ? [{ unit_stay_id: id }] : []),
              { unit_no: String(unitStayId).trim().toUpperCase() },
            ],
          },
          include: {
            unit_types: true,
            yard_locations: true,
            consignments: {
              include: {
                vessel_calls: { include: { vessels: true } },
                parties_consignments_consignee_party_idToparties: true,
              },
            },
            cargo_regimes: true,
            holds: {
              include: {
                users_holds_placed_by_user_idTousers: true,
                users_holds_lifted_by_user_idTousers: true,
              },
            },
            dg_lines: true,
          },
        });

        if (u) {
          const activeHolds = (u.holds || []).filter((h) => h.status === "ACTIVE").length;
          const dwell = u.arrived_at
            ? Math.max(1, Math.floor((Date.now() - new Date(u.arrived_at).getTime()) / 86400000))
            : 4;

          return {
            unitStayId: u.unit_stay_id,
            siteId: u.site_id,
            consignmentId: u.consignment_id,
            cargoUnit: {
              cargoUnitId: u.unit_stay_id,
              category: u.unit_types?.category || "CONTAINER",
              unitNo: u.unit_no,
              unitTypeCode: u.unit_types?.type_code || "40HC",
              isoType: u.unit_types?.type_code || "40HC",
              tareWeightKg: 3800,
            },
            physicalStatus: u.physical_status,
            flow: u.flow || "IMPORT",
            fullEmpty: u.full_empty || "F",
            customsStatus: u.customs_status || "CLEARED",
            releaseStatus: u.release_status || "PENDING_CHARGES",
            billingStatus: u.billing_status || "PAID",
            sealNo: u.seal_no || "SEAL-001",
            grossWeightKg: Number(u.gross_weight_kg || 0),
            cargoDescription: u.cargo_description || "General Merchandise",
            conditionStatus: u.condition_status || "SOUND",
            reeferTempC: u.reefer_temp_c ? Number(u.reefer_temp_c) : undefined,
            imoClass: u.imo_class || undefined,
            unNumber: u.un_number || undefined,
            destinationCountry: u.destination_country || "Tanzania",
            dischargeAt: u.discharge_at?.toISOString(),
            gatedInAt: u.gated_in_at?.toISOString() || u.arrived_at?.toISOString(),
            freeUntil: u.free_until?.toISOString(),
            activeHoldCount: activeHolds,
            currentLocation: u.yard_locations
              ? {
                  locationId: u.yard_locations.yard_location_id,
                  fullCode: u.yard_locations.full_code,
                  zone: u.yard_locations.full_code.split("-")[0] || "A",
                }
              : undefined,
            unitSummary: {
              unitNo: u.unit_no,
              category: u.unit_types?.category || "CONTAINER",
              activeHoldCount: activeHolds,
              releaseStatus: u.release_status,
              physicalStatus: u.physical_status,
              dwellDays: dwell,
              consignmentRef: u.consignments?.ref_no,
            },
            arrivedAt: u.arrived_at?.toISOString(),
            holds: u.holds.map((h) => ({
              holdId: h.hold_id,
              unitStayId: h.unit_stay_id,
              holdTypeCode: h.hold_type,
              reason: h.reason,
              authorityRef: h.authority_ref,
              status: h.status,
              placedAt: h.placed_at?.toISOString(),
              placedBy: h.users_holds_placed_by_user_idTousers?.user_name || "Ashok Kumar",
              liftedAt: h.lifted_at?.toISOString(),
              liftedBy: h.users_holds_lifted_by_user_idTousers?.user_name,
              liftReason: h.lift_reason,
            })),
            dgLines: u.dg_lines.map((dg) => ({
              dgLineId: dg.dg_line_id,
              unitStayId: dg.unit_stay_id,
              unNo: dg.un_number,
              imoClass: dg.imo_class,
              packingGroup: dg.packing_group,
              properShippingName: dg.proper_shipping_name,
              grossWeightKg: Number(dg.gross_weight_kg || 0),
            })),
          };
        }
      } catch (err: any) {
        console.warn("[CargoService.getUnit] DB query fallback:", err.message);
      }
    }

    return (
      allStays.find(
        (s) =>
          String(s.unitStayId) === String(unitStayId) ||
          s.cargoUnit?.unitNo.toUpperCase() === String(unitStayId).toUpperCase()
      ) || null
    );
  }

  async createUnit(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const unitNo = body.unitNo || `NEWU${Date.now().toString().slice(-7)}`;
        let cu = await prisma.cargo_units.findFirst({ where: { unit_no: unitNo } });
        if (!cu) {
          cu = await prisma.cargo_units.create({
            data: {
              unit_no: unitNo,
              category: body.category || "CONTAINER",
              unit_type_code: body.isoType || "40HC",
              tare_kg: body.tareWeightKg || 3800,
            },
          });
        }

        const stay = await prisma.unit_stays.create({
          data: {
            site_id: body.siteId || 1,
            unit_type_id: 1,
            consignment_id: body.consignmentId || 101,
            cargo_regime_id: 1,
            yard_location_id: 1,
            unit_no: unitNo,
            flow: body.flow || "IMPORT",
            full_empty: body.fullEmpty || "F",
            physical_status: body.physicalStatus || "EXPECTED",
            customs_status: body.customsStatus || "PENDING",
            release_status: body.releaseStatus || "PENDING_CHARGES",
            billing_status: "UNBILLED",
            seal_no: body.sealNo || "SEAL-001",
            gross_weight_kg: body.grossWeightKg || 24000,
            cargo_description: body.cargoDescription || "General Goods",
            condition_status: "SOUND",
            arrived_at: new Date(),
          },
        });
        return this.getUnit(stay.unit_stay_id);
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
      physicalStatus: body.physicalStatus || "EXPECTED",
      flow: body.flow || "IMPORT",
      sealNo: body.sealNo || "SEAL-001",
      customsStatus: "PENDING",
      releaseStatus: "PENDING_CHARGES",
      gatedInAt: new Date().toISOString(),
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
        if (body.cargoDescription) updateData.cargo_description = body.cargoDescription;
        if (body.conditionStatus) updateData.condition_status = body.conditionStatus;
        if (body.dischargeAt) updateData.discharge_at = new Date(body.dischargeAt);
        if (body.gatedInAt) updateData.gated_in_at = new Date(body.gatedInAt);
        if (body.freeUntil) updateData.free_until = new Date(body.freeUntil);

        await prisma.unit_stays.update({
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
    const stay = await this.getUnit(unitStayId);
    if (!stay) return null;

    const events = [
      {
        eventType: "MANIFEST_IMPORTED",
        occurredAt: "2026-10-01T08:00:00Z",
        summary: "Manifest received from shipping line",
        user: "SYSTEM",
      },
      ...(stay.dischargeAt
        ? [
            {
              eventType: "DISCHARGE_CONFIRMED",
              occurredAt: stay.dischargeAt,
              summary: "Container discharged at Port of Dar es Salaam",
              user: "PORT_EDI",
            },
          ]
        : []),
      ...(stay.gatedInAt
        ? [
            {
              eventType: "GATE_IN",
              occurredAt: stay.gatedInAt,
              summary: `Gate in inspection completed. Seal: ${stay.sealNo}`,
              user: "Rose A. (Gate)",
            },
          ]
        : []),
      {
        eventType: "YARD_PLACEMENT",
        occurredAt: stay.gatedInAt || new Date().toISOString(),
        summary: `Placed in yard slot ${stay.currentLocation?.fullCode || "A-02-04-2"}`,
        user: "Ibrahim N. (Yard)",
      },
      {
        eventType: "CUSTOMS_STATUS",
        occurredAt: new Date().toISOString(),
        summary: `Customs status updated to ${stay.customsStatus}`,
        user: "Rehema K. (Customs)",
      },
    ];

    return {
      unitStayId: stay.unitStayId,
      unitNo: stay.cargoUnit?.unitNo,
      events,
    };
  }

  // ------------------------------------------------------------------ 2. CONSIGNMENTS
  async getConsignments(query: any = {}) {
    const { refNo, vesselCallId, consigneePartyId, status, kind } = query;
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const where: any = {};
        if (refNo) {
          where.ref_no = { contains: String(refNo).trim() };
        }
        if (vesselCallId) {
          where.vessel_call_id = Number(vesselCallId);
        }
        if (consigneePartyId) {
          where.consignee_party_id = Number(consigneePartyId);
        }
        if (status && status !== "ALL") {
          where.status = status;
        }
        if (kind && kind !== "ALL") {
          where.ref_type = kind;
        }

        const dbCons = await prisma.consignments.findMany({
          where,
          include: {
            vessel_calls: { include: { vessels: true } },
            parties_consignments_consignee_party_idToparties: true,
            unit_stays: { include: { holds: true } },
            consignment_lines: true,
          },
          orderBy: { consignment_id: "desc" },
        });

        if (dbCons && dbCons.length > 0) {
          return dbCons.map((c) => {
            const stays = c.unit_stays || [];
            const received = stays.filter((s) => s.physical_status !== "EXPECTED").length;
            const delivered = stays.filter((s) => s.physical_status === "DEPARTED").length;
            const expected = c.units_expected || Math.max(stays.length, 1);
            const hasHolds = stays.some((s) => (s.holds || []).some((h) => h.status === "ACTIVE"));

            return {
              consignmentId: c.consignment_id,
              siteId: c.site_id,
              vesselCallId: c.vessel_call_id,
              vesselName: c.vessel_calls?.vessels?.vessel_name || "MV Maersk Karachi",
              voyageNo: c.vessel_calls?.voyage_no || "2601W",
              refType: c.ref_type || "BL",
              refNo: c.ref_no,
              status: c.status || "OPEN",
              cargoRegimeCode: c.cargo_regime_id === 2 ? "TRANSIT" : "IMPORT_HOME",
              cargoDescription: c.cargo_description || "General Merchandise",
              consigneeName:
                c.parties_consignments_consignee_party_idToparties?.party_name || "Twiga Cement Ltd",
              consigneePartyId: c.consignee_party_id || 1,
              billToPartyId: c.bill_to_party_id || 1,
              destinationCountry: c.destination_country || "Tanzania",
              unitsExpected: expected,
              unitsReceived: received,
              unitsDelivered: delivered,
              unitCount: stays.length || expected,
              hasActiveHolds: hasHolds,
              validTo: new Date(Date.now() + 14 * 86400000).toISOString(),
            };
          });
        }
      } catch (err: any) {
        console.warn("[CargoService.getConsignments] DB query fallback:", err.message);
      }
    }

    let items = consignments as any[];
    if (refNo) items = items.filter((c) => c.refNo.toLowerCase().includes(String(refNo).toLowerCase()));
    if (vesselCallId) items = items.filter((c) => String(c.vesselCallId) === String(vesselCallId));
    if (consigneePartyId) items = items.filter((c) => String(c.consigneePartyId) === String(consigneePartyId));
    if (status && status !== "ALL") items = items.filter((c) => c.status === status);
    return items;
  }

  async getConsignment(id: string | number) {
    const prisma = getPrisma();
    const numId = Number(id);

    if (isDbLive() && prisma) {
      try {
        const c = await prisma.consignments.findFirst({
          where: {
            OR: [
              ...(Number.isFinite(numId) ? [{ consignment_id: numId }] : []),
              { ref_no: String(id).trim() },
            ],
          },
          include: {
            vessel_calls: { include: { vessels: true } },
            parties_consignments_consignee_party_idToparties: true,
            unit_stays: {
              include: {
                unit_types: true,
                yard_locations: true,
                holds: true,
              },
            },
            consignment_lines: true,
            customs_refs: true,
            release_orders: true,
          },
        });

        if (c) {
          const stays = c.unit_stays || [];
          const received = stays.filter((s) => s.physical_status !== "EXPECTED").length;
          const delivered = stays.filter((s) => s.physical_status === "DEPARTED").length;
          const expected = c.units_expected || Math.max(stays.length, 1);

          return {
            consignmentId: c.consignment_id,
            siteId: c.site_id,
            vesselCallId: c.vessel_call_id,
            vesselName: c.vessel_calls?.vessels?.vessel_name || "MV Maersk Karachi",
            voyageNo: c.vessel_calls?.voyage_no || "2601W",
            refType: c.ref_type || "BL",
            refNo: c.ref_no,
            status: c.status || "OPEN",
            cargoRegimeCode: c.cargo_regime_id === 2 ? "TRANSIT" : "IMPORT_HOME",
            cargoDescription: c.cargo_description || "General Merchandise",
            consigneeName:
              c.parties_consignments_consignee_party_idToparties?.party_name || "Twiga Cement Ltd",
            consigneePartyId: c.consignee_party_id || 1,
            billToPartyId: c.bill_to_party_id || 1,
            destinationCountry: c.destination_country || "Tanzania",
            unitsExpected: expected,
            unitsReceived: received,
            unitsDelivered: delivered,
            unitCount: stays.length || expected,
            lines: c.consignment_lines.map((l) => ({
              consignmentLineId: l.consignment_line_id,
              lineNo: l.line_no,
              packageType: l.package_type || "PK",
              packageCount: l.package_count || 450,
              goodsDescription: l.goods_description || "Ceramic Floor Tiles",
              grossWeightKg: Number(l.gross_weight_kg || 28000),
              volumeCbm: Number(l.volume_cbm || 30),
              commodityCode: l.commodity_code || "TILES",
              hsCode: l.hs_code || "6907.21",
            })),
            units: stays.map((u) => ({
              unitStayId: u.unit_stay_id,
              unitNo: u.unit_no,
              unitTypeCode: u.unit_types?.type_code || "40HC",
              category: u.unit_types?.category || "CONTAINER",
              physicalStatus: u.physical_status,
              customsStatus: u.customs_status,
              releaseStatus: u.release_status,
              billingStatus: u.billing_status,
              location: u.yard_locations?.full_code,
              activeHoldCount: (u.holds || []).filter((h) => h.status === "ACTIVE").length,
            })),
          };
        }
      } catch (err: any) {
        console.warn("[CargoService.getConsignment] DB query fallback:", err.message);
      }
    }

    return (
      consignments.find(
        (c) => String(c.consignmentId) === String(id) || c.refNo === String(id)
      ) || null
    );
  }

  async createConsignment(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const created = await prisma.consignments.create({
          data: {
            site_id: body.siteId || 1,
            vessel_call_id: body.vesselCallId || 1,
            consignee_party_id: body.consigneePartyId || 1,
            bill_to_party_id: body.billToPartyId || 1,
            ref_type: body.refType || "BL",
            ref_no: body.refNo || `BL-LOCAL-${Date.now()}`,
            status: body.status || "OPEN",
            cargo_regime_id: body.cargoRegimeCode === "TRANSIT" ? 2 : 1,
            cargo_description: body.cargoDescription || "General Goods",
            units_expected: body.unitsExpected || 1,
            units_received: 0,
            units_delivered: 0,
            destination_country: body.destinationCountry || "Tanzania",
          },
        });
        return this.getConsignment(created.consignment_id);
      } catch (err: any) {
        console.warn("[CargoService.createConsignment] DB insert error:", err.message);
      }
    }

    const newC = {
      consignmentId: consignments.length + 101,
      status: "OPEN" as const,
      refType: "BL" as const,
      refNo: body.refNo || `BL-LOCAL-${Date.now()}`,
      vesselCallId: body.vesselCallId || 1,
      consigneePartyId: body.consigneePartyId || 1,
      ...body,
    };
    consignments.push(newC);
    return newC;
  }

  async updateConsignment(id: string | number, body: any) {
    const prisma = getPrisma();
    const numId = Number(id);

    if (isDbLive() && prisma && Number.isFinite(numId)) {
      try {
        const updateData: any = {};
        if (body.status) updateData.status = body.status;
        if (body.cargoDescription) updateData.cargo_description = body.cargoDescription;
        if (body.consigneePartyId) updateData.consignee_party_id = Number(body.consigneePartyId);
        if (body.destinationCountry) updateData.destination_country = body.destinationCountry;

        await prisma.consignments.update({
          where: { consignment_id: numId },
          data: updateData,
        });
        return this.getConsignment(numId);
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
    const id = Number(consignmentId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const lines = await prisma.consignment_lines.findMany({
          where: { consignment_id: id },
          orderBy: { line_no: "asc" },
        });

        if (lines && lines.length > 0) {
          return lines.map((l) => ({
            consignmentLineId: l.consignment_line_id,
            consignmentId: l.consignment_id,
            lineNo: l.line_no,
            packageType: l.package_type || "PK",
            packageCount: l.package_count || 450,
            goodsDescription: l.goods_description || "Ceramic Floor Tiles",
            grossWeightKg: Number(l.gross_weight_kg || 28000),
            volumeCbm: Number(l.volume_cbm || 30),
            commodityCode: l.commodity_code || "TILES",
            hsCode: l.hs_code || "6907.21",
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getConsignmentLines] DB query error:", err.message);
      }
    }

    return [
      {
        consignmentLineId: 1,
        consignmentId: Number(consignmentId),
        lineNo: 1,
        packageType: "PK",
        packageCount: 450,
        goodsDescription: "General Merchandise",
        grossWeightKg: 28000,
        volumeCbm: 30,
        commodityCode: "TILES",
      },
    ];
  }

  async saveConsignmentLines(consignmentId: string | number, lines: any[]) {
    const prisma = getPrisma();
    const id = Number(consignmentId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        await prisma.consignment_lines.deleteMany({ where: { consignment_id: id } });
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          await prisma.consignment_lines.create({
            data: {
              consignment_id: id,
              line_no: l.lineNo || i + 1,
              package_type: l.packageType || "PK",
              package_count: Number(l.packageCount || 100),
              goods_description: l.goodsDescription || "Cargo Goods",
              gross_weight_kg: Number(l.grossWeightKg || 20000),
              volume_cbm: Number(l.volumeCbm || 25),
              commodity_code: l.commodityCode || "GEN",
              hs_code: l.hsCode || "0000.00",
            },
          });
        }
        return this.getConsignmentLines(id);
      } catch (err: any) {
        console.warn("[CargoService.saveConsignmentLines] DB save error:", err.message);
      }
    }

    return lines;
  }

  async getConsignmentUnits(consignmentId: string | number) {
    const id = Number(consignmentId);
    return this.getUnits({ consignmentId: id });
  }

  // ------------------------------------------------------------------ 3. VESSEL CALLS
  async getVesselCalls(query: any = {}) {
    const { status } = query;
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const where: any = {};
        if (status) where.status = status;

        const dbCalls = await prisma.vessel_calls.findMany({
          where,
          include: {
            vessels: true,
            ports: true,
            parties: true,
            manifests: true,
            consignments: {
              include: { unit_stays: true },
            },
          },
          orderBy: { vessel_call_id: "desc" },
        });

        if (dbCalls && dbCalls.length > 0) {
          return dbCalls.map((vc) => {
            const allCons = vc.consignments || [];
            const allStays = allCons.flatMap((c) => c.unit_stays || []);
            const expected = allCons.reduce((sum, c) => sum + (c.units_expected || c.unit_stays?.length || 0), 0) || 120;
            const received = allStays.filter((s) => s.physical_status !== "EXPECTED").length || 95;
            const out = allStays.filter((s) => s.physical_status === "DEPARTED").length || 40;

            return {
              vesselCallId: vc.vessel_call_id,
              status: vc.status || "BERTHED",
              portId: vc.port_id,
              portName: vc.ports?.port_name || "Port of Dar es Salaam",
              portCallRef: vc.port_call_ref || `PC-DAR-${vc.vessel_call_id}`,
              callSign: vc.vessels?.call_sign || "5LDF8",
              vesselName: vc.vessels?.vessel_name || "MV Maersk Karachi",
              voyageIn: vc.voyage_no,
              voyageOut: vc.voyage_no,
              voyageNo: vc.voyage_no,
              eta: vc.eta?.toISOString() || new Date().toISOString(),
              ata: vc.ata?.toISOString(),
              dischargeCompletedAt: vc.discharge_completed_at?.toISOString(),
              gateCutoffAt: vc.gate_cutoff_at?.toISOString(),
              docCutoffAt: vc.doc_cutoff_at?.toISOString(),
              vgmCutoffAt: vc.vgm_cutoff_at?.toISOString(),
              shippingLinePartyId: vc.parties?.party_id || 1,
              shippingLineName: vc.parties?.party_name || "Maersk Line",
              shippingLineCode: vc.parties?.party_code || "MSK",
              stats: { expected, received, out },
            };
          });
        }
      } catch (err: any) {
        console.warn("[CargoService.getVesselCalls] DB query fallback:", err.message);
      }
    }

    let items = vesselCalls as any[];
    if (status) items = items.filter((v) => v.status === status);
    return items;
  }

  async getVesselCall(vesselCallId: string | number) {
    const list = await this.getVesselCalls({});
    return list.find((v: any) => String(v.vesselCallId) === String(vesselCallId)) || null;
  }

  async createVesselCall(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        let vId = 1;
        if (body.vesselName) {
          let v = await prisma.vessels.findFirst({ where: { vessel_name: body.vesselName } });
          if (!v) {
            v = await prisma.vessels.create({
              data: {
                vessel_name: body.vesselName,
                call_sign: body.callSign || "CALL-01",
                is_active: true,
              },
            });
          }
          vId = v.vessel_id;
        }

        const created = await prisma.vessel_calls.create({
          data: {
            vessel_id: vId,
            site_id: body.siteId || 1,
            port_id: body.portId || 1,
            shipping_line_party_id: body.shippingLinePartyId || 1,
            voyage_no: body.voyageNo || body.voyageIn || `V-${Date.now().toString().slice(-4)}`,
            status: body.status || "EXPECTED",
            eta: body.eta ? new Date(body.eta) : new Date(Date.now() + 86400000),
            ata: body.ata ? new Date(body.ata) : null,
            discharge_completed_at: body.dischargeCompletedAt ? new Date(body.dischargeCompletedAt) : null,
            gate_cutoff_at: body.gateCutoffAt ? new Date(body.gateCutoffAt) : null,
            doc_cutoff_at: body.docCutoffAt ? new Date(body.docCutoffAt) : null,
            vgm_cutoff_at: body.vgmCutoffAt ? new Date(body.vgmCutoffAt) : null,
            port_call_ref: body.portCallRef || `PC-${Date.now().toString().slice(-5)}`,
          },
        });
        return this.getVesselCall(created.vessel_call_id);
      } catch (err: any) {
        console.warn("[CargoService.createVesselCall] DB insert error:", err.message);
      }
    }

    const newCall = {
      vesselCallId: vesselCalls.length + 1,
      status: "EXPECTED" as const,
      portId: 1,
      callSign: body.callSign || "V-CALL-26",
      eta: body.eta || new Date(Date.now() + 86400000).toISOString(),
      voyageIn: body.voyageIn || "2601W",
      voyageOut: body.voyageOut || "2601E",
      voyageNo: body.voyageNo || "2601W",
      ...body,
    };
    vesselCalls.push(newCall);
    return newCall;
  }

  async updateVesselCall(vesselCallId: string | number, body: any) {
    const prisma = getPrisma();
    const id = Number(vesselCallId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const updateData: any = {};
        if (body.status) updateData.status = body.status;
        if (body.dischargeCompletedAt) updateData.discharge_completed_at = new Date(body.dischargeCompletedAt);
        if (body.ata) updateData.ata = new Date(body.ata);
        if (body.eta) updateData.eta = new Date(body.eta);
        if (body.gateCutoffAt) updateData.gate_cutoff_at = new Date(body.gateCutoffAt);

        await prisma.vessel_calls.update({
          where: { vessel_call_id: id },
          data: updateData,
        });
        return this.getVesselCall(id);
      } catch (err: any) {
        console.warn("[CargoService.updateVesselCall] DB update error:", err.message);
      }
    }

    const call = vesselCalls.find((v) => String(v.vesselCallId) === String(vesselCallId));
    if (call) Object.assign(call, body);
    return call;
  }

  // ------------------------------------------------------------------ 4. MANIFESTS
  async getManifests() {
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const dbMans = await prisma.manifests.findMany({
          include: {
            parties: true,
            vessel_calls: {
              include: { vessels: true },
            },
            manifest_lines: true,
          },
          orderBy: { manifest_id: "desc" },
        });

        if (dbMans && dbMans.length > 0) {
          return dbMans.map((m) => {
            const lines = m.manifest_lines || [];
            const vName = m.vessel_calls?.vessels?.vessel_name || "MV Maersk Karachi";
            const vVoy = m.vessel_calls?.voyage_no || "2601W";

            return {
              manifestId: m.manifest_id,
              manifestRef: m.manifest_ref,
              manifestNo: m.manifest_ref,
              vesselCallId: m.vessel_call_id,
              vesselName: vName,
              voyageNo: vVoy,
              vesselLabel: `${vName} ${vVoy}`,
              fileName: m.file_name || `${m.manifest_ref}.xlsx`,
              source: m.source || "EXCEL",
              shippingLineName: m.parties?.party_name || "Maersk Line",
              shippingLineCode: m.parties?.party_code || "MSK",
              status: m.status || "APPLIED",
              lineCount: m.line_count || lines.length || 10,
              totalLines: m.line_count || lines.length || 10,
              createdCount: m.created_count || lines.filter((l) => l.match_status === "CREATED").length || 8,
              matchedCount: m.matched_count || lines.filter((l) => l.match_status === "MATCHED").length || 2,
              errorCount: m.error_count || lines.filter((l) => l.match_status === "INVALID").length || 0,
              importedAt: m.imported_at?.toISOString() || new Date().toISOString(),
              importedBy: "Baraka M. (Documentation)",
              lines: lines.map((l) => ({
                manifestLineId: l.manifest_line_id,
                manifestId: l.manifest_id,
                lineNo: l.line_no,
                containerNo: l.unit_no,
                unitNo: l.unit_no,
                billOfLading: l.bl_no,
                blNo: l.bl_no,
                consigneeName: l.consignee_raw,
                consigneeRaw: l.consignee_raw,
                fullEmpty: l.full_empty,
                sealNo: l.seal_no,
                grossWeightKg: Number(l.gross_weight_kg || 0),
                matchStatus: l.match_status,
                unitTypeRaw: l.unit_type_raw || "40HC",
                commodityRaw: l.commodity_raw || "General Merchandise",
                errorText: l.error_text || undefined,
                issue: l.issue || undefined,
              })),
            };
          });
        }
      } catch (err: any) {
        console.warn("[CargoService.getManifests] DB query fallback:", err.message);
      }
    }

    return manifests;
  }

  async getManifest(manifestId: string | number) {
    const list = await this.getManifests();
    return (
      list.find(
        (m: any) =>
          String(m.manifestId) === String(manifestId) || m.manifestNo === String(manifestId)
      ) || null
    );
  }

  async createManifest(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const ref = body.manifestNo || body.manifestRef || `MAN-${Date.now()}`;
        const items = body.items || body.lines || sampleManifestLines;

        const created = await prisma.manifests.create({
          data: {
            vessel_call_id: body.vesselCallId || 1,
            shipping_line_party_id: body.shippingLinePartyId || 1,
            manifest_ref: ref,
            file_name: body.fileName || `${ref}.xlsx`,
            source: body.format || "EXCEL",
            status: "DRAFT",
            line_count: items.length,
            created_count: 0,
            matched_count: 0,
            error_count: items.filter((l: any) => l.issue).length,
            imported_at: new Date(),
          },
        });

        for (let i = 0; i < items.length; i++) {
          const l = items[i];
          await prisma.manifest_lines.create({
            data: {
              manifest_id: created.manifest_id,
              line_no: l.lineNo || i + 1,
              bl_no: l.blNo || l.billOfLading || `BL-${Date.now()}`,
              unit_no: l.unitNo || l.containerNo || `MSKU${1000000 + i}`,
              consignee_raw: l.consigneeRaw || l.consigneeName || "Twiga Cement Ltd",
              full_empty: l.fullEmpty || "F",
              seal_no: l.sealNo || "SEAL-01",
              gross_weight_kg: Number(l.grossWeightKg || 25000),
              match_status: l.matchStatus || "NEW",
              unit_type_raw: l.unitTypeRaw || "40HC",
              commodity_raw: l.commodityRaw || "Cargo",
              error_text: l.errorText || null,
              issue: l.issue || null,
            },
          });
        }

        return this.getManifest(created.manifest_id);
      } catch (err: any) {
        console.warn("[CargoService.createManifest] DB insert error:", err.message);
      }
    }

    const newMan = {
      manifestId: manifests.length + 1,
      manifestNo: body.manifestNo || `MAN-2026-${Date.now()}`,
      vesselCallId: body.vesselCallId || 1,
      status: "DRAFT",
      totalLines: 10,
      importedAt: new Date().toISOString(),
      ...body,
    };
    manifests.push(newMan as any);
    return newMan;
  }

  async updateManifestLine(manifestLineId: string | number, body: any) {
    const prisma = getPrisma();
    const id = Number(manifestLineId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const updateData: any = {};
        if (body.unitNo) updateData.unit_no = body.unitNo;
        if (body.matchStatus) updateData.match_status = body.matchStatus;
        if (body.errorText !== undefined) updateData.error_text = body.errorText;
        if (body.issue !== undefined) updateData.issue = body.issue;
        if (body.unitTypeRaw) updateData.unit_type_raw = body.unitTypeRaw;

        await prisma.manifest_lines.update({
          where: { manifest_line_id: id },
          data: updateData,
        });
        return { success: true };
      } catch (err: any) {
        console.warn("[CargoService.updateManifestLine] DB update error:", err.message);
      }
    }
    return { success: true };
  }

  async applyManifest(manifestId: string | number) {
    const prisma = getPrisma();
    const id = Number(manifestId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const man = await prisma.manifests.findUnique({
          where: { manifest_id: id },
          include: { manifest_lines: true },
        });

        if (man) {
          await prisma.manifests.update({
            where: { manifest_id: id },
            data: { status: "APPLIED" },
          });

          // Create consignments and expected unit stays from manifest lines
          for (const l of man.manifest_lines) {
            if (l.match_status === "NEW" || l.match_status === "MATCHED") {
              let cons = await prisma.consignments.findFirst({ where: { ref_no: l.bl_no || "BL-UNKNOWN" } });
              if (!cons) {
                cons = await prisma.consignments.create({
                  data: {
                    site_id: 1,
                    vessel_call_id: man.vessel_call_id,
                    consignee_party_id: 1,
                    bill_to_party_id: 1,
                    ref_type: "BL",
                    ref_no: l.bl_no || "BL-UNKNOWN",
                    status: "OPEN",
                    cargo_regime_id: 1,
                    cargo_description: l.commodity_raw || "General Merchandise",
                    units_expected: 1,
                    units_received: 0,
                    units_delivered: 0,
                    destination_country: "Tanzania",
                  },
                });
              }

              let stay = await prisma.unit_stays.findFirst({ where: { unit_no: l.unit_no } });
              if (!stay) {
                stay = await prisma.unit_stays.create({
                  data: {
                    site_id: 1,
                    unit_type_id: 1,
                    consignment_id: cons.consignment_id,
                    cargo_regime_id: 1,
                    yard_location_id: 1,
                    unit_no: l.unit_no,
                    flow: "IMPORT",
                    full_empty: l.full_empty || "F",
                    physical_status: "EXPECTED",
                    customs_status: "PENDING",
                    release_status: "PENDING_CHARGES",
                    billing_status: "UNBILLED",
                    seal_no: l.seal_no || "SEAL-001",
                    gross_weight_kg: Number(l.gross_weight_kg || 24000),
                    cargo_description: l.commodity_raw || "General Merchandise",
                    condition_status: "SOUND",
                  },
                });
              }

              await prisma.manifest_lines.update({
                where: { manifest_line_id: l.manifest_line_id },
                data: { match_status: "CREATED" },
              });
            }
          }
        }
        return { success: true, manifest: man };
      } catch (err: any) {
        console.warn("[CargoService.applyManifest] DB apply error:", err.message);
      }
    }

    return { success: true };
  }

  // ------------------------------------------------------------------ 5. CUSTOMS & EXAMS
  async getCustomsRefs(query: any = {}) {
    const { consignmentId, status } = query;
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const where: any = {};
        if (consignmentId) where.consignment_id = Number(consignmentId);
        if (status && status !== "ALL") where.status = status;

        const dbRefs = await prisma.customs_refs.findMany({
          where,
          include: {
            consignments: true,
            unit_stays: true,
          },
          orderBy: { customs_ref_id: "desc" },
        });

        if (dbRefs && dbRefs.length > 0) {
          return dbRefs.map((r) => ({
            customsRefId: r.customs_ref_id,
            consignmentId: r.consignment_id,
            consignmentRef: r.consignments?.ref_no || "BL-DAR-2026-9901",
            unitStayId: r.unit_stay_id,
            unitNo: r.unit_stays?.unit_no,
            refType: r.ref_type || "TANSAD",
            refTypeCode: r.ref_type || "TANSAD",
            refNo: r.ref_no,
            status: r.status || "CLEARED",
            refDate: r.ref_date?.toISOString().split("T")[0],
            validTo: r.valid_to?.toISOString().split("T")[0],
            amount: r.amount ? Number(r.amount) : undefined,
            amountCurrency: r.amount_currency || "USD",
            source: r.source || "MANUAL",
            registeredAt: r.lodged_at?.toISOString() || new Date().toISOString(),
            clearedAt: r.cleared_at?.toISOString(),
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getCustomsRefs] DB query fallback:", err.message);
      }
    }

    let items = customsRefs as any[];
    if (consignmentId) items = items.filter((c) => String(c.consignmentId) === String(consignmentId));
    if (status && status !== "ALL") items = items.filter((c) => c.status === status);
    return items;
  }

  async createCustomsRef(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const created = await prisma.customs_refs.create({
          data: {
            consignment_id: body.consignmentId || 101,
            unit_stay_id: body.unitStayId || null,
            ref_type: body.refTypeCode || body.refType || "CUSTOMS_RELEASE",
            ref_no: body.refNo || `TZ-CUST-2026-${Date.now()}`,
            status: body.status || "ACTIVE",
            ref_date: body.refDate ? new Date(body.refDate) : new Date(),
            valid_to: body.validTo ? new Date(body.validTo) : null,
            amount: body.amount ? Number(body.amount) : null,
            amount_currency: body.amountCurrency || "USD",
            source: body.source || "MANUAL",
            lodged_at: new Date(),
            cleared_at: body.status === "CLEARED" || body.refTypeCode === "CUSTOMS_RELEASE" ? new Date() : null,
          },
        });

        // Update affected unit stays' customs_status if release is recorded
        if (body.refTypeCode === "CUSTOMS_RELEASE" || body.sets === "CLEARED") {
          if (body.unitStayId) {
            await prisma.unit_stays.update({
              where: { unit_stay_id: body.unitStayId },
              data: { customs_status: "CLEARED" },
            });
          } else if (body.consignmentId) {
            await prisma.unit_stays.updateMany({
              where: { consignment_id: body.consignmentId },
              data: { customs_status: "CLEARED" },
            });
          }
        }

        return this.getCustomsRefs({ refNo: created.ref_no });
      } catch (err: any) {
        console.warn("[CargoService.createCustomsRef] DB insert error:", err.message);
      }
    }

    const newRef = {
      customsRefId: customsRefs.length + 101,
      refType: body.refTypeCode || body.refType || "TANSAD",
      refNo: body.refNo || `TZ-CUST-2026-${Date.now()}`,
      status: "ACTIVE",
      registeredAt: new Date().toISOString(),
      ...body,
    };
    customsRefs.push(newRef as any);
    return newRef;
  }

  async getCustomsExams() {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const dbExams = await prisma.customs_exams.findMany({
          include: { unit_stays: true },
          orderBy: { customs_exam_id: "desc" },
        });

        if (dbExams && dbExams.length > 0) {
          return dbExams.map((e) => ({
            examId: e.customs_exam_id,
            unitStayId: e.unit_stay_id,
            unitNo: e.unit_stays?.unit_no || "MSKU 778120 8",
            examType: e.exam_type || "PHYSICAL",
            examBay: e.exam_bay || "BAY-1",
            bay: e.exam_bay || "BAY-1",
            status: e.status || "SCHEDULED",
            scheduledDate: e.scheduled_date?.toISOString().split("T")[0],
            date: e.scheduled_date?.toISOString().split("T")[0],
            scheduledTime: e.scheduled_time || "10:00",
            slot: e.scheduled_time || "10:00",
            officerName: e.officer_name || "TRA Officer",
            officer: e.officer_name || "TRA Officer",
            findings: e.findings,
            completedAt: e.completed_at?.toISOString(),
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getCustomsExams] DB query fallback:", err.message);
      }
    }

    return exams;
  }

  async createCustomsExam(body: any) {
    const prisma = getPrisma();
    if (isDbLive() && prisma) {
      try {
        const created = await prisma.customs_exams.create({
          data: {
            site_id: body.siteId || 1,
            unit_stay_id: body.unitStayId || 1,
            exam_type: body.examType || "PHYSICAL",
            exam_bay: body.examBay || body.bay || "BAY-1",
            status: "SCHEDULED",
            scheduled_date: body.scheduledDate || body.date ? new Date(body.scheduledDate || body.date) : new Date(),
            scheduled_time: body.scheduledTime || body.slot || "10:00",
            officer_name: body.officerName || body.officer || "TRA Inspector",
            requested_at: new Date(),
          },
        });
        return created;
      } catch (err: any) {
        console.warn("[CargoService.createCustomsExam] DB insert error:", err.message);
      }
    }

    const newEx = {
      examId: exams.length + 301,
      unitStayId: body.unitStayId || 1,
      status: "SCHEDULED",
      ...body,
    };
    exams.push(newEx as any);
    return newEx;
  }

  async completeCustomsExam(examId: string | number, body: any) {
    const prisma = getPrisma();
    const id = Number(examId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const ex = await prisma.customs_exams.update({
          where: { customs_exam_id: id },
          data: {
            status: "COMPLETED",
            completed_at: new Date(),
            findings: body.outcome || body.findings || "CLEARED: Verified goods match declaration",
          },
        });
        return { success: true, exam: ex };
      } catch (err: any) {
        console.warn("[CargoService.completeCustomsExam] DB update error:", err.message);
      }
    }
    return { success: true };
  }

  // ------------------------------------------------------------------ 6. HOLDS
  async getHolds(query: any = {}) {
    const { status, unitStayId, holdTypeCode } = query;
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const where: any = {};
        if (status && status !== "all") where.status = status;
        if (unitStayId) where.unit_stay_id = Number(unitStayId);
        if (holdTypeCode && holdTypeCode !== "ALL") where.hold_type = holdTypeCode;

        const dbHolds = await prisma.holds.findMany({
          where,
          include: {
            unit_stays: true,
            users_holds_placed_by_user_idTousers: true,
            users_holds_lifted_by_user_idTousers: true,
          },
          orderBy: { hold_id: "desc" },
        });

        if (dbHolds && dbHolds.length > 0) {
          return dbHolds.map((h) => ({
            holdId: h.hold_id,
            unitStayId: h.unit_stay_id,
            unitNo: h.unit_stays?.unit_no || "MSKU 882014 9",
            holdType: h.hold_type,
            holdTypeCode: h.hold_type,
            authorityRef: h.authority_ref || `AUTH-${h.hold_type}`,
            reason: h.reason,
            status: h.status || "ACTIVE",
            placedAt: h.placed_at?.toISOString() || new Date().toISOString(),
            placedBy: h.users_holds_placed_by_user_idTousers?.user_name || "Ashok Kumar",
            liftedAt: h.lifted_at?.toISOString(),
            liftedBy: h.users_holds_lifted_by_user_idTousers?.user_name,
            liftReason: h.lift_reason,
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getHolds] DB query fallback:", err.message);
      }
    }

    let items = holds as any[];
    if (status && status !== "all") items = items.filter((h) => h.status === status);
    if (unitStayId) items = items.filter((h) => String(h.unitStayId) === String(unitStayId));
    return items;
  }

  async placeHold(body: any, username: string = "Customs Officer") {
    const prisma = getPrisma();
    const unitStayIds: number[] = Array.isArray(body.unitStayIds)
      ? body.unitStayIds
      : body.unitStayId
      ? [Number(body.unitStayId)]
      : [1];

    if (isDbLive() && prisma) {
      try {
        const createdList = [];
        for (const uid of unitStayIds) {
          const created = await prisma.holds.create({
            data: {
              unit_stay_id: uid,
              placed_by_user_id: 1,
              hold_type: body.holdTypeCode || body.holdType || "CUSTOMS",
              reason: body.reason || "Verification hold",
              status: "ACTIVE",
              authority_ref: body.authorityRef || `AUTH-${body.holdTypeCode || "HOLD"}-2026`,
              placed_at: new Date(),
            },
            include: { unit_stays: true },
          });

          // Also set unit release_status to HELD
          await prisma.unit_stays.update({
            where: { unit_stay_id: uid },
            data: { release_status: "HELD" },
          });

          createdList.push({
            holdId: created.hold_id,
            unitStayId: created.unit_stay_id,
            unitNo: created.unit_stays?.unit_no,
            holdTypeCode: created.hold_type,
            authorityRef: created.authority_ref,
            reason: created.reason,
            status: "ACTIVE",
            placedAt: created.placed_at ? created.placed_at.toISOString() : new Date().toISOString(),
            placedBy: username,
          });
        }
        return createdList;
      } catch (err: any) {
        console.warn("[CargoService.placeHold] DB insert error:", err.message);
      }
    }

    const createdList = unitStayIds.map((uid) => ({
      holdId: holds.length + 701,
      unitStayId: uid,
      holdTypeCode: body.holdTypeCode || "CUSTOMS",
      status: "ACTIVE",
      placedAt: new Date().toISOString(),
      placedBy: username,
      reason: body.reason || "Hold placed",
      ...body,
    }));
    holds.push(...(createdList as any[]));
    return createdList;
  }

  async liftHold(holdId: string | number, body: any, username: string = "Customs Supervisor") {
    const prisma = getPrisma();
    const id = Number(holdId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const h = await prisma.holds.update({
          where: { hold_id: id },
          data: {
            status: "LIFTED",
            lifted_at: new Date(),
            lifted_by_user_id: 1,
            lift_reason: body.reason || body.liftReason || "Cleared and verified",
          },
          include: { unit_stays: { include: { holds: true } } },
        });

        // Check if unit has any remaining active holds
        const remaining = (h.unit_stays?.holds || []).filter(
          (x) => x.hold_id !== id && x.status === "ACTIVE"
        );
        if (remaining.length === 0 && h.unit_stay_id) {
          await prisma.unit_stays.update({
            where: { unit_stay_id: h.unit_stay_id },
            data: { release_status: "READY" },
          });
        }

        return { success: true, hold: h };
      } catch (err: any) {
        console.warn("[CargoService.liftHold] DB update error:", err.message);
      }
    }

    const h = (holds as any[]).find((x) => String(x.holdId) === String(holdId));
    if (h) {
      h.status = "LIFTED";
      h.liftedAt = new Date().toISOString();
      h.liftedBy = username;
      h.liftReason = body.reason || "Cleared";
    }
    return { success: true, hold: h };
  }

  // ------------------------------------------------------------------ 7. RELEASE ORDERS
  async getReleaseOrders(query: any = {}) {
    const { status, consignmentId } = query;
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const where: any = {};
        if (status && status !== "all") where.status = status;
        if (consignmentId) where.consignment_id = Number(consignmentId);

        const dbRos = await prisma.release_orders.findMany({
          where,
          include: {
            consignments: {
              include: { parties_consignments_consignee_party_idToparties: true },
            },
            parties: true,
            users: true,
          },
          orderBy: { release_order_id: "desc" },
        });

        if (dbRos && dbRos.length > 0) {
          // Fetch units for each release order
          const roIds = dbRos.map((r) => r.release_order_id);
          let linkedUnits: any[] = [];
          try {
            linkedUnits = await prisma.$queryRawUnsafe<any[]>(
              `SELECT rou.release_order_id, rou.status, us.unit_stay_id, us.unit_no 
               FROM release_order_units rou
               JOIN unit_stays us ON rou.unit_stay_id = us.unit_stay_id
               WHERE rou.release_order_id IN (${roIds.join(",")})`
            );
          } catch (e) {}

          const unitMap = new Map<number, any[]>();
          for (const u of linkedUnits) {
            if (!unitMap.has(u.release_order_id)) unitMap.set(u.release_order_id, []);
            unitMap.get(u.release_order_id)!.push({
              unitStayId: u.unit_stay_id,
              unitNo: u.unit_no,
              status: u.status,
            });
          }

          return dbRos.map((ro) => ({
            releaseOrderId: ro.release_order_id,
            releaseOrderNo: ro.release_no,
            releaseNo: ro.release_no,
            consignmentId: ro.consignment_id,
            consignmentRef: ro.consignments?.ref_no || "BL-DAR-2026-9901",
            consigneeName:
              ro.consignments?.parties_consignments_consignee_party_idToparties?.party_name ||
              "Twiga Cement Ltd",
            status: ro.status || "APPROVED",
            releaseKind: ro.release_kind || "DELIVERY",
            collectorName: ro.collector_name || "Baraka Mwita",
            collectorIdType: ro.collector_id_type || "Driving licence",
            collectorIdNo: ro.collector_id_no || "DL-TZ-98442",
            plannedExitDate: ro.planned_exit_date?.toISOString(),
            validTo: ro.expires_at?.toISOString() || new Date(Date.now() + 72 * 3600000).toISOString(),
            requestedBy: ro.parties?.party_name || "Bollore Logistics",
            approvedBy: ro.users?.user_name || "Ashok Kumar",
            unitsTotal: ro.units_total || 1,
            unitsOut: ro.units_out || 0,
            issuedAt: ro.issued_at?.toISOString() || new Date().toISOString(),
            expiresAt: ro.expires_at?.toISOString(),
            units: unitMap.get(ro.release_order_id) || [
              { unitStayId: 1, unitNo: "MSKU 882014 9", status: "PENDING" },
            ],
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getReleaseOrders] DB query fallback:", err.message);
      }
    }

    let items = releaseOrders as any[];
    if (status && status !== "all") items = items.filter((r) => r.status === status);
    if (consignmentId) items = items.filter((r) => String(r.consignmentId) === String(consignmentId));
    return items;
  }

  async getReleaseOrder(releaseOrderId: string | number) {
    const list = await this.getReleaseOrders({});
    return (
      list.find(
        (r: any) =>
          String(r.releaseOrderId) === String(releaseOrderId) ||
          r.releaseNo === String(releaseOrderId) ||
          r.releaseOrderNo === String(releaseOrderId)
      ) || null
    );
  }

  async createReleaseOrder(body: any, username: string = "Release Officer") {
    const prisma = getPrisma();
    const releaseNo = body.releaseNo || `RO-DAR1-26-0${1950 + Math.floor(Math.random() * 500)}`;

    if (isDbLive() && prisma) {
      try {
        const units = body.units || [];
        const created = await prisma.release_orders.create({
          data: {
            site_id: 1,
            consignment_id: body.consignmentId || 101,
            requested_by_party_id: body.transporterPartyId || 1,
            approved_by_user_id: 1,
            release_no: releaseNo,
            status: body.status || "REQUESTED",
            release_kind: body.releaseKind || "DELIVERY",
            collector_name: body.collectorName || "Baraka Mwita",
            collector_id_type: body.collectorIdType || "Driving licence",
            collector_id_no: body.collectorIdNo || "DL-TZ-98442",
            planned_exit_date: body.plannedExitDate ? new Date(body.plannedExitDate) : new Date(Date.now() + 86400000),
            expires_at: new Date(Date.now() + 72 * 3600000),
            units_total: units.length || 1,
            units_out: 0,
            requested_at: new Date(),
            issued_at: new Date(),
          },
        });

        // Insert into release_order_units
        for (const u of units) {
          const stayId = u.unitStayId || (await prisma.unit_stays.findFirst({ where: { unit_no: u.unitNo } }))?.unit_stay_id;
          if (stayId) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO release_order_units (release_order_id, unit_stay_id, status) VALUES (${created.release_order_id}, ${stayId}, 'PENDING')`
            );
          }
        }

        return this.getReleaseOrder(created.release_order_id);
      } catch (err: any) {
        console.warn("[CargoService.createReleaseOrder] DB insert error:", err.message);
      }
    }

    const newRo = {
      releaseOrderId: releaseOrders.length + 801,
      releaseNo,
      status: "REQUESTED",
      unitsTotal: (body.units || []).length || 1,
      unitsOut: 0,
      issuedAt: new Date().toISOString(),
      ...body,
    };
    releaseOrders.unshift(newRo as any);
    return newRo;
  }

  async approveReleaseOrder(releaseOrderId: string | number, username: string = "Release Supervisor") {
    const prisma = getPrisma();
    const id = Number(releaseOrderId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        await prisma.release_orders.update({
          where: { release_order_id: id },
          data: { status: "APPROVED" },
        });

        // Update units status
        await prisma.$executeRawUnsafe(
          `UPDATE unit_stays SET release_status = 'APPROVED' WHERE unit_stay_id IN (
             SELECT unit_stay_id FROM release_order_units WHERE release_order_id = ${id}
           )`
        );
        return this.getReleaseOrder(id);
      } catch (err: any) {
        console.warn("[CargoService.approveReleaseOrder] DB update error:", err.message);
      }
    }

    const ro = (releaseOrders as any[]).find((r) => String(r.releaseOrderId) === String(releaseOrderId));
    if (ro) ro.status = "APPROVED";
    return ro;
  }

  async cancelReleaseOrder(releaseOrderId: string | number) {
    const prisma = getPrisma();
    const id = Number(releaseOrderId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        await prisma.release_orders.update({
          where: { release_order_id: id },
          data: { status: "CANCELLED" },
        });
        return this.getReleaseOrder(id);
      } catch (err: any) {
        console.warn("[CargoService.cancelReleaseOrder] DB update error:", err.message);
      }
    }

    const ro = (releaseOrders as any[]).find((r) => String(r.releaseOrderId) === String(releaseOrderId));
    if (ro) ro.status = "CANCELLED";
    return ro;
  }

  async revalidateReleaseOrder(releaseOrderId: string | number, days: number = 2) {
    const prisma = getPrisma();
    const id = Number(releaseOrderId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        const newExpiry = new Date(Date.now() + days * 86400000);
        await prisma.release_orders.update({
          where: { release_order_id: id },
          data: {
            status: "APPROVED",
            expires_at: newExpiry,
          },
        });
        return this.getReleaseOrder(id);
      } catch (err: any) {
        console.warn("[CargoService.revalidateReleaseOrder] DB update error:", err.message);
      }
    }

    const ro = (releaseOrders as any[]).find((r) => String(r.releaseOrderId) === String(releaseOrderId));
    if (ro) {
      ro.validTo = new Date(Date.now() + days * 86400000).toISOString();
      ro.status = "APPROVED";
    }
    return ro;
  }

  // ------------------------------------------------------------------ 8. DANGEROUS GOODS
  async getDgLines() {
    const prisma = getPrisma();

    if (isDbLive() && prisma) {
      try {
        const dbDg = await prisma.dg_lines.findMany({
          include: {
            unit_stays: {
              include: { yard_locations: true },
            },
          },
          orderBy: { dg_line_id: "desc" },
        });

        if (dbDg && dbDg.length > 0) {
          return dbDg.map((dg) => ({
            unitDgLineId: dg.dg_line_id,
            dgLineId: dg.dg_line_id,
            unitStayId: dg.unit_stay_id,
            unitNo: dg.unit_stays?.unit_no || "MSKU 882014 9",
            unNo: dg.un_number.replace(/^UN\s*/, ""),
            unNumber: dg.un_number,
            imoClass: dg.imo_class,
            packingGroup: dg.packing_group || "II",
            properShippingName: dg.proper_shipping_name || "HAZARDOUS MATERIAL",
            flashpointC: dg.flashpoint_c ? Number(dg.flashpoint_c) : undefined,
            marinePollutant: dg.marine_pollutant || false,
            grossWeightKg: Number(dg.gross_weight_kg || 18000),
            emergencyContact: dg.emergency_contact || "+255 22 286 0011 (Chemtrec TZ)",
            location: dg.unit_stays?.yard_locations?.full_code,
          }));
        }
      } catch (err: any) {
        console.warn("[CargoService.getDgLines] DB query fallback:", err.message);
      }
    }

    return dgLines;
  }

  async saveDgLines(unitStayId: string | number, lines: any[]) {
    const prisma = getPrisma();
    const id = Number(unitStayId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        await prisma.dg_lines.deleteMany({ where: { unit_stay_id: id } });
        for (const l of lines) {
          await prisma.dg_lines.create({
            data: {
              unit_stay_id: id,
              un_number: l.unNo?.startsWith("UN") ? l.unNo : `UN ${l.unNo}`,
              imo_class: l.imoClass || "3",
              packing_group: l.packingGroup || "II",
              proper_shipping_name: l.properShippingName || "Hazardous Goods",
              flashpoint_c: l.flashpointC ? String(l.flashpointC) : null,
              marine_pollutant: !!l.marinePollutant,
              gross_weight_kg: Number(l.grossWeightKg || 18000),
              emergency_contact: l.emergencyContact || "+255 22 286 0011",
            },
          });
        }
        // Update imo_class on unit_stays
        if (lines.length > 0) {
          await prisma.unit_stays.update({
            where: { unit_stay_id: id },
            data: { imo_class: lines[0].imoClass, un_number: lines[0].unNo },
          });
        }
        return this.getDgLines();
      } catch (err: any) {
        console.warn("[CargoService.saveDgLines] DB save error:", err.message);
      }
    }

    return lines;
  }

  async deleteDgLine(dgLineId: string | number) {
    const prisma = getPrisma();
    const id = Number(dgLineId);

    if (isDbLive() && prisma && Number.isFinite(id)) {
      try {
        await prisma.dg_lines.delete({ where: { dg_line_id: id } });
        return { success: true };
      } catch (err: any) {
        console.warn("[CargoService.deleteDgLine] DB delete error:", err.message);
      }
    }
    return { success: true };
  }
}

export const cargoService = new CargoService();
