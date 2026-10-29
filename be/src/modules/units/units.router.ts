import { Router } from "express";
import { z } from "zod";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { unitTypes, identityRules, plateFormats } from "../../data/admin";
import { allStays } from "../../data/core";
import { holdsOf } from "../../data/control";
import { search } from "../../data/search";
import { getPrisma, isDbLive } from "../../db/prisma";
import {
  NotFoundError,
  asyncHandler,
  validateBody,
  parsePaginationParams,
  paginateArray,
  containerNumberSchema,
  vinNumberSchema,
} from "../../common";

const router = Router();

const validateIdentityBodySchema = z.object({
  category: z
    .enum(["CONTAINER", "VEHICLE_VIN", "BREAKBULK", "CUSTOM"])
    .optional()
    .default("CONTAINER"),
  rawValue: z.string().min(1, "Value to validate cannot be empty"),
});

const createUnitTypeSchema = z
  .object({
    typeCode: z.string().min(1, "Type code is required").optional(),
    unitTypeCode: z.string().min(1).optional(),
    typeName: z.string().min(1, "Type name is required").optional(),
    category: z.string().optional().default("CONTAINER"),
    identityRules: z.array(z.string()).optional(),
    isActive: z.boolean().optional().default(true),
  })
  .passthrough();

router.get(
  "/unit-types",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const params = parsePaginationParams(req.query);
    const paginated = paginateArray(unitTypes, params, (u) => u.unitTypeId);
    res.json(paginated);
  },
);

router.post(
  "/unit-types",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  validateBody(createUnitTypeSchema),
  (req, res) => {
    const newType = {
      unitTypeId: unitTypes.length + 1,
      typeCode:
        req.body.typeCode ||
        req.body.unitTypeCode ||
        `UT-${unitTypes.length + 1}`,
      typeName: req.body.typeName || "Standard Container",
      category: req.body.category || "CONTAINER",
      identityRules: ["ISO_6346"],
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    unitTypes.push(newType as any);
    res.status(201).json(newType);
  },
);

router.get(
  "/unit-types/:unitTypeId",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const item = unitTypes.find(
      (u) =>
        String(u.unitTypeId) === req.params.unitTypeId ||
        (u as any).typeCode === req.params.unitTypeId,
    );
    if (!item) {
      throw new NotFoundError("Unit type", req.params.unitTypeId);
    }
    res.json(item);
  },
);

router.patch(
  "/unit-types/:unitTypeId",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const item = unitTypes.find(
      (u) =>
        String(u.unitTypeId) === req.params.unitTypeId ||
        (u as any).typeCode === req.params.unitTypeId,
    );
    if (!item) {
      throw new NotFoundError("Unit type", req.params.unitTypeId);
    }
    Object.assign(item, req.body);
    res.json(item);
  },
);

router.get(
  "/identity-rules",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const params = parsePaginationParams(req.query);
    const paginated = paginateArray(identityRules, params);
    res.json(paginated);
  },
);

router.post(
  "/identity:validate",
  requireSite(false),
  requirePermission("masters.view"),
  validateBody(validateIdentityBodySchema),
  (req, res) => {
    const { category, rawValue } = req.body;
    const val = String(rawValue || "")
      .trim()
      .toUpperCase();

    if (category === "CONTAINER") {
      const parseResult = containerNumberSchema.safeParse(val);
      res.json({
        category: "CONTAINER",
        rawValue,
        normalizedValue: val.replace(/\s+/g, ""),
        isValid: parseResult.success,
        ruleApplied: "ISO 6346",
        errors: parseResult.success
          ? []
          : [
              "Unit number must consist of 4 letters and 7 digits (e.g. MSKU 123456 7)",
            ],
      });
      return;
    }

    if (category === "VEHICLE_VIN") {
      const parseResult = vinNumberSchema.safeParse(val);
      res.json({
        category: "VEHICLE_VIN",
        rawValue,
        normalizedValue: val,
        isValid: parseResult.success,
        ruleApplied: "ISO 3779 VIN",
        errors: parseResult.success
          ? []
          : [
              "VIN must be exactly 17 alphanumeric characters, excluding I, O, Q",
            ],
      });
      return;
    }

    res.json({
      category: category || "CUSTOM",
      rawValue,
      normalizedValue: val,
      isValid: true,
      ruleApplied: "NONE",
      errors: [],
    });
  },
);

