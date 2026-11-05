"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoVesselCallsController = void 0;
const cargo_service_1 = require("../../../modules/cargo/cargo.service");
exports.cargoVesselCallsController = {
    getVesselCalls: async (req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getVesselCalls(req.query);
            res.json({ items, nextCursor: null, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getVesselCallById: async (req, res) => {
        try {
            const { vesselCallId } = req.params;
            const call = await cargo_service_1.cargoService.getVesselCall(vesselCallId);
            if (!call)
                return res.status(404).json({ error: 'Vessel call not found' });
            res.json(call);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createVesselCall: async (req, res) => {
        try {
            const created = await cargo_service_1.cargoService.createVesselCall(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateVesselCall: async (req, res) => {
        try {
            const { vesselCallId } = req.params;
            const updated = await cargo_service_1.cargoService.updateVesselCall(vesselCallId, req.body);
            if (!updated)
                return res.status(404).json({ error: 'Vessel call not found' });
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
