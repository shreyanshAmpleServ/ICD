"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gateRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const gate_1 = require("../../v1/controllers/gate");
const setup_1 = require("../../v1/controllers/setup");
const prisma_1 = require("../../db/prisma");
exports.gateRouter = (0, express_1.Router)();
// =========================================================================
// 1. Gates & Gate Lanes (Dynamic via SetupService / DB)
// =========================================================================
exports.gateRouter.get("/gates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), setup_1.setupGatesController.getGates);
exports.gateRouter.get("/gates/:gateId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), setup_1.setupGatesController.getGateById);
exports.gateRouter.post("/gates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.createGate);
exports.gateRouter.patch("/gates/:gateId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.updateGate);
exports.gateRouter.delete("/gates/:gateId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.deleteGate);
exports.gateRouter.post("/gates/:gateId/lanes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.createLane);
exports.gateRouter.patch("/gate-lanes/:laneId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.updateLane);
exports.gateRouter.delete("/gate-lanes/:laneId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.deleteLane);
// =========================================================================
// 2. Checkpoints (Dynamic via SetupService / DB)
// =========================================================================
exports.gateRouter.get("/checkpoints", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), setup_1.setupGatesController.getCheckpoints);
exports.gateRouter.get("/checkpoints/:checkpointId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), setup_1.setupGatesController.getCheckpointById);
exports.gateRouter.post("/checkpoints", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.createCheckpoint);
exports.gateRouter.patch("/checkpoints/:checkpointId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.updateCheckpoint);
exports.gateRouter.delete("/checkpoints/:checkpointId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.deleteCheckpoint);
// =========================================================================
// 3. Visit Types & Sequences (Dynamic via SetupService / DB)
// =========================================================================
exports.gateRouter.get("/visit-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), setup_1.setupGatesController.getVisitTypes);
exports.gateRouter.get("/visit-types/:visitTypeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), setup_1.setupGatesController.getVisitTypeById);
exports.gateRouter.post("/visit-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.createVisitType);
exports.gateRouter.patch("/visit-types/:visitTypeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.updateVisitType);
exports.gateRouter.delete("/visit-types/:visitTypeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), setup_1.setupGatesController.deleteVisitType);
// =========================================================================
// 4. Truck Visits & Operations (Dynamic via GateVisitsController / DB)
// =========================================================================
exports.gateRouter.get(["/truck-visits", "/gate/visits"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin"), gate_1.gateVisitsController.getVisits);
exports.gateRouter.post(["/truck-visits", "/gate/visits"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), gate_1.gateVisitsController.createVisit);
exports.gateRouter.get(["/truck-visits/:id", "/gate/visits/:id"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin"), gate_1.gateVisitsController.getVisitById);
exports.gateRouter.patch(["/truck-visits/:id", "/gate/visits/:id"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), gate_1.gateVisitsController.updateVisitStatus);
// Check-in / Checkout / Cancel / Turn Back
exports.gateRouter.post(["/truck-visits/:id\\:checkin", "/gate/visits/:id\\:checkin", "/truck-visits/:id/checkin", "/gate/visits/:id/checkin"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), gate_1.gateVisitsController.checkin);
exports.gateRouter.post(["/truck-visits/:id\\:checkout", "/gate/visits/:id\\:checkout", "/truck-visits/:id/checkout", "/gate/visits/:id/checkout"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkout", "DO"), gate_1.gateVisitsController.checkout);
exports.gateRouter.post(["/truck-visits/:id\\:cancel", "/gate/visits/:id\\:cancel", "/truck-visits/:id/cancel", "/gate/visits/:id/cancel"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), gate_1.gateVisitsController.cancelVisit);
exports.gateRouter.post(["/truck-visits/:id/turn-back", "/gate/visits/:id/turn-back"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), gate_1.gateVisitsController.turnBack);
// Checkpoint Events & Gate Pass
exports.gateRouter.post(["/truck-visits/:id/checkpoint-events", "/gate/visits/:id/checkpoint-events"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), gate_1.gateVisitsController.recordCheckpointEvent);
exports.gateRouter.get(["/truck-visits/:id/checkpoint-events", "/gate/visits/:id/checkpoint-events"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin"), async (req, res) => {
    try {
        const prisma = (0, prisma_1.getPrisma)();
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.gateRouter.post(["/truck-visits/:id/gate-pass\\:print", "/gate/visits/:id/gate-pass\\:print"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), gate_1.gateVisitsController.printGatePass);
// Units on Visit
exports.gateRouter.post(["/truck-visits/:id/units", "/gate/visits/:id/units"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), async (req, res) => {
    try {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            const numId = Number(req.params.id);
            if (!isNaN(numId)) {
                let stayId = req.body.unitStayId ? BigInt(req.body.unitStayId) : null;
                if (!stayId && req.body.unitNo) {
                    const stay = await prisma.unit_stay.findFirst({
                        where: { unit_stay_cargo_units: { unit_number: req.body.unitNo } },
                    });
                    if (stay)
                        stayId = stay.unit_stay_id;
                }
                if (stayId) {
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
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.gateRouter.delete(["/truck-visits/:id/units/:visitUnitId", "/gate/visits/:id/units/:visitUnitId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), async (req, res) => {
    try {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            const txnId = Number(req.params.visitUnitId);
            if (!isNaN(txnId)) {
                await prisma.visit_unit_txn.deleteMany({
                    where: { visit_unit_txn_id: BigInt(txnId) },
                });
            }
        }
        res.status(204).end();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 5. Gate Lane, Passes & Barrier
// =========================================================================
exports.gateRouter.get("/gate/lanes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin"), gate_1.gateLaneController.getLanes);
exports.gateRouter.post("/gate/lanes/:laneId/open-barrier", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), gate_1.gateLaneController.openBarrier);
exports.gateRouter.get("/gate-passes/:token", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin"), gate_1.gateLaneController.getGatePass);
// =========================================================================
// 6. Queue & Appointments
// =========================================================================
exports.gateRouter.get("/gate/queue", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin"), gate_1.gateQueueController.getQueue);
exports.gateRouter.get("/gate/queue/summary", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin"), gate_1.gateQueueController.getQueueSummary);
exports.gateRouter.get("/appointments", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage"), gate_1.gateAppointmentsController.getAppointments);
exports.gateRouter.post("/appointments", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage", "DO"), gate_1.gateAppointmentsController.createAppointment);
exports.gateRouter.patch(["/appointments/:id", "/appointments/:id/status"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage", "DO"), gate_1.gateAppointmentsController.updateAppointmentStatus);
exports.gateRouter.get("/appointments/slot-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage"), gate_1.gateAppointmentsController.getSlotRules);
exports.gateRouter.get("/appointments/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage"), gate_1.gateAppointmentsController.getAppointmentById);
// =========================================================================
// 7. Weighbridge Tickets & Overrides
// =========================================================================
exports.gateRouter.get(["/weighbridge/tickets", "/weighings"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("weighbridge.ticket"), gate_1.gateWeighbridgeController.getTickets);
exports.gateRouter.post(["/weighbridge/tickets", "/weighings"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("weighbridge.ticket", "DO"), gate_1.gateWeighbridgeController.createTicket);
exports.gateRouter.post(["/weighbridge/tickets/:ticketId/override-request", "/weighings/:ticketId/override-request"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("weighbridge.ticket", "DO"), gate_1.gateWeighbridgeController.requestOverride);
exports.gateRouter.post(["/weighbridge/tickets/:ticketId/print", "/weighings/:ticketId/print"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("weighbridge.ticket", "DO"), gate_1.gateWeighbridgeController.printTicket);
exports.default = exports.gateRouter;
