"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDocumentsController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupDocumentsController = {
    getNumberSequences: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getNumberSequences();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createNumberSequence: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createNumberSequence(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateNumberSequence: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateNumberSequence(req.params.sequenceId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getDocumentTypes: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getDocumentTypes();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createDocumentType: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createDocumentType(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateDocumentType: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateDocumentType(req.params.documentTypeId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
