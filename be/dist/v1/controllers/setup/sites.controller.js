"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSitesController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupSitesController = {
    getCompanies: async (_req, res) => {
        try {
            const comp = await setup_service_1.setupService.getCompany();
            const items = comp ? [comp] : [];
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createCompany: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createCompany(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateCompany: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateCompany(Number(req.params.companyId), req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getSites: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getSites();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createSite: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createSite(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateSite: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateSite(req.params.siteId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCountryPacks: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getCountryPacks();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createCountryPack: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createCountryPack(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateCountryPack: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateCountryPack(req.params.countryCode, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
