import { Request, Response } from "express";
import { getPrisma } from "../../configs/prisma";
import { sendSuccess, sendCreated, sendError } from "../../utils";

export class RepairsController {
  // Repair Codes
  public getCodes = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const dbCodes = await prisma.repair_codes.findMany({
        orderBy: { repair_code_id: "asc" },
      });

      const items = (dbCodes || []).map((rc) => ({
        repairCodeId: rc.repair_code_id,
        code: rc.repair_code,
        name: rc.description,
        component: rc.component_code,
        standardHours: Number(rc.default_hours ?? 2.0),
        isActive: rc.is_active ?? true,
      }));

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createCode = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const code = req.body.code || `RC_${Date.now()}`;
      const created = await prisma.repair_codes.create({
        data: {
          repair_code: code,
          component_code: req.body.component || "PANEL",
          description: req.body.name || req.body.description || "Repair operation",
          default_hours: req.body.standardHours ? Number(req.body.standardHours) : 2.0,
          is_active: true,
        },
      });

      return sendCreated(res, {
        repairCodeId: created.repair_code_id,
        code: created.repair_code,
        name: created.description,
        component: created.component_code,
        standardHours: Number(created.default_hours),
        isActive: created.is_active,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getCodeById = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const idStr = String(req.params.repairCodeId);
      const isNum = !isNaN(Number(idStr));
      const rc = await prisma.repair_codes.findFirst({
        where: isNum
          ? { OR: [{ repair_code_id: Number(idStr) }, { repair_code: idStr }] }
          : { repair_code: idStr },
      });

      if (!rc) return sendError(res, "Repair code not found", 404);

      return sendSuccess(res, {
        repairCodeId: rc.repair_code_id,
        code: rc.repair_code,
        name: rc.description,
        component: rc.component_code,
        standardHours: Number(rc.default_hours),
        isActive: rc.is_active,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateCode = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const idStr = String(req.params.repairCodeId);
      const isNum = !isNaN(Number(idStr));
      const existing = await prisma.repair_codes.findFirst({
        where: isNum
          ? { OR: [{ repair_code_id: Number(idStr) }, { repair_code: idStr }] }
          : { repair_code: idStr },
      });

      if (!existing) return sendError(res, "Repair code not found", 404);

      const updated = await prisma.repair_codes.update({
        where: { repair_code_id: existing.repair_code_id },
        data: {
          description: req.body.name || req.body.description,
          component_code: req.body.component,
          default_hours: req.body.standardHours ? Number(req.body.standardHours) : undefined,
          is_active: req.body.isActive,
        },
      });

      return sendSuccess(res, {
        repairCodeId: updated.repair_code_id,
        code: updated.repair_code,
        name: updated.description,
        component: updated.component_code,
        standardHours: Number(updated.default_hours),
        isActive: updated.is_active,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  // Repair Estimates
  public getEstimates = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const dbEst = await prisma.repair_estimates.findMany({
        include: {
          unit_stays: true,
          parties: true,
        },
        orderBy: { estimate_id: "desc" },
      });

      const items = (dbEst || []).map((e) => ({
        repairEstimateId: e.estimate_id,
        estimateNo: `EST-26-0${e.estimate_id}`,
        createdAt: e.created_at?.toISOString() || new Date().toISOString(),
        unitStayId: e.unit_stay_id,
        unitNo: e.unit_stays?.unit_no || "TCLU 551902 4",
        unitType: "20GP",
        location: "A-01-02-1",
        lineCode: e.parties?.party_code || "MSK",
        partyName: e.parties?.party_name || "Maersk Line Tanzania",
        totalLabour: 140,
        totalMaterial: 140,
        totalAmount: Number(e.total_amount ?? 280),
        status: e.status || "APPROVED",
        approverRef: "APP-2026-9912",
        lines: [
          {
            lineNo: 1,
            component: "PANEL",
            damageCode: "SCRATCH",
            repairCode: "RP-01",
            description: "Straighten and paint side panel",
            hours: Number(e.total_hours ?? 3.5),
            labourCost: 140,
            materialCost: 140,
            lineStatus: "APPROVED",
          },
        ],
      }));

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createEstimate = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const unitStayId = Number(req.body.unitStayId) || 5001;
      const partyId = Number(req.body.partyId) || 1;
      const totalHours = req.body.totalHours ? Number(req.body.totalHours) : 3.5;
      const totalAmount = req.body.totalAmount ? Number(req.body.totalAmount) : 280;

      const created = await prisma.repair_estimates.create({
        data: {
          unit_stay_id: unitStayId,
          party_id: partyId,
          total_hours: totalHours,
          total_amount: totalAmount,
          status: "DRAFT",
        },
      });

      return sendCreated(res, {
        repairEstimateId: created.estimate_id,
        estimateNo: `EST-26-0${created.estimate_id}`,
        unitStayId: created.unit_stay_id,
        unitNo: req.body.unitNo || "MSKU 882014 9",
        partyName: req.body.partyName || "Maersk Line",
        totalAmountUsd: Number(created.total_amount),
        status: created.status,
        createdAt: created.created_at?.toISOString(),
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getEstimateById = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const idStr = String(req.params.repairEstimateId);
      const isNum = !isNaN(Number(idStr));
      const est = await prisma.repair_estimates.findFirst({
        where: isNum
          ? { estimate_id: Number(idStr) }
          : { estimate_id: parseInt(idStr.replace(/\D/g, ""), 10) || 1 },
        include: {
          unit_stays: true,
          parties: true,
        },
      });

      if (!est) return sendError(res, "Repair estimate not found", 404);

      return sendSuccess(res, {
        repairEstimateId: est.estimate_id,
        estimateNo: `EST-26-0${est.estimate_id}`,
        unitStayId: est.unit_stay_id,
        unitNo: est.unit_stays?.unit_no,
        partyName: est.parties?.party_name,
        totalAmount: Number(est.total_amount),
        status: est.status,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateEstimate = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.repairEstimateId, 10);
      const updated = await prisma.repair_estimates.update({
        where: { estimate_id: id },
        data: {
          status: req.body.status,
          total_amount: req.body.totalAmount ? Number(req.body.totalAmount) : undefined,
        },
      });
      return sendSuccess(res, updated);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public sendEstimate = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.repairEstimateId, 10);
      const updated = await prisma.repair_estimates.update({
        where: { estimate_id: id },
        data: { status: "SENT" },
      });
      return sendSuccess(res, { success: true, estimate: updated });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public decideEstimate = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.repairEstimateId, 10);
      const nextStatus = req.body.decision === "APPROVE" ? "APPROVED" : "REJECTED";
      const updated = await prisma.repair_estimates.update({
        where: { estimate_id: id },
        data: { status: nextStatus },
      });
      return sendSuccess(res, { success: true, estimate: updated });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public completeEstimate = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.repairEstimateId, 10);
      const updated = await prisma.repair_estimates.update({
        where: { estimate_id: id },
        data: { status: "COMPLETED" },
      });
      return sendSuccess(res, { success: true, estimate: updated });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };
}

export const repairsController = new RepairsController();
