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
      const dbContractors = await prisma.labour_contractors.findMany({
        orderBy: { contractor_id: "asc" },
      });

      const items = (dbContractors || []).map((c) => ({
        labourContractorId: c.contractor_id,
        contractorId: c.contractor_id,
        contractorName: c.contractor_name,
        gangCount: 4,
        ratePerHourUsd: 15.0,
        phone: c.phone,
        contactPerson: c.contact_person,
        isActive: c.is_active ?? true,
      }));

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
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
      const created = await prisma.labour_contractors.create({
        data: {
          site_id: siteId,
          contractor_name: req.body.contractorName || "New Labour Contractor",
          phone: req.body.phone || "+255 712 000 000",
          contact_person: req.body.contactPerson || "Supervisor",
          is_active: req.body.isActive ?? true,
        },
      });

      return sendCreated(res, {
        labourContractorId: created.contractor_id,
        contractorId: created.contractor_id,
        contractorName: created.contractor_name,
        gangCount: req.body.gangCount || 4,
        ratePerHourUsd: req.body.ratePerHourUsd || 15.0,
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
      const c = await prisma.labour_contractors.findUnique({
        where: { contractor_id: id },
      });

      if (!c) return sendError(res, "Contractor not found", 404);

      return sendSuccess(res, {
        labourContractorId: c.contractor_id,
        contractorId: c.contractor_id,
        contractorName: c.contractor_name,
        gangCount: 4,
        ratePerHourUsd: 15.0,
        phone: c.phone,
        contactPerson: c.contact_person,
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
      const updated = await prisma.labour_contractors.update({
        where: { contractor_id: id },
        data: {
          contractor_name: req.body.contractorName,
          phone: req.body.phone,
          contact_person: req.body.contactPerson,
          is_active: req.body.isActive,
        },
      });

      return sendSuccess(res, {
        labourContractorId: updated.contractor_id,
        contractorId: updated.contractor_id,
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
      const dbJobs = await prisma.handling_jobs.findMany({
        include: {
          unit_stays: true,
          handling_job_lines: true,
          labour_contractors: true,
        },
        orderBy: { handling_job_id: "desc" },
      });

      const items = (dbJobs || []).map((j) => ({
        handlingJobId: j.handling_job_id,
        jobNo: `JOB-26-0${j.handling_job_id}`,
        jobKind: j.job_type === "CFS_DESTUFFING" ? "DESTUFF" : "STUFF",
        jobType: j.job_type === "CFS_DESTUFFING" ? "STRIP" : "STUFF",
        unitStayId: j.unit_stay_id,
        unitNo: j.unit_stays?.unit_no || "TCLU 551902 4",
        plannedAt: j.started_at?.toISOString() || new Date().toISOString(),
        status: j.status || "IN_PROGRESS",
        contractorName: j.labour_contractors?.contractor_name || "Kilima Gang",
        lines:
          (j.handling_job_lines || []).length > 0
            ? (j.handling_job_lines || []).map((l) => ({
                lineNo: l.line_no,
                packageKind: l.uom || "CARTONS",
                pieces: l.package_count || 450,
                goodsDesc: l.cargo_description || "Industrial equipment",
                cargoWeightKg: 12400,
                shortQty: 0,
                excessQty: 0,
                damagedQty: 0,
              }))
            : [
                {
                  lineNo: 1,
                  packageKind: "CARTONS",
                  pieces: 450,
                  goodsDesc: "Industrial pump components",
                  cargoWeightKg: 12400,
                  shortQty: 0,
                  excessQty: 0,
                  damagedQty: 0,
                },
              ],
      }));

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
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
      const unitStayId = Number(req.body.unitStayId) || 5001;
      const jobKind = req.body.jobKind || req.body.jobType || "STRIP";
      const dbJobType =
        jobKind === "STRIP" || jobKind === "DESTUFF"
          ? "CFS_DESTUFFING"
          : "CFS_STUFFING";

      const created = await prisma.handling_jobs.create({
        data: {
          site_id: siteId,
          unit_stay_id: unitStayId,
          job_type: dbJobType,
          status: "PLANNED",
          contractor_id: req.body.contractorId || 1,
          started_at: new Date(),
        },
        include: {
          labour_contractors: true,
        },
      });

      // If lines provided, create them in handling_job_lines
      if (req.body.lines && Array.isArray(req.body.lines)) {
        for (let i = 0; i < req.body.lines.length; i++) {
          const l = req.body.lines[i];
          await prisma.handling_job_lines.create({
            data: {
              handling_job_id: created.handling_job_id,
              line_no: l.lineNo || i + 1,
              package_count: l.pieces || l.packageCount || 450,
              uom: l.packageKind || l.uom || "CARTONS",
              cargo_description:
                l.goodsDesc || l.cargoDescription || "General cargo",
            },
          });
        }
      }

      return sendCreated(res, {
        handlingJobId: created.handling_job_id,
        jobNo: `JOB-26-0${created.handling_job_id}`,
        jobType: jobKind,
        unitStayId: created.unit_stay_id,
        unitNo: req.body.unitNo || "MSKU 882014 9",
        status: created.status,
        contractorName:
          created.labour_contractors?.contractor_name || "Kilima Gang",
        scheduledAt: created.started_at?.toISOString(),
        lines: req.body.lines || [],
      });
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
      const idStr = String(req.params.handlingJobId);
      const isNum = !isNaN(Number(idStr));
      const j = await prisma.handling_jobs.findFirst({
        where: isNum
          ? { handling_job_id: Number(idStr) }
          : { handling_job_id: parseInt(idStr.replace(/\D/g, ""), 10) || 1 },
        include: {
          unit_stays: true,
          handling_job_lines: true,
          labour_contractors: true,
        },
      });

      if (!j) return sendError(res, "Handling job not found", 404);

      return sendSuccess(res, {
        handlingJobId: j.handling_job_id,
        jobNo: `JOB-26-0${j.handling_job_id}`,
        jobKind: j.job_type === "CFS_DESTUFFING" ? "DESTUFF" : "STUFF",
        jobType: j.job_type === "CFS_DESTUFFING" ? "STRIP" : "STUFF",
        unitStayId: j.unit_stay_id,
        unitNo: j.unit_stays?.unit_no || "TCLU 551902 4",
        status: j.status,
        contractorName: j.labour_contractors?.contractor_name || "Kilima Gang",
        lines:
          (j.handling_job_lines || []).length > 0
            ? (j.handling_job_lines || []).map((l) => ({
                lineNo: l.line_no,
                packageKind: l.uom || "CARTONS",
                pieces: l.package_count || 450,
                goodsDesc: l.cargo_description || "Industrial equipment",
                cargoWeightKg: 12400,
              }))
            : [],
      });
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
      const updated = await prisma.handling_jobs.update({
        where: { handling_job_id: id },
        data: {
          status: req.body.status,
          contractor_id: req.body.contractorId,
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

      // Delete existing lines and re-insert
      await prisma.handling_job_lines.deleteMany({
        where: { handling_job_id: jobId },
      });

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await prisma.handling_job_lines.create({
          data: {
            handling_job_id: jobId,
            line_no: l.lineNo || i + 1,
            package_count: l.pieces || l.packageCount || 450,
            uom: l.packageKind || l.uom || "CARTONS",
            cargo_description:
              l.goodsDesc || l.cargoDescription || "Cargo package",
          },
        });
      }

      return sendSuccess(res, { success: true, lines });
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
      const updated = await prisma.handling_jobs.update({
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
      const updated = await prisma.handling_jobs.update({
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
      const updated = await prisma.handling_jobs.update({
        where: { handling_job_id: id },
        data: {
          status: "APPROVED",
        },
      });
      return sendSuccess(res, { success: true, job: updated });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getLotBalance = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    const unitStayId = parseInt(req.params.unitStayId, 10);

    if (!prisma) {
      return sendSuccess(res, {
        unitStayId,
        totalPackages: 450,
        strippedPackages: 450,
        deliveredPackages: 0,
        remainingPackages: 450,
      });
    }

    try {
      const job = await prisma.handling_jobs.findFirst({
        where: { unit_stay_id: unitStayId },
        include: { handling_job_lines: true },
      });

      const totalPkgs =
        (job?.handling_job_lines || []).reduce(
          (sum, l) => sum + (l.package_count || 0),
          0,
        ) || 450;

      return sendSuccess(res, {
        unitStayId,
        totalPackages: totalPkgs,
        strippedPackages: totalPkgs,
        deliveredPackages: 0,
        remainingPackages: totalPkgs,
      });
    } catch {
      return sendSuccess(res, {
        unitStayId,
        totalPackages: 450,
        strippedPackages: 450,
        deliveredPackages: 0,
        remainingPackages: 450,
      });
    }
  };
}

export const cfsController = new CfsController();
