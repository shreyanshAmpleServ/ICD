"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoCustomsController = void 0;
const cargo_service_1 = require("../../../modules/cargo/cargo.service");
exports.cargoCustomsController = {
    getCustomsRefs: async (req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getCustomsRefs(req.query);
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createCustomsRef: async (req, res) => {
        try {
            const created = await cargo_service_1.cargoService.createCustomsRef(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getExams: async (_req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getCustomsExams();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createExam: async (req, res) => {
        try {
            const created = await cargo_service_1.cargoService.createCustomsExam(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