router.get(
  "/plate-formats",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const params = parsePaginationParams(req.query);
    const paginated = paginateArray(plateFormats, params);
    res.json(paginated);
  },
);

router.get("/search", requireSite(true), (req, res) => {
  const q = String(req.query.q || "").trim();
  const results = search(q);
  res.json({
    query: q,
    results,
    total: results.reduce((acc, g) => acc + (g.hits?.length || 0), 0),
  });
});

router.get(
  "/units",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const {
      category,
      status,
      customsStatus,
      location,
      search: searchQ,
    } = req.query;
    let items = allStays;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbStays = await prisma.unit_stays.findMany({
            include: {
              unit_types: true,
              yard_locations: true,
              consignments: true,
              cargo_regimes: true,
              holds: true,
            },
            orderBy: { unit_stay_id: "desc" },
          });

          if (dbStays && dbStays.length > 0) {
            const mapped = dbStays.map((u) => {
              const activeHolds = (u.holds || []).filter(
                (h) => h.status === "ACTIVE",
              ).length;
              const dwell = u.arrived_at
                ? Math.max(
                    1,
                    Math.floor(
                      (Date.now() - new Date(u.arrived_at).getTime()) /
                        86400000,
                    ),
                  )
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
                flow: u.flow,
                fullEmpty: u.full_empty,
                customsStatus: u.customs_status,
                releaseStatus: u.release_status,
                billingStatus: u.billing_status,
                sealNo: u.seal_no,
                grossWeightKg: Number(u.gross_weight_kg || 0),
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

            const dbIds = new Set(mapped.map((m) => m.cargoUnit.unitNo));
            items = [
              ...mapped,
              ...allStays.filter((s) => !dbIds.has(s.cargoUnit.unitNo)),
            ] as any;
          }
        } catch (err: any) {
          console.warn("[Units API] DB query fallback to memory:", err.message);
        }
      }
    }

    if (category) {
      items = items.filter((s) => s.cargoUnit?.category === category);
    }
    if (status) {
      items = items.filter((s) => s.physicalStatus === status);
    }
    if (customsStatus) {
      items = items.filter((s) => s.customsStatus === customsStatus);
    }
    if (location) {
      items = items.filter((s) =>
        s.currentLocation?.fullCode?.startsWith(String(location)),
      );
    }
    if (searchQ) {
      const q = String(searchQ).toLowerCase();
      items = items.filter(
        (s) =>
          s.cargoUnit?.unitNo.toLowerCase().includes(q) ||
          s.sealNo?.toLowerCase().includes(q) ||
          s.currentLocation?.fullCode?.toLowerCase().includes(q),
      );
    }

    const paginationParams = parsePaginationParams(req.query);
    const paginated = paginateArray(
      items,
      paginationParams,
      (s) => s.unitStayId,
    );
    res.json(paginated);
  }),
);

router.post(
  "/units",
  requireSite(false),
  requirePermission("consignment.edit", "DO"),
  (req, res) => {
    const newStay = {
      unitStayId: allStays.length + 5001,
      siteId: 1,
      consignmentId: req.body.consignmentId || 101,
      cargoUnit: {
        cargoUnitId: allStays.length + 5001,
        category: req.body.category || "CONTAINER",
        unitNo: req.body.unitNo || `NEWU${Date.now().toString().slice(-7)}`,
        isoType: req.body.isoType || "40HC",
        tareWeightKg: req.body.tareWeightKg || 3800,
      },
      physicalStatus: "EXPECTED",
      flow: req.body.flow || "IMPORT",
      sealNo: req.body.sealNo || "SEAL-001",
      customsStatus: "PENDING",
      releaseStatus: "PENDING_CHARGES",
      gatedInAt: new Date().toISOString(),
      logInst: 1,
      ...req.body,
    };
    allStays.push(newStay as any);
    res.status(201).json(newStay);
  },
);

