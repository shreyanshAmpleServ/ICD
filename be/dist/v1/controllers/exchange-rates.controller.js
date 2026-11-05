"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeRatesController = void 0;
const prisma_1 = require("../../db/prisma");
const HOLIDAYS = {
    '2026-07-07': 'Saba Saba',
    '2026-08-08': 'Nane Nane',
    '2026-08-26': 'Maulid',
    '2026-10-14': 'Nyerere Day',
    '2026-12-09': 'Independence Day',
    '2026-12-25': 'Christmas Day',
    '2026-12-26': 'Boxing Day',
    '2027-01-01': "New Year's Day",
};
const isSunday = (d) => new Date(d + 'T00:00:00Z').getUTCDay() === 0;
const dShort = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
function formatDbRate(r, usedBy = 0) {
    const dateStr = r.rate_date instanceof Date
        ? r.rate_date.toISOString().split('T')[0]
        : String(r.rate_date).split('T')[0];
    return {
        exchangeRateId: r.exchange_rate_id,
        companyId: r.company_id,
        fromCurrency: r.from_currency,
        toCurrency: r.to_currency,
        rateDate: dateStr,
        rate: Number(r.rate).toFixed(2),
        rateKind: r.rate_kind,
        sourceNote: r.source_note || 'Bank of Tanzania mean rate 09:00',
        usedBy,
        enteredAt: r.createdate instanceof Date ? r.createdate.toISOString() : new Date().toISOString(),
        enteredBy: r.createdby || 'Grace Mrema',
        effectiveFrom: dateStr,
        isCurrent: true,
    };
}
exports.exchangeRatesController = {
    getExchangeRates: async (req, res) => {
        try {
            const prisma = (0, prisma_1.getPrisma)();
            if (!prisma) {
                return res.status(500).json({ error: 'Database connection unavailable', items: [], total: 0 });
            }
            const dbRates = await prisma.m_exchange_rate.findMany({
                orderBy: [{ rate_date: 'desc' }, { rate_kind: 'asc' }],
            });
            // Count invoices that used each exchange rate from live invoice table
            let invoiceCounts = {};
            try {
                const invoices = await prisma.invoice.findMany({
                    select: { exchange_rate: true },
                });
                for (const inv of invoices) {
                    if (inv.exchange_rate) {
                        const key = Number(inv.exchange_rate).toFixed(2);
                        invoiceCounts[key] = (invoiceCounts[key] || 0) + 1;
                    }
                }
            }
            catch {
                // Table empty or not queried
            }
            const items = dbRates.map((r) => {
                const rVal = Number(r.rate).toFixed(2);
                const usedBy = invoiceCounts[rVal] || 0;
                return formatDbRate(r, usedBy);
            });
            return res.json({ items, total: items.length });
        }
        catch (err) {
            console.error('[Exchange Rates Controller] getExchangeRates error:', err);
            return res.status(500).json({ error: err.message, items: [], total: 0 });
        }
    },
    getEffectiveRate: async (req, res) => {
        const targetDate = req.query.date || new Date().toISOString().split('T')[0];
        try {
            const prisma = (0, prisma_1.getPrisma)();
            if (!prisma) {
                return res.status(500).json({ error: 'Database connection unavailable' });
            }
            const targetD = new Date(targetDate + 'T00:00:00Z');
            // 1. Check exact daily rate
            const exactDaily = await prisma.m_exchange_rate.findFirst({
                where: {
                    from_currency: 'USD',
                    to_currency: 'TZS',
                    rate_kind: 'DAILY',
                    rate_date: targetD,
                },
            });
            if (exactDaily) {
                return res.json({
                    rate: formatDbRate(exactDaily, 0),
                    note: 'Daily rate for this date',
                });
            }
            // 2. Carry forward: latest daily rate earlier in the same month
            const targetMonth = targetDate.slice(0, 7);
            const monthStart = new Date(`${targetMonth}-01T00:00:00Z`);
            const carryDaily = await prisma.m_exchange_rate.findFirst({
                where: {
                    from_currency: 'USD',
                    to_currency: 'TZS',
                    rate_kind: 'DAILY',
                    rate_date: {
                        gte: monthStart,
                        lte: targetD,
                    },
                },
                orderBy: { rate_date: 'desc' },
            });
            if (carryDaily) {
                const holText = HOLIDAYS[targetDate] ? ` (${HOLIDAYS[targetDate]})` : '';
                const sunText = isSunday(targetDate) ? ' (Sunday)' : '';
                const reason = sunText || holText;
                const note = `No rate on ${dShort(targetDate)}${reason}; last daily rate carries forward`;
                return res.json({
                    rate: formatDbRate(carryDaily, 0),
                    note,
                });
            }
            // 3. Fallback: monthly benchmark rate for the month or earlier
            const monthlyRate = await prisma.m_exchange_rate.findFirst({
                where: {
                    from_currency: 'USD',
                    to_currency: 'TZS',
                    rate_kind: 'MONTHLY',
                    rate_date: { lte: targetD },
                },
                orderBy: { rate_date: 'desc' },
            });
            if (monthlyRate) {
                return res.json({
                    rate: formatDbRate(monthlyRate, 0),
                    note: 'No daily rate; monthly rate used',
                });
            }
            // 4. Any latest available rate in database
            const anyLatest = await prisma.m_exchange_rate.findFirst({
                where: {
                    from_currency: 'USD',
                    to_currency: 'TZS',
                    rate_date: { lte: targetD },
                },
                orderBy: { rate_date: 'desc' },
            });
            if (anyLatest) {
                return res.json({
                    rate: formatDbRate(anyLatest, 0),
                    note: 'Latest available rate in force',
                });
            }
            return res.status(404).json({ error: 'No exchange rate configured in database for this pair' });
        }
        catch (err) {
            console.error('[Exchange Rates Controller] getEffectiveRate error:', err);
            return res.status(500).json({ error: err.message });
        }
    },
    createExchangeRate: async (req, res) => {
        try {
            const fromCurrency = req.body.fromCurrency || req.body.baseCurrency || 'USD';
            const toCurrency = req.body.toCurrency || req.body.quoteCurrency || 'TZS';
            const rateVal = Number(req.body.rate);
            const rateKind = (req.body.rateKind || 'DAILY').toUpperCase();
            const rateDateStr = req.body.rateDate || req.body.effectiveFrom || new Date().toISOString().split('T')[0];
            const sourceNote = req.body.sourceNote || 'BoT mean rate 09:00';
            const user = req.body.enteredBy || req.user?.username || 'Grace Mrema';
            if (!rateVal || isNaN(rateVal)) {
                return res.status(400).json({ error: 'Valid rate number is required' });
            }
            const prisma = (0, prisma_1.getPrisma)();
            if (!prisma) {
                return res.status(500).json({ error: 'Database connection unavailable' });
            }
            const d = new Date(rateDateStr + 'T00:00:00Z');
            const created = await prisma.m_exchange_rate.upsert({
                where: {
                    company_id_from_currency_to_currency_rate_date: {
                        company_id: 1,
                        from_currency: fromCurrency,
                        to_currency: toCurrency,
                        rate_date: d,
                    },
                },
                update: {
                    rate: rateVal,
                    rate_kind: rateKind,
                    source_note: sourceNote,
                    updatedby: user,
                    updatedate: new Date(),
                },
                create: {
                    company_id: 1,
                    from_currency: fromCurrency,
                    to_currency: toCurrency,
                    rate_date: d,
                    rate: rateVal,
                    rate_kind: rateKind,
                    source_note: sourceNote,
                    createdby: user,
                },
            });
            return res.status(201).json(formatDbRate(created, 0));
        }
        catch (err) {
            console.error('[Exchange Rates Controller] createExchangeRate error:', err);
            return res.status(500).json({ error: err.message });
        }
    },
    updateExchangeRate: async (req, res) => {
        try {
            const exchangeRateId = Number(req.params.exchangeRateId);
            const { rate, sourceNote, enteredBy } = req.body;
            const prisma = (0, prisma_1.getPrisma)();
            if (!prisma) {
                return res.status(500).json({ error: 'Database connection unavailable' });
            }
            const existing = await prisma.m_exchange_rate.findUnique({
                where: { exchange_rate_id: exchangeRateId },
            });
            if (!existing) {
                return res.status(404).json({ error: 'Exchange rate not found' });
            }
            // Check if locked by posted documents
            const invoiceCount = await prisma.invoice.count({
                where: { exchange_rate: existing.rate },
            });
            if (invoiceCount > 0) {
                return res.status(400).json({
                    error: "A rate used by a posted document can't be edited: the invoice, its fiscal receipt and its NG journal all carry it. Corrections go on the next rate.",
                });
            }
            const updated = await prisma.m_exchange_rate.update({
                where: { exchange_rate_id: exchangeRateId },
                data: {
                    ...(rate !== undefined ? { rate: Number(rate) } : {}),
                    ...(sourceNote !== undefined ? { source_note: sourceNote } : {}),
                    updatedby: enteredBy || req.user?.username || 'Grace Mrema',
                    updatedate: new Date(),
                },
            });
            return res.json(formatDbRate(updated, 0));
        }
        catch (err) {
            console.error('[Exchange Rates Controller] updateExchangeRate error:', err);
            return res.status(500).json({ error: err.message });
        }
    },
};
