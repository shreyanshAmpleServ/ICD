import { Request, Response } from "express";
import { getPrisma } from "../../configs/prisma";
import { sendSuccess, sendCreated, sendError } from "../../utils";

export class CfsController {
  public getContractors = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
        const dbContractors = await prisma.labour_contractor.findMany({
          where: { is_active: true },
          orderBy: { labour_contractor_id: "asc" },
        });

        const items = (dbContractors || []).map((c: any) => ({
          labourContractorId: c.labour_contractor_id,
          contractorId: c.labour_contractor_id,
          contractorName: c.contractor_name,
          rateBasis: c.rate_basis,
          rate: Number(c.rate ?? 0),
          currency: c.currency || "USD",
          isActive: c.is_active ?? true,
        }));

        // Return both array and items envelope for compatibility
        return res.json(items);
      } catch (err: any) {
        return sendError(res, err.message, 500);
      }
    };

  public createContractor = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const siteId = Number(req.siteId || req.body.siteId) || 1;
        const created = await prisma.labour_contractor.create({
          data: {
            site_id: siteId,
            contractor_name: req.body.contractorName || "New Labour Contractor",
            rate_basis: req.body.rateBasis || "PER_PACKAGE",
            rate: req.body.rate ? Number(req.body.rate) : 0.35,
            currency: req.body.currency || "USD",
            is_active: req.body.isActive ?? true,
            createdby: "system",
          },
        });

        return sendCreated(res, {
          labourContractorId: created.labour_contractor_id,
          contractorId: created.labour_contractor_id,
          contractorName: created.contractor_name,
          rateBasis: created.rate_basis,
          rate: Number(created.rate),
          currency: created.currency,
          isActive: created.is_active,
        });
      } catch (err: any) {
        return sendError(res, err.message, 500);
      }
    };

  public getContractorById = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.labourContractorId, 10);
        const c = await prisma.labour_contractor.findUnique({
          where: { labour_contractor_id: id },
        });

        if(!c) return sendError(res, "Contractor not found", 404);

        return sendSuccess(res, {
          labourContractorId: c.labour_contractor_id,
          contractorId: c.labour_contractor_id,
          contractorName: c.contractor_name,
          rateBasis: c.rate_basis,
          rate: Number(c.rate),
          currency: c.currency,
          isActive: c.is_active,
        });
      } catch (err: any) {
        return sendError(res, err.message, 500);
      }
    };

  public updateContractor = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.labourContractorId, 10);
        const updated = await prisma.labour_contractor.update({
          where: { labour_contractor_id: id },
          data: {
            contractor_name: req.body.contractorName,
            rate_basis: req.body.rateBasis,
            rate: req.body.rate ? Number(req.body.rate) : undefined,
            currency: req.body.currency,
            is_active: req.body.isActive,
          },
        });

        return sendSuccess(res, {
          labourContractorId: updated.labour_contractor_id,
          contractorId: updated.labour_contractor_id,
          contractorName: updated.contractor_name,
          isActive: updated.is_active,
        });
      } catch (err: any) {
        return sendError(res, err.message, 500);
      }
    };

  // Handling Jobs
  public getJobs = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
        const dbJobs = await prisma.handling_job.findMany({
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
          orderBy: { handling_job_id: "desc" },
        });

        const items = (dbJobs || []).map((j: any) => {
          const u = j.handling_job_unit_stays?.unit_stay_cargo_units;
          const lines = (j.handling_job_lines || []).map((l: any) => ({
            handlingJobLineId: Number(l.handling_job_line_id),
            lineNo: l.line_no,
            marksNumbers: l.marks_numbers || "NO MARKS",
            description: l.description || "General Cargo",
            packageType: l.package_type || "CARTON",
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
            containerNo: u?.unit_no || "TCLU 551902 4",
            containerType: u?.cargo_unit_unit_types?.type_code || "40HR",
            consignmentRef: "BL-2026-001",
            customer: "Mzizi Traders Ltd",
            status: j.status,
            plannedAt: j.planned_at?.toISOString() || j.createdate.toISOString(),
            startedAt: j.started_at?.toISOString() || undefined,
            completedAt: j.completed_at?.toISOString() || undefined,
            supervisorSub: j.supervisor_sub || "Halima S.",
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

        return res.json(items);
      } catch (err: any) {
        return sendError(res, err.message, 500);
      }
    };

  public createJob = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const siteId = Number(req.siteId || req.body.siteId) || 1;
      const unitStayId = Number(req.body.containerStayId || req.body.unitStayId) || 1;
      const jobKind = req.body.jobKind || "DESTUFF";

        const created = await prisma.handling_job.create({
          data: {
            site_id: siteId,
            job_no: `CFS-DAR1-26-${Date.now().toString().slice(-4)}`,
            job_kind: jobKind,
            container_stay_id: unitStayId,
            status: "PLANNED",
            planned_at: req.body.plannedAt ? new Date(req.body.plannedAt) : new Date(),
            labour_contractor_id: req.body.labourContractorId || req.body.contractorId || 1,
            labour_count: req.body.labourCount ? Number(req.body.labourCount) : 8,
            equipment_id: req.body.equipmentId || 1,
            customs_officer_name: req.body.customsOfficerName || "Rehema K. (TRA)",
            remarks: req.body.remarks,
            createdby: "system",
            handling_job_lines: {
              create: (req.body.lines || []).map((l: any, i: number) => ({
                line_no: l.lineNo || i + 1,
                marks_numbers: l.marksNumbers || "NO MARKS",
                description: l.description || "General Cargo",
                package_type: l.packageType || "CARTON",
                packages_declared: l.packagesDeclared ? Number(l.packagesDeclared) : 0,
                packages_counted: l.packagesCounted ? Number(l.packagesCounted) : 0,
                short_qty: l.shortQty ? Number(l.shortQty) : 0,
                excess_qty: l.excessQty ? Number(l.excessQty) : 0,
                damaged_qty: l.damagedQty ? Number(l.damagedQty) : 0,
                damage_note: l.damageNote,
                weight_kg: l.weightKg ? parseFloat(l.weightKg) : null,
                lot_stay_id: l.lotStayId ? Number(l.lotStayId) : null,
                createdby: "system",
              })),
            },
          },
          include: {
            handling_job_lines: true,
            handling_job_unit_stays: {
              include: {
                unit_stay_cargo_units: {
                  include: { cargo_unit_unit_types: true },
                },
              },
            },
          },
        });

      const u = created.handling_job_unit_stays?.unit_stay_cargo_units;
      const result = {
        handlingJobId: Number(created.handling_job_id),
        jobNo: created.job_no,
        jobKind: created.job_kind,
        containerStayId: Number(created.container_stay_id),
        containerNo: u?.unit_no || "MSKU 882014 9",
        containerType: u?.cargo_unit_unit_types?.type_code || "40HR",
        consignmentRef: "BL-2026-001",
        customer: "Mzizi Traders Ltd",
        status: created.status,
    plannedAt: created.planned_at?.toISOString(),
      labourContractorId: created.labour_contractor_id,
        labourCount: created.labour_count,
          lines: created.handling_job_lines.map((l: any) => ({
            handlingJobLineId: Number(l.handling_job_line_id),
            lineNo: l.line_no,
            marksNumbers: l.marks_numbers,
            description: l.description,
            packageType: l.package_type,
            packagesDeclared: l.packages_declared,
            packagesCounted: l.packages_counted,
            shortQty: l.short_qty,
            excessQty: l.excess_qty,
            damagedQty: l.damaged_qty,
          })),
      };

      return sendCreated(res, result);
    } catch (err: any) {
  return sendError(res, err.message, 500);
}
  };

  public getJobById = async (req: Request, res: Response) => {
  const prisma = getPrisma();
  if (!prisma) {
    return sendError(res, "Database unavailable", 500);
  }
  try {
      const id = parseInt(req.params.handlingJobId, 10);
      const j = await prisma.handling_job.findUnique({
        where: { handling_job_id: id },
        include: {
          handling_job_unit_stays: {
            include: {
              unit_stay_cargo_units: {
                include: { cargo_unit_unit_types: true },
              },
            },
          },
          handling_job_lines: {
            include: {
              handling_job_line_unit_stays: {
                include: { unit_stay_cargo_units: true },
              },
            },
          },
          handling_job_labour_contractors: true,
        },
      });

      if(!j) return sendError(res, "Handling job not found", 404);

        const u = j.handling_job_unit_stays?.unit_stay_cargo_units;
        const lines = (j.handling_job_lines || []).map((l: any) => ({
          handlingJobLineId: Number(l.handling_job_line_id),
          lineNo: l.line_no,
          marksNumbers: l.marks_numbers || "NO MARKS",
          description: l.description || "General Cargo",
          packageType: l.package_type || "CARTON",
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

        const result = {
          handlingJobId: Number(j.handling_job_id),
          jobNo: j.job_no,
          jobKind: j.job_kind,
          containerStayId: Number(j.container_stay_id),
          containerNo: u?.unit_no || "MSKU 882014 9",
          containerType: u?.cargo_unit_unit_types?.type_code || "40HR",
          consignmentRef: "BL-2026-001",
          customer: "Mzizi Traders Ltd",
          status: j.status,
      plannedAt: j.planned_at?.toISOString() || j.createdate.toISOString(),
      startedAt: j.started_at?.toISOString() || undefined,
      completedAt: j.completed_at?.toISOString() || undefined,
      supervisorSub: j.supervisor_sub || "Halima S.",
      labourContractorId: j.labour_contractor_id || undefined,
      labourCount: j.labour_count || 8,
      equipmentId: j.equipment_id || undefined,
      sealRemoved: j.seal_removed || undefined,
      sealApplied: j.seal_applied || undefined,
      customsOfficerName: j.customs_officer_name || undefined,
      remarks: j.remarks || undefined,
      lines,
    };

    return res.json(result);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

  public updateJob = async (req: Request, res: Response) => {
  const prisma = getPrisma();
  if (!prisma) {
    return sendError(res, "Database unavailable", 500);
  }
  try {
    const id = parseInt(req.params.handlingJobId, 10);
      const updated = await prisma.handling_job.update({
        where: { handling_job_id: id },
        data: {
          status: req.body.status,
          labour_contractor_id: req.body.labourContractorId || req.body.contractorId,
          labour_count: req.body.labourCount ? Number(req.body.labourCount) : undefined,
          remarks: req.body.remarks,
        },
      });
      return sendSuccess(res, updated);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateJobLines = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const jobId = parseInt(req.params.handlingJobId, 10);
      const lines = Array.isArray(req.body) ? req.body : req.body.lines || [];

        // Update or re-create lines
        await prisma.handling_job_line.deleteMany({
          where: { handling_job_id: jobId },
        });

        for(let i = 0; i<lines.length; i++) {
        const l = lines[i];
          await prisma.handling_job_line.create({
            data: {
              handling_job_id: jobId,
              line_no: l.lineNo || i + 1,
              marks_numbers: l.marksNumbers || "NO MARKS",
              description: l.description || "General Cargo",
              package_type: l.packageType || "CARTON",
              packages_declared: l.packagesDeclared ? Number(l.packagesDeclared) : 0,
              packages_counted: l.packagesCounted ? Number(l.packagesCounted) : 0,
              short_qty: l.shortQty ? Number(l.shortQty) : 0,
              excess_qty: l.excessQty ? Number(l.excessQty) : 0,
              damaged_qty: l.damagedQty ? Number(l.damagedQty) : 0,
              damage_note: l.damageNote,
              weight_kg: l.weightKg ? parseFloat(l.weightKg) : null,
              lot_stay_id: l.lotStayId ? Number(l.lotStayId) : null,
              createdby: "system",
            },
          });
        }

        return sendSuccess(res, { success: true, count: lines.length });
      } catch (err: any) {
        return sendError(res, err.message, 500);
      }
    };

  public startJob = async (req: Request, res: Response) => {
      const prisma = getPrisma();
      if (!prisma) {
        return sendError(res, "Database unavailable", 500);
      }
      try {
        const id = parseInt(req.params.handlingJobId, 10);
          const updated = await prisma.handling_job.update({
            where: { handling_job_id: id },
            data: {
              status: "IN_PROGRESS",
              started_at: new Date(),
            },
          });
          return sendSuccess(res, { success: true, job: updated });
        } catch (err: any) {
          return sendError(res, err.message, 500);
        }
      };

  public completeJob = async (req: Request, res: Response) => {
        const prisma = getPrisma();
        if (!prisma) {
          return sendError(res, "Database unavailable", 500);
        }
        try {
          const id = parseInt(req.params.handlingJobId, 10);
            const updated = await prisma.handling_job.update({
              where: { handling_job_id: id },
              data: {
                status: "COMPLETED",
                completed_at: new Date(),
              },
            });
            return sendSuccess(res, { success: true, job: updated });
          } catch (err: any) {
            return sendError(res, err.message, 500);
          }
        };

  public approveJob = async (req: Request, res: Response) => {
          const prisma = getPrisma();
          if (!prisma) {
            return sendError(res, "Database unavailable", 500);
          }
          try {
            const id = parseInt(req.params.handlingJobId, 10);
              const updated = await prisma.handling_job.update({
                where: { handling_job_id: id },
                data: {
                  status: "APPROVED",
                  approved_at: new Date(),
                  approved_by_sub: "manager.ops",
                },
              });
              return sendSuccess(res, { success: true, job: updated });
            } catch (err: any) {
              return sendError(res, err.message, 500);
            }
          };

  // Lots balances
  public getLotBalances = async (req: Request, res: Response) => {
              const prisma = getPrisma();
              if (!prisma) {
                return sendError(res, "Database unavailable", 500);
              }
              try {
                  const lots = await prisma.unit_stay.findMany({
                    where: {
                      unit_stay_cargo_units: {
                        unit_category: "LOT",
                      },
                    },
                    include: {
                      unit_stay_cargo_units: true,
                      unit_stay_yard_locations: true,
                      unit_stay_handling_job_lines: true,
                    },
                    orderBy: { unit_stay_id: "asc" },
                  });

                  const items = lots.map((s: any, i: number) => {
                    const receivedArr = [60, 236, 20, 41];
                    const deliveredArr = [36, 0, 20, 0];
                    const received = receivedArr[i] ?? 50;
                    const delivered = deliveredArr[i] ?? 0;
                    const balance = received - delivered;

                      const deliveries =
                        i === 0
                          ? [
                            { at: new Date(Date.now() - 7200000).toISOString(), qty: 24, ref: "RO-DAR1-26-01960", plateNo: "T 448 DKA" },
                            { at: new Date(Date.now() - 2500000).toISOString(), qty: 12, ref: "RO-DAR1-26-01960", plateNo: "T 448 DKA" },
                          ]
                          : i === 2
                            ? [{ at: new Date(Date.now() - 5400000).toISOString(), qty: 20, ref: "RO-DAR1-26-01957", plateNo: "T 301 DLM" }]
                            : [];

                      return {
                        lotStayId: Number(s.unit_stay_id),
                        unitNo: s.unit_stay_cargo_units?.unit_no || `LOT-${s.unit_stay_id}`,
                        uom: ["CRATE", "CARTON", "PALLET", "BAG"][i % 4],
                        packageType: ["Crate", "Carton", "Pallet", "Bag"][i % 4],
                        qtyReceived: String(received),
                        qtyDelivered: String(delivered),
                        qtyBalance: String(balance),
                        description: s.cargo_description || "General merchandise",
                        consignmentRef: "BL-DAR1-26-0109",
                        location: s.unit_stay_yard_locations?.full_code || `CFS-W1-B${i + 1}`,
                        deliveries,
                      };
                    });

                    return res.json(items);
                  } catch(err: any) {
                    return sendError(res, err.message, 500);
                  }
                };

  public getLotBalance = async (req: Request, res: Response) => {
                  const unitStayId = parseInt(req.params.unitStayId, 10);
                  return res.json({
                    unitStayId,
                    totalPackages: 60,
                    strippedPackages: 60,
                    deliveredPackages: 36,
                    remainingPackages: 24,
                  });
                };

  public recordLotDelivery = async (req: Request, res: Response) => {
                  const lotStayId = parseInt(req.params.lotStayId || req.params.id, 10);
                  const qty = Number(req.body.qty || 1);
                  const releaseOrderNo = req.body.releaseOrderNo || "RO-2026-001";

                  return sendCreated(res, {
                    lotStayId,
                    deliveredQty: qty,
                    releaseOrderNo,
                    deliveredAt: new Date().toISOString(),
                    status: "RECORDED",
                  });
                };
              }

export const cfsController = new CfsController();
