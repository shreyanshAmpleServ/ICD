import { Request, Response } from 'express';
import { moveOrders, equipmentForMoves } from '../../../data/ops';
import { getPrisma, isDbLive } from '../../../db/prisma';

// Valid check constraints on ICD_New database
const VALID_MOVE_KINDS = ['PICK_FOR_VISIT', 'FROM_ACTIVITY', 'TO_ACTIVITY', 'RESHUFFLE', 'RELOCATE', 'PLACE'];

function normalizeMoveKind(kind?: string): string {
  if (!kind) return 'PLACE';
  const upper = kind.toUpperCase();
  if (VALID_MOVE_KINDS.includes(upper)) return upper;
  if (upper === 'REHANDLE') return 'RESHUFFLE';
  if (upper === 'YARD_TO_YARD') return 'RELOCATE';
  if (upper === 'LOAD') return 'PICK_FOR_VISIT';
  if (upper === 'DISCHARGE') return 'PLACE';
  return 'RELOCATE';
}

export const yardMovesController = {
  getMoveOrders: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
            const dbMoves = await prisma.move_order.findMany({
              include: {
                unit_stay: {
                  include: {
                    unit_stay_cargo_units: true,
                  },
                },
                m_equipment: true,
                m_yard_location_move_order_from_location_idTom_yard_location: true,
                m_yard_location_move_order_to_location_idTom_yard_location: true,
                truck_visit: {
                  include: {
                    m_truck_truck_visit_truck_idTom_truck: true,
                  },
                },
              },
              orderBy: { move_order_id: 'desc' },
            });

            if(dbMoves && dbMoves.length > 0) {
              const items = dbMoves.map((m: any) => ({
                moveOrderId: Number(m.move_order_id),
                moveId: Number(m.move_order_id),
                siteId: m.site_id || 1,
                unitStayId: Number(m.unit_stay_id),
                unitNo: m.unit_stay?.unit_stay_cargo_units?.unit_number || 'MSKU 123456 7',
                isoCode: m.unit_stay?.unit_stay_cargo_units?.iso_code || '42G1',
                category: 'CONTAINER',
                unitType: m.unit_stay?.unit_stay_cargo_units?.iso_code?.startsWith('4') ? '40ft Standard dry' : '20ft Standard dry',
                moveType: m.move_kind,
                moveKind: m.move_kind,
                sourceLocation: m.m_yard_location_move_order_from_location_idTom_yard_location?.full_code || 'A-01-01-1',
                targetLocation: m.m_yard_location_move_order_to_location_idTom_yard_location?.full_code || 'B-02-02-2',
                fromCode: m.m_yard_location_move_order_from_location_idTom_yard_location?.full_code || 'A-01-01-1',
                toCode: m.m_yard_location_move_order_to_location_idTom_yard_location?.full_code || 'B-02-02-2',
                fromLocationCode: m.m_yard_location_move_order_from_location_idTom_yard_location?.full_code || 'A-01-01-1',
                toLocationCode: m.m_yard_location_move_order_to_location_idTom_yard_location?.full_code || 'B-02-02-2',
                status: m.status || 'OPEN',
                priority: m.priority,
                priorityText: m.priority >= 5 ? 'URGENT' : (m.priority >= 4 ? 'HIGH' : 'NORMAL'),
                priorityNumber: m.priority,
                assignedEquipmentId: m.assigned_equipment_id || 1,
                assignedEquipment: m.m_equipment?.equipment_name || m.m_equipment?.equipment_code || 'RTG-01',
                assignedOperatorSub: m.assigned_operator_sub || 'ibrahim.n',
                assignedOperator: m.assigned_operator_sub || 'Ibrahim N.',
                operatorName: m.assigned_operator_sub || 'Ibrahim N.',
                requestedAt: m.requested_at?.toISOString() || m.createdate?.toISOString(),
                completedAt: m.completed_at?.toISOString(),
                plateNo: m.truck_visit?.m_truck_truck_visit_truck_idTom_truck?.plate_no,
              }));
          return res.json({ items, total: items.length });
        }
      }
    }

      res.json({ items: moveOrders, total: moveOrders.length });
  } catch(err: any) {
    console.error('getMoveOrders error:', err);
    res.status(500).json({ error: err.message });
  }
},

  createMoveOrder: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (prisma) {
          let unitStayId = req.body.unitStayId ? Number(req.body.unitStayId) : undefined;

          // If unitNo was provided instead of unitStayId
          if(!unitStayId && req.body.unitNo) {
            const cargo = await prisma.cargo_unit.findFirst({
              where: { unit_number: req.body.unitNo },
              include: { unit_stay: true },
            });
        if (cargo && cargo.unit_stay && cargo.unit_stay.length > 0) {
          unitStayId = Number(cargo.unit_stay[0].unit_stay_id);
        }
      }

      if (!unitStayId) {
        const firstStay = await prisma.unit_stay.findFirst();
        unitStayId = firstStay ? Number(firstStay.unit_stay_id) : 1;
      }

      let fromLocId = req.body.fromLocationId ? Number(req.body.fromLocationId) : undefined;
      let toLocId = req.body.toLocationId ? Number(req.body.toLocationId) : undefined;

      if (!fromLocId && (req.body.sourceLocation || req.body.fromLocationCode || req.body.fromCode)) {
        const code = req.body.sourceLocation || req.body.fromLocationCode || req.body.fromCode;
        const loc = await prisma.m_yard_location.findFirst({
          where: {
            OR: [{ full_code: code }, { location_code: code }],
          },
        });
        if (loc) fromLocId = loc.yard_location_id;
      }

      if (!toLocId && (req.body.targetLocation || req.body.toLocationCode || req.body.toCode)) {
        const code = req.body.targetLocation || req.body.toLocationCode || req.body.toCode;
        const loc = await prisma.m_yard_location.findFirst({
          where: {
            OR: [{ full_code: code }, { location_code: code }],
          },
        });
        if (loc) toLocId = loc.yard_location_id;
      }

      const moveKind = normalizeMoveKind(req.body.moveType || req.body.moveKind);
      const priority = req.body.priority === 'URGENT' ? 5 : (req.body.priority === 'HIGH' ? 4 : (Number(req.body.priority) || 3));

      let eqId = req.body.assignedEquipmentId ? Number(req.body.assignedEquipmentId) : undefined;
      if (!eqId && req.body.assignedEquipment) {
        const eq = await prisma.m_equipment.findFirst({
          where: {
            OR: [
              { equipment_code: req.body.assignedEquipment },
              { equipment_name: req.body.assignedEquipment },
            ],
          },
        });
        if (eq) eqId = eq.equipment_id;
      }

      const created = await prisma.move_order.create({
        data: {
          site_id: Number(req.body.siteId) || 1,
          unit_stay_id: BigInt(unitStayId),
          move_kind: moveKind,
          from_location_id: fromLocId,
          to_location_id: toLocId,
          suggestion_rank: 1,
          priority,
          status: 'OPEN',
          assigned_equipment_id: eqId,
          assigned_operator_sub: req.body.assignedOperator || req.body.assignedOperatorSub || 'ibrahim.n',
          requested_at: new Date(),
          createdby: 'dispatcher',
        },
        include: {
          unit_stay: {
            include: {
              unit_stay_cargo_units: true,
            },
          },
          m_equipment: true,
          m_yard_location_move_order_from_location_idTom_yard_location: true,
          m_yard_location_move_order_to_location_idTom_yard_location: true,
        },
      });

      return res.status(201).json({
        moveOrderId: Number(created.move_order_id),
        moveId: Number(created.move_order_id),
        siteId: created.site_id,
        unitStayId: Number(created.unit_stay_id),
        unitNo: created.unit_stay?.unit_stay_cargo_units?.unit_number || req.body.unitNo,
        moveType: created.move_kind,
        moveKind: created.move_kind,
        fromCode: created.m_yard_location_move_order_from_location_idTom_yard_location?.full_code,
        toCode: created.m_yard_location_move_order_to_location_idTom_yard_location?.full_code,
        sourceLocation: created.m_yard_location_move_order_from_location_idTom_yard_location?.full_code,
        targetLocation: created.m_yard_location_move_order_to_location_idTom_yard_location?.full_code,
        status: created.status,
        priority: created.priority,
        assignedEquipmentId: created.assigned_equipment_id,
        assignedEquipment: created.m_equipment?.equipment_name,
      });
    }

    const newMove = { moveOrderId: moveOrders.length + 1, ...req.body, status: 'OPEN' };
    moveOrders.push(newMove as any);
    res.status(201).json(newMove);
  } catch (err: any) {
    console.error('createMoveOrder error:', err);
    res.status(500).json({ error: err.message });
  }
  },

  startMove: async (req: Request, res: Response) => {
    try {
      const { moveOrderId } = req.params;
      const prisma = getPrisma();
      if (prisma) {
          const id = Number(moveOrderId);
          const updated = await prisma.move_order.update({
            where: { move_order_id: BigInt(id) },
            data: { status: 'IN_PROGRESS', updatedate: new Date() },
          });
          return res.json({
            success: true,
            moveOrderId: Number(updated.move_order_id),
            status: updated.status,
          });
        }
        res.json({ success: true, moveOrderId: Number(moveOrderId), status: 'IN_PROGRESS' });
      } catch (err: any) {
        console.error('startMove error:', err);
        res.status(500).json({ error: err.message });
      }
    },

    completeMove: async (req: Request, res: Response) => {
      try {
        const { moveOrderId } = req.params;
        const prisma = getPrisma();
        if (prisma) {
          const id = Number(moveOrderId);
          const existing = await prisma.move_order.findFirst({
            where: { move_order_id: BigInt(id) },
          });
          if (!existing) return res.status(404).json({ error: 'Move order not found' });

          let toLocId = existing.to_location_id;
          if (req.body.toCode) {
            const loc = await prisma.m_yard_location.findFirst({
              where: {
                OR: [{ full_code: req.body.toCode }, { location_code: req.body.toCode }],
              },
            });
            if (loc) toLocId = loc.yard_location_id;
          }

          const updated = await prisma.move_order.update({
            where: { move_order_id: BigInt(id) },
            data: {
              status: 'DONE',
              to_location_id: toLocId,
              completed_at: new Date(),
              updatedate: new Date(),
            },
          });

          // Record execution in yard_move
          try {
            await prisma.yard_move.create({
              data: {
                site_id: existing.site_id,
                unit_stay_id: existing.unit_stay_id,
                move_kind: existing.move_kind,
                from_location_id: existing.from_location_id,
                to_location_id: toLocId,
                equipment_id: existing.assigned_equipment_id,
                operator_sub: existing.assigned_operator_sub || 'ibrahim.n',
                occurred_at: new Date(),
                createdby: 'operator',
              },
            });
          } catch (ymErr) {
            console.warn('Could not record yard_move execution entry:', ymErr);
          }

          return res.json({
            success: true,
            moveOrderId: Number(updated.move_order_id),
            status: updated.status,
            completedAt: updated.completed_at?.toISOString(),
          });
        }

        res.json({ success: true, moveOrderId: Number(moveOrderId), status: 'DONE' });
      } catch (err: any) {
        console.error('completeMove error:', err);
        res.status(500).json({ error: err.message });
      }
    },

      assignMove: async (req: Request, res: Response) => {
        try {
          const { moveOrderId } = req.params;
          const prisma = getPrisma();
          if (prisma) {
            const id = Number(moveOrderId);
            const eqId = req.body.assignedEquipmentId ? Number(req.body.assignedEquipmentId) : undefined;
            const opSub = req.body.assignedOperatorSub || req.body.assignedOperator;

            const updated = await prisma.move_order.update({
              where: { move_order_id: BigInt(id) },
              data: {
                status: 'ASSIGNED',
                assigned_equipment_id: eqId,
                assigned_operator_sub: opSub,
                updatedate: new Date(),
              },
            });

            return res.json({
              success: true,
              moveOrderId: Number(updated.move_order_id),
              status: updated.status,
              assignedEquipmentId: updated.assigned_equipment_id,
              assignedOperatorSub: updated.assigned_operator_sub,
            });
          }
          res.json({ success: true, moveOrderId: Number(moveOrderId), status: 'ASSIGNED' });
        } catch (err: any) {
          console.error('assignMove error:', err);
          res.status(500).json({ error: err.message });
        }
      },

        executeMove: async (req: Request, res: Response) => {
          return yardMovesController.completeMove(req, res);
        },

          getEquipment: async (_req: Request, res: Response) => {
            try {
              if (isDbLive()) {
                const prisma = getPrisma();
                if (prisma) {
                  const eq = await prisma.m_equipment.findMany({
                    where: { is_active: true },
                    orderBy: { equipment_id: 'asc' },
                  });

                  if (eq && eq.length > 0) {
                    const items = eq.map((e: any) => ({
                      equipmentId: e.equipment_id,
                      equipmentCode: e.equipment_code,
                      equipmentName: e.equipment_name,
                      equipmentType: e.equipment_type,
                      capacityKg: e.capacity_kg,
                      status: 'AVAILABLE',
                    }));
                    return res.json({ items, total: items.length });
                  }
                }
              }

              res.json({ items: equipmentForMoves, total: equipmentForMoves.length });
            } catch (err: any) {
              console.error('getEquipment error:', err);
              res.status(500).json({ error: err.message });
            }
          },
};
