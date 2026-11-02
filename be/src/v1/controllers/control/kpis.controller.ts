import { Request, Response } from 'express';

export const controlKpisController = {
  getKpis: async (_req: Request, res: Response) => {
    try {
      res.json({
        gateTurnaroundMinutes: 28.5,
        yardOccupancyPercent: 68.2,
        dwellTimeAvgDays: 4.8,
        dailyThroughputTeu: 450,
        unbilledRevenueUsd: 14200.0,
        activeExceptionsCount: 3,
        kpiTrends: [
          { date: '2026-10-25', throughput: 410, turnaround: 32 },
          { date: '2026-10-26', throughput: 430, turnaround: 30 },
          { date: '2026-10-27', throughput: 460, turnaround: 29 },
          { date: '2026-10-28', throughput: 445, turnaround: 28 },
          { date: '2026-10-29', throughput: 480, turnaround: 27 },
          { date: '2026-10-30', throughput: 490, turnaround: 26 },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