router.get(
  "/units/:unitStayId",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const stay = allStays.find(
      (x) =>
        String(x.unitStayId) === req.params.unitStayId ||
        x.cargoUnit?.unitNo.toUpperCase() ===
          req.params.unitStayId.toUpperCase(),
    );
    if (!stay) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json(stay);
  }),
);

router.patch(
  "/units/:unitStayId",
  requireSite(false),
  requirePermission("consignment.edit", "DO"),
  asyncHandler(async (req, res) => {
    const stay = allStays.find(
      (x) =>
        String(x.unitStayId) === req.params.unitStayId ||
        x.cargoUnit?.unitNo.toUpperCase() ===
          req.params.unitStayId.toUpperCase(),
    );
    if (!stay) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    Object.assign(stay, req.body, {
      logInst: ((stay as any).logInst || 1) + 1,
    });
    res.json(stay);
  }),
);

router.get(
  "/units/:unitStayId/timeline",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const stay = allStays.find(
      (x) =>
        String(x.unitStayId) === req.params.unitStayId ||
        x.cargoUnit?.unitNo.toUpperCase() ===
          req.params.unitStayId.toUpperCase(),
    );
    if (!stay) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }

    const timeline = [
      {
        eventType: "MANIFEST_IMPORTED",
        occurredAt: "2026-10-01T08:00:00Z",
        summary: "Manifest received from shipping line",
        user: "SYSTEM",
      },
      {
        eventType: "DISCHARGE_CONFIRMED",
        occurredAt: "2026-10-03T14:30:00Z",
        summary: "Container discharged at Port of Dar es Salaam",
        user: "PORT_EDI",
      },
      {
        eventType: "GATE_IN",
        occurredAt: stay.gatedInAt || "2026-10-04T09:15:00Z",
        summary: "Gate in pass issued to truck T 124 DFH",
        user: "Rose A.",
      },
      {
        eventType: "YARD_PLACEMENT",
        occurredAt: "2026-10-04T09:45:00Z",
        summary: `Placed into yard slot ${stay.currentLocation?.fullCode || "A-02-04-2"}`,
        user: "Ibrahim N.",
      },
      {
        eventType: "CUSTOMS_STATUS",
        occurredAt: "2026-10-05T11:00:00Z",
        summary: `Customs status updated to ${stay.customsStatus}`,
        user: "Rehema K.",
      },
    ];

    res.json({
      unitStayId: stay.unitStayId,
      unitNo: stay.cargoUnit?.unitNo,
      events: timeline,
    });
  }),
);

router.get(
  "/cargo-units/:cargoUnitId/stays",
  requireSite(false),
  requirePermission("consignment.view"),
  (req, res) => {
    const stays = allStays.filter(
      (s) => String(s.cargoUnit?.cargoUnitId) === req.params.cargoUnitId,
    );
    const params = parsePaginationParams(req.query);
    const paginated = paginateArray(stays, params, (s) => s.unitStayId);
    res.json(paginated);
  },
);

router.get(
  "/units/:unitStayId/holds",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const stay = allStays.find(
      (x) =>
        String(x.unitStayId) === req.params.unitStayId ||
        x.cargoUnit?.unitNo.toUpperCase() ===
          req.params.unitStayId.toUpperCase(),
    );
    if (!stay) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    const holds = holdsOf(stay.unitStayId || 0);
    const params = parsePaginationParams(req.query);
    const paginated = paginateArray(holds, params);
    res.json(paginated);
  }),
);

router.get(
  "/units/:unitStayId/history",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const stay = allStays.find(
      (x) =>
        String(x.unitStayId) === req.params.unitStayId ||
        x.cargoUnit?.unitNo.toUpperCase() ===
          req.params.unitStayId.toUpperCase(),
    );
    if (!stay) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json({
      unitStayId: stay.unitStayId,
      unitNo: stay.cargoUnit?.unitNo,
      moves: [
        {
          fromLocation: "GATE_IN_LANE_1",
          toLocation: stay.currentLocation?.fullCode || "A-02-04-2",
          movedAt: stay.gatedInAt,
          movedBy: "Ibrahim N.",
        },
      ],
    });
  }),
);

export const unitsRouter = router;
