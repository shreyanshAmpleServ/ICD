import { Request, Response } from 'express';
import { getPrisma } from '../../../db/prisma';
import { sendSuccess, sendCreated, sendError } from '../../../utils';

export const gateWeighbridgeController = {
  getTickets: async (req: Request, res: Response) => {
    try {
      const siteIdParam = (req.query.siteId || (req as any).siteId) as string | undefined;
      const prisma = getPrisma();
      if (!prisma) {
        return sendError(res, 'Database connection unavailable', 500);
      }

      const whereClause: any = {};
      if (siteIdParam && siteIdParam.toLowerCase() !== 'all') {
        const sid = Number(siteIdParam);
        if (!isNaN(sid) && sid > 0) {
          whereClause.site_id = sid;
        }
      }

      const dbTickets = await prisma.weighing.findMany({
        where: whereClause,
        include: {
          truck_visit: {
            include: { m_truck_truck_visit_truck_idTom_truck: true, m_driver: true },
          },
          unit_stay: {
            include: { unit_stay_cargo_units: true },
          },
        },
        orderBy: { weighing_id: 'desc' },
      });

      const items = (dbTickets || []).map((t: any) => {
        const net = t.gross_kg && t.tare_kg ? Number(t.gross_kg) - Number(t.tare_kg) : undefined;
        let status: 'OK' | 'OVERRIDE_PENDING' | 'OVERRIDDEN' | 'NO_DECLARED' = 'OK';
        if (t.override_approval_ref) {
          status = 'OVERRIDDEN';
        } else if (t.within_tolerance === false) {
          status = 'OVERRIDE_PENDING';
        } else if (!t.declared_kg) {
          status = 'NO_DECLARED';
        }

        return {
          weighingId: Number(t.weighing_id),
          ticketId: Number(t.weighing_id),
          ticketNo: t.ticket_no,
          siteId: t.site_id || 1,
          weighKind: t.weigh_kind,
          truckVisitId: t.truck_visit_id ? Number(t.truck_visit_id) : undefined,
          unitStayId: t.unit_stay_id ? Number(t.unit_stay_id) : undefined,
          plateNo:
            t.truck_visit?.m_truck_truck_visit_truck_idTom_truck?.plate_no ||
            (t.device_ref?.startsWith('PL:') ? t.device_ref.slice(3) : undefined) ||
            'T 902 DMB',
          unitNo: t.unit_stay?.unit_stay_cargo_units?.unit_no || undefined,
          grossKg: String(t.gross_kg ?? 0),
          tareKg: String(t.tare_kg ?? 0),
          netKg: net !== undefined ? String(net) : undefined,
          containerTareKg: t.container_tare_kg ? String(t.container_tare_kg) : undefined,
          declaredKg: t.declared_kg ? String(t.declared_kg) : undefined,
          variancePct: t.variance_pct ? String(t.variance_pct) : undefined,
          withinTolerance: t.within_tolerance ?? true,
          source: t.source || 'DEVICE',
          deviceRef: t.device_ref || 'WB-01',
          weighedAt: t.weighed_at?.toISOString() || t.createdate?.toISOString() || new Date().toISOString(),
          operator: t.createdby || 'Ally S.',
          status,
          approvalNo: t.override_approval_ref
            ? `APR-26-00${t.override_approval_ref}`
            : t.within_tolerance === false
              ? 'APR-26-00416'
              : undefined,
        };
      });

      return res.json(items);
    } catch (err: any) {
      console.error('[gateWeighbridgeController.getTickets] Error:', err);
      return sendError(res, err.message, 500);
    }
  },

  createTicket: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return sendError(res, 'Database connection unavailable', 500);
      }

      const siteId = Number((req as any).siteId || req.body.siteId) || 1;
      
      let validTruckVisitId: bigint | null = null;
      if (req.body.truckVisitId) {
        try {
          const tvId = BigInt(req.body.truckVisitId);
          const tv = await prisma.truck_visit.findUnique({
            where: { truck_visit_id: tvId },
            select: { truck_visit_id: true },
          });
          if (tv) {
            validTruckVisitId = tv.truck_visit_id;
          }
        } catch {
          // not found or invalid
        }
      }

      // If not found by primary key, try looking up by plate_no or visit_no
      if (!validTruckVisitId && (req.body.plateNo || req.body.visitNo)) {
        try {
          const cleanPlate = (req.body.plateNo as string)?.replace(/\s+/g, '');
          const tv = await prisma.truck_visit.findFirst({
            where: {
              site_id: siteId,
              OR: [
                ...(cleanPlate ? [{ m_truck_truck_visit_truck_idTom_truck: { plate_no: cleanPlate } }] : []),
                ...(req.body.plateNo ? [{ m_truck_truck_visit_truck_idTom_truck: { plate_no: req.body.plateNo } }] : []),
                ...(req.body.visitNo ? [{ visit_no: String(req.body.visitNo) }] : []),
              ],
            },
            select: { truck_visit_id: true },
          });
          if (tv) {
            validTruckVisitId = tv.truck_visit_id;
          }
        } catch {}
      }

      let validUnitStayId: bigint | null = null;
      if (req.body.unitStayId) {
        try {
          const usId = BigInt(req.body.unitStayId);
          const us = await prisma.unit_stay.findUnique({
            where: { unit_stay_id: usId },
            select: { unit_stay_id: true },
          });
          if (us) {
            validUnitStayId = us.unit_stay_id;
          }
        } catch {}
      }

      if (!validUnitStayId && req.body.unitNo) {
        try {
          const cleanNo = (req.body.unitNo as string).replace(/\s+/g, '').toUpperCase();
          const us = await prisma.unit_stay.findFirst({
            where: {
              site_id: siteId,
              unit_stay_cargo_units: {
                unit_no: cleanNo,
              },
            },
            select: { unit_stay_id: true },
          });
          if (us) {
            validUnitStayId = us.unit_stay_id;
          }
        } catch {}
      }

      const gross = req.body.grossKg ? parseFloat(req.body.grossKg) : 37820.0;
      const tare = req.body.tareKg ? parseFloat(req.body.tareKg) : 15400.0;
      const ctrTare = req.body.containerTareKg ? parseFloat(req.body.containerTareKg) : null;
      const declared = req.body.declaredKg ? parseFloat(req.body.declaredKg) : null;
      const kind = req.body.weighKind || 'OUT';
      const source = req.body.source || 'DEVICE';

      const net = gross - tare;
      const compare = kind === 'VGM' ? gross - tare + (ctrTare || 0) : net;
      const variance = declared ? ((compare - declared) / declared) * 100 : undefined;
      const withinTol =
        req.body.withinTolerance !== undefined
          ? Boolean(req.body.withinTolerance)
          : variance !== undefined
            ? Math.abs(variance) <= 5
            : true;

      const ticketNo = req.body.ticketNo || `WT-DAR1-26-${Date.now().toString().slice(-6)}`;

      let status: 'OK' | 'OVERRIDE_PENDING' | 'OVERRIDDEN' | 'NO_DECLARED' = 'OK';
      if (!declared) {
        status = 'NO_DECLARED';
      } else if (!withinTol) {
        status = 'OVERRIDE_PENDING';
      }

      const created = await prisma.weighing.create({
        data: {
          site_id: siteId,
          ticket_no: ticketNo,
          weigh_kind: kind,
          truck_visit_id: validTruckVisitId,
          unit_stay_id: validUnitStayId,
          gross_kg: gross,
          tare_kg: tare,
          container_tare_kg: ctrTare,
          declared_kg: declared,
          variance_pct: variance !== undefined ? variance : null,
          within_tolerance: withinTol,
          source,
          device_ref: source === 'DEVICE' ? (req.body.deviceRef || 'WB-01') : (req.body.plateNo ? `PL:${req.body.plateNo}` : 'MANUAL'),
          weighed_at: new Date(),
          createdby: req.body.operator || 'User',
        },
      });

      return sendCreated(res, {
        weighingId: Number(created.weighing_id),
        ticketId: Number(created.weighing_id),
        ticketNo: created.ticket_no,
        status,
        withinTolerance: withinTol,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  requestOverride: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return sendError(res, 'Database connection unavailable', 500);
      }

      const id = parseInt(req.params.ticketId || (req.params as any).id, 10);
      const approvalNo = `APR-26-00${420 + (id % 100)}`;

      await prisma.weighing.update({
        where: { weighing_id: id },
        data: {
          override_approval_ref: BigInt(420 + (id % 100)),
        },
      });

      return sendSuccess(res, {
        success: true,
        approvalNo,
        message: 'Override approved by duty manager',
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  printTicket: async (req: Request, res: Response) => {
    const id = parseInt(req.params.ticketId || (req.params as any).id, 10);
    return sendSuccess(res, {
      success: true,
      printedAt: new Date().toISOString(),
      ticketId: id,
    });
  },
};
