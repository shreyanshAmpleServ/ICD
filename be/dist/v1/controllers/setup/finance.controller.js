"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupFinanceController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupFinanceController = {
    getAccountingPeriods: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getAccountingPeriods();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createAccountingPeriod: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createAccountingPeriod(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateAccountingPeriod: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateAccountingPeriod(req.params.periodId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    closePeriod: async (req, res) => {
        try {
            const periodKey = req.params.periodKey || req.params.accountingPeriodId || req.body.periodKey || req.params.periodId;
            const cleanKey = String(periodKey).replace(':close', '').replace('/close', '');
            const closed = await setup_service_1.setupService.closeAccountingPeriod(cleanKey, req.body.reason);
            res.json(closed);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    reopenPeriod: async (req, res) => {
        try {
            const periodKey = req.params.periodKey || req.params.accountingPeriodId || req.body.periodKey || req.params.periodId;
            const cleanKey = String(periodKey).replace(':reopen', '').replace('/reopen', '');
            const reopened = await setup_service_1.setupService.reopenAccountingPeriod(cleanKey, req.body.reason);
            res.json(reopened);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getChargeCodes: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getChargeCodes();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createChargeCode: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createChargeCode(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateChargeCode: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateChargeCode(req.params.chargeCodeId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getTaxCodes: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getTaxCodes();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createTaxCode: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createTaxCode(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateTaxCode: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateTaxCode(req.params.taxCodeId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPaymentChannels: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getPaymentChannels();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createPaymentChannel: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createPaymentChannel(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updatePaymentChannel: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updatePaymentChannel(req.params.channelId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getGlSettings: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getGlSettings();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createGlSetting: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createGlSetting(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateGlSetting: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateGlSetting(req.params.glSettingId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
