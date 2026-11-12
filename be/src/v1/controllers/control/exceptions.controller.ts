import { Request, Response } from 'express';
import { exceptions } from '../../../data/control';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const controlExceptionsController = {
  getExceptions: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).exception_case) {
          const dbExceptions = await (prisma as any).exception_case.findMany({
            include: { m_exception_type: true },
            orderBy: { exception_case_id: 'desc' },
          });
          if (dbExceptions && dbExceptions.length > 0) {
            const items = dbExceptions.map((e: any) => ({
              exceptionId: e.exception_case_id ? String(e.exception_case_id) : e.case_no,
              caseNo: e.case_no,
              exceptionTypeCode: e.m_exception_type?.exception_code || 'GATE_WEIGHT_DISCREPANCY',
              exceptionTypeName: e.m_exception_type?.exception_name || 'Weight Discrepancy',
              severity: e.severity || 'HIGH',
              status: e.status || 'OPEN',
              title: e.title,
              details: e.description || e.title,
              raisedAt: e.raised_at,
              dueAt: e.due_at,
              escalationLevel: e.escalation_level,
              resolutionCode: e.resolution_code,
              resolutionNotes: e.resolution_note,
              resolvedAt: e.resolved_at,
            }));
            return res.json({ items, total: items.length });
          }
        }
      }
      res.json({ items: exceptions, total: exceptions.length });
    } catch (err: any) {
      console.warn('[controlExceptionsController] Falling back to mock data due to:', err.message);
      res.json({ items: exceptions, total: exceptions.length });
    }
  },

  resolveException: async (req: Request, res: Response) => {
    try {
      const { exceptionId } = req.params;
      const { resolution, resolutionNotes } = req.body;
      const prisma = getPrisma();
      if (prisma && isDbLive() && (prisma as any).exception_case) {
        const isNumeric = /^\d+$/.test(exceptionId);
        const whereClause = isNumeric
          ? { exception_case_id: BigInt(exceptionId) }
          : { case_no: exceptionId };

        const updated = await (prisma as any).exception_case.update({
          where: whereClause,
          data: {
            status: 'RESOLVED',
            resolution_code: resolution || 'AUTHORIZED_EXCEPTION',
            resolution_note: resolutionNotes || '',
            resolved_at: new Date(),
          },
        });
        return res.json(updated);
      }
      const item = exceptions.find(
        (e: any) => String(e.exceptionCaseId || e.exceptionId) === exceptionId || e.caseNo === exceptionId
      );
      if (item) (item as any).status = 'RESOLVED';
      res.json(item || { success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
