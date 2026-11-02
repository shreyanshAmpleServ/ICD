import { Request, Response } from 'express';
import { exceptions } from '../../../data/control';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const controlExceptionsController = {
  getExceptions: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const dbExceptions = await prisma.exceptions.findMany({
            include: { exception_types: true },
            orderBy: { exception_id: 'desc' },
          });
          if (dbExceptions && dbExceptions.length > 0) {
            const items = dbExceptions.map((e: any) => ({
              exceptionId: e.exception_id,
              exceptionTypeCode: e.exception_types?.type_code || 'GATE_WEIGHT_DISCREPANCY',
              exceptionTypeName: e.exception_types?.type_name || 'Weight Discrepancy',
              severity: e.severity || 'HIGH',
              status: e.status || 'OPEN',
              details: e.details,
              raisedAt: e.raised_at,
            }));
            return res.json({ items, total: items.length });
          }
        }
      }
      res.json({ items: exceptions, total: exceptions.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  resolveException: async (req: Request, res: Response) => {
    try {
      const { exceptionId } = req.params;
      const { resolution, resolutionNotes } = req.body;
      const prisma = getPrisma();
      if (prisma) {
        const updated = await prisma.exceptions.update({
          where: { exception_id: Number(exceptionId) },
          data: {
            status: 'RESOLVED',
            resolution_code: resolution || 'AUTHORIZED_EXCEPTION',
            resolution_notes: resolutionNotes || '',
            resolved_at: new Date(),
          },
        });
        return res.json(updated);
      }
      const item = exceptions.find((e: any) => String(e.exceptionId) === exceptionId);
      if (item) (item as any).status = 'RESOLVED';
      res.json(item || { success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

