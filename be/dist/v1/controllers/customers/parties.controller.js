"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerPartiesController = void 0;
const prisma_1 = require("../../../db/prisma");
exports.customerPartiesController = {
    getParties: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const parties = await prisma.m_party.findMany({
                        include: {
                            m_party_m_party_role: true,
                            m_party_m_party_contact: true,
                        },
                        orderBy: { party_id: 'asc' },
                    });
                    if (parties && parties.length > 0) {
                        const items = parties.map((p) => ({
                            partyId: p.party_id,
                            partyCode: p.party_code,
                            partyName: p.party_name,
                            roles: p.m_party_m_party_role?.map((r) => r.role_code) || [],
                            creditStatus: p.credit_status || 'GOOD',
                            creditLimit: Number(p.credit_limit || 0),
                            syncStatus: p.sync_status || 'SYNCED',
                            isActive: p.is_active ?? true,
                            contacts: p.m_party_m_party_contact?.map((c) => ({
                                contactName: c.contact_name,
                                email: c.email,
                                phone: c.phone,
                            })) || [],
                        }));
                        return res.json({ items, total: items.length, nextCursor: null });
                    }
                }
            }
            res.json({
                items: [
                    { partyId: 1, partyCode: 'MSC', partyName: 'Mediterranean Shipping Company', roles: ['SHIPPING_LINE'], creditStatus: 'GOOD', isActive: true },
                    { partyId: 2, partyCode: 'MAERSK', partyName: 'Maersk Line Tanzania', roles: ['SHIPPING_LINE'], creditStatus: 'GOOD', isActive: true },
                    { partyId: 3, partyCode: 'CMA', partyName: 'CMA CGM Tanzania', roles: ['SHIPPING_LINE'], creditStatus: 'GOOD', isActive: true },
                ],
                total: 3,
                nextCursor: null,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPartyById: async (req, res) => {
        try {
            const { partyId } = req.params;
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const p = await prisma.m_party.findFirst({
                    where: { party_id: Number(partyId) || undefined, party_code: partyId },
                    include: {
                        m_party_m_party_role: true,
                        m_party_m_party_contact: true,
                    },
                });
                if (p)
                    return res.json(p);
            }
            res.status(404).json({ error: 'Party not found' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createParty: async (req, res) => {
        try {
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const created = await prisma.m_party.create({
                    data: {
                        party_code: req.body.partyCode || `PTY-${Date.now()}`,
                        party_name: req.body.partyName || 'New Party',
                        tax_pin: req.body.taxPin,
                        credit_limit: req.body.creditLimit ? Number(req.body.creditLimit) : 0,
                        credit_status: req.body.creditStatus || 'GOOD',
                        source: 'LOCAL',
                        sync_status: 'PENDING',
                        is_active: true,
                    },
                });
                return res.status(201).json(created);
            }
            res.status(201).json({ partyId: 99, ...req.body });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateParty: async (req, res) => {
        try {
            const { partyId } = req.params;
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const updated = await prisma.m_party.update({
                    where: { party_id: Number(partyId) },
                    data: req.body,
                });
                return res.json(updated);
            }
            res.json({ partyId, ...req.body });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
