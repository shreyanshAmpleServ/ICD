import { Request, Response } from 'express';
import { getPrisma } from '../../../db/prisma';
import { auditLog } from '../../../data/insight';

export const controlAuditController = {
  getAuditTrail: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (prisma) {
        const { entityName, entityId } = req.params;
        const where: any = {};
        if (entityName) where.entity_name = entityName;
        if (entityId) where.entity_id = entityId;

        const dbLogs = await prisma.audit_log.findMany({
          where,
          orderBy: { occurred_at: 'desc' },
          take: 200,
        });

        if (dbLogs && dbLogs.length > 0) {
          const items = dbLogs.map((a: any) => {
            let changes: any = [];
            if (a.changes_json) {
              try {
                changes = JSON.parse(a.changes_json);
              } catch {}
            }
            return {
              auditLogId: Number(a.audit_log_id),
              occurredAt: a.occurred_at ? new Date(a.occurred_at).toISOString() : new Date().toISOString(),
              userSub: a.user_sub,
              userName: a.user_name || a.user_sub || 'System',
              deviceId: a.device_id,
              ipAddress: a.ip_address,
              siteId: a.site_id,
              entityName: a.entity_name,
              entityId: a.entity_id,
              action: a.action,
              reason: a.reason,
              changes,
              summary: a.reason || `${a.action} on ${a.entity_name} ${a.entity_id}`,
              source: a.source || 'UI',
            };
          });
          return res.json({ items, total: items.length });
        }
      }

      // If DB has no audit logs yet, provide the standard catalog audit entries
      res.json({ items: auditLog, total: auditLog.length });
    } catch (err: any) {
      console.warn('[controlAuditController.getAuditTrail] Fallback to auditLog:', err.message);
      res.json({ items: auditLog, total: auditLog.length });
    }
  },
};


