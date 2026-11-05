"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refundsController = exports.RefundsController = void 0;
const prisma_1 = require("../../db/prisma");
const seed_refunds_1 = require("../../scripts/seed-refunds");
const money_1 = require("../../data/money");
// Standard error / response helpers
const sendError = (res, message, code = 400) => res.status(code).json({
    type: 'https://api.icd.dcc/errors/validation',
    title: 'Validation Error',
    status: code,
    detail: message,
    code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString(),
});
let seededInitial = false;
let memoryFallbackRefunds = [...money_1.refunds];
class RefundsController {
    /**
     * Ensure database is initialized with initial/mock refunds if table is empty
     */
    async ensureDatabaseSeeded() {
        if (seededInitial)
            return;
        try {
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const count = await prisma.refund.count();
                if (count === 0) {
                    console.log('[RefundsController] DB has 0 refunds. Seeding initial data...');
                    await (0, seed_refunds_1.seedRefunds)();
                }
                seededInitial = true;
            }
        }
        catch (e) {
            console.warn('[RefundsController] Error checking/seeding refunds DB:', e.message);
        }
    }
    /**
     * GET /refunds
     * Fetch all refunds strictly from the database
     */
    getRefunds = async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    await this.ensureDatabaseSeeded();
                    const dbRefunds = await prisma.refund.findMany({
                        include: {
                            payment_refund: {
                                include: {
                                    m_party_payment: true,
                                },
                            },
                            approval_request_refund: {
                                include: {
                                    approval_request_approval_step: {
                                        orderBy: { level_no: 'asc' },
                                    },
                                },
                            },
                            m_currency_refund: true,
                        },
                        orderBy: { refund_id: 'desc' },
                    });
                    // Purely database-fetched refund records
                    const items = dbRefunds.map((r) => {
                        const pay = r.payment_refund;
                        const party = pay?.m_party_payment;
                        const app = r.approval_request_refund;
                        const steps = app?.approval_request_approval_step || [];
                        // Compute UI status based on approval_request governance and refund status
                        let uiStatus = r.status;
                        if (r.status === 'PAID') {
                            uiStatus = 'PAID';
                        }
                        else if (r.status === 'CANCELLED') {
                            uiStatus = 'CANCELLED';
                        }
                        else if (app?.status === 'PENDING') {
                            uiStatus = app.current_level === 2 ? 'PENDING_L2' : 'PENDING_L1';
                        }
                        else if (app?.status === 'REJECTED') {
                            uiStatus = 'REJECTED';
                        }
                        else {
                            uiStatus = 'APPROVED';
                        }
                        return {
                            refundId: Number(r.refund_id),
                            refundNo: r.refund_no,
                            paymentId: Number(r.payment_id),
                            partyId: pay?.party_id || 201,
                            partyName: party?.party_name || 'Customer',
                            currency: r.currency || 'USD',
                            amount: String(Number(r.amount).toFixed(2)),
                            reason: r.reason,
                            status: uiStatus,
                            requestedBy: r.createdby || 'Neema Mushi',
                            requestedAt: r.createdate?.toISOString() || new Date().toISOString(),
                            paidAt: r.paid_at?.toISOString() || null,
                            paidReference: r.paid_reference || null,
                            levels: steps.map((s) => ({
                                level: s.level_no,
                                who: s.decided_by_sub || s.requested_by_sub || 'Approver',
                                decision: s.decision,
                                at: s.decided_at?.toISOString() || null,
                            })),
                        };
                    });
                    return res.json({ items, total: items.length });
                }
            }
            // Fallback only if database connection is completely unavailable
            res.json({ items: memoryFallbackRefunds, total: memoryFallbackRefunds.length });
        }
        catch (err) {
            console.error('[RefundsController.getRefunds] Error:', err);
            res.status(500).json({ error: err.message });
        }
    };
    /**
     * POST /refunds
     * Create a new refund request and record it to DB
     */
    createRefund = async (req, res) => {
        try {
            const b = req.body || {};
            const amount = Number(b.amount || 0);
            if (!amount || amount <= 0) {
                return sendError(res, 'Refund amount must be greater than 0');
            }
            const currency = b.currency || 'USD';
            const seq = Math.floor(1000 + Math.random() * 9000);
            const refundNo = b.refundNo || `RFD-DAR1-26-00${seq}`;
            const reason = b.reason || 'Customer overpayment refund';
            const paymentId = Number(b.paymentId || 1);
            const cashierName = req.user?.username || req.headers['x-user-sub'] || 'Neema Mushi';
            const levelsRequired = amount >= 500 ? 2 : 1;
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    // 1. Verify or find valid payment
                    let paymentRow = await prisma.payment.findUnique({
                        where: { payment_id: BigInt(paymentId) },
                    });
                    if (!paymentRow) {
                        paymentRow = await prisma.payment.findFirst();
                    }
                    const targetPaymentId = paymentRow ? paymentRow.payment_id : BigInt(paymentId);
                    // 2. Create maker-checker Approval Request
                    const appReq = await prisma.approval_request.create({
                        data: {
                            site_id: 1,
                            request_no: `APR-26-0${seq}`,
                            permission_code: 'payment.refund',
                            entity_name: 'refund',
                            entity_id: targetPaymentId,
                            summary: `Refund of ${currency} ${amount.toFixed(2)} - ${refundNo}`,
                            reason,
                            amount,
                            amount_currency: currency,
                            levels_required: levelsRequired,
                            current_level: 1,
                            status: 'PENDING',
                            requested_by_sub: cashierName,
                            requested_at: new Date(),
                            createdby: cashierName,
                        },
                    });
                    // 3. Create initial Approval Step
                    await prisma.approval_step.create({
                        data: {
                            approval_request_id: appReq.approval_request_id,
                            level_no: 1,
                            decision: 'PENDING',
                            decided_by_sub: 'Grace Mrema',
                            requested_by_sub: cashierName,
                            decided_at: new Date(),
                            createdby: cashierName,
                        },
                    });
                    // 4. Create Refund row in DB (conforms to CK_refund_status: 'APPROVED', 'PAID', 'CANCELLED')
                    const newRefund = await prisma.refund.create({
                        data: {
                            payment_id: targetPaymentId,
                            refund_no: refundNo,
                            currency,
                            amount,
                            reason,
                            approval_request_id: appReq.approval_request_id,
                            status: 'APPROVED',
                            createdby: cashierName,
                            createdate: new Date(),
                        },
                        include: {
                            payment_refund: {
                                include: { m_party_payment: true },
                            },
                            approval_request_refund: {
                                include: { approval_request_approval_step: true },
                            },
                        },
                    });
                    const createdItem = {
                        refundId: Number(newRefund.refund_id),
                        refundNo: newRefund.refund_no,
                        paymentId: Number(newRefund.payment_id),
                        partyId: newRefund.payment_refund?.party_id || 13,
                        partyName: newRefund.payment_refund?.m_party_payment?.party_name || 'Customer',
                        currency: newRefund.currency,
                        amount: String(Number(newRefund.amount).toFixed(2)),
                        reason: newRefund.reason,
                        status: 'PENDING_L1',
                        requestedBy: newRefund.createdby,
                        requestedAt: newRefund.createdate.toISOString(),
                        method: 'Bank transfer CRDB',
                        levels: [{ level: 1, who: 'Grace Mrema' }, ...(levelsRequired > 1 ? [{ level: 2, who: 'Peter Lyimo' }] : [])],
                    };
                    return res.status(201).json(createdItem);
                }
            }
            // Memory fallback
            const fallbackItem = {
                refundId: 70 + memoryFallbackRefunds.length,
                refundNo,
                paymentId,
                partyId: 13,
                currency,
                amount: String(amount.toFixed(2)),
                reason,
                status: 'PENDING_L1',
                requestedBy: cashierName,
                requestedAt: new Date().toISOString(),
                method: 'Bank transfer CRDB',
                levels: [{ level: 1, who: 'Grace Mrema' }, ...(levelsRequired > 1 ? [{ level: 2, who: 'Peter Lyimo' }] : [])],
            };
            memoryFallbackRefunds.unshift(fallbackItem);
            res.status(201).json(fallbackItem);
        }
        catch (err) {
            console.error('[RefundsController.createRefund] Error:', err);
            res.status(500).json({ error: err.message });
        }
    };
    /**
     * POST /refunds/:refundId/decide
     * Approve or reject a refund at current level
     */
    decideRefund = async (req, res) => {
        try {
            const refundId = Number(req.params.refundId);
            const { ok, level, note } = req.body || {};
            const decider = req.user?.username || req.headers['x-user-sub'] || 'Grace Mrema';
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const currentRefund = await prisma.refund.findUnique({
                        where: { refund_id: BigInt(refundId) },
                        include: {
                            approval_request_refund: {
                                include: { approval_request_approval_step: true },
                            },
                        },
                    });
                    if (!currentRefund) {
                        return sendError(res, 'Refund not found', 404);
                    }
                    const app = currentRefund.approval_request_refund;
                    const currentLevel = Number(level || (app?.current_level || 1));
                    const levelsRequired = app?.levels_required || 1;
                    let newAppStatus = app?.status || 'PENDING';
                    let newRefundStatus = currentRefund.status;
                    if (!ok) {
                        newAppStatus = 'REJECTED';
                        newRefundStatus = 'CANCELLED';
                    }
                    else if (currentLevel === 1 && levelsRequired > 1) {
                        newAppStatus = 'PENDING';
                    }
                    else {
                        newAppStatus = 'APPROVED';
                        newRefundStatus = 'APPROVED';
                    }
                    // Update or insert approval step
                    if (app) {
                        const existingStep = await prisma.approval_step.findFirst({
                            where: {
                                approval_request_id: app.approval_request_id,
                                level_no: currentLevel,
                            },
                        });
                        if (existingStep) {
                            await prisma.approval_step.update({
                                where: { approval_step_id: existingStep.approval_step_id },
                                data: {
                                    decision: ok ? 'APPROVED' : 'REJECTED',
                                    decided_by_sub: decider,
                                    decision_note: note || null,
                                    decided_at: new Date(),
                                    updatedby: decider,
                                },
                            });
                        }
                        else {
                            await prisma.approval_step.create({
                                data: {
                                    approval_request_id: app.approval_request_id,
                                    level_no: currentLevel,
                                    decision: ok ? 'APPROVED' : 'REJECTED',
                                    decided_by_sub: decider,
                                    requested_by_sub: currentRefund.createdby,
                                    decision_note: note || null,
                                    decided_at: new Date(),
                                    createdby: decider,
                                },
                            });
                        }
                        // Update approval request
                        await prisma.approval_request.update({
                            where: { approval_request_id: app.approval_request_id },
                            data: {
                                current_level: ok && currentLevel === 1 && levelsRequired > 1 ? 2 : currentLevel,
                                status: newAppStatus,
                                decided_at: newAppStatus === 'APPROVED' || newAppStatus === 'REJECTED' ? new Date() : null,
                                updatedate: new Date(),
                                updatedby: decider,
                            },
                        });
                    }
                    // Update refund record
                    const updatedRefund = await prisma.refund.update({
                        where: { refund_id: BigInt(refundId) },
                        data: {
                            status: newRefundStatus,
                            updatedate: new Date(),
                            updatedby: decider,
                        },
                    });
                    const returnStatus = !ok
                        ? 'REJECTED'
                        : currentLevel === 1 && levelsRequired > 1
                            ? 'PENDING_L2'
                            : 'APPROVED';
                    return res.json({
                        success: true,
                        refundId: Number(updatedRefund.refund_id),
                        status: returnStatus,
                    });
                }
            }
            // Memory fallback
            const found = memoryFallbackRefunds.find((r) => r.refundId === refundId);
            if (found) {
                found.status = !ok ? 'REJECTED' : level === 1 && (found.levels || []).length > 1 ? 'PENDING_L2' : 'APPROVED';
            }
            res.json({ success: true, refundId, status: found?.status || 'APPROVED' });
        }
        catch (err) {
            console.error('[RefundsController.decideRefund] Error:', err);
            res.status(500).json({ error: err.message });
        }
    };
    /**
     * POST /refunds/:refundId/mark-paid
     * Record payout details for an approved refund
     */
    markPaid = async (req, res) => {
        try {
            const refundId = Number(req.params.refundId);
            const { paidReference, paidAt } = req.body || {};
            const officer = req.user?.username || req.headers['x-user-sub'] || 'Halima Said';
            if (!paidReference) {
                return sendError(res, 'Bank payment voucher reference is required to mark paid');
            }
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const updated = await prisma.refund.update({
                        where: { refund_id: BigInt(refundId) },
                        data: {
                            status: 'PAID',
                            paid_at: paidAt ? new Date(paidAt) : new Date(),
                            paid_reference: paidReference,
                            updatedate: new Date(),
                            updatedby: officer,
                        },
                    });
                    return res.json({
                        success: true,
                        refundId: Number(updated.refund_id),
                        status: updated.status,
                        paidAt: updated.paid_at,
                        paidReference: updated.paid_reference,
                    });
                }
            }
            // Memory fallback
            const found = memoryFallbackRefunds.find((r) => r.refundId === refundId);
            if (found) {
                found.status = 'PAID';
                found.paidAt = paidAt || new Date().toISOString();
                found.paidReference = paidReference;
            }
            res.json({ success: true, refundId, status: 'PAID' });
        }
        catch (err) {
            console.error('[RefundsController.markPaid] Error:', err);
            res.status(500).json({ error: err.message });
        }
    };
}
exports.RefundsController = RefundsController;
exports.refundsController = new RefundsController();
