"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoReleasesController = void 0;
const cargo_service_1 = require("../../../modules/cargo/cargo.service");
exports.cargoReleasesController = {
    getReleaseOrders: async (req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getReleaseOrders(req.query);
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getReleaseOrderById: async (req, res) => {
        try {
            const { releaseOrderId } = req.params;
            const order = await cargo_service_1.cargoService.getReleaseOrder(releaseOrderId);
            if (!order)
                return res.status(404).json({ error: 'Release order not found' });
            res.json(order);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createReleaseOrder: async (req, res) => {
        try {
            const username = req.user?.username || 'Release Officer';
            const created = await cargo_service_1.cargoService.createReleaseOrder(req.body, username);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    approveReleaseOrder: async (req, res) => {
        try {
            const { releaseOrderId } = req.params;
            const username = req.user?.username || 'Terminal Manager';
            const result = await cargo_service_1.cargoService.approveReleaseOrder(releaseOrderId, username);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    cancelReleaseOrder: async (req, res) => {
        try {
            const { releaseOrderId } = req.params;
            const { reason } = req.body;
            const result = await cargo_service_1.cargoService.cancelReleaseOrder(releaseOrderId, reason);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    revalidateReleaseOrder: async (req, res) => {
        try {
            const { releaseOrderId } = req.params;
            const { validTo } = req.body;
            const result = await cargo_service_1.cargoService.revalidateReleaseOrder(releaseOrderId, validTo);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
