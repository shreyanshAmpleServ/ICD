"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const admin_1 = require("../../data/admin");
const core_1 = require("../../data/core");
const search_controller_1 = require("../../v1/controllers/search/search.controller");
const cargo_service_1 = require("../cargo/cargo.service");
const common_1 = require("../../common");
const router = (0, express_1.Router)();
const validateIdentityBodySchema = zod_1.z.object({
    category: zod_1.z
        .enum(["CONTAINER", "VEHICLE_VIN", "BREAKBULK", "CUSTOM"])
        .optional()
        .default("CONTAINER"),
    rawValue: zod_1.z.string().min(1, "Value to validate cannot be empty"),
});
const createUnitTypeSchema = zod_1.z
    .object({
    typeCode: zod_1.z.string().min(1, "Type code is required").optional(),
    unitTypeCode: zod_1.z.string().min(1).optional(),
    typeName: zod_1.z.string().min(1, "Type name is required").optional(),
    category: zod_1.z.string().optional().default("CONTAINER"),
    identityRules: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional().default(true),
})
    .passthrough();
router.get("/unit-types", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), (req, res) => {
    const params = (0, common_1.parsePaginationParams)(req.query);
    const paginated = (0, common_1.paginateArray)(admin_1.unitTypes, params, (u) => u.unitTypeId);
    res.json(paginated);
});
router.post("/unit-types", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (0, common_1.validateBody)(createUnitTypeSchema), (req, res) => {
    const newType = {
        unitTypeId: admin_1.unitTypes.length + 1,
        typeCode: req.body.typeCode ||
            req.body.unitTypeCode ||
            `UT-${admin_1.unitTypes.length + 1}`,
        typeName: req.body.typeName || "Standard Container",
        category: req.body.category || "CONTAINER",
        identityRules: ["ISO_6346"],
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    admin_1.unitTypes.push(newType);
    res.status(201).json(newType);
});
router.get("/unit-types/:unitTypeId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), (req, res) => {
    const item = admin_1.unitTypes.find((u) => String(u.unitTypeId) === req.params.unitTypeId ||
        u.typeCode === req.params.unitTypeId);
    if (!item) {
        throw new common_1.NotFoundError("Unit type", req.params.unitTypeId);
    }
    res.json(item);
});
router.patch("/unit-types/:unitTypeId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const item = admin_1.unitTypes.find((u) => String(u.unitTypeId) === req.params.unitTypeId ||
        u.typeCode === req.params.unitTypeId);
    if (!item) {
        throw new common_1.NotFoundError("Unit type", req.params.unitTypeId);
    }
    Object.assign(item, req.body);
    res.json(item);
});
router.get("/identity-rules", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), (req, res) => {
    const params = (0, common_1.parsePaginationParams)(req.query);
    const paginated = (0, common_1.paginateArray)(admin_1.identityRules, params);
    res.json(paginated);
});
router.post("/identity:validate", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), (0, common_1.validateBody)(validateIdentityBodySchema), (req, res) => {
    const { category, rawValue } = req.body;
    const val = String(rawValue || "")
        .trim()
        .toUpperCase();
    if (category === "CONTAINER") {
        const parseResult = common_1.containerNumberSchema.safeParse(val);
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
        const parseResult = common_1.vinNumberSchema.safeParse(val);
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
});
router.get("/plate-formats", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), (req, res) => {
    const params = (0, common_1.parsePaginationParams)(req.query);
    const paginated = (0, common_1.paginateArray)(admin_1.plateFormats, params);
    res.json(paginated);
});
router.get("/search", (0, siteScope_1.requireSite)(true), search_controller_1.searchController.globalSearch);
router.get("/units", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (0, common_1.asyncHandler)(async (req, res) => {
    const items = await cargo_service_1.cargoService.getUnits(req.query);
    const paginationParams = (0, common_1.parsePaginationParams)(req.query);
    const paginated = (0, common_1.paginateArray)(items, paginationParams, (s) => s.unitStayId);
    res.json(paginated);
}));
router.post("/units", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.edit", "DO"), (0, common_1.asyncHandler)(async (req, res) => {
    const newStay = await cargo_service_1.cargoService.createUnit(req.body);
    res.status(201).json(newStay);
}));
router.get("/units/:unitStayId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (0, common_1.asyncHandler)(async (req, res) => {
    const stay = await cargo_service_1.cargoService.getUnit(req.params.unitStayId);
    if (!stay) {
        throw new common_1.NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json(stay);
}));
router.patch("/units/:unitStayId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.edit", "DO"), (0, common_1.asyncHandler)(async (req, res) => {
    const stay = await cargo_service_1.cargoService.updateUnit(req.params.unitStayId, req.body);
    if (!stay) {
        throw new common_1.NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json(stay);
}));
router.get("/units/:unitStayId/timeline", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (0, common_1.asyncHandler)(async (req, res) => {
    const timeline = await cargo_service_1.cargoService.getUnitTimeline(req.params.unitStayId);
    if (!timeline) {
        throw new common_1.NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json(timeline);
}));
router.get("/cargo-units/:cargoUnitId/stays", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    const stays = core_1.allStays.filter((s) => String(s.cargoUnit?.cargoUnitId) === req.params.cargoUnitId);
    const params = (0, common_1.parsePaginationParams)(req.query);
    const paginated = (0, common_1.paginateArray)(stays, params, (s) => s.unitStayId);
    res.json(paginated);
});
router.get("/units/:unitStayId/holds", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (0, common_1.asyncHandler)(async (req, res) => {
    const holds = await cargo_service_1.cargoService.getHolds({ unitStayId: req.params.unitStayId });
    const params = (0, common_1.parsePaginationParams)(req.query);
    const paginated = (0, common_1.paginateArray)(holds, params);
    res.json(paginated);
}));
router.get("/units/:unitStayId/history", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (0, common_1.asyncHandler)(async (req, res) => {
    const stay = await cargo_service_1.cargoService.getUnit(req.params.unitStayId);
    if (!stay) {
        throw new common_1.NotFoundError("Unit stay", req.params.unitStayId);
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
}));
exports.unitsRouter = router;
