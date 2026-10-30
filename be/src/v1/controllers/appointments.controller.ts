import { Request, Response } from "express";
import { getPrisma } from "../../configs/prisma";
import { sendSuccess, sendCreated, sendError } from "../../utils";

export class AppointmentsController {
  public getSlotRules = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const dbRules = await prisma.appointment_slot_rules.findMany({
        include: { visit_types: true },
        orderBy: { rule_id: "asc" },
      });

      const items = (dbRules || []).map((r) => ({
        appointmentSlotRuleId: r.rule_id,
        ruleId: r.rule_id,
        flow: r.visit_types?.visit_code || "IMPORT_PICKUP",
        visitTypeCode: r.visit_types?.visit_code,
        visitTypeName: r.visit_types?.visit_name,
        startHour: 6,
        endHour: 18,
        slotDurationMin: r.slot_duration_min || 60,
        maxSlotsPerHour: r.max_trucks_per_slot || 20,
        isActive: r.is_active ?? true,
        logInst: 1,
      }));

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createSlotRule = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const siteId = Number(req.siteId || req.body.siteId) || 1;
      const flow = req.body.flow || req.body.visitTypeCode || "IMPORT_PICKUP";
      const visitType = await prisma.visit_types.findFirst({
        where: { visit_code: flow },
      });
      const vtId = visitType?.visit_type_id || 3;

      const created = await prisma.appointment_slot_rules.create({
        data: {
          site_id: siteId,
          visit_type_id: vtId,
          slot_duration_min: req.body.slotDurationMin || 60,
          max_trucks_per_slot: req.body.maxSlotsPerHour || 20,
          is_active: req.body.isActive ?? true,
        },
        include: { visit_types: true },
      });

