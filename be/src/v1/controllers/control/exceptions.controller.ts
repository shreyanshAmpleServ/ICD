import { Request, Response } from "express";
import { getPrisma } from "../../../db/prisma";

export const controlExceptionsController = {
  getExceptions: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res
          .status(500)
          .json({ error: "Database connection unavailable" });
      }

      const dbExceptions = await prisma.exception_case.findMany({
        include: { m_exception_type: true },
        orderBy: { exception_case_id: "desc" },
      });

      const items = (dbExceptions || []).map((e: any) => ({
        exceptionId: e.exception_case_id
          ? String(e.exception_case_id)
          : e.case_no,
        caseNo: e.case_no,
        exceptionTypeCode:
          e.m_exception_type?.exception_code || "GATE_WEIGHT_DISCREPANCY",
        exceptionTypeName:
          e.m_exception_type?.exception_name || "Weight Discrepancy",
        severity: e.severity || "HIGH",
        status: e.status || "OPEN",
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
    } catch (err: any) {
      console.error("[controlExceptionsController.getExceptions] Error:", err);
      res.status(500).json({ error: err.message });
    }
  },

  resolveException: async (req: Request, res: Response) => {
    try {
      const { exceptionId } = req.params;
      const { resolution, resolutionNotes } = req.body;
      const prisma = getPrisma();
      if (!prisma) {
        return res
          .status(500)
          .json({ error: "Database connection unavailable" });
      }

      const isNumeric = /^\d+$/.test(exceptionId);
      const whereClause = isNumeric
        ? { exception_case_id: BigInt(exceptionId) }
        : { case_no: exceptionId };

      const updated = await prisma.exception_case.update({
        where: whereClause as any,
        data: {
          status: "RESOLVED",
          resolution_code: resolution || "AUTHORIZED_EXCEPTION",
          resolution_note: resolutionNotes || "",
          resolved_at: new Date(),
        },
      });
      return res.json(updated);
    } catch (err: any) {
      console.error(
        "[controlExceptionsController.resolveException] Error:",
        err,
      );
      res.status(500).json({ error: err.message });
    }
  },
};
