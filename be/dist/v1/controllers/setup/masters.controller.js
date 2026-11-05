"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMastersController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupMastersController = {
    getTrucks: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getTrucks();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createTruck: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createTruck(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateTruck: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateTruck(req.params.truckId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getDrivers: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getDrivers();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createDriver: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createDriver(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateDriver: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateDriver(req.params.driverId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getVessels: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getVessels();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createVessel: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createVessel(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateVessel: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateVessel(req.params.vesselId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPorts: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getPorts();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createPort: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createPort(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updatePort: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updatePort(req.params.portId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCommodities: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getCommodities();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createCommodity: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createCommodity(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateCommodity: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateCommodity(req.params.commodityId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getEquipment: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getEquipment();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createEquipment: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createEquipment(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateEquipment: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateEquipment(req.params.equipmentId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
