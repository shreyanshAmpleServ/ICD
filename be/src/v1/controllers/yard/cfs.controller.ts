import { Request, Response } from 'express';
import { getPrisma } from '../../../db/prisma';

export const yardCfsController = {
  getJobs: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const jobs = await (prisma as any).cfs_jobs?.findMany({
        include: { unit_stays: true },
        orderBy: { job_id: 'desc' },
      }) || [];

      const items = jobs.map((j: any) => ({
        jobId: j.job_id,
        jobNo: j.job_no,
        jobType: j.job_type,
        unitStayId: j.unit_stay_id,
        unitNumber: j.unit_stays?.unit_number,
        status: j.status,
        packagesExpected: j.packages_expected,
        packagesProcessed: j.packages_processed,
        commencedAt: j.commenced_at,
        completedAt: j.completed_at,
      }));
      return res.json({ items, total: items.length });
    } catch (err: any) {
      console.error('yardCfsController.getJobs error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  createJob: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const created = await (prisma as any).cfs_jobs.create({
        data: {
          site_id: Number(req.body.siteId) || 1,
          job_no: `CFS-${Date.now()}`,
          job_type: req.body.jobType || 'DEVANNING',
          unit_stay_id: Number(req.body.unitStayId) || 1,
          status: 'PLANNED',
          packages_expected: Number(req.body.packagesExpected) || 100,
        },
      });
      return res.status(201).json(created);
    } catch (err: any) {
      console.error('yardCfsController.createJob error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  updateJob: async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const updated = await (prisma as any).cfs_jobs.update({
        where: { job_id: Number(jobId) },
        data: req.body,
      });
      res.json(updated);
    } catch (err: any) {
      console.error('yardCfsController.updateJob error:', err);
      res.status(500).json({ error: err.message });
    }
  },
};
