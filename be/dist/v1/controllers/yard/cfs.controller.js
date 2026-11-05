"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yardCfsController = void 0;
const prisma_1 = require("../../../db/prisma");
exports.yardCfsController = {
    getJobs: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const jobs = await prisma.cfs_jobs.findMany({
                        include: { unit_stays: true },
                        orderBy: { job_id: 'desc' },
                    });
                    if (jobs && jobs.length > 0) {
                        const items = jobs.map((j) => ({
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
                    }
                }
            }
            res.json({
                items: [
                    {
                        jobId: 1,
                        jobNo: 'CFS-2026-001',
                        jobType: 'DEVANNING',
                        unitStayId: 101,
                        unitNumber: 'MSKU 882014 9',
                        status: 'IN_PROGRESS',
                        packagesExpected: 450,
                        packagesProcessed: 200,
                        commencedAt: new Date(Date.now() - 7200000).toISOString(),
                        completedAt: null,
                    },
                ],
                total: 1,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createJob: async (req, res) => {
        try {
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const created = await prisma.cfs_jobs.create({
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
            }
            res.status(201).json({ jobId: 2, jobNo: `CFS-${Date.now()}`, ...req.body });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
