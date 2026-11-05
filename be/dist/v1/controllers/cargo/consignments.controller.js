"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoConsignmentsController = void 0;
const cargo_service_1 = require("../../../modules/cargo/cargo.service");
exports.cargoConsignmentsController = {
    getConsignments: async (req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getConsignments(req.query);
            res.json({ items, nextCursor: null, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getConsignmentById: async (req, res) => {
        try {
            const { consignmentId } = req.params;
            const c = await cargo_service_1.cargoService.getConsignment(consignmentId);
            if (!c)
                return res.status(404).json({ error: 'Consignment not found' });
            res.json(c);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createConsignment: async (req, res) => {
        try {
            const created = await cargo_service_1.cargoService.createConsignment(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateConsignment: async (req, res) => {
        try {
            const { consignmentId } = req.params;
            const updated = await cargo_service_1.cargoService.updateConsignment(consignmentId, req.body);
            if (!updated)
                return res.status(404).json({ error: 'Consignment not found' });
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getConsignmentLines: async (req, res) => {
        try {
            const { consignmentId } = req.params;
            const lines = await cargo_service_1.cargoService.getConsignmentLines(consignmentId);
            res.json({ items: lines, total: lines.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    saveConsignmentLines: async (req, res) => {
        try {
            const { consignmentId } = req.params;
            const lines = Array.isArray(req.body) ? req.body : [req.body];
            const saved = await cargo_service_1.cargoService.saveConsignmentLines(consignmentId, lines);
            res.json({ items: saved, total: saved.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getConsignmentUnits: async (req, res) => {
        try {
            const { consignmentId } = req.params;
            const units = await cargo_service_1.cargoService.getConsignmentUnits(consignmentId);
            res.json({ items: units, total: units.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
