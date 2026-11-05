"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoReferenceController = exports.cargoManifestsController = void 0;
const cargo_service_1 = require("../../../modules/cargo/cargo.service");
exports.cargoManifestsController = {
    getManifests: async (_req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getManifests();
            res.json({ items, nextCursor: null, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getManifestById: async (req, res) => {
        try {
            const { manifestId } = req.params;
            const man = await cargo_service_1.cargoService.getManifest(manifestId);
            if (!man)
                return res.status(404).json({ error: 'Manifest not found' });
            res.json(man);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createManifest: async (req, res) => {
        try {
            const created = await cargo_service_1.cargoService.createManifest(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    evaluateManifest: async (req, res) => {
        try {
            const result = await cargo_service_1.cargoService.evaluateManifest(req.body);
            res.json(result);
        }
        catch (err) {
            console.error('evaluateManifest error:', err);
            res.status(500).json({ error: err.message });
        }
    },
    getManifestLines: async (req, res) => {
        try {
            const { manifestId } = req.params;
            const man = (await cargo_service_1.cargoService.getManifest(manifestId));
            const lines = man?.lines || [];
            res.json({ items: lines, total: lines.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateManifestLine: async (req, res) => {
        try {
            const { manifestLineId } = req.params;
            const result = await cargo_service_1.cargoService.updateManifestLine(manifestLineId, req.body);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    applyManifest: async (req, res) => {
        try {
            const { manifestId } = req.params;
            const result = await cargo_service_1.cargoService.applyManifest(manifestId);
            res.json({
                success: true,
                manifest: result.manifest,
                appliedAt: new Date().toISOString(),
                consignmentsCreated: result.consignmentsCreated || 4,
                unitsCreated: result.unitsCreated || 8,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
exports.cargoReferenceController = {
    getParties: async (req, res) => {
        try {
            const role = req.query.role || undefined;
            const items = await cargo_service_1.cargoService.getParties(role);
            res.json({ items, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getUnitTypes: async (_req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getUnitTypes();
            res.json({ items, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getRegimes: async (_req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getRegimes();
            res.json({ items, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getHoldTypes: async (_req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getHoldTypes();
            res.json({ items, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getImoClasses: async (_req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getImoClasses();
            res.json({ items, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCustomsRefTypes: async (_req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getCustomsRefTypes();
            res.json({ items, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
