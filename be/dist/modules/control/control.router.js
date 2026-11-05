"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const control_1 = require("../../data/control");
const cargo_1 = require("../../data/cargo");
const admin_1 = require("../../data/admin");
const core_1 = require("../../data/core");
const router = (0, express_1.Router)();
// In-memory resolution codes
let resolutionCodes = [
    {
        resolutionCodeId: 1,
        code: "AUTHORIZED_EXCEPTION",
        name: "Authorized exception override",
        isActive: true,
        logInst: 1,
    },
    {
        resolutionCodeId: 2,
        code: "CORRECTED_DATA",
        name: "Master data or manifest corrected",
        isActive: true,
        logInst: 1,
    },
    {
        resolutionCodeId: 3,
        code: "RELEASE_CONFIRMED",
        name: "Official release confirmation verified",
        isActive: true,
        logInst: 1,
    },
    {
        resolutionCodeId: 4,
        code: "TURNED_BACK",
        name: "Vehicle turned back from terminal",
        isActive: true,
        logInst: 1,
    },
];
// In-memory comments store
const commentsStore = {
    ...cargo_1.exceptionComments,
};
const cargo_service_1 = require("../cargo/cargo.service");
// ------------------------------------------------------------------ 1. Customs (Site-scoped)
router.get("/customs/ref-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    res.json({ items: cargo_1.REF_TYPES, total: cargo_1.REF_TYPES.length, nextCursor: null });
});
router.get(["/customs/refs", "/customs-declarations"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const items = await cargo_service_1.cargoService.getCustomsRefs(req.query);
        res.json({ items, total: items.length, nextCursor: null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/customs/refs", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("customs.ref.edit", "DO"), async (req, res) => {
    try {
        const newRef = await cargo_service_1.cargoService.createCustomsRef(req.body);
        res.status(201).json(newRef);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/customs/refs/:customsRefId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    const ref = control_1.customsRefs.find((c) => String(c.customsRefId) === req.params.customsRefId);
    if (!ref)
        return res.status(404).json({ error: "Customs reference not found" });
    res.json(ref);
});
router.patch("/customs/refs/:customsRefId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("customs.ref.edit", "DO"), (req, res) => {
    const ref = control_1.customsRefs.find((c) => String(c.customsRefId) === req.params.customsRefId);
    if (!ref)
        return res.status(404).json({ error: "Customs reference not found" });
    Object.assign(ref, req.body, { logInst: (ref.logInst || 1) + 1 });
    res.json(ref);
});
router.post("/customs/refs/:customsRefId([0-9a-zA-Z_.-]+):cancel", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("customs.ref.edit", "DO"), (req, res) => {
    const ref = control_1.customsRefs.find((c) => String(c.customsRefId) === req.params.customsRefId);
    if (!ref)
        return res.status(404).json({ error: "Customs reference not found" });
    ref.status = "CANCELLED";
    res.json({ success: true, customsRef: ref });
});
router.get("/exams", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const items = await cargo_service_1.cargoService.getCustomsExams();
        res.json({ items, total: items.length, nextCursor: null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/exams", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("customs.exam.record", "DO"), async (req, res) => {
    try {
        const newExam = await cargo_service_1.cargoService.createCustomsExam(req.body);
        res.status(201).json(newExam);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/exams/:examId([0-9a-zA-Z_.-]+):complete", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("customs.exam.record", "DO"), async (req, res) => {
    try {
        const result = await cargo_service_1.cargoService.completeCustomsExam(req.params.examId, req.body);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ------------------------------------------------------------------ 2. Holds (Site-scoped)
router.get("/hold-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    res.json({ items: control_1.holdTypes, total: control_1.holdTypes.length, nextCursor: null });
});
router.post("/hold-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newHt = {
        holdTypeId: control_1.holdTypes.length + 1,
        holdTypeCode: req.body.holdTypeCode || `HT_${control_1.holdTypes.length + 1}`,
        name: req.body.name || "Custom Hold Type",
        blocksGateOut: req.body.blocksGateOut !== false,
        blocksYardMove: !!req.body.blocksYardMove,
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    control_1.holdTypes.push(newHt);
    res.status(201).json(newHt);
});
router.get("/hold-types/:holdTypeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    const ht = control_1.holdTypes.find((h) => String(h.holdTypeId) === req.params.holdTypeId ||
        h.holdCode === req.params.holdTypeId);
    if (!ht)
        return res.status(404).json({ error: "Hold type not found" });
    res.json(ht);
});
router.patch("/hold-types/:holdTypeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const ht = control_1.holdTypes.find((h) => String(h.holdTypeId) === req.params.holdTypeId ||
        h.holdCode === req.params.holdTypeId);
    if (!ht)
        return res.status(404).json({ error: "Hold type not found" });
    Object.assign(ht, req.body);
    res.json(ht);
});
router.get("/holds", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const items = await cargo_service_1.cargoService.getHolds(req.query);
        res.json({ items, total: items.length, nextCursor: null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post(["/holds", "/holds:place"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("customs.hold.place", "DO"), async (req, res) => {
    try {
        const placed = await cargo_service_1.cargoService.placeHold(req.body, req.user?.username);
        res.status(201).json(Array.isArray(placed) ? placed[0] : placed);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/holds/:holdId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const holds = await cargo_service_1.cargoService.getHolds({});
        const h = holds.find((x) => String(x.holdId) === req.params.holdId);
        if (!h)
            return res.status(404).json({ error: "Hold not found" });
        res.json(h);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/holds/:holdId([0-9a-zA-Z_.-]+):lift", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("customs.hold.lift", "DO"), async (req, res) => {
    try {
        const result = await cargo_service_1.cargoService.liftHold(req.params.holdId, req.body, req.user?.username);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ------------------------------------------------------------------ 3. Release (Site-scoped)
router.get("/release-conditions", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    res.json({
        items: admin_1.releaseConditions,
        total: admin_1.releaseConditions.length,
        nextCursor: null,
    });
});
router.get("/release-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    res.json({
        items: admin_1.releaseRules,
        total: admin_1.releaseRules.length,
        nextCursor: null,
    });
});
router.post("/release-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newRule = {
        releaseRuleId: admin_1.releaseRules.length + 1,
        ruleCode: req.body.ruleCode || `RULE_${admin_1.releaseRules.length + 1}`,
        ruleName: req.body.ruleName || "Standard Clearance Check",
        conditionCode: req.body.conditionCode || "CUSTOMS_CLEARED",
        isMandatory: true,
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    admin_1.releaseRules.push(newRule);
    res.status(201).json(newRule);
});
router.get("/release-rules/:releaseRuleId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    const r = admin_1.releaseRules.find((x) => String(x.releaseRuleId) === req.params.releaseRuleId ||
        x.ruleCode === req.params.releaseRuleId);
    if (!r)
        return res.status(404).json({ error: "Release rule not found" });
    res.json(r);
});
router.patch("/release-rules/:releaseRuleId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const r = admin_1.releaseRules.find((x) => String(x.releaseRuleId) === req.params.releaseRuleId ||
        x.ruleCode === req.params.releaseRuleId);
    if (!r)
        return res.status(404).json({ error: "Release rule not found" });
    Object.assign(r, req.body);
    res.json(r);
});
router.get(["/release-orders", "/releases"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const items = await cargo_service_1.cargoService.getReleaseOrders(req.query);
        res.json({ items, total: items.length, nextCursor: null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post(["/release-orders", "/releases"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("release.issue", "DO"), async (req, res) => {
    try {
        const newRo = await cargo_service_1.cargoService.createReleaseOrder(req.body, req.user?.username);
        res.status(201).json(newRo);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get(["/release-orders/:releaseOrderId", "/releases/:releaseOrderId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const ro = await cargo_service_1.cargoService.getReleaseOrder(req.params.releaseOrderId);
        if (!ro)
            return res.status(404).json({ error: "Release order not found" });
        res.json(ro);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/release-qr/:qrToken", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkout"), async (req, res) => {
    const list = await cargo_service_1.cargoService.getReleaseOrders({});
    const ro = list[0];
    res.json({
        qrToken: req.params.qrToken,
        isValid: true,
        releaseOrderNo: ro?.releaseOrderNo || "RO-DAR1-26-01943",
        status: ro?.status || "APPROVED",
        validTo: ro?.validTo || new Date(Date.now() + 86400000).toISOString(),
        units: ro?.units || ["MSKU 882014 9"],
    });
});
router.post([
    "/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):evaluate",
    "/release-orders:evaluate",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    const unitStayId = req.body.unitStayId || 5001;
    const stay = core_1.allStays.find((s) => s.unitStayId === Number(unitStayId)) || core_1.allStays[0];
    const checks = (0, control_1.evaluate)(stay, "PREVIEW");
    const canRelease = checks.every((c) => c.result === "PASS" || c.result === "NOT_APPLIC");
    res.json({ unitStayId: stay.unitStayId, canRelease, checks });
});
router.post("/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):approve", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("release.issue", "DO"), async (req, res) => {
    try {
        const ro = await cargo_service_1.cargoService.approveReleaseOrder(req.params.releaseOrderId, req.user?.username);
        res.json({ success: true, releaseOrder: ro });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):cancel", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("release.issue", "DO"), async (req, res) => {
    try {
        const ro = await cargo_service_1.cargoService.cancelReleaseOrder(req.params.releaseOrderId);
        res.json({ success: true, releaseOrder: ro });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):revalidate", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("release.issue", "DO"), async (req, res) => {
    try {
        const ro = await cargo_service_1.cargoService.revalidateReleaseOrder(req.params.releaseOrderId);
        res.json({
            success: true,
            releaseOrder: ro,
            message: "Validity extended by 48 hours.",
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+)/units:change", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("release.issue", "DO"), (req, res) => {
    const ro = control_1.releaseOrders.find((r) => String(r.releaseOrderId) === req.params.releaseOrderId);
    if (!ro)
        return res.status(404).json({ error: "Release order not found" });
    ro.units = req.body.units || [];
    res.json({ success: true, releaseOrder: ro });
});
router.post("/gate-out-checks", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkout"), (req, res) => {
    const { unitStayId, truckVisitId } = req.body;
    const stay = core_1.allStays.find((s) => s.unitStayId === Number(unitStayId || 5001)) ||
        core_1.allStays[0];
    const checks = (0, control_1.evaluate)(stay, "GATE_OUT");
    const canExit = checks.every((c) => c.result === "PASS" || c.result === "NOT_APPLIC");
    res.json({
        unitStayId,
        truckVisitId,
        canExit,
        reasons: checks
            .filter((c) => c.result !== "PASS" && c.result !== "NOT_APPLIC")
            .map((c) => c.detail),
        checks,
    });
});
router.get("/units/:unitStayId/gate-out-explanation", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    const stay = core_1.allStays.find((s) => String(s.unitStayId) === req.params.unitStayId) ||
        core_1.allStays[0];
    const checks = (0, control_1.evaluate)(stay, "GATE_OUT");
    res.json({ unitStayId: stay.unitStayId, checks });
});
// ------------------------------------------------------------------ 4. Approvals
router.get("/approvals", (0, siteScope_1.requireSite)(true), (req, res) => {
    const { status, permissionCode, siteId } = req.query;
    const headerSite = req.headers["x-site-id"];
    let items = control_1.approvals;
    if (status)
        items = items.filter((a) => a.status === status);
    if (permissionCode)
        items = items.filter((a) => a.permissionCode === permissionCode);
    const targetSite = (siteId || headerSite);
    if (targetSite && targetSite !== "all" && targetSite !== "ALL") {
        items = items.filter((a) => a.siteId === null ||
            String(a.siteId) === targetSite ||
            (targetSite === "DAR1" && a.siteId === 1));
    }
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/approvals/:approvalRequestId", (0, siteScope_1.requireSite)(false), (req, res) => {
    const app = control_1.approvals.find((a) => String(a.approvalRequestId) === req.params.approvalRequestId);
    if (!app)
        return res.status(404).json({ error: "Approval request not found" });
    res.json(app);
});
router.post("/approvals/:approvalRequestId([0-9a-zA-Z_.-]+):decide", (0, siteScope_1.requireSite)(false), (req, res) => {
    const app = control_1.approvals.find((a) => String(a.approvalRequestId) === req.params.approvalRequestId);
    if (!app)
        return res.status(404).json({ error: "Approval request not found" });
    const decision = req.body.decision || "APPROVE";
    app.status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    app.decidedAt = new Date().toISOString();
    app.decidedBy = req.user?.username || "Approver";
    app.decisionNotes = req.body.notes || "Approved per review";
    res.json({ success: true, approval: app });
});
router.post("/approvals/:approvalRequestId([0-9a-zA-Z_.-]+):cancel", (0, siteScope_1.requireSite)(false), (req, res) => {
    const app = control_1.approvals.find((a) => String(a.approvalRequestId) === req.params.approvalRequestId);
    if (!app)
        return res.status(404).json({ error: "Approval request not found" });
    app.status = "CANCELLED";
    res.json({ success: true, approval: app });
});
router.get("/approval-policies", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), (req, res) => {
    res.json({
        items: admin_1.approvalPolicies,
        total: admin_1.approvalPolicies.length,
        nextCursor: null,
    });
});
router.post("/approval-policies", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newPol = {
        approvalPolicyId: admin_1.approvalPolicies.length + 1,
        policyCode: req.body.policyCode || `POL_${admin_1.approvalPolicies.length + 1}`,
        policyName: req.body.policyName || "Custom Approval Policy",
        thresholdAmount: req.body.thresholdAmount || 1000,
        currency: "USD",
        requiredRole: req.body.requiredRole || "OPS_MANAGER",
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    admin_1.approvalPolicies.push(newPol);
    res.status(201).json(newPol);
});
router.get("/approval-policies/:approvalPolicyId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), (req, res) => {
    const p = admin_1.approvalPolicies.find((x) => String(x.approvalPolicyId) === req.params.approvalPolicyId);
    if (!p)
        return res.status(404).json({ error: "Approval policy not found" });
    res.json(p);
});
router.patch("/approval-policies/:approvalPolicyId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const p = admin_1.approvalPolicies.find((x) => String(x.approvalPolicyId) === req.params.approvalPolicyId);
    if (!p)
        return res.status(404).json({ error: "Approval policy not found" });
    Object.assign(p, req.body);
    res.json(p);
});
router.get("/delegations", (0, siteScope_1.requireSite)(false), (req, res) => {
    res.json({ items: cargo_1.delegations, total: cargo_1.delegations.length, nextCursor: null });
});
router.post("/delegations", (0, siteScope_1.requireSite)(false), (req, res) => {
    const newDel = {
        delegationId: cargo_1.delegations.length + 1,
        fromUserSub: req.body.fromUserSub || "u-daniel",
        fromUserName: req.body.fromUserName || "Ops · Daniel K.",
        toUserSub: req.body.toUserSub || "u-rehema",
        toUserName: req.body.toUserName || "Doc & Clearance · Rehema K.",
        roles: req.body.roles || ["OPS_MANAGER"],
        validFrom: new Date().toISOString(),
        validTo: req.body.validTo || new Date(Date.now() + 604800000).toISOString(),
        status: "ACTIVE",
        logInst: 1,
        ...req.body,
    };
    cargo_1.delegations.push(newDel);
    res.status(201).json(newDel);
});
router.post("/delegations/:delegationId([0-9a-zA-Z_.-]+):revoke", (0, siteScope_1.requireSite)(false), (req, res) => {
    const del = cargo_1.delegations.find((d) => String(d.delegationId) === req.params.delegationId);
    if (!del)
        return res.status(404).json({ error: "Delegation not found" });
    del.status = "REVOKED";
    res.json({ success: true, delegation: del });
});
// ------------------------------------------------------------------ 5. Exceptions (Site-scoped)
router.get("/exception-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.view"), (req, res) => {
    res.json({
        items: admin_1.exceptionTypes,
        total: admin_1.exceptionTypes.length,
        nextCursor: null,
    });
});
router.post("/exception-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newEt = {
        exceptionTypeId: admin_1.exceptionTypes.length + 1,
        code: req.body.code || `EX_${admin_1.exceptionTypes.length + 1}`,
        name: req.body.name || "Custom Exception",
        severity: req.body.severity || "MEDIUM",
        slaMinutes: req.body.slaMinutes || 120,
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    admin_1.exceptionTypes.push(newEt);
    res.status(201).json(newEt);
});
router.get("/exception-types/:exceptionTypeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.view"), (req, res) => {
    const et = admin_1.exceptionTypes.find((x) => String(x.exceptionTypeId) === req.params.exceptionTypeId ||
        x.code === req.params.exceptionTypeId);
    if (!et)
        return res.status(404).json({ error: "Exception type not found" });
    res.json(et);
});
router.patch("/exception-types/:exceptionTypeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const et = admin_1.exceptionTypes.find((x) => String(x.exceptionTypeId) === req.params.exceptionTypeId ||
        x.code === req.params.exceptionTypeId);
    if (!et)
        return res.status(404).json({ error: "Exception type not found" });
    Object.assign(et, req.body);
    res.json(et);
});
router.get("/resolution-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.view"), (req, res) => {
    res.json({
        items: resolutionCodes,
        total: resolutionCodes.length,
        nextCursor: null,
    });
});
router.post("/resolution-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newRc = {
        resolutionCodeId: resolutionCodes.length + 1,
        code: req.body.code || `RES_${resolutionCodes.length + 1}`,
        name: req.body.name || "Custom Resolution",
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    resolutionCodes.push(newRc);
    res.status(201).json(newRc);
});
router.get("/resolution-codes/:resolutionCodeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.view"), (req, res) => {
    const rc = resolutionCodes.find((x) => String(x.resolutionCodeId) === req.params.resolutionCodeId ||
        x.code === req.params.resolutionCodeId);
    if (!rc)
        return res.status(404).json({ error: "Resolution code not found" });
    res.json(rc);
});
router.patch("/resolution-codes/:resolutionCodeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const rc = resolutionCodes.find((x) => String(x.resolutionCodeId) === req.params.resolutionCodeId ||
        x.code === req.params.resolutionCodeId);
    if (!rc)
        return res.status(404).json({ error: "Resolution code not found" });
    Object.assign(rc, req.body);
    res.json(rc);
});
router.get("/exceptions", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.view"), (req, res) => {
    const { status, severity } = req.query;
    let items = control_1.exceptions;
    if (status)
        items = items.filter((e) => e.status === status);
    if (severity)
        items = items.filter((e) => e.severity === severity);
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/exceptions", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.manage", "DO"), (req, res) => {
    const newEx = {
        exceptionCaseId: control_1.exceptions.length + 1001,
        caseNo: `EX-26-0${control_1.exceptions.length + 882}`,
        exceptionType: req.body.exceptionType || "SEAL_MISMATCH",
        severity: req.body.severity || "HIGH",
        status: "OPEN",
        entityName: req.body.entityName || "unit_stay",
        entityId: req.body.entityId || "5001",
        description: req.body.description || "Discrepancy observed at gate",
        openedAt: new Date().toISOString(),
        openedBy: req.user?.username || "Gate Officer",
        assignedRole: "OPS_MANAGER",
        logInst: 1,
        ...req.body,
    };
    control_1.exceptions.push(newEx);
    res.status(201).json(newEx);
});
router.get("/exceptions/:exceptionCaseId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.view"), (req, res) => {
    const ex = control_1.exceptions.find((e) => String(e.exceptionCaseId) === req.params.exceptionCaseId ||
        e.caseNo === req.params.exceptionCaseId);
    if (!ex)
        return res.status(404).json({ error: "Exception case not found" });
    res.json(ex);
});
router.post("/exceptions/:exceptionCaseId([0-9a-zA-Z_.-]+):assign", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.manage", "DO"), (req, res) => {
    const ex = control_1.exceptions.find((e) => String(e.exceptionCaseId) === req.params.exceptionCaseId ||
        e.caseNo === req.params.exceptionCaseId);
    if (!ex)
        return res.status(404).json({ error: "Exception case not found" });
    ex.assignedTo = req.body.assignedTo || req.body.assignee;
    ex.assignedRole = req.body.assignedRole || "OPS_MANAGER";
    res.json({ success: true, exception: ex });
});
router.get("/exceptions/:exceptionCaseId/comments", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.view"), (req, res) => {
    const comments = commentsStore[req.params.exceptionCaseId] || [
        {
            commentId: 1,
            exceptionCaseId: Number(req.params.exceptionCaseId),
            author: "System",
            text: "Case registered automatically from checkpoint alert",
            createdAt: new Date().toISOString(),
        },
    ];
    res.json({ items: comments, total: comments.length, nextCursor: null });
});
router.post("/exceptions/:exceptionCaseId/comments", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.view"), (req, res) => {
    if (!commentsStore[req.params.exceptionCaseId])
        commentsStore[req.params.exceptionCaseId] = [];
    const comment = {
        commentId: Date.now(),
        exceptionCaseId: Number(req.params.exceptionCaseId),
        author: req.user?.username || "Current User",
        text: req.body.text || req.body.comment || "",
        createdAt: new Date().toISOString(),
    };
    commentsStore[req.params.exceptionCaseId].push(comment);
    res.status(201).json(comment);
});
router.post("/exceptions/:exceptionCaseId([0-9a-zA-Z_.-]+):resolve", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.manage", "DO"), (req, res) => {
    const ex = control_1.exceptions.find((e) => String(e.exceptionCaseId) === req.params.exceptionCaseId ||
        e.caseNo === req.params.exceptionCaseId);
    if (!ex)
        return res.status(404).json({ error: "Exception case not found" });
    ex.status = "RESOLVED";
    ex.resolutionCode = req.body.resolutionCode || "AUTHORIZED_EXCEPTION";
    ex.resolutionNotes = req.body.notes || "Resolved and logged";
    ex.resolvedAt = new Date().toISOString();
    ex.resolvedBy = req.user?.username || "OPS_MANAGER";
    res.json({ success: true, exception: ex });
});
router.post("/exceptions/:exceptionCaseId([0-9a-zA-Z_.-]+):close", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.manage", "DO"), (req, res) => {
    const ex = control_1.exceptions.find((e) => String(e.exceptionCaseId) === req.params.exceptionCaseId ||
        e.caseNo === req.params.exceptionCaseId);
    if (!ex)
        return res.status(404).json({ error: "Exception case not found" });
    ex.status = "CLOSED";
    ex.closedAt = new Date().toISOString();
    res.json({ success: true, exception: ex });
});
router.post("/exceptions/:exceptionCaseId([0-9a-zA-Z_.-]+):reopen", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("exception.manage", "DO"), (req, res) => {
    const ex = control_1.exceptions.find((e) => String(e.exceptionCaseId) === req.params.exceptionCaseId ||
        e.caseNo === req.params.exceptionCaseId);
    if (!ex)
        return res.status(404).json({ error: "Exception case not found" });
    ex.status = "OPEN";
    res.json({ success: true, exception: ex });
});
// ------------------------------------------------------------------ Dangerous Goods (Global 🌐)
router.get(["/dg-classes", "/dg-lines"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const items = await cargo_service_1.cargoService.getDgLines();
        res.json({ items, total: items.length, nextCursor: null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.controlRouter = router;
