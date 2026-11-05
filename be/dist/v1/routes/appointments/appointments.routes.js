"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentsRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const utils_1 = require("../../../utils");
const appointments_controller_1 = require("../../controllers/appointments.controller");
const router = (0, express_1.Router)();
// Slot Rules
router.get(["/appointment-slot-rules", "/appointments/slot-rules"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.getSlotRules));
router.post(["/appointment-slot-rules", "/appointments/slot-rules"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage", "DO"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.createSlotRule));
router.get("/appointment-slot-rules/:appointmentSlotRuleId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.getSlotRuleById));
router.patch("/appointment-slot-rules/:appointmentSlotRuleId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage", "DO"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.updateSlotRule));
// Availability
router.get("/appointments/availability", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.getAvailability));
// Appointments CRUD & Actions
router.get("/appointments", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.getAppointments));
router.post("/appointments", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book", "DO"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.createAppointment));
router.get("/appointments/:appointmentId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.getAppointmentById));
router.post("/appointments/:appointmentId([0-9a-zA-Z_.-]+):cancel", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book", "DO"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.cancelAppointment));
router.post("/appointments/:appointmentId([0-9a-zA-Z_.-]+):reschedule", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book", "DO"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.rescheduleAppointment));
router.patch(["/appointments/:appointmentId/status", "/appointments/:appointmentId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book", "DO"), (0, utils_1.asyncHandler)(appointments_controller_1.appointmentsController.updateAppointmentStatus));
exports.appointmentsRouter = router;
exports.default = router;
