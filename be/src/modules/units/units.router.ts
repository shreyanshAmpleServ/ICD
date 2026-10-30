import { Router } from "express";
import { z } from "zod";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { unitTypes, identityRules, plateFormats } from "../../data/admin";
import { allStays } from "../../data/core";
import { holdsOf } from "../../data/control";
import { search } from "../../data/search";
import { getPrisma, isDbLive } from "../../db/prisma";
import { cargoService } from "../cargo/cargo.service";
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
    const items = await cargoService.getUnits(req.query);
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
  asyncHandler(async (req, res) => {
    const newStay = await cargoService.createUnit(req.body);
    res.status(201).json(newStay);
  }),
);

router.get(
  "/units/:unitStayId",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const stay = await cargoService.getUnit(req.params.unitStayId);
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
    const stay = await cargoService.updateUnit(req.params.unitStayId, req.body);
    if (!stay) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json(stay);
  }),
);

router.get(
  "/units/:unitStayId/timeline",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const timeline = await cargoService.getUnitTimeline(req.params.unitStayId);
    if (!timeline) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json(timeline);
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
    const holds = await cargoService.getHolds({ unitStayId: req.params.unitStayId });
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
    const stay = await cargoService.getUnit(req.params.unitStayId);
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
