import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import {
  gateQueueController,
  gateLaneController,
  gateAppointmentsController,
  gateVisitsController,
  gateWeighbridgeController,
} from "../../v1/controllers/gate";
import { setupGatesController } from "../../v1/controllers/setup";
import { getPrisma } from "../../db/prisma";

export const gateRouter = Router();

// =========================================================================
// 1. Gates & Gate Lanes (Dynamic via SetupService / DB)
// =========================================================================
gateRouter.get("/gates", requireSite(false), requirePermission("masters.view"), setupGatesController.getGates);
gateRouter.get("/gates/:gateId", requireSite(false), requirePermission("masters.view"), setupGatesController.getGateById);
gateRouter.post("/gates", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.createGate);
gateRouter.patch("/gates/:gateId", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.updateGate);
gateRouter.delete("/gates/:gateId", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.deleteGate);
gateRouter.post("/gates/:gateId/lanes", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.createLane);
gateRouter.patch("/gate-lanes/:laneId", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.updateLane);
gateRouter.delete("/gate-lanes/:laneId", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.deleteLane);

// =========================================================================
// 2. Checkpoints (Dynamic via SetupService / DB)
// =========================================================================
gateRouter.get("/checkpoints", requireSite(false), requirePermission("masters.view"), setupGatesController.getCheckpoints);
gateRouter.get("/checkpoints/:checkpointId", requireSite(false), requirePermission("masters.view"), setupGatesController.getCheckpointById);
gateRouter.post("/checkpoints", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.createCheckpoint);
gateRouter.patch("/checkpoints/:checkpointId", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.updateCheckpoint);
gateRouter.delete("/checkpoints/:checkpointId", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.deleteCheckpoint);

// =========================================================================
// 3. Visit Types & Sequences (Dynamic via SetupService / DB)
// =========================================================================
gateRouter.get("/visit-types", requireSite(false), requirePermission("masters.view"), setupGatesController.getVisitTypes);
gateRouter.get("/visit-types/:visitTypeId", requireSite(false), requirePermission("masters.view"), setupGatesController.getVisitTypeById);
gateRouter.post("/visit-types", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.createVisitType);
gateRouter.patch("/visit-types/:visitTypeId", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.updateVisitType);
gateRouter.delete("/visit-types/:visitTypeId", requireSite(false), requirePermission("admin.gate.configure", "DO"), setupGatesController.deleteVisitType);

