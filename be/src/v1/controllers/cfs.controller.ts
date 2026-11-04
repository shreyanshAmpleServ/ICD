import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../configs/prisma';
import { sendSuccess, sendCreated, sendError } from '../../utils';
import {
  contractors as seedContractors,
  jobs as seedJobs,
  lotBalances as seedLotBalances,
} from '../../data/ops';

// Resilient in-memory stores initialized with seed CFS data
const inMemoryContractors: any[] = JSON.parse(JSON.stringify(seedContractors));
const inMemoryJobs: any[] = JSON.parse(JSON.stringify(seedJobs));
const inMemoryLotBalances: any[] = JSON.parse(JSON.stringify(seedLotBalances));

export class CfsController {
  public getContractors = async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          try {
            const queryPromise = prisma.labour_contractor.findMany({
              where: { is_active: true },
              orderBy: { labour_contractor_id: 'asc' },
            });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection pool timeout')), 1200)
            );
            const dbContractors = (await Promise.race([queryPromise, timeoutPromise])) as any[];
            if (dbContractors && dbContractors.length > 0) {
              const items = dbContractors.map((c: any) => ({
                labourContractorId: c.labour_contractor_id,
                contractorId: c.labour_contractor_id,
                contractorName: c.contractor_name,
                rateBasis: c.rate_basis,
                rate: Number(c.rate ?? 0),
                currency: c.currency || 'USD',
                isActive: c.is_active ?? true,
              }));
              return res.json(items);
            }
          } catch (err: any) {
            console.warn('[cfsController.getContractors] DB query error or timeout, falling back:', err.message);
          }
        }
      }
      return res.json(inMemoryContractors);
    } catch (err: any) {
      console.warn('[cfsController.getContractors] Unexpected error, returning fallback:', err.message);
      return res.json(inMemoryContractors);
    }
  };

  public createContractor = async (req: Request, res: Response) => {
    try {
      const siteId = Number((req as any).siteId || req.body.siteId) || 1;
      const maxId = inMemoryContractors.reduce((m, x) => Math.max(m, Number(x.labourContractorId) || 0), 40);
      const newId = maxId + 1;

      const newContractor = {
        labourContractorId: newId,
        contractorId: newId,
        contractorName: req.body.contractorName || 'New Labour Contractor',
        rateBasis: req.body.rateBasis || 'PER_PACKAGE',
        rate: req.body.rate ? String(req.body.rate) : '0.35',
        currency: req.body.currency || 'USD',
        isActive: req.body.isActive ?? true,
      };

      inMemoryContractors.push(newContractor);

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          prisma.labour_contractor
            .create({
              data: {
                site_id: siteId,
                contractor_name: newContractor.contractorName,
                rate_basis: newContractor.rateBasis,
                rate: Number(newContractor.rate),
                currency: newContractor.currency,
                is_active: newContractor.isActive,
                createdby: 'system',
              },
            })
            .catch((err: any) => console.warn('[createContractor] DB background create error:', err.message));
        }
      }

      return sendCreated(res, newContractor);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getContractorById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.labourContractorId, 10);
      const local = inMemoryContractors.find((c) => c.labourContractorId === id);
      if (local) return sendSuccess(res, local);
      return sendError(res, 'Contractor not found', 404);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateContractor = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.labourContractorId, 10);
      const local = inMemoryContractors.find((c) => c.labourContractorId === id);
      if (local) {
        if (req.body.contractorName) local.contractorName = req.body.contractorName;
        if (req.body.rateBasis) local.rateBasis = req.body.rateBasis;
        if (req.body.rate) local.rate = String(req.body.rate);
        if (req.body.currency) local.currency = req.body.currency;
        if (req.body.isActive !== undefined) local.isActive = req.body.isActive;
      }
      return sendSuccess(res, local || { labourContractorId: id, ...req.body });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  // Handling Jobs
  public getJobs = async (req: Request, res: Response) => {
    try {
      let items: any[] = [];

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          try {
            const queryPromise = prisma.handling_job.findMany({
              include: {
                handling_job_unit_stays: {
                  include: {
                    unit_stay_cargo_units: {
                      include: {
                        cargo_unit_unit_types: true,
                      },
                    },
                  },
                },
                handling_job_lines: {
                  include: {
                    handling_job_line_unit_stays: {
                      include: {
                        unit_stay_cargo_units: true,
                      },
                    },
                  },
                },
                handling_job_labour_contractors: true,
              },
              orderBy: { handling_job_id: 'desc' },
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection pool timeout')), 1200)
            );

            const dbJobs = (await Promise.race([queryPromise, timeoutPromise])) as any[];

            if (dbJobs && dbJobs.length > 0) {
              const mapped = dbJobs.map((j: any) => {
                const u = j.handling_job_unit_stays?.unit_stay_cargo_units;
                const lines = (j.handling_job_lines || []).map((l: any) => ({
                  handlingJobLineId: Number(l.handling_job_line_id),
                  lineNo: l.line_no,
                  marksNumbers: l.marks_numbers || 'NO MARKS',
                  description: l.description || 'General Cargo',
                  packageType: l.package_type || 'CARTON',
                  packagesDeclared: l.packages_declared ?? 0,
                  packagesCounted: l.packages_counted ?? 0,
                  shortQty: l.short_qty ?? 0,
                  excessQty: l.excess_qty ?? 0,
                  damagedQty: l.damaged_qty ?? 0,
                  damageNote: l.damage_note || undefined,
                  weightKg: l.weight_kg ? String(l.weight_kg) : undefined,
                  lotStayId: l.lot_stay_id ? Number(l.lot_stay_id) : undefined,
                  lotUnitNo: l.handling_job_line_unit_stays?.unit_stay_cargo_units?.unit_no || undefined,
                }));

                return {
                  handlingJobId: Number(j.handling_job_id),
                  jobNo: j.job_no,
                  jobKind: j.job_kind,
                  containerStayId: Number(j.container_stay_id),
                  containerNo: u?.unit_no || 'TCLU 551902 4',
                  containerType: u?.cargo_unit_unit_types?.type_code || '40HR',
                  consignmentRef: 'BL-2026-001',
                  customer: 'Mzizi Traders Ltd',
                  status: j.status,
                  plannedAt: j.planned_at?.toISOString() || j.createdate.toISOString(),
                  startedAt: j.started_at?.toISOString() || undefined,
                  completedAt: j.completed_at?.toISOString() || undefined,
                  supervisorSub: j.supervisor_sub || 'Halima S.',
                  labourContractorId: j.labour_contractor_id || undefined,
                  labourCount: j.labour_count || 8,
                  equipmentId: j.equipment_id || undefined,
                  sealRemoved: j.seal_removed || undefined,
                  sealApplied: j.seal_applied || undefined,
                  customsOfficerName: j.customs_officer_name || undefined,
                  remarks: j.remarks || undefined,
                  lines,
                };
              });

              const dbIds = new Set(mapped.map((m) => m.handlingJobId));
              items = [...mapped, ...inMemoryJobs.filter((x) => !dbIds.has(x.handlingJobId))];
            }
          } catch (err: any) {
            console.warn('[cfsController.getJobs] DB query error or timeout, falling back:', err.message);
          }
        }
      }

      if (!items || items.length === 0) {
        items = [...inMemoryJobs];
      }

      return res.json(items);
    } catch (err: any) {
      console.warn('[cfsController.getJobs] Unexpected error, returning fallback:', err.message);
      return res.json(inMemoryJobs);
    }
  };

  public createJob = async (req: Request, res: Response) => {
    try {
      const siteId = Number((req as any).siteId || req.body.siteId) || 1;
      const unitStayId = Number(req.body.containerStayId || req.body.unitStayId) || 5001;
      const jobKind = req.body.jobKind || 'DESTUFF';

      const maxId = inMemoryJobs.reduce((m, x) => Math.max(m, Number(x.handlingJobId) || 0), 2205);
      const newId = maxId + 1;
      const jobNo = `CFS-DAR1-26-${newId}`;

      const lines = (req.body.lines || []).map((l: any, i: number) => ({
        handlingJobLineId: 77000 + newId * 10 + i,
        lineNo: l.lineNo || i + 1,
        marksNumbers: l.marksNumbers || 'NO MARKS',
        description: l.description || 'General Cargo',
        packageType: l.packageType || 'CARTON',
        packagesDeclared: l.packagesDeclared ? Number(l.packagesDeclared) : 100,
        packagesCounted: l.packagesCounted ? Number(l.packagesCounted) : 0,
        shortQty: l.shortQty ? Number(l.shortQty) : 0,
        excessQty: l.excessQty ? Number(l.excessQty) : 0,
        damagedQty: l.damagedQty ? Number(l.damagedQty) : 0,
        damageNote: l.damageNote,
        weightKg: l.weightKg ? String(l.weightKg) : '10000',
        lotStayId: l.lotStayId ? Number(l.lotStayId) : undefined,
      }));

      const newJob: any = {
        handlingJobId: newId,
        jobNo,
        jobKind,
        containerStayId: unitStayId,
        containerNo: req.body.containerNo || 'MSKU 882014 9',
        containerType: req.body.containerType || '40HR',
        consignmentRef: req.body.consignmentRef || 'BL-2026-001',
        customer: req.body.customer || 'Mzizi Traders Ltd',
        status: 'PLANNED',
        plannedAt: req.body.plannedAt ? new Date(req.body.plannedAt).toISOString() : new Date().toISOString(),
        supervisorSub: req.body.supervisorSub || 'Halima S.',
        labourContractorId: Number(req.body.labourContractorId) || 41,
        labourCount: Number(req.body.labourCount) || 8,
        equipmentId: req.body.equipmentId ? Number(req.body.equipmentId) : 4,
        customsOfficerName: req.body.customsOfficerName || 'Rehema K. (TRA)',
        remarks: req.body.remarks,
        lines,
      };

      inMemoryJobs.unshift(newJob);

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          prisma.handling_job
            .create({
              data: {
                site_id: siteId,
                job_no: jobNo,
                job_kind: jobKind,
                container_stay_id: unitStayId,
                status: 'PLANNED',
                planned_at: new Date(newJob.plannedAt),
                labour_contractor_id: newJob.labourContractorId,
                labour_count: newJob.labourCount,
                equipment_id: newJob.equipmentId,
                customs_officer_name: newJob.customsOfficerName,
                remarks: newJob.remarks,
                createdby: 'system',
              },
            })
            .catch((err: any) => console.warn('[createJob] DB background create error:', err.message));
        }
      }

      return sendCreated(res, newJob);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getJobById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.handlingJobId, 10);
      const local = inMemoryJobs.find((j) => j.handlingJobId === id);
      if (local) {
        return res.json(local);
      }
      return sendError(res, 'Handling job not found', 404);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateJob = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.handlingJobId, 10);
      const local = inMemoryJobs.find((j) => j.handlingJobId === id);
      if (local) {
        if (req.body.status) local.status = req.body.status;
        if (req.body.labourContractorId) local.labourContractorId = Number(req.body.labourContractorId);
        if (req.body.labourCount) local.labourCount = Number(req.body.labourCount);
        if (req.body.remarks) local.remarks = req.body.remarks;
      }
      return sendSuccess(res, local || { handlingJobId: id, ...req.body });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateJobLines = async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.handlingJobId, 10);
      const lines = Array.isArray(req.body) ? req.body : req.body.lines || [];

      const local = inMemoryJobs.find((j) => j.handlingJobId === jobId);
      if (local) {
        local.lines = lines;
      }

      return sendSuccess(res, { success: true, count: lines.length });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public startJob = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.handlingJobId, 10);
      const local = inMemoryJobs.find((j) => j.handlingJobId === id);
      if (local) {
        local.status = 'IN_PROGRESS';
        local.startedAt = new Date().toISOString();
      }
      return sendSuccess(res, { success: true, job: local });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public completeJob = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.handlingJobId, 10);
      const local = inMemoryJobs.find((j) => j.handlingJobId === id);
      if (local) {
        local.status = req.body.status || 'COMPLETED';
        local.completedAt = new Date().toISOString();
        if (req.body.lines) local.lines = req.body.lines;
      }
      return sendSuccess(res, { success: true, job: local });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public approveJob = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.handlingJobId, 10);
      const local = inMemoryJobs.find((j) => j.handlingJobId === id);
      if (local) {
        local.status = 'APPROVED';
        local.approvedAt = new Date().toISOString();
        local.approvedBySub = 'manager.ops';
      }
      return sendSuccess(res, { success: true, job: local });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  // Lots balances
  public getLotBalances = async (req: Request, res: Response) => {
    try {
      return res.json(inMemoryLotBalances);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getLotBalance = async (req: Request, res: Response) => {
    const unitStayId = parseInt(req.params.unitStayId, 10);
    const local = inMemoryLotBalances.find((l) => l.lotStayId === unitStayId);
    if (local) {
      const rec = Number(local.qtyReceived) || 60;
      const del = Number(local.qtyDelivered) || 0;
      return res.json({
        unitStayId,
        totalPackages: rec,
        strippedPackages: rec,
        deliveredPackages: del,
        remainingPackages: rec - del,
      });
    }
    return res.json({
      unitStayId,
      totalPackages: 60,
      strippedPackages: 60,
      deliveredPackages: 36,
      remainingPackages: 24,
    });
  };

  public recordLotDelivery = async (req: Request, res: Response) => {
    const lotStayId = parseInt(req.params.lotStayId || (req.params as any).id, 10);
    const qty = Number(req.body.qty || 1);
    const releaseOrderNo = req.body.releaseOrderNo || 'RO-2026-001';

    const local = inMemoryLotBalances.find((l) => l.lotStayId === lotStayId);
    if (local) {
      const currentDel = Number(local.qtyDelivered) || 0;
      const currentRec = Number(local.qtyReceived) || 60;
      local.qtyDelivered = String(currentDel + qty);
      local.qtyBalance = String(Math.max(0, currentRec - (currentDel + qty)));
      local.deliveries = local.deliveries || [];
      local.deliveries.unshift({
        at: new Date().toISOString(),
        qty,
        ref: releaseOrderNo,
        plateNo: req.body.plateNo || 'T 448 DKA',
      });
    }

    return sendCreated(res, {
      lotStayId,
      deliveredQty: qty,
      releaseOrderNo,
      deliveredAt: new Date().toISOString(),
      status: 'RECORDED',
    });
  };
}

export const cfsController = new CfsController();
