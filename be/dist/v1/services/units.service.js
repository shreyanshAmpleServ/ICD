"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitsService = exports.UnitsService = void 0;
const admin_1 = require("../../data/admin");
const core_1 = require("../../data/core");
const control_1 = require("../../data/control");
const search_1 = require("../../data/search");
const prisma_1 = require("../../configs/prisma");
const utils_1 = require("../../utils");
const common_validation_1 = require("../validations/common.validation");
class UnitsService {
    async getUnitTypes(params) {
        return (0, utils_1.paginateArray)(admin_1.unitTypes, params, (u) => u.unitTypeId);
    }
    async createUnitType(body) {
        const newType = {
            unitTypeId: admin_1.unitTypes.length + 1,
            typeCode: body.typeCode || body.unitTypeCode || `UT-${admin_1.unitTypes.length + 1}`,
            typeName: body.typeName || "Standard Container",
            category: body.category || "CONTAINER",
            identityRules: ["ISO_6346"],
            isActive: true,
            logInst: 1,
            ...body,
        };
        admin_1.unitTypes.push(newType);
        return newType;
    }
    async getUnitTypeById(idOrCode) {
        const item = admin_1.unitTypes.find((u) => String(u.unitTypeId) === idOrCode || u.typeCode === idOrCode);
        if (!item) {
            throw new utils_1.NotFoundError("Unit type", idOrCode);
        }
        return item;
    }
    async updateUnitType(idOrCode, body) {
        const item = await this.getUnitTypeById(idOrCode);
        Object.assign(item, body);
        return item;
    }
    async getIdentityRules(params) {
        return (0, utils_1.paginateArray)(admin_1.identityRules, params);
    }
    validateIdentity(category, rawValue) {
        const val = String(rawValue || "")
            .trim()
            .toUpperCase();
        if (category === "CONTAINER") {
            const parseResult = common_validation_1.containerNumberSchema.safeParse(val);
            return {
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
            };
        }
        if (category === "VEHICLE_VIN") {
            const parseResult = common_validation_1.vinNumberSchema.safeParse(val);
            return {
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
            };
        }
        return {
            category: category || "CUSTOM",
            rawValue,
            normalizedValue: val,
            isValid: true,
            ruleApplied: "NONE",
            errors: [],
        };
    }
    async getPlateFormats(params) {
        return (0, utils_1.paginateArray)(admin_1.plateFormats, params);
    }
    searchGlobal(q) {
        const trimmed = String(q || "").trim();
        const results = (0, search_1.search)(trimmed);
        return {
            query: trimmed,
            results,
            total: results.reduce((acc, g) => acc + (g.hits?.length || 0), 0),
        };
    }
    async getUnits(filters, params) {
        let items = core_1.allStays;
        if ((0, prisma_1.isDbLive)()) {
            const prisma = (0, prisma_1.getPrisma)();
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
                            const activeHolds = (u.holds || []).filter((h) => h.status === "ACTIVE").length;
                            const dwell = u.arrived_at
                                ? Math.max(1, Math.floor((Date.now() - new Date(u.arrived_at).getTime()) /
                                    86400000))
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
                            ...core_1.allStays.filter((s) => !dbIds.has(s.cargoUnit.unitNo)),
                        ];
                    }
                }
                catch (err) {
                    console.warn("[UnitsService] DB query fallback to memory:", err.message);
                }
            }
        }
        if (filters.category) {
            items = items.filter((s) => s.cargoUnit?.category === filters.category);
        }
        if (filters.status) {
            items = items.filter((s) => s.physicalStatus === filters.status);
        }
        if (filters.customsStatus) {
            items = items.filter((s) => s.customsStatus === filters.customsStatus);
        }
        if (filters.location) {
            items = items.filter((s) => s.currentLocation?.fullCode?.startsWith(String(filters.location)));
        }
        if (filters.search) {
            const q = String(filters.search).toLowerCase();
            items = items.filter((s) => s.cargoUnit?.unitNo.toLowerCase().includes(q) ||
                s.sealNo?.toLowerCase().includes(q) ||
                s.currentLocation?.fullCode?.toLowerCase().includes(q));
        }
        return (0, utils_1.paginateArray)(items, params, (s) => s.unitStayId);
    }
    /**
     * Retrieves single Unit Stay by ID or UnitNo
     */
    async getUnitStayById(idOrUnitNo) {
        const stay = core_1.allStays.find((x) => String(x.unitStayId) === idOrUnitNo ||
            x.cargoUnit?.unitNo.toUpperCase() === idOrUnitNo.toUpperCase());
        if (!stay) {
            throw new utils_1.NotFoundError("Unit stay", idOrUnitNo);
        }
        return stay;
    }
    async createUnitStay(body) {
        const newStay = {
            unitStayId: core_1.allStays.length + 5001,
            siteId: 1,
            consignmentId: body.consignmentId || 101,
            cargoUnit: {
                cargoUnitId: core_1.allStays.length + 5001,
                category: body.category || "CONTAINER",
                unitNo: body.unitNo || `NEWU${Date.now().toString().slice(-7)}`,
                isoType: body.isoType || "40HC",
                tareWeightKg: body.tareWeightKg || 3800,
            },
            physicalStatus: "EXPECTED",
            flow: body.flow || "IMPORT",
            sealNo: body.sealNo || "SEAL-001",
            customsStatus: "PENDING",
            releaseStatus: "PENDING_CHARGES",
            gatedInAt: new Date().toISOString(),
            logInst: 1,
            ...body,
        };
        core_1.allStays.push(newStay);
        return newStay;
    }
    /**
     * Updates an existing Unit Stay
     */
    async updateUnitStay(idOrUnitNo, body) {
        const stay = await this.getUnitStayById(idOrUnitNo);
        Object.assign(stay, body, { logInst: (stay.logInst || 1) + 1 });
        return stay;
    }
    /**
     * Gets timeline events for a Unit Stay
     */
    async getUnitTimeline(idOrUnitNo) {
        const stay = await this.getUnitStayById(idOrUnitNo);
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
        return {
            unitStayId: stay.unitStayId,
            unitNo: stay.cargoUnit?.unitNo,
            events: timeline,
        };
    }
    /**
     * Gets active holds on a Unit Stay
     */
    async getUnitHolds(idOrUnitNo, params) {
        const stay = await this.getUnitStayById(idOrUnitNo);
        const holds = (0, control_1.holdsOf)(stay.unitStayId || 0);
        return (0, utils_1.paginateArray)(holds, params);
    }
    /**
     * Gets yard moves history
     */
    async getUnitHistory(idOrUnitNo) {
        const stay = await this.getUnitStayById(idOrUnitNo);
        return {
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
        };
    }
}
exports.UnitsService = UnitsService;
exports.unitsService = new UnitsService();
