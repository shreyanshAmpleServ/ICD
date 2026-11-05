"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlApprovalsController = void 0;
const control_1 = require("../../../data/control");
const cargo_1 = require("../../../data/cargo");
const prisma_1 = require("../../../db/prisma");
exports.controlApprovalsController = {
    getApprovals: async (req, res) => {
        try {
            const statusParam = req.query.status;
            const siteIdParam = req.query.siteId ? Number(req.query.siteId) : undefined;
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const whereClause = {};
                    if (statusParam) {
                        whereClause.status = statusParam.toUpperCase();
                    }
                    if (siteIdParam) {
                        whereClause.site_id = siteIdParam;
                    }
                    const dbApprovals = await prisma.approval_request.findMany({
                        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
                        include: {
                            m_permission_approval_request: true,
                            m_site_approval_request: true,
                        },
                        orderBy: { approval_request_id: 'desc' },
                    });
                    if (dbApprovals) {
                        const items = dbApprovals.map((a) => ({
                            approvalRequestId: Number(a.approval_request_id),
                            approvalId: Number(a.approval_request_id),
                            requestNo: a.request_no,
                            permissionCode: a.permission_code,
                            policyName: a.m_permission_approval_request?.permission_name || a.permission_code,
                            entityName: a.entity_name,
                            entityId: Number(a.entity_id),
                            summary: a.summary,
                            reason: a.reason,
                            amount: a.amount ? Number(a.amount) : null,
                            amountCurrency: a.amount_currency || 'USD',
                            levelsRequired: a.levels_required || 1,
                            currentLevel: a.current_level || 1,
                            status: a.status,
                            requestedBy: `${a.requested_by_sub} · ${a.createdby || 'Officer'}`,
                            requestedAt: a.requested_at?.toISOString() || new Date().toISOString(),
                            expiresAt: a.expires_at?.toISOString() || null,
                            decidedAt: a.decided_at?.toISOString() || null,
                            canDecide: true,
                            mine: false,
                            siteCode: a.m_site_approval_request?.site_code || 'DAR1',
                        }));
                        // Return both items array and wrapper for client flexibility
                        return res.json({ items, total: items.length });
                    }
                }
            }
            let fallback = cargo_1.allApprovals || control_1.approvals;
            if (statusParam) {
                fallback = fallback.filter((a) => a.status === statusParam);
            }
            res.json({ items: fallback, total: fallback.length });
        }
        catch (err) {
            console.error('[ApprovalsController] getApprovals error:', err);
            res.status(500).json({ error: err.message });
        }
    },
    actionApproval: async (req, res) => {
        try {
            const approvalId = req.params.approvalId || req.params.requestId;
            const { action, comments, reason } = req.body || {};
            const newStatus = action === 'APPROVE' || action === 'APPROVED' ? 'APPROVED' : 'REJECTED';
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const updated = await prisma.approval_request.update({
                        where: { approval_request_id: BigInt(approvalId) },
                        data: {
                            status: newStatus,
                            decided_at: new Date(),
                            updatedate: new Date(),
                            updatedby: req.headers['x-user-sub'] ? String(req.headers['x-user-sub']) : 'Ashok K.',
                        },
                    });
                    return res.json({
                        success: true,
                        approvalRequestId: Number(updated.approval_request_id),
                        status: updated.status,
                        decidedAt: updated.decided_at,
                    });
                }
            }
            res.json({ success: true, approvalId, status: newStatus });
        }
        catch (err) {
            console.error('[ApprovalsController] actionApproval error:', err);
            res.status(500).json({ error: err.message });
        }
    },
};
