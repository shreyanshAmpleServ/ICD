import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const controlAuditController = {
  getAuditTrail: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const audit = await prisma.audit_log.findMany({
            include: { users: true },
            orderBy: { audit_id: 'desc' },
            take: 50,
          });
          if (audit && audit.length > 0) {
            const items = audit.map((a: any) => ({
              auditId: a.audit_id,
              entityName: a.entity_name,
              entityId: a.entity_id,
              action: a.action,
              changedBy: a.users?.display_name || a.users?.username || 'System',
              changedAt: a.changed_at,
              details: a.diff_json,
            }));
            return res.json({ items, total: items.length });
          }
        }
      }
      res.json({
        items: [
          { auditId: 1, entityName: 'TruckVisit', entityId: '101', action: 'STATUS_UPDATE', changedBy: 'Gate Officer', changedAt: new Date().toISOString() },
          { auditId: 2, entityName: 'Hold', entityId: '5', action: 'RELEASE', changedBy: 'Customs Officer', changedAt: new Date(Date.now() - 3600000).toISOString() },
        ],
        total: 2,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

