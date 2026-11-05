"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tariffsController = void 0;
exports.mapDbTariffToFrontend = mapDbTariffToFrontend;
const prisma_1 = require("../../db/prisma");
const money_1 = require("../../data/money");
function mapDbTariffToFrontend(t) {
    const rules = (t.tariff_tariff_rule || []).map((r) => ({
        tariffRuleId: r.tariff_rule_id,
        tariffId: r.tariff_id,
        chargeCode: r.m_charge_code_tariff_rule?.charge_code || 'CHARGE',
        basis: r.basis,
        unitCategory: r.unit_category,
        lengthFt: r.length_ft,
        vehicleClass: r.vehicle_class,
        fullEmpty: r.full_empty,
        isReefer: r.is_reefer,
        isHazardous: r.is_hazardous,
        clockStart: r.clock_start,
        freeDays: r.free_days,
        freeExclSundays: r.free_excl_sundays,
        freeExclHolidays: r.free_excl_holidays,
        flatRate: r.flat_rate != null ? Number(r.flat_rate).toFixed(2) : undefined,
        minCharge: r.min_charge != null ? Number(r.min_charge).toFixed(2) : undefined,
        maxCharge: r.max_charge != null ? Number(r.max_charge).toFixed(2) : undefined,
        taxCode: r.tax_code || 'VAT18',
        sortOrder: r.sort_order,
        slabs: (r.tariff_rule_tariff_slab || []).map((s) => ({
            tariffSlabId: s.tariff_slab_id,
            tariffRuleId: s.tariff_rule_id,
            fromQty: String(s.from_qty),
            toQty: s.to_qty != null ? String(s.to_qty) : null,
            rate: Number(s.rate).toFixed(2),
        })),
    }));
    const approvalNote = t.approval_request_tariff?.reason ||
        (t.remarks?.includes('Waiting') ? t.remarks : undefined);
    return {
        tariffId: t.tariff_id,
        tariffCode: t.tariff_code,
        tariffName: t.tariff_name,
        level: t.tariff_level,
        companyId: t.company_id,
        siteId: t.site_id,
        partyId: t.party_id,
        regimeCode: t.m_cargo_regime_tariff?.regime_code ||
            (t.cargo_regime_id === 2 ? 'TRANSIT' : undefined),
        currency: t.currency || 'USD',
        versionNo: t.version_no,
        effectiveFrom: t.effective_from
            ? t.effective_from.toISOString().split('T')[0]
            : '2026-07-01',
        effectiveTo: t.effective_to
            ? t.effective_to.toISOString().split('T')[0]
            : null,
        status: t.status,
        approvalNote,
        updatedBy: t.updatedby || t.createdby || 'Grace Mrema',
        submittedBy: t.createdby || undefined,
        regulatorRef: t.regulator_ref || undefined,
        remarks: t.remarks || undefined,
        rules,
    };
}
exports.tariffsController = {
    getTariffs: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    try {
                        const dbTariffs = await prisma.tariff.findMany({
                            where: {
                                tariff_code: { startsWith: 'TRF-' },
                            },
                            include: {
                                tariff_tariff_rule: {
                                    include: {
                                        m_charge_code_tariff_rule: true,
                                        tariff_rule_tariff_slab: true,
                                    },
                                    orderBy: { sort_order: 'asc' },
                                },
                                m_cargo_regime_tariff: true,
                                m_site_tariff: true,
                                m_party_tariff: true,
                                approval_request_tariff: true,
                            },
                            orderBy: { tariff_id: 'asc' },
                        });
                        if (dbTariffs && dbTariffs.length > 0) {
                            const items = dbTariffs.map(mapDbTariffToFrontend);
                            return res.json({ items, total: items.length, nextCursor: null });
                        }
                    }
                    catch (dbErr) {
                        console.warn('[Tariffs Controller] DB query failed, using fallback:', dbErr.message);
                    }
                }
            }
            return res.json({ items: money_1.tariffs, total: money_1.tariffs.length, nextCursor: null });
        }
        catch (err) {
            console.error('[Tariffs Controller] getTariffs error:', err.message);
            return res.json({ items: money_1.tariffs, total: money_1.tariffs.length, nextCursor: null });
        }
    },
    getTariffById: async (req, res) => {
        const tariffIdParam = req.params.tariffId;
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const isNumeric = /^\d+$/.test(tariffIdParam);
                    const whereClause = isNumeric
                        ? { tariff_id: parseInt(tariffIdParam, 10) }
                        : { tariff_code: tariffIdParam };
                    const dbTariff = await prisma.tariff.findFirst({
                        where: whereClause,
                        include: {
                            tariff_tariff_rule: {
                                include: {
                                    m_charge_code_tariff_rule: true,
                                    tariff_rule_tariff_slab: true,
                                },
                                orderBy: { sort_order: 'asc' },
                            },
                            m_cargo_regime_tariff: true,
                            m_site_tariff: true,
                            m_party_tariff: true,
                            approval_request_tariff: true,
                        },
                    });
                    if (dbTariff) {
                        return res.json(mapDbTariffToFrontend(dbTariff));
                    }
                }
            }
            const mock = money_1.tariffs.find((x) => String(x.tariffId) === tariffIdParam || x.tariffCode === tariffIdParam);
            if (mock)
                return res.json(mock);
            return res.status(404).json({ error: 'Tariff not found' });
        }
        catch (err) {
            console.error('[Tariffs Controller] getTariffById error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    },
    getTariffRules: async (req, res) => {
        const tariffIdParam = req.params.tariffId;
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const isNumeric = /^\d+$/.test(tariffIdParam);
                    const whereClause = isNumeric
                        ? { tariff_id: parseInt(tariffIdParam, 10) }
                        : { tariff_code: tariffIdParam };
                    const dbTariff = await prisma.tariff.findFirst({
                        where: whereClause,
                        include: {
                            tariff_tariff_rule: {
                                include: {
                                    m_charge_code_tariff_rule: true,
                                    tariff_rule_tariff_slab: true,
                                },
                                orderBy: { sort_order: 'asc' },
                            },
                        },
                    });
                    if (dbTariff) {
                        const frontend = mapDbTariffToFrontend(dbTariff);
                        return res.json({
                            items: frontend.rules,
                            total: frontend.rules.length,
                            nextCursor: null,
                        });
                    }
                }
            }
            const mock = money_1.tariffs.find((x) => String(x.tariffId) === tariffIdParam || x.tariffCode === tariffIdParam);
            return res.json({
                items: mock?.rules || [],
                total: (mock?.rules || []).length,
                nextCursor: null,
            });
        }
        catch (err) {
            console.error('[Tariffs Controller] getTariffRules error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    },
    createTariff: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const b = req.body;
                    const created = await prisma.tariff.create({
                        data: {
                            tariff_code: b.tariffCode || `TRF-${Date.now()}`,
                            tariff_name: b.tariffName || 'Standard ICD Tariff',
                            tariff_level: b.level || 'SITE',
                            company_id: b.companyId || 1,
                            site_id: b.siteId ?? null,
                            party_id: b.partyId ?? null,
                            cargo_regime_id: b.cargoRegimeId ?? null,
                            currency: b.currency || 'USD',
                            version_no: b.versionNo || 1,
                            effective_from: b.effectiveFrom ? new Date(b.effectiveFrom) : new Date(),
                            effective_to: b.effectiveTo ? new Date(b.effectiveTo) : null,
                            status: b.status || 'DRAFT',
                            remarks: b.remarks ?? null,
                            createdby: b.createdBy || 'system',
                            updatedby: b.updatedBy || 'system',
                        },
                        include: {
                            tariff_tariff_rule: {
                                include: {
                                    m_charge_code_tariff_rule: true,
                                    tariff_rule_tariff_slab: true,
                                },
                            },
                        },
                    });
                    return res.status(201).json(mapDbTariffToFrontend(created));
                }
            }
            const newT = {
                tariffId: money_1.tariffs.length + 1,
                tariffCode: req.body.tariffCode || `TRF-${money_1.tariffs.length + 1}`,
                tariffName: req.body.tariffName || 'Standard ICD Tariff',
                currency: req.body.currency || 'USD',
                versionNo: 1,
                status: 'ACTIVE',
                effectiveFrom: new Date().toISOString(),
                rules: req.body.rules || [],
                ...req.body,
            };
            money_1.tariffs.push(newT);
            return res.status(201).json(newT);
        }
        catch (err) {
            console.error('[Tariffs Controller] createTariff error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    },
    updateTariff: async (req, res) => {
        const tariffIdParam = req.params.tariffId;
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const isNumeric = /^\d+$/.test(tariffIdParam);
                    const whereClause = isNumeric
                        ? { tariff_id: parseInt(tariffIdParam, 10) }
                        : { tariff_code: tariffIdParam };
                    const target = await prisma.tariff.findFirst({ where: whereClause });
                    if (target) {
                        const b = req.body;
                        const updated = await prisma.tariff.update({
                            where: { tariff_id: target.tariff_id },
                            data: {
                                ...(b.tariffName && { tariff_name: b.tariffName }),
                                ...(b.status && { status: b.status }),
                                ...(b.effectiveFrom && { effective_from: new Date(b.effectiveFrom) }),
                                ...(b.effectiveTo !== undefined && { effective_to: b.effectiveTo ? new Date(b.effectiveTo) : null }),
                                ...(b.remarks !== undefined && { remarks: b.remarks }),
                                ...(b.regulatorRef !== undefined && { regulator_ref: b.regulatorRef }),
                                updatedby: b.updatedBy || 'Grace Mrema',
                                updatedate: new Date(),
                            },
                            include: {
                                tariff_tariff_rule: {
                                    include: {
                                        m_charge_code_tariff_rule: true,
                                        tariff_rule_tariff_slab: true,
                                    },
                                },
                                m_cargo_regime_tariff: true,
                                m_site_tariff: true,
                                m_party_tariff: true,
                                approval_request_tariff: true,
                            },
                        });
                        return res.json(mapDbTariffToFrontend(updated));
                    }
                }
            }
            const mock = money_1.tariffs.find((x) => String(x.tariffId) === tariffIdParam || x.tariffCode === tariffIdParam);
            if (!mock)
                return res.status(404).json({ error: 'Tariff not found' });
            Object.assign(mock, req.body);
            return res.json(mock);
        }
        catch (err) {
            console.error('[Tariffs Controller] updateTariff error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    },
    submitTariff: async (req, res) => {
        const tariffIdParam = req.params.tariffId;
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const isNumeric = /^\d+$/.test(tariffIdParam);
                    const whereClause = isNumeric
                        ? { tariff_id: parseInt(tariffIdParam, 10) }
                        : { tariff_code: tariffIdParam };
                    const target = await prisma.tariff.findFirst({ where: whereClause });
                    if (target) {
                        const updated = await prisma.tariff.update({
                            where: { tariff_id: target.tariff_id },
                            data: {
                                status: 'PENDING_APPROVAL',
                                updatedate: new Date(),
                            },
                            include: {
                                tariff_tariff_rule: {
                                    include: {
                                        m_charge_code_tariff_rule: true,
                                        tariff_rule_tariff_slab: true,
                                    },
                                },
                                m_cargo_regime_tariff: true,
                                m_site_tariff: true,
                                m_party_tariff: true,
                                approval_request_tariff: true,
                            },
                        });
                        return res.json({ success: true, tariff: mapDbTariffToFrontend(updated) });
                    }
                }
            }
            const mock = money_1.tariffs.find((x) => String(x.tariffId) === tariffIdParam);
            if (mock)
                mock.status = 'PENDING_APPROVAL';
            return res.json({ success: true, tariff: mock });
        }
        catch (err) {
            console.error('[Tariffs Controller] submitTariff error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    },
    newVersion: async (req, res) => {
        const tariffIdParam = req.params.tariffId;
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const isNumeric = /^\d+$/.test(tariffIdParam);
                    const whereClause = isNumeric
                        ? { tariff_id: parseInt(tariffIdParam, 10) }
                        : { tariff_code: tariffIdParam };
                    const target = await prisma.tariff.findFirst({
                        where: whereClause,
                        include: {
                            tariff_tariff_rule: {
                                include: {
                                    tariff_rule_tariff_slab: true,
                                },
                            },
                        },
                    });
                    if (target) {
                        const nextVersionNo = target.version_no + 1;
                        const created = await prisma.tariff.create({
                            data: {
                                tariff_code: target.tariff_code,
                                tariff_name: target.tariff_name,
                                tariff_level: target.tariff_level,
                                company_id: target.company_id,
                                site_id: target.site_id,
                                party_id: target.party_id,
                                cargo_regime_id: target.cargo_regime_id,
                                currency: target.currency,
                                version_no: nextVersionNo,
                                effective_from: new Date(),
                                effective_to: null,
                                status: 'DRAFT',
                                createdby: 'Neema Mushi',
                                updatedby: 'Neema Mushi',
                            },
                        });
                        // Clone rules
                        for (const r of target.tariff_tariff_rule) {
                            const newRule = await prisma.tariff_rule.create({
                                data: {
                                    tariff_id: created.tariff_id,
                                    charge_code_id: r.charge_code_id,
                                    basis: r.basis,
                                    unit_category: r.unit_category,
                                    length_ft: r.length_ft,
                                    vehicle_class: r.vehicle_class,
                                    full_empty: r.full_empty,
                                    is_reefer: r.is_reefer,
                                    is_hazardous: r.is_hazardous,
                                    clock_start: r.clock_start,
                                    free_days: r.free_days,
                                    free_excl_sundays: r.free_excl_sundays,
                                    free_excl_holidays: r.free_excl_holidays,
                                    flat_rate: r.flat_rate,
                                    min_charge: r.min_charge,
                                    max_charge: r.max_charge,
                                    tax_code: r.tax_code,
                                    sort_order: r.sort_order,
                                    createdby: 'Neema Mushi',
                                    updatedby: 'Neema Mushi',
                                },
                            });
                            for (const s of r.tariff_rule_tariff_slab) {
                                await prisma.tariff_slab.create({
                                    data: {
                                        tariff_rule_id: newRule.tariff_rule_id,
                                        from_qty: s.from_qty,
                                        to_qty: s.to_qty,
                                        rate: s.rate,
                                        createdby: 'Neema Mushi',
                                        updatedby: 'Neema Mushi',
                                    },
                                });
                            }
                        }
                        const fullNewTariff = await prisma.tariff.findUnique({
                            where: { tariff_id: created.tariff_id },
                            include: {
                                tariff_tariff_rule: {
                                    include: {
                                        m_charge_code_tariff_rule: true,
                                        tariff_rule_tariff_slab: true,
                                    },
                                },
                                m_cargo_regime_tariff: true,
                                m_site_tariff: true,
                                m_party_tariff: true,
                                approval_request_tariff: true,
                            },
                        });
                        return res.status(201).json(mapDbTariffToFrontend(fullNewTariff));
                    }
                }
            }
            const mock = money_1.tariffs.find((x) => String(x.tariffId) === tariffIdParam);
            const version = {
                ...mock,
                tariffId: money_1.tariffs.length + 1,
                versionNo: (mock?.versionNo || 1) + 1,
                status: 'DRAFT',
                createdFromId: mock?.tariffId,
            };
            money_1.tariffs.push(version);
            return res.status(201).json(version);
        }
        catch (err) {
            console.error('[Tariffs Controller] newVersion error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    },
    getTariffRates: async (_req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const rules = await prisma.tariff_rule.findMany({
                        include: {
                            m_charge_code_tariff_rule: true,
                            tariff_rule_tariff_slab: true,
                        },
                        orderBy: { sort_order: 'asc' },
                    });
                    if (rules && rules.length > 0) {
                        const mapped = rules.map((r) => ({
                            ruleId: r.tariff_rule_id,
                            tariffId: r.tariff_id,
                            chargeCode: r.m_charge_code_tariff_rule?.charge_code,
                            chargeName: r.m_charge_code_tariff_rule?.charge_name,
                            calcBasis: r.basis,
                            flatRate: r.flat_rate != null ? Number(r.flat_rate) : null,
                            minCharge: r.min_charge != null ? Number(r.min_charge) : null,
                            freeDays: r.free_days,
                        }));
                        return res.json({ items: mapped, total: mapped.length });
                    }
                }
            }
            return res.json({ items: money_1.rates, total: money_1.rates.length });
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    },
};
