import { Router } from 'express';
import { requireSite } from '../../../middlewares/siteScope';
import { requirePermission } from '../../../middlewares/permission';
import {
  gateQueueController,
  gateLaneController,
  gateAppointmentsController,
  gateVisitsController,
  gateWeighbridgeController,
} from '../../controllers/gate';

export const gateRoutes = Router();

// Queue & Operations
gateRoutes.get('/gate/queue', requireSite(false), requirePermission('gate.visit.checkin'), gateQueueController.getQueue);
gateRoutes.get('/gate/queue/summary', requireSite(false), requirePermission('gate.visit.checkin'), gateQueueController.getQueueSummary);

// Lanes & Passes
gateRoutes.get('/gate/lanes', requireSite(false), requirePermission('gate.visit.checkin'), gateLaneController.getLanes);
gateRoutes.post('/gate/lanes/:laneId/open-barrier', requireSite(false), requirePermission('gate.visit.checkin', 'DO'), gateLaneController.openBarrier);
gateRoutes.get('/gate-passes/:token', requireSite(false), requirePermission('gate.visit.checkin'), gateLaneController.getGatePass);

// Appointments
gateRoutes.get('/appointments', requireSite(false), requirePermission('appointment.manage'), gateAppointmentsController.getAppointments);
gateRoutes.post('/appointments', requireSite(false), requirePermission('appointment.manage', 'DO'), gateAppointmentsController.createAppointment);
gateRoutes.patch(['/appointments/:id', '/appointments/:id/status'], requireSite(false), requirePermission('appointment.manage', 'DO'), gateAppointmentsController.updateAppointmentStatus);
gateRoutes.get('/appointments/slot-rules', requireSite(false), requirePermission('appointment.manage'), gateAppointmentsController.getSlotRules);
gateRoutes.get('/appointments/:id', requireSite(false), requirePermission('appointment.manage'), gateAppointmentsController.getAppointmentById);

// Visits & Actions
gateRoutes.get(['/truck-visits', '/gate/visits'], requireSite(false), requirePermission('gate.visit.checkin'), gateVisitsController.getVisits);
gateRoutes.post(['/truck-visits', '/gate/visits'], requireSite(false), requirePermission('gate.visit.checkin', 'DO'), gateVisitsController.createVisit);
gateRoutes.get(['/truck-visits/:id', '/gate/visits/:id'], requireSite(false), requirePermission('gate.visit.checkin'), gateVisitsController.getVisitById);
gateRoutes.patch(['/truck-visits/:id', '/gate/visits/:id'], requireSite(false), requirePermission('gate.visit.checkin', 'DO'), gateVisitsController.updateVisitStatus);
gateRoutes.post(['/truck-visits/:id\\:checkin', '/gate/visits/:id\\:checkin', '/truck-visits/:id/checkin', '/gate/visits/:id/checkin'], requireSite(false), requirePermission('gate.visit.checkin', 'DO'), gateVisitsController.checkin);
gateRoutes.post(['/truck-visits/:id\\:checkout', '/gate/visits/:id\\:checkout', '/truck-visits/:id/checkout', '/gate/visits/:id/checkout'], requireSite(false), requirePermission('gate.visit.checkin', 'DO'), gateVisitsController.checkout);
gateRoutes.post(['/truck-visits/:id\\:cancel', '/gate/visits/:id\\:cancel', '/truck-visits/:id/cancel', '/gate/visits/:id/cancel'], requireSite(false), requirePermission('gate.visit.checkin', 'DO'), gateVisitsController.cancelVisit);
gateRoutes.post(['/truck-visits/:id/turn-back', '/gate/visits/:id/turn-back'], requireSite(false), requirePermission('gate.visit.checkin', 'DO'), gateVisitsController.turnBack);
gateRoutes.post(['/truck-visits/:id/checkpoint-events', '/gate/visits/:id/checkpoint-events'], requireSite(false), requirePermission('gate.visit.checkin', 'DO'), gateVisitsController.recordCheckpointEvent);
gateRoutes.post(['/truck-visits/:id/gate-pass\\:print', '/gate/visits/:id/gate-pass\\:print'], requireSite(false), requirePermission('gate.visit.checkin', 'DO'), gateVisitsController.printGatePass);

// Weighbridge
gateRoutes.get(['/weighbridge/tickets', '/weighings'], requireSite(false), requirePermission('weighbridge.ticket'), gateWeighbridgeController.getTickets);
gateRoutes.post(['/weighbridge/tickets', '/weighings'], requireSite(false), requirePermission('weighbridge.ticket', 'DO'), gateWeighbridgeController.createTicket);
gateRoutes.post(['/weighbridge/tickets/:ticketId/override-request', '/weighings/:ticketId/override-request'], requireSite(false), requirePermission('weighbridge.ticket', 'DO'), gateWeighbridgeController.requestOverride);
gateRoutes.post(['/weighbridge/tickets/:ticketId/print', '/weighings/:ticketId/print'], requireSite(false), requirePermission('weighbridge.ticket', 'DO'), gateWeighbridgeController.printTicket);

