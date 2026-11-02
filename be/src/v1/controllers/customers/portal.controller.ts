import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const customerPortalController = {
  getOverview: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const totalConsignments = await prisma.consignments.count();
          const totalUnits = await prisma.unit_stay.count();
          return res.json({
            activeConsignments: totalConsignments,
            totalUnitsInDepot: totalUnits,
            readyForPickup: 4,
            pendingCustoms: 2,
            unpaidInvoices: 1,
            totalOutstandingUsd: 1250.0,
          });
        }
      }
      res.json({
        activeConsignments: 5,
        totalUnitsInDepot: 12,
        readyForPickup: 4,
        pendingCustoms: 2,
        unpaidInvoices: 1,
        totalOutstandingUsd: 1250.0,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getRequests: async (req: Request, res: Response) => {
    try {
      res.json({
        items: [
          {
            requestId: 1,
            requestNo: 'REQ-2026-001',
            requestType: 'STRIP_AND_STUFF',
            status: 'IN_REVIEW',
            description: 'Request for unstuffing 40HC container at bay 4',
            createdDate: new Date().toISOString(),
          },
        ],
        total: 1,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

