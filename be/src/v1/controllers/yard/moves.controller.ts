import { Request, Response } from "express";
import { getPrisma } from "../../../db/prisma";

// Valid check constraints on ICD_New database
const VALID_MOVE_KINDS = [
  "PICK_FOR_VISIT",
  "FROM_ACTIVITY",
  "TO_ACTIVITY",
  "RESHUFFLE",
  "RELOCATE",
  "PLACE",
] as const;
type MoveKind = (typeof VALID_MOVE_KINDS)[number];

function normalizeMoveKind(kind?: string): MoveKind {
  if (!kind) return "PLACE";
  const upper = String(kind).trim().toUpperCase();
  if ((VALID_MOVE_KINDS as readonly string[]).includes(upper)) {
    return upper as MoveKind;
  }
  const aliases: Record<string, MoveKind> = {
    REHANDLE: "RESHUFFLE",
    YARD_TO_YARD: "RELOCATE",
    LOAD: "PICK_FOR_VISIT",
    DISCHARGE: "PLACE",
  };
  return aliases[upper] ?? "RELOCATE";
}

function parseSiteId(val: unknown): number | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  const num = Number(val);
  return Number.isSafeInteger(num) && num > 0 ? num : undefined;
}

export const yardMovesController = {
  getMoveOrders: async (req: Request, res: Response) => {
    try {
      const siteId = parseSiteId(
        req.query.siteId || req.headers["x-site-id"] || (req as any).siteId,
      );
      const { status, equipmentCode } = req.query;

      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ success: false, message: "Database connection unavailable" });
      }

      const whereClause: any = {};
      if (siteId) whereClause.site_id = siteId;
      if (status && typeof status === "string") {
        if (
          status.toUpperCase() === "COMPLETED" ||
          status.toUpperCase() === "DONE"
        ) {
          whereClause.status = { in: ["DONE", "COMPLETED"] };
        } else {
          whereClause.status = status;
        }
      }

      const dbMoves = await prisma.move_order.findMany({
        where: whereClause,
        include: {
          unit_stay: {
            include: {
              unit_stay_cargo_units: {
                include: {
                  cargo_unit_unit_types: true,
                },
              },
            },
          },
          m_equipment: true,
          m_yard_location_move_order_from_location_idTom_yard_location: true,
          m_yard_location_move_order_to_location_idTom_yard_location: true,
          truck_visit_move_order: {
            include: {
              m_truck_truck_visit_truck_idTom_truck: true,
            },
          },
        },
        orderBy: { move_order_id: "desc" },
        take: 100,
      });

      let items = (dbMoves || []).map((m: any) => ({
        moveOrderId: Number(m.move_order_id),
        moveId: Number(m.move_order_id),
        siteId: m.site_id || 1,
        unitStayId: Number(m.unit_stay_id),
        unitNo:
          m.unit_stay?.unit_stay_cargo_units?.unit_no || "MSKU 123456 7",
        isoCode:
          m.unit_stay?.unit_stay_cargo_units?.cargo_unit_unit_types
            ?.iso_code || "42G1",
        category:
          m.unit_stay?.unit_stay_cargo_units?.unit_category ||
          "CONTAINER",
        unitType:
          m.unit_stay?.unit_stay_cargo_units?.cargo_unit_unit_types
            ?.type_name || "40ft Standard dry",
        moveType: m.move_kind,
        moveKind: m.move_kind,
        sourceLocation:
          m.m_yard_location_move_order_from_location_idTom_yard_location
            ?.location_code || "YARD",
        fromLocationCode:
          m.m_yard_location_move_order_from_location_idTom_yard_location
            ?.location_code || "YARD",
        targetLocation:
          m.m_yard_location_move_order_to_location_idTom_yard_location
            ?.location_code || "BUFFER",
        toLocationCode:
          m.m_yard_location_move_order_to_location_idTom_yard_location
            ?.location_code || "BUFFER",
        priority: m.priority || 5,
        status: m.status || "OPEN",
        equipmentId: m.assigned_equipment_id,
        equipmentCode: m.m_equipment?.equipment_code || undefined,
        equipmentType: m.m_equipment?.equipment_type || undefined,
        assignedTo:
          m.assigned_operator_sub ||
          m.m_equipment?.equipment_code ||
          undefined,
        operatorName: m.assigned_operator_sub || undefined,
        licensePlate:
          m.truck_visit_move_order?.m_truck_truck_visit_truck_idTom_truck
            ?.plate_no || undefined,
        truckPlate:
          m.truck_visit_move_order?.m_truck_truck_visit_truck_idTom_truck
            ?.plate_no || undefined,
        driverName: undefined,
        requestedAt: m.requested_at
          ? m.requested_at.toISOString()
          : new Date().toISOString(),
        startedAt: undefined,
        completedAt: m.completed_at
          ? m.completed_at.toISOString()
          : undefined,
        reason: m.override_reason || undefined,
      }));

      if (equipmentCode && typeof equipmentCode === "string") {
        items = items.filter(
          (x: any) => x.equipmentCode === equipmentCode,
        );
      }

      return res.json({
        success: true,
        items,
        total: items.length,
      });
    } catch (error: any) {
      console.error("getMoveOrders error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Create a move order.
   */
  createMoveOrder: async (req: Request, res: Response) => {
    try {
      const siteId =
        parseSiteId(
          req.body.siteId || req.query.siteId || req.headers["x-site-id"] || 1,
        ) || 1;
      const {
        unitStayId,
        unitNo,
        moveKind,
        moveType,
        fromLocationId,
        fromCode,
        sourceLocation,
        toLocationId,
        toCode,
        targetLocation,
        priority = 5,
        assignedEquipmentId,
        assignedOperatorSub,
        truckVisitId,
        overrideReason,
      } = req.body;

      if (!unitStayId && !unitNo) {
        return res.status(400).json({
          success: false,
          message: "unitStayId or unitNo is required",
        });
      }

      const normalizedKind = normalizeMoveKind(moveKind || moveType);
      const prisma = getPrisma();
      if (!prisma) {
        return res
          .status(500)
          .json({ success: false, message: "Database connection unavailable" });
      }

      let targetStay: any = null;
      if (unitStayId) {
        try {
          targetStay = await prisma.unit_stay.findUnique({
            where: { unit_stay_id: BigInt(unitStayId) },
            include: { unit_stay_cargo_units: true },
          });
        } catch {}
      }

      const searchUnitNo = (unitNo || req.body.unit_no || "")
        .trim()
        .toUpperCase();
      if (!targetStay && searchUnitNo) {
        const cleanNo = searchUnitNo.replace(/[\s-]/g, "");
        targetStay = await prisma.unit_stay.findFirst({
          where: {
            site_id: siteId,
            unit_stay_cargo_units: {
              OR: [{ unit_no: searchUnitNo }, { unit_no: cleanNo }],
            },
          },
          orderBy: { unit_stay_id: "desc" },
          include: { unit_stay_cargo_units: true },
        });
      }

      if (!targetStay) {
        const finalUnitNo =
          searchUnitNo || `CONT-${Date.now().toString().slice(-6)}`;
        let cu = await prisma.cargo_unit.findFirst({
          where: { unit_no: finalUnitNo },
        });
        if (!cu) {
          const firstType = await prisma.m_unit_type.findFirst({
            select: { unit_type_id: true },
          });
          cu = await prisma.cargo_unit.create({
            data: {
              unit_category: "CONTAINER",
              unit_no: finalUnitNo,
              unit_type_id: firstType?.unit_type_id || 1,
              createdby: (req as any).user?.sub || "system",
            },
          });
        }
        const firstRegime = await prisma.m_cargo_regime.findFirst({
          select: { cargo_regime_id: true },
        });
        targetStay = await prisma.unit_stay.create({
          data: {
            cargo_unit_id: cu.cargo_unit_id,
            site_id: siteId,
            cargo_regime_id: firstRegime?.cargo_regime_id || 1,
            flow: "IMPORT",
            full_empty: "F",
            physical_status: "IN_YARD",
            createdby: (req as any).user?.sub || "system",
          },
          include: { unit_stay_cargo_units: true },
        });
      }

      let resolvedFromLocId: number | null = fromLocationId
        ? Number(fromLocationId)
        : null;
      const rawFromCode = String(fromCode || sourceLocation || "").trim();
      if (!resolvedFromLocId && rawFromCode) {
        const loc = await prisma.m_yard_location.findFirst({
          where: {
            site_id: siteId,
            OR: [{ location_code: rawFromCode }, { full_code: rawFromCode }],
          },
          select: { yard_location_id: true },
        });
        if (loc) resolvedFromLocId = loc.yard_location_id;
      }
      if (resolvedFromLocId) {
        const exists = await prisma.m_yard_location.findUnique({
          where: { yard_location_id: resolvedFromLocId },
          select: { yard_location_id: true },
        });
        if (!exists) resolvedFromLocId = null;
      }

      let resolvedToLocId: number | null = toLocationId
        ? Number(toLocationId)
        : null;
      const rawToCode = String(toCode || targetLocation || "").trim();
      if (!resolvedToLocId && rawToCode) {
        const loc = await prisma.m_yard_location.findFirst({
          where: {
            site_id: siteId,
            OR: [{ location_code: rawToCode }, { full_code: rawToCode }],
          },
          select: { yard_location_id: true },
        });
        if (loc) resolvedToLocId = loc.yard_location_id;
      }
      if (resolvedToLocId) {
        const exists = await prisma.m_yard_location.findUnique({
          where: { yard_location_id: resolvedToLocId },
          select: { yard_location_id: true },
        });
        if (!exists) resolvedToLocId = null;
      }

      let resolvedEquipId: number | null = assignedEquipmentId
        ? Number(assignedEquipmentId)
        : null;
      if (resolvedEquipId) {
        const exists = await prisma.m_equipment.findUnique({
          where: { equipment_id: resolvedEquipId },
          select: { equipment_id: true },
        });
        if (!exists) resolvedEquipId = null;
      }

      let resolvedTruckVisitId: bigint | null = null;
      if (truckVisitId) {
        try {
          const tv = await prisma.truck_visit.findUnique({
            where: { truck_visit_id: BigInt(truckVisitId) },
            select: { truck_visit_id: true },
          });
          if (tv) resolvedTruckVisitId = tv.truck_visit_id;
        } catch {}
      }

      const newOrder = await prisma.move_order.create({
        data: {
          site_id: siteId,
          unit_stay_id: targetStay.unit_stay_id,
          move_kind: normalizedKind,
          from_location_id: resolvedFromLocId,
          to_location_id: resolvedToLocId,
          priority: Number(priority) || 5,
          status: "OPEN",
          assigned_equipment_id: resolvedEquipId,
          assigned_operator_sub: assignedOperatorSub || null,
          truck_visit_id: resolvedTruckVisitId,
          override_reason: overrideReason || null,
          createdby: (req as any).user?.sub || "system",
        },
        include: {
          unit_stay: {
            include: {
              unit_stay_cargo_units: true,
            },
          },
          m_equipment: true,
          m_yard_location_move_order_from_location_idTom_yard_location: true,
          m_yard_location_move_order_to_location_idTom_yard_location: true,
        },
      });

      return res.status(201).json({
        success: true,
        data: {
          moveOrderId: Number(newOrder.move_order_id),
          moveId: Number(newOrder.move_order_id),
          siteId: newOrder.site_id,
          unitStayId: Number(newOrder.unit_stay_id),
          unitNo:
            newOrder.unit_stay?.unit_stay_cargo_units?.unit_no ||
            searchUnitNo ||
            "UNKNOWN",
          moveType: newOrder.move_kind,
          moveKind: newOrder.move_kind,
          sourceLocation:
            newOrder
              .m_yard_location_move_order_from_location_idTom_yard_location
              ?.full_code ||
            rawFromCode ||
            "YARD",
          targetLocation:
            newOrder.m_yard_location_move_order_to_location_idTom_yard_location
              ?.full_code ||
            rawToCode ||
            "BUFFER",
          priority: newOrder.priority,
          status: newOrder.status,
          assignedEquipmentId: newOrder.assigned_equipment_id,
          assignedOperatorSub: newOrder.assigned_operator_sub,
          createdAt: newOrder.createdate.toISOString(),
        },
      });
    } catch (error: any) {
      console.error("createMoveOrder error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  startMove: async (req: Request, res: Response) => {
    try {
      const moveOrderId = req.params.moveOrderId || req.params.moveId;
      if (!moveOrderId) {
        return res
          .status(400)
          .json({ success: false, message: "moveOrderId is required" });
      }

      if (true) {
        const prisma = getPrisma();
        if (prisma) {
          const updated = await prisma.move_order.update({
            where: { move_order_id: BigInt(moveOrderId) },
            data: {
              status: "IN_PROGRESS",
              updatedby: (req as any).user?.sub || "system",
              updatedate: new Date(),
            },
          });
          return res.json({
            success: true,
            data: {
              moveOrderId: Number(updated.move_order_id),
              status: updated.status,
            },
          });
        }
      }

      return res.json({
        success: true,
        data: { moveOrderId: Number(moveOrderId), status: "IN_PROGRESS" },
      });
    } catch (error: any) {
      console.error("startMove error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  completeMove: async (req: Request, res: Response) => {
    try {
      const moveOrderId = req.params.moveOrderId || req.params.moveId;
      const { toLocationId } = req.body;
      if (!moveOrderId) {
        return res
          .status(400)
          .json({ success: false, message: "moveOrderId is required" });
      }

      if (true) {
        const prisma = getPrisma();
        if (prisma) {
          const existing = await prisma.move_order.findUnique({
            where: { move_order_id: BigInt(moveOrderId) },
          });

          if (!existing) {
            return res
              .status(404)
              .json({ success: false, message: "Move order not found" });
          }

          const targetLocationId = toLocationId
            ? Number(toLocationId)
            : existing.to_location_id;

          const updated = await prisma.move_order.update({
            where: { move_order_id: BigInt(moveOrderId) },
            data: {
              status: "DONE",
              completed_at: new Date(),
              to_location_id: targetLocationId,
              updatedby: (req as any).user?.sub || "system",
              updatedate: new Date(),
            },
          });

          if (targetLocationId && existing.unit_stay_id) {
            await prisma.unit_stay
              .update({
                where: { unit_stay_id: existing.unit_stay_id },
                data: {
                  current_location_id: targetLocationId,
                  updatedby: (req as any).user?.sub || "system",
                  updatedate: new Date(),
                },
              })
              .catch((e: any) =>
                console.warn("Could not update unit_stay location:", e.message),
              );
          }

          return res.json({
            success: true,
            data: {
              moveOrderId: Number(updated.move_order_id),
              status: updated.status,
              completedAt: updated.completed_at?.toISOString(),
            },
          });
        }
      }

      return res.json({
        success: true,
        data: {
          moveOrderId: Number(moveOrderId),
          status: "COMPLETED",
          completedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("completeMove error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  assignMove: async (req: Request, res: Response) => {
    try {
      const moveOrderId = req.params.moveOrderId || req.params.moveId;
      const { equipmentId, operatorSub, equipmentCode } = req.body;
      if (!moveOrderId) {
        return res
          .status(400)
          .json({ success: false, message: "moveOrderId is required" });
      }

      if (true) {
        const prisma = getPrisma();
        if (prisma) {
          let resolvedEquipmentId = equipmentId
            ? Number(equipmentId)
            : undefined;
          if (!resolvedEquipmentId && equipmentCode) {
            const eq = await prisma.m_equipment.findFirst({
              where: { equipment_code: String(equipmentCode) },
            });
            if (eq) resolvedEquipmentId = eq.equipment_id;
          }

          const updated = await prisma.move_order.update({
            where: { move_order_id: BigInt(moveOrderId) },
            data: {
              assigned_equipment_id: resolvedEquipmentId ?? null,
              assigned_operator_sub: operatorSub || null,
              status: "ASSIGNED",
              updatedby: (req as any).user?.sub || "system",
              updatedate: new Date(),
            },
            include: {
              m_equipment: true,
            },
          });

          return res.json({
            success: true,
            data: {
              moveOrderId: Number(updated.move_order_id),
              status: updated.status,
              assignedEquipmentId: updated.assigned_equipment_id,
              equipmentCode: updated.m_equipment?.equipment_code || undefined,
              assignedOperatorSub: updated.assigned_operator_sub,
            },
          });
        }
      }

      return res.json({
        success: true,
        data: {
          moveOrderId: Number(moveOrderId),
          status: "ASSIGNED",
          assignedEquipmentId: equipmentId,
          assignedOperatorSub: operatorSub,
        },
      });
    } catch (error: any) {
      console.error("assignMove error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  executeMove: async (req: Request, res: Response) => {
    try {
      const moveId = req.params.moveId || req.params.moveOrderId;
      if (!moveId) {
        return res
          .status(400)
          .json({ success: false, message: "moveId is required" });
      }

      if (true) {
        const prisma = getPrisma();
        if (prisma) {
          const updated = await prisma.move_order.update({
            where: { move_order_id: BigInt(moveId) },
            data: {
              status: "IN_PROGRESS",
              updatedby: (req as any).user?.sub || "system",
              updatedate: new Date(),
            },
          });

          return res.json({
            success: true,
            data: {
              moveOrderId: Number(updated.move_order_id),
              status: updated.status,
            },
          });
        }
      }

      return res.json({
        success: true,
        data: { moveOrderId: Number(moveId), status: "IN_PROGRESS" },
      });
    } catch (error: any) {
      console.error("executeMove error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getEquipment: async (req: Request, res: Response) => {
    try {
      const siteId = parseSiteId(
        req.query.siteId || req.headers["x-site-id"] || (req as any).siteId,
      );

      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ success: false, message: "Database connection unavailable" });
      }

      const whereClause: any = { is_active: true };
      if (siteId) whereClause.site_id = siteId;

      let equipment = await prisma.m_equipment.findMany({
        where: whereClause,
        orderBy: { equipment_code: "asc" },
      });

      if ((!equipment || equipment.length === 0) && siteId) {
        equipment = await prisma.m_equipment.findMany({
          where: { is_active: true },
          orderBy: { equipment_code: "asc" },
        });
      }

      const items = (equipment || []).map((e: any) => ({
        equipmentId: e.equipment_id,
        equipmentCode: e.equipment_code,
        equipmentName: e.equipment_name,
        equipmentType: e.equipment_type,
        capacityKg: e.capacity_kg ? Number(e.capacity_kg) : undefined,
        status: e.is_active ? "AVAILABLE" : "MAINTENANCE",
        siteId: e.site_id,
      }));
      return res.json({ success: true, items, total: items.length });
    } catch (error: any) {
      console.error("getEquipment error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getLocations: async (req: Request, res: Response) => {
    try {
      const siteId = parseSiteId(
        req.query.siteId || req.headers["x-site-id"] || (req as any).siteId,
      );

      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ success: false, message: "Database connection unavailable" });
      }

      const whereClause: any = { is_active: true };
      if (siteId) whereClause.site_id = siteId;

      let locations = await prisma.m_yard_location.findMany({
        where: whereClause,
        orderBy: { location_code: "asc" },
        take: 300,
      });

      if ((!locations || locations.length === 0) && siteId) {
        locations = await prisma.m_yard_location.findMany({
          where: { is_active: true },
          orderBy: { location_code: "asc" },
          take: 300,
        });
      }

      const items = (locations || []).map((l: any) => ({
        locationId: l.yard_location_id,
        yardLocationId: l.yard_location_id,
        parentId: l.parent_id,
        levelNo: l.level_no,
        locationCode: l.location_code,
        fullCode: l.full_code,
        name: l.location_code,
        kind: l.location_kind,
        locationKind: l.location_kind,
        isSlot: Boolean(l.is_slot),
        siteId: l.site_id,
        allows20: Boolean(l.allows_20),
        allows40: Boolean(l.allows_40),
        allows45: Boolean(l.allows_45),
        maxTier: l.max_tier,
        maxWeightKg: l.max_weight_kg,
        isBlocked: Boolean(l.is_blocked),
        blockedReason: l.blocked_reason,
      }));
      return res.json({ success: true, items, total: items.length });
    } catch (error: any) {
      console.error("getLocations error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getOperators: async (_req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ success: false, message: "Database connection unavailable" });
      }

      const users = await prisma.app_user.findMany({
        where: { is_active: true },
        select: {
          user_id: true,
          user_sub: true,
          user_name: true,
          email: true,
          phone: true,
        },
        orderBy: { user_id: "asc" },
      });

      const items = (users || []).map((u: any) => ({
        userId: u.user_id,
        userSub: u.user_sub,
        name: u.user_name,
        email: u.email,
        phone: u.phone,
      }));
      return res.json({ success: true, items, total: items.length });
    } catch (error: any) {
      console.error("getOperators error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

export default yardMovesController;
