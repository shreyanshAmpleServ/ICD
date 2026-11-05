"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoHoldsController = void 0;
const cargo_service_1 = require("../../../modules/cargo/cargo.service");
exports.cargoHoldsController = {
    getHolds: async (req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getHolds(req.query);
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createHold: async (req, res) => {
        try {
            const username = req.user?.username || 'Customs Officer';
            const created = await cargo_service_1.cargoService.createHold(req.body, username);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    releaseHold: async (req, res) => {
        try {
            const { holdId } = req.params;
            const username = req.user?.username || 'Customs Officer';
            const result = await cargo_service_1.cargoService.releaseHold(holdId, username, req.body.reason);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
