import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../configs/prisma';
import { sendSuccess, sendCreated, sendError } from '../../utils';
import { estimates as seedEstimates, repairCodes as seedRepairCodes } from '../../data/ops';

// Resilient in-memory store initialized with seed estimates & repair codes
const inMemoryEstimates: any[] = JSON.parse(JSON.stringify(seedEstimates));
const inMemoryRepairCodes: any[] = JSON.parse(JSON.stringify(seedRepairCodes));

export class RepairsController {
  // Repair Codes
  public getCodes = async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          try {
            const queryPromise = prisma.m_repair_code.findMany({
              where: { is_active: true },
              orderBy: { repair_code: 'asc' },
            });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timeout')), 1200)
            );
            const dbCodes = (await Promise.race([queryPromise, timeoutPromise])) as any[];
            if (dbCodes && dbCodes.length > 0) {
              const items = dbCodes.map((rc: any) => ({
                repairCode: rc.repair_code,
                repairName: rc.repair_name,
                defaultLabourHours: String(rc.default_labour_hours ?? 1.5),
                isActive: rc.is_active ?? true,
              }));
              return res.json(items);
            }
          } catch {
            // fallback to inMemory
          }
        }
      }

      return res.json(inMemoryRepairCodes);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createCode = async (req: Request, res: Response) => {
    try {
      const code = req.body.repairCode || req.body.code || `RC_${Date.now()}`;
      const name = req.body.repairName || req.body.name || 'Repair operation';
      const hours = req.body.defaultLabourHours ? String(req.body.defaultLabourHours) : '1.5';

      const newCode = {
        repairCode: code,
        repairName: name,
        defaultLabourHours: hours,
        isActive: true,
      };

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          try {
            await prisma.m_repair_code.create({
              data: {
                repair_code: code,
                repair_name: name,
                default_labour_hours: parseFloat(hours),
                is_active: true,
                createdby: 'system',
              },
            });
          } catch {
            // fallback
          }
        }
      }

      const existingIdx = inMemoryRepairCodes.findIndex((c) => c.repairCode === code);
      if (existingIdx >= 0) {
        inMemoryRepairCodes[existingIdx] = newCode;
      } else {
        inMemoryRepairCodes.push(newCode);
      }

      return sendCreated(res, newCode);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getCodeById = async (req: Request, res: Response) => {
    try {
      const code = String(req.params.repairCodeId || req.params.id);
      const found = inMemoryRepairCodes.find((c) => c.repairCode === code);
      if (!found) return sendError(res, 'Repair code not found', 404);
      return res.json(found);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateCode = async (req: Request, res: Response) => {
    try {
      const code = String(req.params.repairCodeId || req.params.id);
      const idx = inMemoryRepairCodes.findIndex((c) => c.repairCode === code);
      if (idx === -1) return sendError(res, 'Repair code not found', 404);

      if (req.body.repairName || req.body.name) inMemoryRepairCodes[idx].repairName = req.body.repairName || req.body.name;
      if (req.body.defaultLabourHours) inMemoryRepairCodes[idx].defaultLabourHours = String(req.body.defaultLabourHours);
      if (req.body.isActive !== undefined) inMemoryRepairCodes[idx].isActive = !!req.body.isActive;

      return sendSuccess(res, inMemoryRepairCodes[idx]);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  // Repair Estimates
  public getEstimates = async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          try {
            const queryPromise = prisma.repair_estimate.findMany({
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
                  orderBy: { line_no: 'asc' },
                },
              },
              orderBy: { repair_estimate_id: 'desc' },
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timeout')), 1200)
            );

            const dbEst = (await Promise.race([queryPromise, timeoutPromise])) as any[];

            if (dbEst && dbEst.length > 0) {
              const items = dbEst.map((e: any) => {
                const u = e.repair_estimate_unit_stays?.unit_stay_cargo_units;
                const lines = (e.repair_estimate_lines || []).map((l: any) => ({
                  repairEstimateLineId: Number(l.repair_estimate_line_id),
                  lineNo: l.line_no,
                  repairCode: l.repair_code,
                  locationDetail: l.location_detail || '',
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
                  createdAt: e.createdate ? new Date(e.createdate).toISOString() : new Date().toISOString(),
                  unitStayId: Number(e.unit_stay_id),
                  unitNo: u?.unit_no || 'MSKU 402117 8',
                  unitType: u?.cargo_unit_unit_types?.type_code || '40HC',
                  location: e.repair_estimate_unit_stays?.unit_stay_yard_locations?.full_code || 'C-02-04',
                  lineCode: e.m_party_repair_estimate?.party_code || 'MSK',
                  approverPartyId: e.approver_party_id,
                  currency: e.currency || 'USD',
                  labourRate: String(e.labour_rate ?? 18),
                  totalLabour: String(tl),
                  totalMaterial: String(tm),
                  totalAmount: String(tl + tm),
                  status: e.status,
                  sentAt: e.sent_at ? new Date(e.sent_at).toISOString() : undefined,
                  approverRef: e.approver_ref || undefined,
                  decidedAt: e.decided_at ? new Date(e.decided_at).toISOString() : undefined,
                  completedAt: e.completed_at ? new Date(e.completed_at).toISOString() : undefined,
                  inspectionId: e.inspection_id ? Number(e.inspection_id) : undefined,
                  lines,
                };
              });
              return res.json(items);
            }
          } catch {
            // fallback
          }
        }
      }

      return res.json(inMemoryEstimates);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createEstimate = async (req: Request, res: Response) => {
    try {
      const unitStayId = Number(req.body.unitStayId) || 5001;
      const partyId = Number(req.body.approverPartyId || req.body.partyId) || 4;
      const labourRate = req.body.labourRate ? parseFloat(req.body.labourRate) : 18.0;

      const lines = (req.body.lines || [
        {
          lineNo: 1,
          repairCode: 'STR-DT',
          locationDetail: 'Front end',
          quantity: '1',
          labourHours: '1.5',
          labourCost: '27.00',
          materialCost: '0.00',
          responsibility: 'OWNER',
          lineStatus: 'PROPOSED',
        },
      ]).map((l: any, i: number) => ({
        repairEstimateLineId: Date.now() + i,
        lineNo: l.lineNo || l.line_no || i + 1,
        repairCode: l.repairCode || l.repair_code || 'STR-DT',
        locationDetail: l.locationDetail || l.location_detail || '',
        quantity: String(l.quantity ?? '1'),
        labourHours: String(l.labourHours ?? '1.5'),
        labourCost: String(l.labourCost ?? '27.00'),
        materialCost: String(l.materialCost ?? '0.00'),
        responsibility: l.responsibility || 'OWNER',
        lineStatus: l.lineStatus || 'PROPOSED',
      }));

      const totLab = lines.reduce((a: number, l: any) => a + Number(l.labourCost || 0), 0);
      const totMat = lines.reduce((a: number, l: any) => a + Number(l.materialCost || 0), 0);
      const newId = 410 + inMemoryEstimates.length + 1;

      const newEst = {
        repairEstimateId: newId,
        estimateNo: `EST-26-0${newId}`,
        createdAt: new Date().toISOString(),
        unitStayId,
        unitNo: req.body.unitNo || 'MSKU 402117 8',
        unitType: req.body.unitType || '40HC',
        location: req.body.location || 'C-02-04',
        lineCode: req.body.lineCode || 'MSK',
        approverPartyId: partyId,
        currency: 'USD',
        labourRate: String(labourRate),
        totalLabour: totLab.toFixed(2),
        totalMaterial: totMat.toFixed(2),
        totalAmount: (totLab + totMat).toFixed(2),
        status: 'DRAFT',
        inspectionId: req.body.inspectionId ? Number(req.body.inspectionId) : undefined,
        lines,
      };

      inMemoryEstimates.unshift(newEst);
      return sendCreated(res, newEst);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getEstimateById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.repairEstimateId || req.params.id, 10);
      const found = inMemoryEstimates.find((e) => e.repairEstimateId === id);
      if (!found) return sendError(res, 'Repair estimate not found', 404);
      return res.json(found);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateEstimate = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.repairEstimateId || req.params.id, 10);
      const idx = inMemoryEstimates.findIndex((e) => e.repairEstimateId === id);
      if (idx === -1) return sendError(res, 'Repair estimate not found', 404);

      if (req.body.status) inMemoryEstimates[idx].status = req.body.status;
      if (req.body.approverRef) inMemoryEstimates[idx].approverRef = req.body.approverRef;
      if (req.body.totalLabour) inMemoryEstimates[idx].totalLabour = String(req.body.totalLabour);
      if (req.body.totalMaterial) inMemoryEstimates[idx].totalMaterial = String(req.body.totalMaterial);

      return sendSuccess(res, inMemoryEstimates[idx]);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public sendEstimate = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.repairEstimateId || req.params.id, 10);
      const idx = inMemoryEstimates.findIndex((e) => e.repairEstimateId === id);
      if (idx === -1) return sendError(res, 'Repair estimate not found', 404);

      inMemoryEstimates[idx].status = 'SENT';
      inMemoryEstimates[idx].sentAt = new Date().toISOString();

      return sendSuccess(res, { success: true, estimate: inMemoryEstimates[idx] });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public decideEstimate = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.repairEstimateId || req.params.id, 10);
      const idx = inMemoryEstimates.findIndex((e) => e.repairEstimateId === id);
      if (idx === -1) return sendError(res, 'Repair estimate not found', 404);

      const decisions = req.body.decisions || {};
      const ref = req.body.ref || 'REF-DECISION';

      let approvedCount = 0;
      let totalLines = inMemoryEstimates[idx].lines.length;

      inMemoryEstimates[idx].lines = inMemoryEstimates[idx].lines.map((l: any) => {
        const dec = decisions[l.repairEstimateLineId] || decisions[l.lineNo];
        if (dec) {
          l.lineStatus = dec;
          if (dec === 'APPROVED') approvedCount++;
        } else if (l.lineStatus === 'APPROVED') {
          approvedCount++;
        }
        return l;
      });

      const nextStatus =
        totalLines === 0
          ? 'APPROVED'
          : approvedCount === totalLines
          ? 'APPROVED'
          : approvedCount === 0
          ? 'REJECTED'
          : 'PARTIAL';

      inMemoryEstimates[idx].status = nextStatus;
      inMemoryEstimates[idx].approverRef = ref;
      inMemoryEstimates[idx].decidedAt = new Date().toISOString();

      return sendSuccess(res, { success: true, status: nextStatus, estimate: inMemoryEstimates[idx] });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public completeEstimate = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.repairEstimateId || req.params.id, 10);
      const idx = inMemoryEstimates.findIndex((e) => e.repairEstimateId === id);
      if (idx === -1) return sendError(res, 'Repair estimate not found', 404);

      inMemoryEstimates[idx].lines = inMemoryEstimates[idx].lines.map((l: any) => {
        if (l.lineStatus === 'APPROVED') {
          l.lineStatus = 'DONE';
        }
        return l;
      });

      inMemoryEstimates[idx].status = 'COMPLETED';
      inMemoryEstimates[idx].completedAt = new Date().toISOString();

      return sendSuccess(res, { success: true, estimate: inMemoryEstimates[idx] });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };
}

export const repairsController = new RepairsController();