      return sendCreated(res, {
        appointmentSlotRuleId: created.rule_id,
        ruleId: created.rule_id,
        flow: created.visit_types?.visit_code,
        slotDurationMin: created.slot_duration_min,
        maxSlotsPerHour: created.max_trucks_per_slot,
        isActive: created.is_active,
        logInst: 1,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getSlotRuleById = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.appointmentSlotRuleId, 10);
      const r = await prisma.appointment_slot_rules.findUnique({
        where: { rule_id: id },
        include: { visit_types: true },
      });

      if (!r) return sendError(res, "Slot rule not found", 404);

      return sendSuccess(res, {
        appointmentSlotRuleId: r.rule_id,
        ruleId: r.rule_id,
        flow: r.visit_types?.visit_code || "IMPORT_PICKUP",
        startHour: 6,
        endHour: 18,
        slotDurationMin: r.slot_duration_min || 60,
        maxSlotsPerHour: r.max_trucks_per_slot || 20,
        isActive: r.is_active ?? true,
        logInst: 1,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateSlotRule = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.appointmentSlotRuleId, 10);
      const updated = await prisma.appointment_slot_rules.update({
        where: { rule_id: id },
        data: {
          max_trucks_per_slot: req.body.maxSlotsPerHour,
          slot_duration_min: req.body.slotDurationMin,
          is_active: req.body.isActive,
        },
        include: { visit_types: true },
      });

      return sendSuccess(res, {
        appointmentSlotRuleId: updated.rule_id,
        ruleId: updated.rule_id,
        flow: updated.visit_types?.visit_code,
        slotDurationMin: updated.slot_duration_min,
        maxSlotsPerHour: updated.max_trucks_per_slot,
        isActive: updated.is_active,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getAvailability = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const date = String(req.query.date || new Date().toISOString().slice(0, 10));
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);

      // Count booked appointments per slot from database
      const bookedAppts = await prisma.appointments.findMany({
        where: {
          slot_start: { gte: startOfDay, lte: endOfDay },
          status: { not: "CANCELLED" },
        },
      });

      const hours = [8, 10, 12, 14, 16];
      const capacity = 20;

      const slots = hours.map((h) => {
        const slotHourStr = h < 10 ? `0${h}` : `${h}`;
        const slotStart = `${date}T${slotHourStr}:00:00Z`;
        const countInSlot = bookedAppts.filter((a) => {
          const apptHour = new Date(a.slot_start).getUTCHours();
          return apptHour >= h && apptHour < h + 2;
        }).length;

        return {
          slotTime: slotStart,
          available: Math.max(0, capacity - countInSlot),
          capacity,
        };
      });

      return sendSuccess(res, { date, slots });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getAppointments = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const dbAppts = await prisma.appointments.findMany({
        include: {
          appointments_visit_types: true,
          appointments_parties: true,
        },
        orderBy: { appointment_id: "desc" },
      });

      const items = (dbAppts || []).map((a) => {
        const slotStartDate = a.slot_start ? new Date(a.slot_start) : new Date();
        const slotEndDate = a.slot_end
          ? new Date(a.slot_end)
          : new Date(Date.now() + 3600000);
        return {
          appointmentId: a.appointment_id,
          apptNo: a.appointment_no,
          appointmentNo: a.appointment_no,
          date: slotStartDate.toISOString().slice(0, 10),
          hour: slotStartDate.getHours(),
          slotStart: slotStartDate.toISOString(),
          slotEnd: slotEndDate.toISOString(),
          slotTime: slotStartDate.toISOString(),
          visitTypeCode: (a as any).appointments_visit_types?.visit_code || "IMPORT_PICKUP",
          visitTypeName: (a as any).appointments_visit_types?.visit_name || "Import container pickup",
          plateNo: a.truck_plate || "T 118 DPE",
          plate: a.truck_plate || "T 118 DPE",
          truckPlate: a.truck_plate,
          partyId: a.transporter_party_id || 1,
          partyName: (a as any).appointments_parties?.party_name || "Transporter",
          driverName: "Juma Ramadhani",
          driverPhone: "+255 712 111 222",
          status: a.status || "BOOKED",
          logInst: 1,
        };
      });

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createAppointment = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const siteId = Number(req.siteId || req.body.siteId) || 1;
      const visitTypeCode = req.body.visitTypeCode || "IMPORT_PICKUP";
      const visitType = await prisma.visit_types.findFirst({
        where: { visit_code: visitTypeCode },
      });
      const vtId = visitType?.visit_type_id || 3;

      const transporterPartyId = Number(req.body.partyId || req.body.transporterPartyId) || 7;
      const apptCount = await prisma.appointments.count();
      const apptNo = req.body.apptNo || req.body.appointmentNo || `APT-26-0${apptCount + 4130}`;
      const slotStart = req.body.slotStart || req.body.slotTime || new Date(Date.now() + 3600000);
      const slotEnd = req.body.slotEnd || new Date(Date.now() + 7200000);

      const created = await prisma.appointments.create({
        data: {
          site_id: siteId,
          visit_type_id: vtId,
          transporter_party_id: transporterPartyId,
          appointment_no: apptNo,
          truck_plate: (req.body.plateNo || req.body.truckPlate || req.body.plate || "T 124 DFH").toUpperCase(),
          slot_start: new Date(slotStart),
          slot_end: new Date(slotEnd),
          status: "BOOKED",
        },
      });

      return sendCreated(res, {
        appointmentId: created.appointment_id,
        apptNo: created.appointment_no,
        appointmentNo: created.appointment_no,
        slotStart: created.slot_start.toISOString(),
        slotEnd: created.slot_end.toISOString(),
        plateNo: created.truck_plate,
        driverName: req.body.driverName || "Driver",
        status: created.status,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getAppointmentById = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const idStr = String(req.params.appointmentId);
      const isNum = !isNaN(Number(idStr));
      const a = await prisma.appointments.findFirst({
        where: isNum
          ? { OR: [{ appointment_id: Number(idStr) }, { appointment_no: idStr }] }
          : { appointment_no: idStr },
        include: {
          appointments_visit_types: true,
          appointments_parties: true,
        },
      });

      if (!a) return sendError(res, "Appointment not found", 404);

      const slotStartDate = a.slot_start ? new Date(a.slot_start) : new Date();
      const slotEndDate = a.slot_end
        ? new Date(a.slot_end)
        : new Date(Date.now() + 3600000);

      return sendSuccess(res, {
        appointmentId: a.appointment_id,
        apptNo: a.appointment_no,
        appointmentNo: a.appointment_no,
        date: slotStartDate.toISOString().slice(0, 10),
        hour: slotStartDate.getHours(),
        slotStart: slotStartDate.toISOString(),
        slotEnd: slotEndDate.toISOString(),
        slotTime: slotStartDate.toISOString(),
        visitTypeCode: (a as any).appointments_visit_types?.visit_code || "IMPORT_PICKUP",
        visitTypeName: (a as any).appointments_visit_types?.visit_name,
        plateNo: a.truck_plate,
        partyId: a.transporter_party_id,
        partyName: (a as any).appointments_parties?.party_name,
        status: a.status,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public cancelAppointment = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const idStr = String(req.params.appointmentId);
      const isNum = !isNaN(Number(idStr));
      const existing = await prisma.appointments.findFirst({
        where: isNum
          ? { OR: [{ appointment_id: Number(idStr) }, { appointment_no: idStr }] }
          : { appointment_no: idStr },
      });
      if (!existing) return sendError(res, "Appointment not found", 404);

      const updated = await prisma.appointments.update({
        where: { appointment_id: existing.appointment_id },
        data: { status: "CANCELLED" },
      });

      return sendSuccess(res, { success: true, appointment: updated });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public rescheduleAppointment = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const idStr = String(req.params.appointmentId);
      const isNum = !isNaN(Number(idStr));
      const existing = await prisma.appointments.findFirst({
        where: isNum
          ? { OR: [{ appointment_id: Number(idStr) }, { appointment_no: idStr }] }
          : { appointment_no: idStr },
      });
      if (!existing) return sendError(res, "Appointment not found", 404);

      const slotStart = req.body.slotStart ? new Date(req.body.slotStart) : existing.slot_start;
      const slotEnd = req.body.slotEnd ? new Date(req.body.slotEnd) : existing.slot_end;

      const updated = await prisma.appointments.update({
        where: { appointment_id: existing.appointment_id },
        data: {
          slot_start: slotStart,
          slot_end: slotEnd,
          status: "CONFIRMED",
        },
      });

      return sendSuccess(res, { success: true, appointment: updated });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };
}

export const appointmentsController = new AppointmentsController();
