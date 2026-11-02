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
        const dbCodes = await prisma.m_repair_code.findMany({
          where: { is_active: true },
          orderBy: { repair_code: "asc" },
        });

        const items = (dbCodes || []).map((rc: any) => ({
          repairCode: rc.repair_code,
          repairName: rc.repair_name,
          defaultLabourHours: String(rc.default_labour_hours ?? 1.5),
          isActive: rc.is_active ?? true,
        }));

        return res.json(items);
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
        const code = req.body.repairCode || req.body.code || `RC_${Date.now()}`;
        const created = await prisma.m_repair_code.create({
          data: {
            repair_code: code,
            repair_name: req.body.repairName || req.body.name || "Repair operation",
            default_labour_hours: req.body.defaultLabourHours ? parseFloat(req.body.defaultLabourHours) : 1.5,
            is_active: true,
            createdby: "system",
          },
        });

        return sendCreated(res, {
          repairCode: created.repair_code,
          repairName: created.repair_name,
          defaultLabourHours: String(created.default_labour_hours),
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
        const code = String(req.params.repairCodeId || req.params.id);
        const rc = await prisma.m_repair_code.findUnique({
          where: { repair_code: code },
        });

        if(!rc) return sendError(res, "Repair code not found", 404);

          return res.json({
            repairCode: rc.repair_code,
            repairName: rc.repair_name,
            defaultLabourHours: String(rc.default_labour_hours),
            isActive: rc.is_active,
          });
        } catch(err: any) {
          return sendError(res, err.message, 500);
        }
      };

  public updateCode = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
        const code = String(req.params.repairCodeId || req.params.id);
        const updated = await prisma.m_repair_code.update({
          where: { repair_code: code },
          data: {
            repair_name: req.body.repairName || req.body.name,
            default_labour_hours: req.body.defaultLabourHours ? parseFloat(req.body.defaultLabourHours) : undefined,
            is_active: req.body.isActive,
          },
        });

        return sendSuccess(res, {
          repairCode: updated.repair_code,
          repairName: updated.repair_name,
          defaultLabourHours: String(updated.default_labour_hours),
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
        const dbEst = await prisma.repair_estimate.findMany({
          include: {
            repair_estimate_unit_stays: {
              include: {
                unit_stay_cargo_units: {
                  include: { cargo_unit_unit_types: true },
                },
                unit_stay_yard_locations: true,
              },
            },
            m_party_repair_estimate: true,
            repair_estimate_lines: {
              orderBy: { line_no: "asc" },
            },
          },
          orderBy: { repair_estimate_id: "desc" },
        });

        const items = (dbEst || []).map((e: any) => {
          const u = e.repair_estimate_unit_stays?.unit_stay_cargo_units;
          const lines = (e.repair_estimate_lines || []).map((l: any) => ({
            repairEstimateLineId: Number(l.repair_estimate_line_id),
            lineNo: l.line_no,
            repairCode: l.repair_code,
            locationDetail: l.location_detail || "",
            quantity: String(l.quantity),
            labourHours: String(l.labour_hours),
            labourCost: String(l.labour_cost),
            materialCost: String(l.material_cost),
            responsibility: l.responsibility,
            lineStatus: l.line_status,
          }));

          const tl = Number(e.total_labour ?? 0);
          const tm = Number(e.total_material ?? 0);

          return {
            repairEstimateId: Number(e.repair_estimate_id),
            estimateNo: e.estimate_no,
            createdAt: e.createdate.toISOString(),
            unitStayId: Number(e.unit_stay_id),
            unitNo: u?.unit_no || "MSKU 402117 8",
            unitType: u?.cargo_unit_unit_types?.type_code || "40HC",
            location: e.repair_estimate_unit_stays?.unit_stay_yard_locations?.full_code || "C-02-04",
            lineCode: e.m_party_repair_estimate?.party_code || "MSK",
            approverPartyId: e.approver_party_id,
            currency: e.currency,
            labourRate: String(e.labour_rate ?? 18),
            totalLabour: String(tl),
            totalMaterial: String(tm),
            totalAmount: String(tl + tm),
            status: e.status,
            sentAt: e.sent_at?.toISOString() || undefined,
            approverRef: e.approver_ref || undefined,
            decidedAt: e.decided_at?.toISOString() || undefined,
            completedAt: e.completed_at?.toISOString() || undefined,
            inspectionId: e.inspection_id ? Number(e.inspection_id) : undefined,
            lines,
          };
        });

        return res.json(items);
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
      const siteId = Number(req.siteId || req.body.siteId) || 1;
      const unitStayId = Number(req.body.unitStayId) || 1;
      const partyId = Number(req.body.approverPartyId || req.body.partyId) || 1;
      const labourRate = req.body.labourRate ? parseFloat(req.body.labourRate) : 18.0;

        const lines = req.body.lines || [
          {
            line_no: 1,
            repair_code: "STR-DT",
            location_detail: "Front end",
            quantity: 1,
            labour_hours: 1.5,
            labour_cost: 27.0,
            material_cost: 0.0,
            responsibility: "OWNER",
            line_status: "PROPOSED",
          },
        ];

        const totLab = lines.reduce((a: number, l: any) => a + Number(l.labourCost || l.labour_cost || 0), 0);
        const totMat = lines.reduce((a: number, l: any) => a + Number(l.materialCost || l.material_cost || 0), 0);

        const created = await prisma.repair_estimate.create({
          data: {
            site_id: siteId,
            estimate_no: `EST-26-0${Date.now().toString().slice(-4)}`,
            unit_stay_id: unitStayId,
            approver_party_id: partyId,
            currency: "USD",
            labour_rate: labourRate,
            total_labour: totLab,
            total_material: totMat,
            status: "DRAFT",
            inspection_id: req.body.inspectionId ? Number(req.body.inspectionId) : null,
            createdby: "system",
            repair_estimate_lines: {
              create: lines.map((l: any, i: number) => ({
                line_no: l.lineNo || l.line_no || i + 1,
                repair_code: l.repairCode || l.repair_code || "STR-DT",
                location_detail: l.locationDetail || l.location_detail || "",
                quantity: l.quantity ? parseFloat(l.quantity) : 1,
                labour_hours: l.labourHours ? parseFloat(l.labourHours) : 1.5,
                labour_cost: l.labourCost ? parseFloat(l.labourCost) : 27.0,
                material_cost: l.materialCost ? parseFloat(l.materialCost) : 0.0,
                responsibility: l.responsibility || "OWNER",
                line_status: l.lineStatus || l.line_status || "PROPOSED",
                createdby: "system",
              })),
            },
          },
          include: {
            repair_estimate_lines: true,
            repair_estimate_unit_stays: {
              include: {
                unit_stay_cargo_units: {
                  include: { cargo_unit_unit_types: true },
                },
              },
            },
            m_party_repair_estimate: true,
          },
        });

        const u = created.repair_estimate_unit_stays?.unit_stay_cargo_units;
        return sendCreated(res, {
          repairEstimateId: Number(created.repair_estimate_id),
          estimateNo: created.estimate_no,
          createdAt: created.createdate.toISOString(),
          unitStayId: Number(created.unit_stay_id),
          unitNo: u?.unit_no || "MSKU 402117 8",
          unitType: u?.cargo_unit_unit_types?.type_code || "40HC",
          lineCode: created.m_party_repair_estimate?.party_code || "MSK",
          totalAmount: String(totLab + totMat),
          status: created.status,
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
        const id = parseInt(req.params.repairEstimateId || req.params.id, 10);
        const e = await prisma.repair_estimate.findUnique({
          where: { repair_estimate_id: id },
          include: {
            repair_estimate_unit_stays: {
              include: {
                unit_stay_cargo_units: {
                  include: { cargo_unit_unit_types: true },
                },
                unit_stay_yard_locations: true,
              },
            },
            m_party_repair_estimate: true,
            repair_estimate_lines: {
              orderBy: { line_no: "asc" },
            },
          },
        });

        if(!e) return sendError(res, "Repair estimate not found", 404);

        const u = e.repair_estimate_unit_stays?.unit_stay_cargo_units;
        const lines = (e.repair_estimate_lines || []).map((l: any) => ({
          repairEstimateLineId: Number(l.repair_estimate_line_id),
          lineNo: l.line_no,
          repairCode: l.repair_code,
          locationDetail: l.location_detail || "",
          quantity: String(l.quantity),
          labourHours: String(l.labour_hours),
          labourCost: String(l.labour_cost),
          materialCost: String(l.material_cost),
          responsibility: l.responsibility,
          lineStatus: l.line_status,
        }));

        const tl = Number(e.total_labour ?? 0);
        const tm = Number(e.total_material ?? 0);

        const result = {
          repairEstimateId: Number(e.repair_estimate_id),
          estimateNo: e.estimate_no,
          createdAt: e.createdate.toISOString(),
          unitStayId: Number(e.unit_stay_id),
          unitNo: u?.unit_no || "MSKU 402117 8",
          unitType: u?.cargo_unit_unit_types?.type_code || "40HC",
          location: e.repair_estimate_unit_stays?.unit_stay_yard_locations?.full_code || "C-02-04",
          lineCode: e.m_party_repair_estimate?.party_code || "MSK",
          approverPartyId: e.approver_party_id,
          currency: e.currency,
          labourRate: String(e.labour_rate ?? 18),
          totalLabour: String(tl),
          totalMaterial: String(tm),
          totalAmount: String(tl + tm),
          status: e.status,
          sentAt: e.sent_at?.toISOString() || undefined,
          approverRef: e.approver_ref || undefined,
          decidedAt: e.decided_at?.toISOString() || undefined,
          completedAt: e.completed_at?.toISOString() || undefined,
          inspectionId: e.inspection_id ? Number(e.inspection_id) : undefined,
          lines,
        };

        return res.json(result);
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
        const id = parseInt(req.params.repairEstimateId || req.params.id, 10);
        const updated = await prisma.repair_estimate.update({
          where: { repair_estimate_id: id },
          data: {
            status: req.body.status,
            approver_ref: req.body.approverRef,
            total_labour: req.body.totalLabour ? parseFloat(req.body.totalLabour) : undefined,
            total_material: req.body.totalMaterial ? parseFloat(req.body.totalMaterial) : undefined,
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
        const id = parseInt(req.params.repairEstimateId || req.params.id, 10);
        const updated = await prisma.repair_estimate.update({
          where: { repair_estimate_id: id },
          data: {
            status: "SENT",
            sent_at: new Date(),
          },
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
        const id = parseInt(req.params.repairEstimateId || req.params.id, 10);
        const decisions = req.body.decisions || {};
        const ref = req.body.ref || "REF-DECISION";

        // Update line items
        const lineIds = Object.keys(decisions).map(Number);
        let approvedCount = 0;
        let totalLines = 0;

        for(const lineId of lineIds) {
          totalLines++;
          const dec = decisions[lineId];
          if (dec === "APPROVED") approvedCount++;
          await prisma.repair_estimate_line.update({
            where: { repair_estimate_line_id: lineId },
            data: { line_status: dec },
          });
        }

      const nextStatus =
          totalLines === 0
            ? "APPROVED"
            : approvedCount === totalLines
              ? "APPROVED"
              : approvedCount === 0
                ? "REJECTED"
                : "PARTIAL";

        const updated = await prisma.repair_estimate.update({
          where: { repair_estimate_id: id },
          data: {
            status: nextStatus,
            approver_ref: ref,
            decided_at: new Date(),
          },
        });

        return sendSuccess(res, { success: true, status: nextStatus, estimate: updated });
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
        const id = parseInt(req.params.repairEstimateId || req.params.id, 10);

        // Mark approved lines as DONE
        await prisma.repair_estimate_line.updateMany({
          where: { repair_estimate_id: id, line_status: "APPROVED" },
          data: { line_status: "DONE" },
        });

        const updated = await prisma.repair_estimate.update({
          where: { repair_estimate_id: id },
          data: {
            status: "COMPLETED",
            completed_at: new Date(),
          },
        });

        return sendSuccess(res, { success: true, estimate: updated });
      } catch (err: any) {
        return sendError(res, err.message, 500);
      }
    };
  }

  export const repairsController = new RepairsController();
