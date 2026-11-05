"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const admin_1 = require("../../data/admin");
const cargo_service_1 = require("./cargo.service");
const router = (0, express_1.Router)();
// ------------------------------------------------------------------ Vessel Calls (Global 🌐)
router.get("/vessel-calls", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const items = await cargo_service_1.cargoService.getVesselCalls(req.query);
        res.json({ items, nextCursor: null, total: items.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/vessel-calls", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.edit", "DO"), async (req, res) => {
    try {
        const newCall = await cargo_service_1.cargoService.createVesselCall(req.body);
        res.status(201).json(newCall);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/vessel-calls/:vesselCallId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const call = await cargo_service_1.cargoService.getVesselCall(req.params.vesselCallId);
        if (!call)
            return res.status(404).json({ error: "Vessel call not found" });
        res.json(call);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/vessel-calls/:vesselCallId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.edit", "DO"), async (req, res) => {
    try {
        const updated = await cargo_service_1.cargoService.updateVesselCall(req.params.vesselCallId, req.body);
        if (!updated)
            return res.status(404).json({ error: "Vessel call not found" });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ------------------------------------------------------------------ Manifests (Global 🌐)
router.get("/manifests", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("manifest.import"), async (req, res) => {
    try {
        const items = await cargo_service_1.cargoService.getManifests();
        res.json({ items, nextCursor: null, total: items.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post(["/manifests", "/manifests:import"], (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("manifest.import", "DO"), async (req, res) => {
    try {
        const newMan = await cargo_service_1.cargoService.createManifest(req.body);
        res.status(201).json(newMan);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/manifests/:manifestId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("manifest.import"), async (req, res) => {
    try {
        const man = await cargo_service_1.cargoService.getManifest(req.params.manifestId);
        if (!man)
            return res.status(404).json({ error: "Manifest not found" });
        res.json(man);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/manifests/:manifestId/lines", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("manifest.import"), async (req, res) => {
    try {
        const man = (await cargo_service_1.cargoService.getManifest(req.params.manifestId));
        const lines = man?.lines || [];
        res.json({ items: lines, total: lines.length, nextCursor: null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/manifests/:manifestId/lines/:manifestLineId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("manifest.import", "DO"), async (req, res) => {
    try {
        const result = await cargo_service_1.cargoService.updateManifestLine(req.params.manifestLineId, req.body);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/manifests/:manifestId([0-9a-zA-Z_.-]+):apply", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("manifest.import", "DO"), async (req, res) => {
    try {
        const result = await cargo_service_1.cargoService.applyManifest(req.params.manifestId);
        res.json({
            success: true,
            manifest: result.manifest,
            appliedAt: new Date().toISOString(),
            consignmentsCreated: 4,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/manifests/:manifestId([0-9a-zA-Z_.-]+):cancel", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("manifest.import", "DO"), async (req, res) => {
    res.json({
        success: true,
        cancelledAt: new Date().toISOString(),
    });
});
// ------------------------------------------------------------------ Consignments (Global 🌐)
router.get("/consignments", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const items = await cargo_service_1.cargoService.getConsignments(req.query);
        res.json({ items, nextCursor: null, total: items.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/consignments", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.edit", "DO"), async (req, res) => {
    try {
        const newC = await cargo_service_1.cargoService.createConsignment(req.body);
        res.status(201).json(newC);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/consignments/:consignmentId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const c = await cargo_service_1.cargoService.getConsignment(req.params.consignmentId);
        if (!c)
            return res.status(404).json({ error: "Consignment not found" });
        res.json(c);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch("/consignments/:consignmentId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.edit", "DO"), async (req, res) => {
    try {
        const updated = await cargo_service_1.cargoService.updateConsignment(req.params.consignmentId, req.body);
        if (!updated)
            return res.status(404).json({ error: "Consignment not found" });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/consignments/:consignmentId/lines", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const lines = await cargo_service_1.cargoService.getConsignmentLines(req.params.consignmentId);
        res.json({ items: lines, total: lines.length, nextCursor: null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put("/consignments/:consignmentId/lines", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.edit", "DO"), async (req, res) => {
    try {
        const lines = Array.isArray(req.body) ? req.body : [req.body];
        const saved = await cargo_service_1.cargoService.saveConsignmentLines(req.params.consignmentId, lines);
        res.json({ items: saved, total: saved.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/consignments/:consignmentId/units", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const units = await cargo_service_1.cargoService.getConsignmentUnits(req.params.consignmentId);
        res.json({ items: units, total: units.length, nextCursor: null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ------------------------------------------------------------------ Cargo Regimes (Global 🌐)
router.get("/cargo-regimes", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), (req, res) => {
    res.json({
        items: admin_1.cargoRegimes,
        total: admin_1.cargoRegimes.length,
        nextCursor: null,
    });
});
router.get("/cargo-regimes/:regimeCode", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), (req, res) => {
    const item = admin_1.cargoRegimes.find((r) => r.regimeCode === req.params.regimeCode ||
        String(r.cargoRegimeId) === req.params.regimeCode);
    if (!item)
        return res.status(404).json({ error: "Cargo regime not found" });
    res.json(item);
});
// ------------------------------------------------------------------ Dangerous Goods (Global 🌐)
router.get("/dg-lines", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const items = await cargo_service_1.cargoService.getDgLines();
        res.json({ items, total: items.length, nextCursor: null });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/units/:unitStayId/dg-lines", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), async (req, res) => {
    try {
        const all = await cargo_service_1.cargoService.getDgLines();
        const items = all.filter((l) => String(l.unitStayId) === req.params.unitStayId);
        res.json({ items, total: items.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put("/units/:unitStayId/dg-lines", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.edit", "DO"), async (req, res) => {
    try {
        const lines = Array.isArray(req.body) ? req.body : [req.body];
        const saved = await cargo_service_1.cargoService.saveDgLines(req.params.unitStayId, lines);
        res.json({ items: saved, total: saved.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.cargoRouter = router;