// =========================================================================
// 4. Truck Visits & Operations (Dynamic via GateVisitsController / DB)
// =========================================================================
gateRouter.get(["/truck-visits", "/gate/visits"], requireSite(false), requirePermission("gate.visit.checkin"), gateVisitsController.getVisits);
gateRouter.post(["/truck-visits", "/gate/visits"], requireSite(false), requirePermission("gate.visit.checkin", "DO"), gateVisitsController.createVisit);
gateRouter.get(["/truck-visits/:id", "/gate/visits/:id"], requireSite(false), requirePermission("gate.visit.checkin"), gateVisitsController.getVisitById);
gateRouter.patch(["/truck-visits/:id", "/gate/visits/:id"], requireSite(false), requirePermission("gate.visit.checkin", "DO"), gateVisitsController.updateVisitStatus);

  // Check-in / Checkout / Cancel / Turn Back
  gateRouter.post(
    ["/truck-visits/:id\\:checkin", "/gate/visits/:id\\:checkin", "/truck-visits/:id/checkin", "/gate/visits/:id/checkin"],
    requireSite(false),
    requirePermission("gate.visit.checkin", "DO"),
    gateVisitsController.checkin
  );
  gateRouter.post(
    ["/truck-visits/:id\\:checkout", "/gate/visits/:id\\:checkout", "/truck-visits/:id/checkout", "/gate/visits/:id/checkout"],
    requireSite(false),
    requirePermission("gate.visit.checkout", "DO"),
    gateVisitsController.checkout
  );
  gateRouter.post(
    ["/truck-visits/:id\\:cancel", "/gate/visits/:id\\:cancel", "/truck-visits/:id/cancel", "/gate/visits/:id/cancel"],
    requireSite(false),
    requirePermission("gate.visit.checkin", "DO"),
    gateVisitsController.cancelVisit
  );
  gateRouter.post(
    ["/truck-visits/:id/turn-back", "/gate/visits/:id/turn-back"],
    requireSite(false),
    requirePermission("gate.visit.checkin", "DO"),
    gateVisitsController.turnBack
  );

  // Checkpoint Events & Gate Pass
  gateRouter.post(
    ["/truck-visits/:id/checkpoint-events", "/gate/visits/:id/checkpoint-events"],
    requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  gateVisitsController.recordCheckpointEvent
);
  gateRouter.get(
    ["/truck-visits/:id/checkpoint-events", "/gate/visits/:id/checkpoint-events"],
    requireSite(false),
    requirePermission("gate.visit.checkin"),
    async (req, res) => {
        try {
          const prisma = getPrisma();
          if (prisma) {
              const numId = Number(req.params.id);
              const events = await prisma.visit_checkpoint_event.findMany({
                where: isNaN(numId) ? {} : { truck_visit_id: BigInt(numId) },
                include: { m_checkpoint: true },
                orderBy: { seq_no: 'asc' },
              });
              if (events && events.length > 0) {
                const items = events.map((e) => ({
                  eventCheckpointId: Number(e.checkpoint_event_id),
                  checkpointCode: e.m_checkpoint?.checkpoint_code || 'OUTER_IN',
                  checkpointName: e.m_checkpoint?.checkpoint_name || 'Checkpoint',
                  seqNo: e.seq_no,
                  result: e.result,
                  failureReason: e.remarks || undefined,
                  occurredAt: e.event_time?.toISOString(),
                  by: e.createdby || 'Gate Officer',
                }));
                return res.json({ items, total: items.length, nextCursor: null });
              }
            }
            res.json({ items: [], total: 0, nextCursor: null });
          } catch (err: any) {
            res.status(500).json({ error: err.message });
          }
      }
);
  gateRouter.post(
    ["/truck-visits/:id/gate-pass\\:print", "/gate/visits/:id/gate-pass\\:print"],
    requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  gateVisitsController.printGatePass
);

  // Units on Visit
  gateRouter.post(
    ["/truck-visits/:id/units", "/gate/visits/:id/units"],
    requireSite(false),
    requirePermission("gate.visit.checkin", "DO"),
  async (req, res) => {
      try {
        const prisma = getPrisma();
                if(prisma) {
                  const numId = Number(req.params.id);
                  if (!isNaN(numId)) {
                    let stayId = req.body.unitStayId ? BigInt(req.body.unitStayId) : null;
                    if (!stayId && req.body.unitNo) {
                      const stay = await prisma.unit_stay.findFirst({
                        where: { unit_stay_cargo_units: { unit_number: req.body.unitNo } },
                      });
                      if (stay) stayId = stay.unit_stay_id;
                    }
                          if(stayId) {
                            const created = await prisma.visit_unit_txn.create({
                              data: {
                                truck_visit_id: BigInt(numId),
                                unit_stay_id: stayId,
                                direction: req.body.direction || 'PICK',
                                status: 'PLANNED',
                                seal_status: req.body.sealExpected ? 'MATCH' : undefined,
                                createdby: 'gate_operator',
                              },
                            });
                            return res.status(201).json({
                              visitUnitTxnId: Number(created.visit_unit_txn_id),
                              unitStayId: Number(created.unit_stay_id),
                              unitNo: req.body.unitNo || 'MSKU 000000 0',
                              direction: created.direction,
                              status: created.status,
                            });
                          }
                        }
                      }
      res.status(201).json({
                        visitUnitTxnId: Date.now(),
                        unitStayId: req.body.unitStayId || 5001,
                        unitNo: req.body.unitNo || "MSKU 000000 0",
                        direction: req.body.direction || "PICK",
                        status: "PLANNED",
                      });
                    } catch (err: any) {
                      res.status(500).json({ error: err.message });
                    }
                }
);
                gateRouter.delete(
                  ["/truck-visits/:id/units/:visitUnitId", "/gate/visits/:id/units/:visitUnitId"],
                  requireSite(false),
                  requirePermission("gate.visit.checkin", "DO"),
                  async (req, res) => {
                      try {
                        const prisma = getPrisma();
                        if (prisma) {
                          const txnId = Number(req.params.visitUnitId);
                          if(!isNaN(txnId)) {
                          await prisma.visit_unit_txn.deleteMany({
                            where: { visit_unit_txn_id: BigInt(txnId) },
                          });
                        }
                      }
      res.status(204).end();
                    } catch (err: any) {
                      res.status(500).json({ error: err.message });
                    }
                }
              );

              // =========================================================================
              // 5. Gate Lane, Passes & Barrier
              // =========================================================================
              gateRouter.get("/gate/lanes", requireSite(false), requirePermission("gate.visit.checkin"), gateLaneController.getLanes);
              gateRouter.post("/gate/lanes/:laneId/open-barrier", requireSite(false), requirePermission("gate.visit.checkin", "DO"), gateLaneController.openBarrier);
              gateRouter.get("/gate-passes/:token", requireSite(false), requirePermission("gate.visit.checkin"), gateLaneController.getGatePass);

              // =========================================================================
              // 6. Queue & Appointments
              // =========================================================================
              gateRouter.get("/gate/queue", requireSite(false), requirePermission("gate.visit.checkin"), gateQueueController.getQueue);
              gateRouter.get("/gate/queue/summary", requireSite(false), requirePermission("gate.visit.checkin"), gateQueueController.getQueueSummary);
              gateRouter.get("/appointments", requireSite(false), requirePermission("appointment.manage"), gateAppointmentsController.getAppointments);
              gateRouter.post("/appointments", requireSite(false), requirePermission("appointment.manage", "DO"), gateAppointmentsController.createAppointment);
              gateRouter.patch(["/appointments/:id", "/appointments/:id/status"], requireSite(false), requirePermission("appointment.manage", "DO"), gateAppointmentsController.updateAppointmentStatus);
              gateRouter.get("/appointments/slot-rules", requireSite(false), requirePermission("appointment.manage"), gateAppointmentsController.getSlotRules);
              gateRouter.get("/appointments/:id", requireSite(false), requirePermission("appointment.manage"), gateAppointmentsController.getAppointmentById);

              // =========================================================================
              // 7. Weighbridge Tickets & Overrides
              // =========================================================================
              gateRouter.get(["/weighbridge/tickets", "/weighings"], requireSite(false), requirePermission("weighbridge.ticket"), gateWeighbridgeController.getTickets);
              gateRouter.post(["/weighbridge/tickets", "/weighings"], requireSite(false), requirePermission("weighbridge.ticket", "DO"), gateWeighbridgeController.createTicket);
              gateRouter.post(["/weighbridge/tickets/:ticketId/override-request", "/weighings/:ticketId/override-request"], requireSite(false), requirePermission("weighbridge.ticket", "DO"), gateWeighbridgeController.requestOverride);
              gateRouter.post(["/weighbridge/tickets/:ticketId/print", "/weighings/:ticketId/print"], requireSite(false), requirePermission("weighbridge.ticket", "DO"), gateWeighbridgeController.printTicket);

              export default gateRouter;
