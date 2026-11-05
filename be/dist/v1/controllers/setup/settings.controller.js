"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSettingsController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupSettingsController = {
    getFieldRules: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getFieldRules();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createFieldRule: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createFieldRule(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateFieldRule: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateFieldRule(req.params.fieldRuleId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deleteFieldRule: async (req, res) => {
        try {
            const result = await setup_service_1.setupService.deleteFieldRule(Number(req.params.fieldRuleId));
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCalendars: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getCalendars();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createCalendar: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createCalendar(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateCalendar: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateCalendar(req.params.calendarId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getHolidays: async (req, res) => {
        try {
            const items = await setup_service_1.setupService.getHolidays(Number(req.params.calendarId));
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createHoliday: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.addHoliday(Number(req.params.calendarId) || 1, req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateHoliday: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateHoliday(req.params.holidayId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deleteHoliday: async (req, res) => {
        try {
            const result = await setup_service_1.setupService.deleteHoliday(Number(req.params.calendarId) || 1, Number(req.params.holidayId) || Number(req.params.calendarHolidayId));
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
