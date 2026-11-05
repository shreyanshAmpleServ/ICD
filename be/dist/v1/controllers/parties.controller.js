"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partiesController = exports.PartiesController = void 0;
const prisma_1 = require("../../db/prisma");
const core_1 = require("../../data/core");
const utils_1 = require("../../utils");
// Resilient in-memory store initialized with seed parties
const inMemoryParties = JSON.parse(JSON.stringify(core_1.parties)).map((p) => ({
    partyId: p.partyId,
    partyCode: p.partyCode,
    partyName: p.partyName,
    shortName: p.shortName || null,
    roles: Array.isArray(p.roles) && p.roles.length > 0 ? p.roles : ["CUSTOMER"],
    countryCode: p.countryCode || "TZ",
    city: p.city || "Dar es Salaam",
    phone: p.phone || "+255 22 211 0401",
    email: p.email || `${p.partyCode.toLowerCase()}@icd.example`,
    creditStatus: p.creditStatus || "CASH",
    creditLimit: p.creditLimit || "0.00",
    creditCurrency: p.creditCurrency || "USD",
    defaultCurrency: p.defaultCurrency || "USD",
    vatNo: p.vatNo || null,
    taxId: p.taxId || null,
    disbursementService: Boolean(p.disbursementService),
    source: p.source || "NG",
    syncStatus: p.syncStatus || "SYNCED",
    ngRefId: p.ngRefId || null,
    isActive: p.isActive !== false,
    logInst: 1,
    openUnits: p.openUnits || 0,
    contacts: (p.contacts || []).map((c, idx) => ({
        contactId: c.contactId || idx + 1,
        fullName: c.fullName || "Operations Contact",
        role: c.role || "OPERATIONS",
        email: c.email || "",
        phone: c.phone || "",
        isPrimary: c.isPrimary ?? true,
    })),
}));
class PartiesController {
    getParties = async (req, res) => {
        try {
            const { role, q, source, syncStatus, creditStatus, isActive } = req.query;
            let items = [];
            const prisma = (0, prisma_1.getPrisma)();
            if ((0, prisma_1.isDbLive)() && prisma) {
                try {
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 1200));
                    const queryPromise = prisma.m_party.findMany({
                        where: {
                            ...(isActive !== undefined ? { is_active: isActive === "true" } : {}),
                            ...(source ? { source: String(source).toUpperCase() } : {}),
                            ...(syncStatus ? { sync_status: String(syncStatus).toUpperCase() } : {}),
                            ...(creditStatus ? { credit_status: String(creditStatus).toUpperCase() } : {}),
                        },
                        include: {
                            m_party_m_party_role: true,
                            m_party_m_party_contact: true,
                        },
                        orderBy: { party_id: "asc" },
                    });
                    const dbParties = (await Promise.race([queryPromise, timeoutPromise]));
                    if (dbParties && dbParties.length > 0) {
                        items = dbParties.map((p) => {
                            const roles = (p.m_party_m_party_role || []).map((r) => r.role_code);
                            return {
                                partyId: Number(p.party_id),
                                partyCode: p.party_code,
                                partyName: p.party_name,
                                shortName: p.short_name || null,
                                roles: roles.length > 0 ? roles : ["CUSTOMER"],
                                countryCode: p.country_code || "TZ",
                                city: p.city || "Dar es Salaam",
                                phone: p.phone || null,
                                email: p.email || null,
                                creditStatus: p.credit_status || "CASH",
                                creditLimit: p.credit_limit ? String(p.credit_limit) : "0.00",
                                creditCurrency: p.credit_currency || "USD",
                                defaultCurrency: p.default_currency || "USD",
                                vatNo: p.vat_no || null,
                                taxId: p.tax_id || null,
                                disbursementService: Boolean(p.disbursement_service),
                                source: p.source || "NG",
                                syncStatus: p.sync_status || "SYNCED",
                                ngRefId: p.ng_ref_id || null,
                                isActive: Boolean(p.is_active),
                                logInst: p.log_inst || 1,
                                openUnits: 0,
                                contacts: (p.m_party_m_party_contact || []).map((c) => ({
                                    contactId: Number(c.party_contact_id),
                                    fullName: c.contact_name,
                                    role: c.job_title || "OPERATIONS",
                                    email: c.email || "",
                                    phone: c.phone || "",
                                    isPrimary: Boolean(c.is_primary),
                                })),
                            };
                        });
                    }
                }
                catch {
                    // fallback to inMemoryParties
                }
            }
            if (items.length === 0) {
                console.log('[DEBUG getParties] Falling back to inMemoryParties, count:', inMemoryParties.length);
                items = inMemoryParties;
            }
            // 4. In-memory filters for role and q
            if (role) {
                const roleUpper = String(role).toUpperCase();
                items = items.filter((p) => p.roles.includes(roleUpper));
            }
            if (q) {
                const query = String(q).toLowerCase();
                items = items.filter((p) => p.partyName.toLowerCase().includes(query) ||
                    p.partyCode.toLowerCase().includes(query) ||
                    Boolean(p.taxId && p.taxId.toLowerCase().includes(query)));
            }
            // If client requests raw array (e.g. ?format=array), return array directly
            if (req.query.format === "array") {
                return res.json(items);
            }
            // Standard OpenAPI payload
            return res.json({
                items,
                total: items.length,
                nextCursor: null,
            });
        }
        catch (err) {
            console.error("[PartiesController.getParties] Error:", err);
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    /**
     * GET /parties/:partyId
     * Get party details by ID or code
     */
    getPartyDetail = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const partyIdParam = req.params.partyId;
            const numId = parseInt(partyIdParam, 10);
            const p = await prisma.m_party.findFirst({
                where: isNaN(numId)
                    ? { party_code: partyIdParam }
                    : { OR: [{ party_id: numId }, { party_code: partyIdParam }] },
                include: {
                    m_party_m_party_role: true,
                    m_party_m_party_contact: true,
                },
            });
            if (!p) {
                return res.status(404).json({ error: "Party not found" });
            }
            const roles = (p.m_party_m_party_role || []).map((r) => r.role_code);
            const detail = {
                partyId: Number(p.party_id),
                partyCode: p.party_code,
                partyName: p.party_name,
                shortName: p.short_name || null,
                roles: roles.length > 0 ? roles : ["CUSTOMER"],
                countryCode: p.country_code || "TZ",
                city: p.city || "Dar es Salaam",
                phone: p.phone || null,
                email: p.email || null,
                creditStatus: p.credit_status || "CASH",
                creditLimit: p.credit_limit ? String(p.credit_limit) : "0.00",
                creditCurrency: p.credit_currency || "USD",
                defaultCurrency: p.default_currency || "USD",
                vatNo: p.vat_no || null,
                taxId: p.tax_id || null,
                disbursementService: Boolean(p.disbursement_service),
                source: p.source || "NG",
                syncStatus: p.sync_status || "SYNCED",
                ngRefId: p.ng_ref_id || null,
                isActive: Boolean(p.is_active),
                logInst: p.log_inst || 1,
                contacts: (p.m_party_m_party_contact || []).map((c) => ({
                    contactId: Number(c.party_contact_id),
                    fullName: c.contact_name,
                    role: c.job_title || "OPERATIONS",
                    email: c.email || "",
                    phone: c.phone || "",
                    isPrimary: Boolean(c.is_primary),
                })),
            };
            return res.json(detail);
        }
        catch (err) {
            console.error("[PartiesController.getPartyDetail] Error:", err);
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    /**
     * POST /parties
     * Create a new party
     */
    createParty = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const b = req.body;
            const partyCode = b.partyCode || `C-LOCAL${Date.now()}`;
            const roles = Array.isArray(b.roles) && b.roles.length > 0 ? b.roles : ["CUSTOMER"];
            const created = await prisma.m_party.create({
                data: {
                    party_code: partyCode,
                    party_name: b.partyName || "New Party",
                    short_name: b.shortName || null,
                    country_code: b.countryCode || "TZ",
                    city: b.city || "Dar es Salaam",
                    phone: b.phone || null,
                    email: b.email || null,
                    credit_status: b.creditStatus || "CASH",
                    credit_limit: b.creditLimit ? parseFloat(String(b.creditLimit)) : 0,
                    credit_currency: b.creditCurrency || "USD",
                    default_currency: b.defaultCurrency || "USD",
                    vat_no: b.vatNo || null,
                    tax_id: b.taxId || null,
                    disbursement_service: Boolean(b.disbursementService),
                    source: b.source || "LOCAL",
                    sync_status: b.syncStatus || "PROVISIONAL",
                    ng_ref_id: b.ngRefId || null,
                    is_active: b.isActive ?? true,
                    createdby: req.userSub || "system",
                },
            });
            // Add roles
            for (const r of roles) {
                await prisma.m_party_role.create({
                    data: {
                        party_id: created.party_id,
                        role_code: r.toUpperCase(),
                        createdby: req.userSub || "system",
                    },
                });
            }
            const newEntry = {
                partyId: Number(created.party_id),
                partyCode: created.party_code,
                partyName: created.party_name,
                shortName: b.shortName || null,
                roles,
                countryCode: b.countryCode || "TZ",
                city: b.city || "Dar es Salaam",
                phone: b.phone || null,
                email: b.email || null,
                creditStatus: b.creditStatus || "CASH",
                creditLimit: b.creditLimit ? String(b.creditLimit) : "0.00",
                creditCurrency: b.creditCurrency || "USD",
                defaultCurrency: b.defaultCurrency || "USD",
                vatNo: b.vatNo || null,
                taxId: b.taxId || null,
                disbursementService: Boolean(b.disbursementService),
                source: created.source,
                syncStatus: created.sync_status,
                ngRefId: b.ngRefId || null,
                isActive: b.isActive ?? true,
                logInst: 1,
                openUnits: 0,
                contacts: [],
            };
            inMemoryParties.unshift(newEntry);
            return (0, utils_1.sendCreated)(res, {
                partyId: Number(created.party_id),
                partyCode: created.party_code,
                partyName: created.party_name,
                roles,
                source: created.source,
                syncStatus: created.sync_status,
            });
        }
        catch (err) {
            console.error("[PartiesController.createParty] Error:", err);
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    /**
     * PATCH /parties/:partyId
     * Update party
     */
    updateParty = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const partyIdParam = req.params.partyId;
            const numId = parseInt(partyIdParam, 10);
            const b = req.body;
            const existing = await prisma.m_party.findFirst({
                where: isNaN(numId)
                    ? { party_code: partyIdParam }
                    : { party_id: numId },
            });
            if (!existing) {
                return res.status(404).json({ error: "Party not found" });
            }
            const updated = await prisma.m_party.update({
                where: { party_id: existing.party_id },
                data: {
                    ...(b.partyName ? { party_name: b.partyName } : {}),
                    ...(b.shortName !== undefined ? { short_name: b.shortName } : {}),
                    ...(b.city ? { city: b.city } : {}),
                    ...(b.phone !== undefined ? { phone: b.phone } : {}),
                    ...(b.email !== undefined ? { email: b.email } : {}),
                    ...(b.creditStatus ? { credit_status: b.creditStatus } : {}),
                    ...(b.creditLimit !== undefined
                        ? { credit_limit: parseFloat(String(b.creditLimit)) }
                        : {}),
                    ...(b.syncStatus ? { sync_status: b.syncStatus } : {}),
                    ...(b.isActive !== undefined
                        ? { is_active: Boolean(b.isActive) }
                        : {}),
                    log_inst: { increment: 1 },
                    updatedby: req.userSub || "system",
                },
            });
            return res.json({
                partyId: Number(updated.party_id),
                partyCode: updated.party_code,
                partyName: updated.party_name,
                logInst: updated.log_inst,
            });
        }
        catch (err) {
            console.error("[PartiesController.updateParty] Error:", err);
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    /**
     * POST /parties:provisional
     * Create provisional party
     */
    createProvisional = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma || !(0, prisma_1.isDbLive)()) {
            const b = req.body;
            const partyId = Date.now();
            const partyCode = b.partyCode || `PROV-${Date.now().toString().slice(-6)}`;
            const provParty = {
                partyId,
                partyCode,
                partyName: b.partyName || "Provisional Party",
                roles: Array.isArray(b.roles) && b.roles.length > 0 ? b.roles : ["CUSTOMER", "CONSIGNEE"],
                source: "LOCAL",
                syncStatus: "PROVISIONAL",
                isActive: true,
            };
            return (0, utils_1.sendCreated)(res, provParty);
        }
        try {
            const b = req.body;
            const partyCode = b.partyCode || `PROV-${Date.now()}`;
            const roles = Array.isArray(b.roles) && b.roles.length > 0 ? b.roles : ["CUSTOMER"];
            const created = await prisma.m_party.create({
                data: {
                    party_code: partyCode,
                    party_name: b.partyName || "Provisional Party",
                    country_code: b.countryCode || "TZ",
                    city: b.city || "Dar es Salaam",
                    source: "LOCAL",
                    sync_status: "PROVISIONAL",
                    credit_status: "CASH",
                    is_active: true,
                    createdby: req.userSub || "system",
                },
            });
            for (const r of roles) {
                await prisma.m_party_role.create({
                    data: {
                        party_id: created.party_id,
                        role_code: r.toUpperCase(),
                        createdby: req.userSub || "system",
                    },
                });
            }
            return (0, utils_1.sendCreated)(res, {
                partyId: Number(created.party_id),
                partyCode: created.party_code,
                partyName: created.party_name,
                roles,
                source: "LOCAL",
                syncStatus: "PROVISIONAL",
                isActive: true,
            });
        }
        catch (err) {
            console.error("[PartiesController.createProvisional] Error:", err);
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    /**
     * POST /parties/:partyId/match & /parties/:partyId:match
     * Match provisional party with master NG record
     */
    matchParty = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const partyIdParam = req.params.partyId;
            const numId = parseInt(partyIdParam, 10);
            const ngRefId = req.body.ngRefId || req.body.matchedMasterPartyId || "NG-MATCHED";
            const existing = await prisma.m_party.findFirst({
                where: isNaN(numId)
                    ? { party_code: partyIdParam }
                    : { party_id: numId },
            });
            if (!existing) {
                return res.status(404).json({ error: "Party not found" });
            }
            const updated = await prisma.m_party.update({
                where: { party_id: existing.party_id },
                data: {
                    sync_status: "SYNCED",
                    source: "NG",
                    ng_ref_id: String(ngRefId),
                    updatedby: req.userSub || "system",
                },
            });
            return res.json({
                success: true,
                party: {
                    partyId: Number(updated.party_id),
                    partyCode: updated.party_code,
                    partyName: updated.party_name,
                    syncStatus: updated.sync_status,
                    ngRefId: updated.ng_ref_id,
                },
                message: "Provisional party successfully linked to master record.",
            });
        }
        catch (err) {
            console.error("[PartiesController.matchParty] Error:", err);
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    /**
     * GET /parties/:partyId/contacts
     * Get party contacts
     */
    getContacts = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const partyIdParam = req.params.partyId;
            const numId = parseInt(partyIdParam, 10);
            const party = await prisma.m_party.findFirst({
                where: isNaN(numId)
                    ? { party_code: partyIdParam }
                    : { party_id: numId },
            });
            if (!party) {
                return res.status(404).json({ error: "Party not found" });
            }
            const contacts = await prisma.m_party_contact.findMany({
                where: { party_id: party.party_id },
                orderBy: { is_primary: "desc" },
            });
            const items = contacts.map((c) => ({
                contactId: Number(c.party_contact_id),
                fullName: c.contact_name,
                role: c.job_title || "OPERATIONS",
                email: c.email || "",
                phone: c.phone || "",
                isPrimary: Boolean(c.is_primary),
            }));
            return res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            console.error("[PartiesController.getContacts] Error:", err);
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    /**
     * PUT /parties/:partyId/contacts
     * Replace or add contacts for party
     */
    updateContacts = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const partyIdParam = req.params.partyId;
            const numId = parseInt(partyIdParam, 10);
            const incomingList = Array.isArray(req.body) ? req.body : [req.body];
            const party = await prisma.m_party.findFirst({
                where: isNaN(numId)
                    ? { party_code: partyIdParam }
                    : { party_id: numId },
            });
            if (!party) {
                return res.status(404).json({ error: "Party not found" });
            }
            for (const c of incomingList) {
                if (c.contactId) {
                    await prisma.m_party_contact.update({
                        where: { party_contact_id: Number(c.contactId) },
                        data: {
                            contact_name: c.fullName || c.contactName,
                            job_title: c.role || c.jobTitle,
                            email: c.email,
                            phone: c.phone,
                            is_primary: Boolean(c.isPrimary),
                            updatedby: req.userSub || "system",
                        },
                    });
                }
                else {
                    await prisma.m_party_contact.create({
                        data: {
                            party_id: party.party_id,
                            contact_name: c.fullName || c.contactName || "New Contact",
                            job_title: c.role || c.jobTitle || "OPERATIONS",
                            email: c.email || "",
                            phone: c.phone || "",
                            is_primary: Boolean(c.isPrimary),
                            createdby: req.userSub || "system",
                        },
                    });
                }
            }
            const updated = await prisma.m_party_contact.findMany({
                where: { party_id: party.party_id },
            });
            const items = updated.map((c) => ({
                contactId: Number(c.party_contact_id),
                fullName: c.contact_name,
                role: c.job_title || "OPERATIONS",
                email: c.email || "",
                phone: c.phone || "",
                isPrimary: Boolean(c.is_primary),
            }));
            return res.json({ items, total: items.length });
        }
        catch (err) {
            console.error("[PartiesController.updateContacts] Error:", err);
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    /**
     * PATCH /parties/:partyId/contacts/:contactId
     * Patch single contact
     */
    patchContact = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const contactId = parseInt(req.params.contactId, 10);
            const b = req.body;
            const updated = await prisma.m_party_contact.update({
                where: { party_contact_id: contactId },
                data: {
                    ...(b.fullName || b.contactName
                        ? { contact_name: b.fullName || b.contactName }
                        : {}),
                    ...(b.role || b.jobTitle ? { job_title: b.role || b.jobTitle } : {}),
                    ...(b.email !== undefined ? { email: b.email } : {}),
                    ...(b.phone !== undefined ? { phone: b.phone } : {}),
                    ...(b.isPrimary !== undefined
                        ? { is_primary: Boolean(b.isPrimary) }
                        : {}),
                    updatedby: req.userSub || "system",
                },
            });
            return res.json({
                contactId: Number(updated.party_contact_id),
                fullName: updated.contact_name,
                role: updated.job_title,
                email: updated.email,
                phone: updated.phone,
                isPrimary: updated.is_primary,
            });
        }
        catch (err) {
            console.error("[PartiesController.patchContact] Error:", err);
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
}
exports.PartiesController = PartiesController;
exports.partiesController = new PartiesController();
