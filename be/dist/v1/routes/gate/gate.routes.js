"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gateRoutes = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const gate_1 = require("../../controllers/gate");
exports.gateRoutes = (0, express_1.Router)();
// Queue & Operations
exports.gateRoutes.get('/gate/queue', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin'), gate_1.gateQueueController.getQueue);
exports.gateRoutes.get('/gate/queue/summary', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin'), gate_1.gateQueueController.getQueueSummary);
// Lanes & Passes
exports.gateRoutes.get('/gate/lanes', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin'), gate_1.gateLaneController.getLanes);
exports.gateRoutes.post('/gate/lanes/:laneId/open-barrier', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin', 'DO'), gate_1.gateLaneController.openBarrier);
exports.gateRoutes.get('/gate-passes/:token', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin'), gate_1.gateLaneController.getGatePass);
// Appointments
exports.gateRoutes.get('/appointments', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('appointment.manage'), gate_1.gateAppointmentsController.getAppointments);
exports.gateRoutes.post('/appointments', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('appointment.manage', 'DO'), gate_1.gateAppointmentsController.createAppointment);
exports.gateRoutes.patch(['/appointments/:id', '/appointments/:id/status'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('appointment.manage', 'DO'), gate_1.gateAppointmentsController.updateAppointmentStatus);
exports.gateRoutes.get('/appointments/slot-rules', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('appointment.manage'), gate_1.gateAppointmentsController.getSlotRules);
exports.gateRoutes.get('/appointments/:id', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('appointment.manage'), gate_1.gateAppointmentsController.getAppointmentById);
// Visits & Actions
exports.gateRoutes.get(['/truck-visits', '/gate/visits'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin'), gate_1.gateVisitsController.getVisits);
exports.gateRoutes.post(['/truck-visits', '/gate/visits'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin', 'DO'), gate_1.gateVisitsController.createVisit);
exports.gateRoutes.get(['/truck-visits/:id', '/gate/visits/:id'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin'), gate_1.gateVisitsController.getVisitById);
exports.gateRoutes.patch(['/truck-visits/:id', '/gate/visits/:id'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin', 'DO'), gate_1.gateVisitsController.updateVisitStatus);
exports.gateRoutes.post(['/truck-visits/:id\\:checkin', '/gate/visits/:id\\:checkin', '/truck-visits/:id/checkin', '/gate/visits/:id/checkin'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin', 'DO'), gate_1.gateVisitsController.checkin);
exports.gateRoutes.post(['/truck-visits/:id\\:checkout', '/gate/visits/:id\\:checkout', '/truck-visits/:id/checkout', '/gate/visits/:id/checkout'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin', 'DO'), gate_1.gateVisitsController.checkout);
exports.gateRoutes.post(['/truck-visits/:id\\:cancel', '/gate/visits/:id\\:cancel', '/truck-visits/:id/cancel', '/gate/visits/:id/cancel'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin', 'DO'), gate_1.gateVisitsController.cancelVisit);
exports.gateRoutes.post(['/truck-visits/:id/turn-back', '/gate/visits/:id/turn-back'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin', 'DO'), gate_1.gateVisitsController.turnBack);
exports.gateRoutes.post(['/truck-visits/:id/checkpoint-events', '/gate/visits/:id/checkpoint-events'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin', 'DO'), gate_1.gateVisitsController.recordCheckpointEvent);
exports.gateRoutes.post(['/truck-visits/:id/gate-pass\\:print', '/gate/visits/:id/gate-pass\\:print'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('gate.visit.checkin', 'DO'), gate_1.gateVisitsController.printGatePass);
// Weighbridge
exports.gateRoutes.get(['/weighbridge/tickets', '/weighings'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('weighbridge.ticket'), gate_1.gateWeighbridgeController.getTickets);
exports.gateRoutes.post(['/weighbridge/tickets', '/weighings'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('weighbridge.ticket', 'DO'), gate_1.gateWeighbridgeController.createTicket);
exports.gateRoutes.post(['/weighbridge/tickets/:ticketId/override-request', '/weighings/:ticketId/override-request'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('weighbridge.ticket', 'DO'), gate_1.gateWeighbridgeController.requestOverride);
exports.gateRoutes.post(['/weighbridge/tickets/:ticketId/print', '/weighings/:ticketId/print'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('weighbridge.ticket', 'DO'), gate_1.gateWeighbridgeController.printTicket);
