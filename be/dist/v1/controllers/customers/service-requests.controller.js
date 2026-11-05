"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerServiceRequestsController = void 0;
const prisma_1 = require("../../../db/prisma");
exports.customerServiceRequestsController = {
    getServiceRequests: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const dbReqs = await prisma.service_requests.findMany({
                        include: { parties: true, unit_stays: true },
                        orderBy: { request_id: 'desc' },
                    });
                    if (dbReqs && dbReqs.length > 0) {
                        const items = dbReqs.map((r) => ({
                            requestId: r.request_id,
                            requestNo: r.request_no,
                            partyId: r.party_id,
                            partyName: r.parties?.party_name,
                            unitStayId: r.unit_stay_id,
                            unitNumber: r.unit_stays?.unit_number,
                            requestType: r.request_type,
                            status: r.status,
                            notes: r.notes,
                            createdDate: r.createdate,
                        }));
                        return res.json({ items, total: items.length });
                    }
                }
            }
            res.json({
                items: [
                    {
                        requestId: 1,
                        requestNo: 'SR-2026-0001',
                        partyId: 1,
                        partyName: 'Mediterranean Shipping Company (Tanzania) Ltd',
                        requestType: 'DIRECT_DELIVERY',
                        status: 'APPROVED',
                        notes: 'Approved for priority gate pass',
                        createdDate: new Date().toISOString(),
                    },
                ],
                total: 1,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createServiceRequest: async (req, res) => {
        try {
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const created = await prisma.service_requests.create({
                    data: {
                        request_no: `SR-${Date.now()}`,
                        party_id: Number(req.body.partyId) || 1,
                        unit_stay_id: req.body.unitStayId ? Number(req.body.unitStayId) : undefined,
                        request_type: req.body.requestType || 'GENERAL_INQUIRY',
                        status: 'PENDING',
                        notes: req.body.notes || '',
                    },
                });
                return res.status(201).json(created);
            }
            res.status(201).json({ requestId: 2, requestNo: `SR-${Date.now()}`, ...req.body });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
