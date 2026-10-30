import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { asyncHandler } from "../../utils";
import { appointmentsController } from "../controllers/appointments.controller";

const router = Router();

// Slot Rules
router.get(
  "/appointment-slot-rules",
  requireSite(false),
  requirePermission("appointment.manage"),
  asyncHandler(appointmentsController.getSlotRules)
);

router.post(
  "/appointment-slot-rules",
  requireSite(false),
  requirePermission("appointment.manage", "DO"),
  asyncHandler(appointmentsController.createSlotRule)
);

router.get(
  "/appointment-slot-rules/:appointmentSlotRuleId",
  requireSite(false),
  requirePermission("appointment.manage"),
  asyncHandler(appointmentsController.getSlotRuleById)
);

router.patch(
  "/appointment-slot-rules/:appointmentSlotRuleId",
  requireSite(false),
  requirePermission("appointment.manage", "DO"),
  asyncHandler(appointmentsController.updateSlotRule)
);

// Availability
router.get(
  "/appointments/availability",
  requireSite(false),
  requirePermission("appointment.book"),
  asyncHandler(appointmentsController.getAvailability)
);

// Appointments CRUD & Actions
router.get(
  "/appointments",
  requireSite(false),
  requirePermission("appointment.book"),
  asyncHandler(appointmentsController.getAppointments)
);

router.post(
  "/appointments",
  requireSite(false),
  requirePermission("appointment.book", "DO"),
  asyncHandler(appointmentsController.createAppointment)
);

router.get(
  "/appointments/:appointmentId",
  requireSite(false),
  requirePermission("appointment.book"),
  asyncHandler(appointmentsController.getAppointmentById)
);

router.post(
  "/appointments/:appointmentId([0-9a-zA-Z_.-]+):cancel",
  requireSite(false),
  requirePermission("appointment.book", "DO"),
  asyncHandler(appointmentsController.cancelAppointment)
);

router.post(
  "/appointments/:appointmentId([0-9a-zA-Z_.-]+):reschedule",
  requireSite(false),
  requirePermission("appointment.book", "DO"),
  asyncHandler(appointmentsController.rescheduleAppointment)
);

export const appointmentsRouter = router;
export default router;

