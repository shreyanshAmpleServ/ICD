import { Request, Response } from 'express';
import { getPrisma } from '../../../db/prisma';

export const controlApprovalsController = {
  getApprovals: async (req: Request, res: Response) => {
    try {
      const statusParam = req.query.status as string;
      const siteIdParam = req.query.siteId ? Number(req.query.siteId) : undefined;

      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable', items: [], total: 0 });
      }

      const whereClause: any = {};
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
          approval_request_approval_step: {
            orderBy: { level_no: 'asc' },
          },
        },
        orderBy: { approval_request_id: 'desc' },
      });

      const items = dbApprovals.map((a: any) => {
        const steps = (a.approval_request_approval_step || []).map((s: any) => ({
          stepId: Number(s.approval_step_id),
          levelNo: s.level_no,
          decision: s.decision,
          decidedBy: s.createdby || s.decided_by_sub || 'Approver',
          onBehalfOf: s.on_behalf_of_sub || undefined,
          note: s.decision_note || undefined,
          decidedAt: s.decided_at instanceof Date ? s.decided_at.toISOString() : String(s.decided_at),
        }));

        return {
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
          currentLevel: a.current_level || 0,
          status: a.status,
          requestedBy: `${a.requested_by_sub} · ${a.createdby || 'Officer'}`,
          requestedAt: a.requested_at instanceof Date ? a.requested_at.toISOString() : (a.createdate instanceof Date ? a.createdate.toISOString() : new Date().toISOString()),
          expiresAt: a.expires_at ? (a.expires_at instanceof Date ? a.expires_at.toISOString() : String(a.expires_at)) : null,
          decidedAt: a.decided_at ? (a.decided_at instanceof Date ? a.decided_at.toISOString() : String(a.decided_at)) : null,
          canDecide: a.status === 'PENDING',
          mine: false,
          siteCode: a.m_site_approval_request?.site_code || 'DAR1',
          steps,
        };
      });

      return res.json({ items, total: items.length });
    } catch (err: any) {
      console.error('[ApprovalsController] getApprovals error:', err);
      res.status(500).json({ error: err.message, items: [], total: 0 });
    }
  },

  actionApproval: async (req: Request, res: Response) => {
    try {
      const approvalIdParam = req.params.approvalId || req.params.requestId;
      const { action, comments, reason } = req.body || {};
      const isApprove = action === 'APPROVE' || action === 'APPROVED';
      const deciderSub = (req.headers['x-user-sub'] as string) || (req as any).user?.username || 'Ashok K.';

      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      let existing = null;
      if (approvalIdParam) {
        // Direct request_no lookup (e.g. 'APR-CT-003' or 'APR-26-000070')
        if (String(approvalIdParam).startsWith('APR-')) {
          existing = await prisma.approval_request.findUnique({
            where: { request_no: String(approvalIdParam) },
          });
        }
        // Numeric primary key lookup
        const cleanDigits = String(approvalIdParam).replace(/[^0-9]/g, '');
        if (!existing && cleanDigits) {
          existing = await prisma.approval_request.findUnique({
            where: { approval_request_id: BigInt(cleanDigits) },
          });
        }
        // General query fallback by request_no
        if (!existing) {
          existing = await prisma.approval_request.findFirst({
            where: {
              OR: [
                { request_no: String(approvalIdParam) },
                { request_no: { contains: String(approvalIdParam) } },
              ],
            },
          });
        }
      }

      if (!existing) {
        return res.status(404).json({ error: `Approval request #${approvalIdParam} not found` });
      }

      const currentLvl = existing.current_level || 0;
      const nextLvl = currentLvl + 1;
      const isDone = !isApprove || nextLvl >= (existing.levels_required || 1);
      const newStatus = !isApprove ? 'REJECTED' : isDone ? 'APPROVED' : 'PENDING';

      // Record approval step in database
      try {
        await prisma.approval_step.create({
          data: {
            approval_request_id: existing.approval_request_id,
            level_no: nextLvl,
            decision: isApprove ? 'APPROVE' : 'REJECT',
            decided_by_sub: deciderSub,
            requested_by_sub: existing.requested_by_sub || 'system',
            decision_note: comments || reason || null,
            createdby: deciderSub,
          },
        });
      } catch (stepErr: any) {
        console.warn('[ApprovalsController] Notice recording step:', stepErr.message);
      }

      // Update approval_request state
      const updated = await prisma.approval_request.update({
        where: { approval_request_id: existing.approval_request_id },
        data: {
          status: newStatus,
          current_level: isDone ? existing.levels_required : nextLvl,
          decided_at: isDone ? new Date() : null,
          updatedate: new Date(),
          updatedby: deciderSub,
        },
      });

      // Update associated entity if finished
      if (isDone) {
        if (existing.entity_name === 'refund') {
          await prisma.refund.updateMany({
            where: { approval_request_id: existing.approval_request_id },
            data: {
              status: newStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED',
              updatedate: new Date(),
              updatedby: deciderSub,
            },
          });
        } else if (existing.entity_name === 'disbursement') {
          await prisma.disbursement.updateMany({
            where: { write_off_approval_request_id: existing.approval_request_id },
            data: {
              status: newStatus === 'APPROVED' ? 'WRITTEN_OFF' : 'RECORDED',
              updatedate: new Date(),
              updatedby: deciderSub,
            },
          });
        }
      }

      return res.json({
        success: true,
        approvalRequestId: Number(updated.approval_request_id),
        status: updated.status,
        decidedAt: updated.decided_at,
        currentLevel: updated.current_level,
      });
    } catch (err: any) {
      console.error('[ApprovalsController] actionApproval error:', err);
      res.status(500).json({ error: err.message });
    }
  },
};
