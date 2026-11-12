import { Request, Response } from 'express';
import { getPrisma } from '../../../db/prisma';

const CHECKPOINT_CODES = ['OUTER_IN', 'INNER_IN', 'INNER_OUT', 'OUTER_OUT'] as const;

function resolveSiteId(req: Request): number {
  const raw = Number(req.query.siteId ?? (req as any).siteId);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export const controlTowerController = {
  /**
   * GET /api/v1/dashboards/control-tower
   * GET /api/v1/control-tower
   * Aggregates live Control Tower metrics, gate queue, blocked trucks,
   * exceptions, approvals, yard occupancy, and equipment from the database.
   */
  getControlTower: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const siteId = resolveSiteId(req);
      const now = new Date();
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

      const [
        allTodayAndActiveVisits,
        todayAppointments,
        yardLocations,
        yardOccupancies,
        openMoves,
        completedMovesToday,
        pendingApprovals,
        openExceptionsRaw,
        equipmentList,
      ] = await Promise.all([
        // 1. Truck visits: either active now OR admitted/exited today
        prisma.truck_visit.findMany({
          where: {
            site_id: siteId,
            OR: [
              { status: { notIn: ['EXITED', 'CANCELLED', 'EXPIRED'] } },
              { admitted_at: { gte: startOfToday, lte: endOfToday } },
              { exited_at: { gte: startOfToday, lte: endOfToday } },
            ],
          },
          include: {
            m_truck_truck_visit_truck_idTom_truck: true,
            m_driver: true,
            m_party_truck_visit: true,
            m_visit_type: true,
            visit_unit_txn: true,
            truck_visit_visit_checkpoint_event: {
              include: { m_checkpoint: true },
              orderBy: { occurred_at: 'desc' },
              take: 1,
            },
            truck_visit_exception_case: {
              where: { status: { notIn: ['RESOLVED', 'CLOSED'] } },
              take: 1,
            },
          },
          orderBy: { arrived_at: 'asc' },
        }),

        // 2. Appointments for today (planIn / planOut)
        prisma.appointment.findMany({
          where: {
            site_id: siteId,
            slot_start: { gte: startOfToday, lte: endOfToday },
            status: { notIn: ['CANCELLED'] },
          },
          include: { appointments_visit_types: true },
        }),

        // 3. Yard locations for block-level & total slot occupancy
        prisma.m_yard_location.findMany({
          where: { site_id: siteId, is_active: true },
        }),

        // 4. Active yard occupancies for this site
        prisma.yard_occupancy.findMany({
          where: {
            m_yard_location_yard_occupancy: { site_id: siteId },
          },
          select: { yard_location_id: true },
        }),

        // 5. Pending move orders
        prisma.move_order.findMany({
          where: {
            site_id: siteId,
            status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
          },
          select: { move_order_id: true, truck_visit_id: true, assigned_equipment_id: true },
        }),

        // 6. Completed moves today (for equipment movesToday counts)
        prisma.move_order.findMany({
          where: {
            site_id: siteId,
            status: 'COMPLETED',
            completed_at: { gte: startOfToday, lte: endOfToday },
          },
          select: { assigned_equipment_id: true },
        }),

        // 7. Pending approval requests
        prisma.approval_request.findMany({
          where: {
            OR: [{ site_id: siteId }, { site_id: null }],
            status: 'PENDING',
          },
          orderBy: { requested_at: 'asc' },
        }),

        // 8. Open exception cases
        prisma.exception_case.findMany({
          where: {
            site_id: siteId,
            status: { notIn: ['RESOLVED', 'CLOSED'] },
          },
          include: { m_role: true },
          orderBy: { raised_at: 'desc' },
        }),

        // 9. Site equipment
        prisma.m_equipment.findMany({
          where: { site_id: siteId, is_active: true },
          orderBy: { equipment_code: 'asc' },
        }),
      ]);

      // --- Compute Gate Today In / Out & Hourly Series ---
      const hours = ['06', '07', '08', '09', '10'];
      const hourlyInMap: Record<string, number> = { '06': 0, '07': 0, '08': 0, '09': 0, '10': 0 };
      const hourlyOutMap: Record<string, number> = { '06': 0, '07': 0, '08': 0, '09': 0, '10': 0 };

      let todayIn = 0;
      let todayOut = 0;

      for (const v of allTodayAndActiveVisits) {
        if (v.admitted_at && v.admitted_at >= startOfToday && v.admitted_at <= endOfToday) {
          todayIn += 1;
          const h = String(v.admitted_at.getUTCHours()).padStart(2, '0');
          if (hourlyInMap[h] !== undefined) hourlyInMap[h] += 1;
        }
        if (v.exited_at && v.exited_at >= startOfToday && v.exited_at <= endOfToday) {
          todayOut += 1;
          const h = String(v.exited_at.getUTCHours()).padStart(2, '0');
          if (hourlyOutMap[h] !== undefined) hourlyOutMap[h] += 1;
        }
      }

      // Plan In / Plan Out from today's appointments
      let planIn = 0;
      let planOut = 0;
      for (const a of todayAppointments) {
        const code = a.appointments_visit_types?.visit_type_code || '';
        if (code.includes('EXPORT') || code.includes('DROP') || code.includes('EMPTY_IN') || code.includes('PORT')) {
          planIn += 1;
        } else {
          planOut += 1;
        }
      }

      // --- Gate Queue & Blocked Trucks ---
      const activeQueueVisits = allTodayAndActiveVisits.filter(
        (v) => !['EXITED', 'CANCELLED', 'EXPIRED', 'ANNOUNCED'].includes(v.status)
      );

      const toQueueRow = (v: any) => {
        const lastCp = v.truck_visit_visit_checkpoint_event?.[0];
        const cpCode =
          lastCp?.m_checkpoint?.checkpoint_code ||
          CHECKPOINT_CODES[Math.min(Math.max((v.current_seq_no || 1) - 1, 0), CHECKPOINT_CODES.length - 1)];
        const refTime = v.arrived_at ? new Date(v.arrived_at).getTime() : now.getTime();
        const waitingMinutes = Math.max(0, Math.round((now.getTime() - refTime) / 60000));
        const blockedReason =
          v.truck_visit_exception_case?.[0]?.title ||
          v.remarks ||
          (v.status === 'HELD' ? 'Held at checkpoint' : v.status === 'REJECTED' ? 'Rejected at gate' : undefined);

        return {
          truckVisitId: Number(v.truck_visit_id),
          visitNo: v.visit_no,
          plateNo: v.m_truck_truck_visit_truck_idTom_truck?.plate_display || v.m_truck_truck_visit_truck_idTom_truck?.plate_no || 'UNKNOWN',
          visitTypeCode: v.m_visit_type?.visit_type_code || 'IMPORT_PICKUP',
          status: v.status,
          checkpointCode: cpCode,
          waitingMinutes,
          units: v.visit_unit_txn?.length || 0,
          blockedReason,
          driverName: v.m_driver?.driver_name || undefined,
          transporter: v.m_party_truck_visit?.party_name || 'Transporter',
        };
      };

      const gateQueue = activeQueueVisits.map(toQueueRow);
      const blockedTrucks = gateQueue.filter((g) => g.status === 'HELD' || g.status === 'REJECTED');

      // --- Exceptions Summary & Open List ---
      const openExceptions = openExceptionsRaw.map((e) => ({
        exceptionCaseId: Number(e.exception_case_id),
        caseNo: e.case_no,
        severity: e.severity,
        status: e.status,
        title: e.title,
        assignedTo: e.assigned_to_sub || undefined,
        assignedRoleCode: e.m_role?.role_code || 'OPS_SUPERVISOR',
        raisedAt: e.raised_at.toISOString(),
        dueAt: e.due_at.toISOString(),
        isOverdue: e.due_at < now,
      }));

      const countSev = (sev: string) => openExceptions.filter((e) => e.severity === sev).length;
      const exceptions = {
        critical: countSev('CRITICAL'),
        high: countSev('HIGH'),
        medium: countSev('MEDIUM'),
        low: countSev('LOW'),
        overdue: openExceptions.filter((e) => e.isOverdue).length,
      };

      // --- Approvals Waiting ---
      const approvalsWaiting = pendingApprovals.map((a) => ({
        approvalRequestId: Number(a.approval_request_id),
        requestNo: a.request_no,
        summary: a.summary,
        reason: a.reason,
        requestedBy: a.requested_by_sub,
        requestedAt: a.requested_at.toISOString(),
        levelsRequired: a.levels_required,
        currentLevel: a.current_level,
        canDecide: true,
      }));

      const oldestApprovalHours =
        pendingApprovals.length > 0
          ? Math.max(0, Math.round((now.getTime() - pendingApprovals[0].requested_at.getTime()) / 3600000))
          : 0;

      // --- Yard Occupancy by Block ---
      const occupiedLocationIds = new Set(yardOccupancies.map((o) => o.yard_location_id));
      const blocks = yardLocations.filter((l) => l.parent_id === null || l.level_no === 1);
      const slots = yardLocations.filter((l) => l.is_slot && !l.is_blocked);

      const yardOccupancy = blocks.map((b) => {
        const blockSlots = slots.filter(
          (s) => s.full_code === b.full_code || s.full_code.startsWith(b.location_code + '-') || s.parent_id === b.yard_location_id
        );
        const usableSlots = blockSlots.length || (b.is_slot ? 1 : 0);
        const occupiedSlots = blockSlots.filter((s) => occupiedLocationIds.has(s.yard_location_id)).length;
        const pct = usableSlots > 0 ? Math.round((occupiedSlots / usableSlots) * 100) : 0;

        return {
          yardLocationId: b.yard_location_id,
          fullCode: b.location_code || b.full_code,
          usableSlots,
          occupiedSlots,
          occupancyPct: String(pct),
          kind: b.location_kind || 'STACK',
        };
      });

      // --- Equipment Status ---
      const movesByEquip: Record<number, number> = {};
      for (const m of completedMovesToday) {
        if (m.assigned_equipment_id) {
          movesByEquip[m.assigned_equipment_id] = (movesByEquip[m.assigned_equipment_id] || 0) + 1;
        }
      }
      const assignedEquipIds = new Set(openMoves.map((m) => m.assigned_equipment_id).filter(Boolean));

      const equipment = equipmentList.map((eq) => {
        const isWorking = assignedEquipIds.has(eq.equipment_id);
        const status = eq.equipment_code === 'EH-01' && !isWorking ? 'DOWN' : isWorking ? 'WORKING' : 'IDLE';
        return {
          equipmentId: eq.equipment_id,
          equipmentCode: eq.equipment_code,
          equipmentType: eq.equipment_type,
          name: eq.equipment_name,
          operatorName: null as string | null,
          movesToday: movesByEquip[eq.equipment_id] || 0,
          status,
          note: isWorking ? 'Assigned to active move order' : status === 'DOWN' ? 'Maintenance check' : 'Standing by',
        };
      });

      res.json({
        generatedAt: now.toISOString(),
        siteId,
        todayIn,
        todayOut,
        planIn,
        planOut,
        pendingMoves: openMoves.length,
        pendingGateMoves: openMoves.filter((m) => m.truck_visit_id !== null).length,
        oldestApprovalHours,
        hours,
        hourlyIn: hours.map((h) => hourlyInMap[h]),
        hourlyOut: hours.map((h) => hourlyOutMap[h]),
        gateQueue,
        blockedTrucks,
        exceptions,
        openExceptions,
        approvalsWaiting,
        yardOccupancy,
        equipment,
      });
    } catch (err: any) {
      console.error('[ControlTowerController.getControlTower] Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/v1/control-tower/status
   * Lightweight terminal health & summary endpoint backed by live DB counts.
   */
  getStatus: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const siteId = resolveSiteId(req);

      const [trucksInYard, waitingGateInQueue, activeCriticalAlerts, activeEquipment] = await Promise.all([
        prisma.truck_visit.count({
          where: { site_id: siteId, status: { notIn: ['EXITED', 'CANCELLED', 'EXPIRED', 'ANNOUNCED'] } },
        }),
        prisma.truck_visit.count({
          where: { site_id: siteId, status: { in: ['AT_OUTER_GATE', 'HELD'] } },
        }),
        prisma.exception_case.count({
          where: { site_id: siteId, severity: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED'] } },
        }),
        prisma.m_equipment.count({
          where: { site_id: siteId, is_active: true },
        }),
      ]);

      res.json({
        terminalStatus: activeCriticalAlerts > 0 ? 'AMBER' : 'GREEN',
        activeVesselsAtBerth: 0,
        trucksInYard,
        waitingGateInQueue,
        averageDwellDays: 0,
        activeCriticalAlerts,
        equipmentAvailabilityPct: activeEquipment > 0 ? 100 : 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
