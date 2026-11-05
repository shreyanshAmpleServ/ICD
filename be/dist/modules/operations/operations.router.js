"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.operationsRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const admin_1 = require("../../data/admin");
const ops_1 = require("../../data/ops");
const prisma_1 = require("../../db/prisma");
const router = (0, express_1.Router)();
// In-memory inspection templates
let templates = admin_1.inspectionTemplates.map((t, i) => ({
    inspectionTemplateId: t.inspectionTemplateId || i + 1,
    templateCode: t.templateCode,
    templateName: t.templateName,
    applicableTo: t.inspectionKind || "GATE_IN",
    items: t.items,
    isActive: true,
    logInst: 1,
}));
// In-memory damage codes
let allDamageCodes = admin_1.damageCodes.map((d, i) => ({
    damageCodeId: i + 1,
    damageCode: d.damageCode,
    damageName: d.damageName,
    appliesTo: d.appliesTo,
    standardHours: 2.5,
    isActive: true,
    logInst: 1,
}));
// In-memory key movements store
const keyMovementsStore = {
    "1": [
        {
            movementId: 1,
            keyCustodyId: 1,
            action: "RECEIVED_AT_GATE",
            performedBy: "Gate Officer",
            performedAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
            movementId: 2,
            keyCustodyId: 1,
            action: "DEPOSITED_KEY_BOARD",
            performedBy: "Yard Driver",
            performedAt: new Date(Date.now() - 3600000).toISOString(),
        },
    ],
};
// ------------------------------------------------------------------ Inspections (Site-scoped)
router.get("/inspection-templates", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("inspection.perform"), (req, res) => {
    res.json({ items: templates, total: templates.length, nextCursor: null });
});
router.post("/inspection-templates", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newT = {
        inspectionTemplateId: templates.length + 1,
        templateCode: req.body.templateCode || `TMPL_${templates.length + 1}`,
        templateName: req.body.templateName || "Custom Inspection",
        applicableTo: req.body.applicableTo || "GATE_IN",
        items: req.body.items || [],
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    templates.push(newT);
    res.status(201).json(newT);
});
router.get("/inspection-templates/:inspectionTemplateId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("inspection.perform"), (req, res) => {
    const t = templates.find((x) => String(x.inspectionTemplateId) === req.params.inspectionTemplateId ||
        x.templateCode === req.params.inspectionTemplateId);
    if (!t)
        return res.status(404).json({ error: "Inspection template not found" });
    res.json(t);
});
router.patch("/inspection-templates/:inspectionTemplateId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const t = templates.find((x) => String(x.inspectionTemplateId) === req.params.inspectionTemplateId ||
        x.templateCode === req.params.inspectionTemplateId);
    if (!t)
        return res.status(404).json({ error: "Inspection template not found" });
    Object.assign(t, req.body, { logInst: t.logInst + 1 });
    res.json(t);
});
router.get("/damage-codes", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("inspection.perform"), (req, res) => {
    res.json({
        items: allDamageCodes,
        total: allDamageCodes.length,
        nextCursor: null,
    });
});
router.post("/damage-codes", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newDc = {
        damageCodeId: allDamageCodes.length + 1,
        damageCode: req.body.damageCode || `DC_${allDamageCodes.length + 1}`,
        component: req.body.component || "PANEL",
        damageType: req.body.damageType || "DENT",
        severity: req.body.severity || "MINOR",
        standardHours: req.body.standardHours || 1.0,
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    allDamageCodes.push(newDc);
    res.status(201).json(newDc);
});
router.get("/damage-codes/:damageCodeId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("inspection.perform"), (req, res) => {
    const dc = allDamageCodes.find((x) => String(x.damageCodeId) === req.params.damageCodeId ||
        x.damageCode === req.params.damageCodeId);
    if (!dc)
        return res.status(404).json({ error: "Damage code not found" });
    res.json(dc);
});
router.patch("/damage-codes/:damageCodeId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const dc = allDamageCodes.find((x) => String(x.damageCodeId) === req.params.damageCodeId ||
        x.damageCode === req.params.damageCodeId);
    if (!dc)
        return res.status(404).json({ error: "Damage code not found" });
    Object.assign(dc, req.body, { logInst: dc.logInst + 1 });
    res.json(dc);
});
router.get("/inspections", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("inspection.perform"), async (req, res) => {
    const { unitNo, status } = req.query;
    let items = ops_1.inspections;
    if ((0, prisma_1.isDbLive)()) {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            try {
                const dbInsps = await prisma.inspections.findMany({
                    include: {
                        unit_stays: true,
                        inspection_findings: true,
                        users: true,
                    },
                    orderBy: { inspection_id: "desc" },
                });
                if (dbInsps && dbInsps.length > 0) {
                    const mapped = dbInsps.map((i) => ({
                        inspectionId: i.inspection_id,
                        siteId: i.site_id || 1,
                        unitStayId: i.unit_stay_id,
                        unitNo: i.unit_stays?.unit_no || "MSKU 882014 9",
                        inspectionKind: i.inspection_type || "GATE_IN",
                        status: i.status || "COMPLETED",
                        condition: i.condition_status || "SOUND",
                        inspectorName: i.users?.user_name || "Ashok Kumar",
                        startedAt: i.inspected_at?.toISOString() || new Date().toISOString(),
                        completedAt: i.inspected_at?.toISOString() || new Date().toISOString(),
                        approvalNeeded: false,
                        findings: (i.inspection_findings || []).map((f) => ({
                            damageCode: f.damage_code || "SCRATCH",
                            component: f.area || "EXTERIOR",
                            severity: f.severity || "LOW",
                            standardHours: 1.5,
                            remarks: f.remarks,
                        })),
                    }));
                    const dbIds = new Set(mapped.map((m) => m.inspectionId));
                    items = [
                        ...mapped,
                        ...ops_1.inspections.filter((ip) => !dbIds.has(ip.inspectionId)),
                    ];
                }
            }
            catch (err) {
                console.warn("[OpsRouter] DB query error on inspections:", err);
            }
        }
    }
    if (unitNo) {
        items = items.filter((i) => i.unitNo?.toLowerCase().includes(String(unitNo).toLowerCase()));
    }
    if (status) {
        items = items.filter((i) => i.status === status);
    }
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/inspections", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("inspection.perform", "DO"), (req, res) => {
    const newInsp = {
        inspectionId: ops_1.inspections.length + 8001,
        unitStayId: req.body.unitStayId || 5001,
        unitNo: req.body.unitNo || "MSKU 000000 0",
        status: "IN_PROGRESS",
        inspectorName: req.body.inspectorName || "Juma M.",
        inspectedAt: new Date().toISOString(),
        findings: req.body.findings || [],
        hasDamage: (req.body.findings || []).length > 0,
        logInst: 1,
        ...req.body,
    };
    ops_1.inspections.push(newInsp);
    res.status(201).json(newInsp);
});
router.get("/inspections/:inspectionId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("inspection.perform"), (req, res) => {
    const insp = ops_1.inspections.find((x) => String(x.inspectionId) === req.params.inspectionId);
    if (!insp)
        return res.status(404).json({ error: "Inspection not found" });
    res.json(insp);
});
router.put("/inspections/:inspectionId/results", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("inspection.perform", "DO"), (req, res) => {
    const insp = ops_1.inspections.find((x) => String(x.inspectionId) === req.params.inspectionId);
    if (!insp)
        return res.status(404).json({ error: "Inspection not found" });
    insp.results = req.body;
    res.json({ success: true, inspection: insp });
});
router.post("/inspections/:inspectionId/findings", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("inspection.perform", "DO"), (req, res) => {
    const insp = ops_1.inspections.find((x) => String(x.inspectionId) === req.params.inspectionId);
    if (!insp)
        return res.status(404).json({ error: "Inspection not found" });
    if (!insp.findings)
        insp.findings = [];
    const finding = {
        inspectionFindingId: insp.findings.length + 1,
        damageCode: req.body.damageCode || "PANEL_DENT",
        locationOnUnit: req.body.locationOnUnit || "RIGHT_FRONT",
        severity: req.body.severity || "MINOR",
        photos: req.body.photos || [],
        ...req.body,
    };
    insp.findings.push(finding);
    insp.hasDamage = true;
    res.status(201).json(finding);
});
router.delete("/inspections/:inspectionId/findings/:inspectionFindingId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("inspection.perform", "DO"), (req, res) => {
    const insp = ops_1.inspections.find((x) => String(x.inspectionId) === req.params.inspectionId);
    if (!insp)
        return res.status(404).json({ error: "Inspection not found" });
    if (insp.findings) {
        const idx = insp.findings.findIndex((f) => String(f.inspectionFindingId) === req.params.inspectionFindingId);
        if (idx >= 0)
            insp.findings.splice(idx, 1);
    }
    res.status(204).end();
});
router.post("/inspections/:inspectionId([0-9a-zA-Z_.-]+):complete", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("inspection.perform", "DO"), (req, res) => {
    const insp = ops_1.inspections.find((x) => String(x.inspectionId) === req.params.inspectionId);
    if (!insp)
        return res.status(404).json({ error: "Inspection not found" });
    insp.status = "COMPLETED";
    insp.completedAt = new Date().toISOString();
    res.json({ success: true, inspection: insp });
});
router.post("/inspections/:inspectionId([0-9a-zA-Z_.-]+):approve", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("inspection.damage.approve", "DO"), (req, res) => {
    const insp = ops_1.inspections.find((x) => String(x.inspectionId) === req.params.inspectionId);
    if (!insp)
        return res.status(404).json({ error: "Inspection not found" });
    insp.status = "APPROVED";
    insp.approvedBy = req.user?.username || "OPS_MANAGER";
    insp.approvedAt = new Date().toISOString();
    res.json({ success: true, inspection: insp });
});
router.get(["/weighings", "/weighbridge/tickets"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("weighbridge.ticket"), async (req, res) => {
    let items = ops_1.tickets;
    if ((0, prisma_1.isDbLive)()) {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            try {
                const dbTickets = await prisma.weighing_tickets.findMany({
                    include: {
                        truck_visits: {
                            include: { trucks: true },
                        },
                    },
                    orderBy: { weighing_ticket_id: "desc" },
                });
                if (dbTickets && dbTickets.length > 0) {
                    const mapped = dbTickets.map((t) => {
                        const gross = Number(t.gross_weight_kg ?? 37300);
                        const tare = Number(t.tare_weight_kg ?? 8500);
                        const net = Number(t.net_weight_kg ?? gross - tare);
                        const declared = net;
                        return {
                            ticketId: t.weighing_ticket_id,
                            ticketNo: `WT-DAR1-${String(t.weighing_ticket_id).padStart(6, "0")}`,
                            scaleNo: 1,
                            truckVisitId: t.truck_visit_id || 4411,
                            plateNo: t.truck_visits?.trucks?.plate_no || "T 118 DPE",
                            kind: "IN",
                            source: "DEVICE",
                            grossKg: gross,
                            tareKg: tare,
                            ctrTareKg: 3750,
                            netKg: net,
                            declaredKg: declared,
                            varianceKg: 0,
                            variancePct: 0,
                            status: "OK",
                            weighedAt: t.weighed_at?.toISOString() || new Date().toISOString(),
                            logInst: 1,
                        };
                    });
                    const dbIds = new Set(mapped.map((m) => m.ticketId));
                    items = [
                        ...mapped,
                        ...ops_1.tickets.filter((tk) => !dbIds.has(tk.ticketId)),
                    ];
                }
            }
            catch (err) {
                console.warn("[OpsRouter] DB query error on weighings:", err);
            }
        }
    }
    res.json({ items, total: items.length, nextCursor: null });
});
router.post(["/weighings", "/weighbridge/tickets"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("weighbridge.ticket", "DO"), (req, res) => {
    const newTicket = {
        weighingId: ops_1.tickets.length + 7001,
        ticketId: ops_1.tickets.length + 7001,
        ticketNo: `WT-DAR1-${String(Date.now()).slice(-6)}`,
        scaleNo: req.body.scaleNo || 1,
        plateNo: req.body.plateNo || "T 124 DFH",
        grossWeightKg: req.body.grossWeightKg || 28450,
        tareWeightKg: req.body.tareWeightKg || 8200,
        netWeightKg: (req.body.grossWeightKg || 28450) - (req.body.tareWeightKg || 8200),
        weighedAt: new Date().toISOString(),
        weighedBy: req.user?.username || "Weighbridge Officer",
        status: "COMPLETED",
        logInst: 1,
        ...req.body,
    };
    ops_1.tickets.push(newTicket);
    res.status(201).json(newTicket);
});
router.get(["/weighings/:weighingId", "/weighbridge/tickets/:weighingId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("weighbridge.ticket"), (req, res) => {
    const t = ops_1.tickets.find((x) => String(x.weighingId) === req.params.weighingId ||
        String(x.ticketId) === req.params.weighingId ||
        x.ticketNo === req.params.weighingId);
    if (!t)
        return res.status(404).json({ error: "Weighing ticket not found" });
    res.json(t);
});
// ------------------------------------------------------------------ Key Custody (Site-scoped)
router.get(["/keys", "/vehicle-keys"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("yard.key.custody"), (req, res) => {
    res.json({ items: ops_1.keys, total: ops_1.keys.length, nextCursor: null });
});
router.post("/keys", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("yard.key.custody", "DO"), (req, res) => {
    const newKey = {
        keyCustodyId: ops_1.keys.length + 1,
        keyTag: req.body.keyTag || `KEY-${ops_1.keys.length + 1}`,
        vin: req.body.vin || "VIN1234567890ABCD",
        hookNo: req.body.hookNo || `H-${ops_1.keys.length + 1}`,
        status: "IN_BOARD",
        logInst: 1,
        ...req.body,
    };
    ops_1.keys.push(newKey);
    res.status(201).json(newKey);
});
router.get("/keys/:keyCustodyId/movements", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("yard.key.custody"), (req, res) => {
    const movs = keyMovementsStore[req.params.keyCustodyId] || [
        {
            movementId: 1,
            keyCustodyId: Number(req.params.keyCustodyId),
            action: "RECEIVED",
            performedBy: "Gate Officer",
            performedAt: new Date().toISOString(),
        },
    ];
    res.json({ items: movs, total: movs.length, nextCursor: null });
});
router.post([
    "/keys/:keyCustodyId/movements",
    "/vehicle-keys/:keyCustodyId([0-9a-zA-Z_.-]+):custody",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("yard.key.custody", "DO"), (req, res) => {
    const mov = {
        movementId: Date.now(),
        keyCustodyId: Number(req.params.keyCustodyId),
        action: req.body.action || "CHECKOUT_TO_DRIVER",
        recipientName: req.body.recipientName || "Driver",
        performedBy: req.user?.username || "Key Custodian",
        performedAt: new Date().toISOString(),
    };
    if (!keyMovementsStore[req.params.keyCustodyId])
        keyMovementsStore[req.params.keyCustodyId] = [];
    keyMovementsStore[req.params.keyCustodyId].push(mov);
    res.status(201).json(mov);
});
exports.operationsRouter = router;
