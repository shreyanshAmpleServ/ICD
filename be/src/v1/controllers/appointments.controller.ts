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
      const dbRules = await prisma.m_appointment_slot_rule.findMany({
        include: { m_visit_type: true },
        orderBy: { appointment_slot_rule_id: "asc" },
      });

      const items = (dbRules || []).map((r: any) => ({
        appointmentSlotRuleId: r.appointment_slot_rule_id,
        ruleId: r.appointment_slot_rule_id,
        flow: r.m_visit_type?.visit_type_code || "IMPORT_PICKUP",
        visitTypeCode: r.m_visit_type?.visit_type_code,
        visitTypeName: r.m_visit_type?.visit_type_name,
        startHour: 6,
        endHour: 18,
        slotDurationMin: 60,
        maxSlotsPerHour: r.capacity_trucks || 20,
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
      const visitType = await prisma.m_visit_type.findFirst({
        where: { visit_type_code: flow },
      });
      const vtId = visitType?.visit_type_id || 1;

      const created = await prisma.m_appointment_slot_rule.create({
        data: {
          site_id: siteId,
          visit_type_id: vtId,
          weekday: req.body.weekday || 1,
          slot_start: new Date("1970-01-01T08:00:00Z"),
          slot_end: new Date("1970-01-01T17:00:00Z"),
          capacity_trucks: req.body.maxSlotsPerHour || 20,
          is_active: req.body.isActive ?? true,
          createdby: "admin",
        },
        include: { m_visit_type: true },
      });

      return sendCreated(res, {
        appointmentSlotRuleId: created.appointment_slot_rule_id,
        ruleId: created.appointment_slot_rule_id,
        flow: created.m_visit_type?.visit_type_code,
        slotDurationMin: 60,
        maxSlotsPerHour: created.capacity_trucks,
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
      const r = await prisma.m_appointment_slot_rule.findUnique({
        where: { appointment_slot_rule_id: id },
        include: { m_visit_type: true },
      });

      if (!r) return sendError(res, "Slot rule not found", 404);

      return sendSuccess(res, {
        appointmentSlotRuleId: r.appointment_slot_rule_id,
        ruleId: r.appointment_slot_rule_id,
        flow: r.m_visit_type?.visit_type_code || "IMPORT_PICKUP",
        startHour: 6,
        endHour: 18,
        slotDurationMin: 60,
        maxSlotsPerHour: r.capacity_trucks || 20,
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
      const updated = await prisma.m_appointment_slot_rule.update({
        where: { appointment_slot_rule_id: id },
        data: {
          capacity_trucks: req.body.maxSlotsPerHour,
          is_active: req.body.isActive,
        },
        include: { m_visit_type: true },
      });

      return sendSuccess(res, {
        appointmentSlotRuleId: updated.appointment_slot_rule_id,
        ruleId: updated.appointment_slot_rule_id,
        flow: updated.m_visit_type?.visit_type_code,
        slotDurationMin: 60,
        maxSlotsPerHour: updated.capacity_trucks,
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
      const bookedAppts = await prisma.appointment.findMany({
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
        const countInSlot = bookedAppts.filter((a: any) => {
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
      const dbAppts = await prisma.appointment.findMany({
        include: {
          appointments_visit_types: true,
          m_party_appointment: true,
          m_truck: true,
          m_driver: true,
        },
        orderBy: { appointment_id: "desc" },
      });

      const items = (dbAppts || []).map((a: any) => {
        const slotStartDate = a.slot_start ? new Date(a.slot_start) : new Date();
        const slotEndDate = a.slot_end
          ? new Date(a.slot_end)
          : new Date(Date.now() + 3600000);
        return {
          appointmentId: Number(a.appointment_id),
          apptNo: a.appointment_no,
          appointmentNo: a.appointment_no,
          date: slotStartDate.toISOString().slice(0, 10),
          hour: slotStartDate.getHours(),
          slotStart: slotStartDate.toISOString(),
          slotEnd: slotEndDate.toISOString(),
          slotTime: slotStartDate.toISOString(),
          visitTypeCode: a.appointments_visit_types?.visit_type_code || "IMPORT_PICKUP",
          visitTypeName: a.appointments_visit_types?.visit_type_name || "Import container pickup",
          plateNo: a.m_truck?.plate_no || "T 118 DPE",
          plate: a.m_truck?.plate_no || "T 118 DPE",
          truckPlate: a.m_truck?.plate_no || "T 118 DPE",
          partyId: a.transporter_party_id || 1,
          partyName: a.m_party_appointment?.party_name || "Transporter",
          driverName: a.m_driver?.driver_name || "Juma Ramadhani",
          driverPhone: a.m_driver?.phone || "+255 712 111 222",
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
      const visitType = await prisma.m_visit_type.findFirst({
        where: { visit_type_code: visitTypeCode },
      });
      const vtId = visitType?.visit_type_id || 1;

      let truckId = req.body.truckId ? Number(req.body.truckId) : undefined;
      const plateNo = req.body.plateNo || req.body.truckPlate || req.body.plate;
      if (!truckId && plateNo) {
        const foundTruck = await prisma.m_truck.findFirst({
          where: { plate_no: plateNo },
        });
        if (foundTruck) {
          truckId = foundTruck.truck_id;
        } else {
          const newTruck = await prisma.m_truck.create({
            data: {
              plate_no: plateNo,
              truck_type: "SEMI_TRAILER",
              createdby: "portal",
            },
          });
          truckId = newTruck.truck_id;
        }
      }

      let driverId = req.body.driverId ? Number(req.body.driverId) : undefined;
      if (!driverId && req.body.driverName) {
        const foundDriver = await prisma.m_driver.findFirst({
          where: { driver_name: req.body.driverName },
        });
        if (foundDriver) {
          driverId = foundDriver.driver_id;
        } else {
          const newDriver = await prisma.m_driver.create({
            data: {
              driver_name: req.body.driverName,
              license_no: `LIC-${Date.now().toString().slice(-6)}`,
              phone: req.body.driverPhone,
              createdby: "portal",
            },
          });
          driverId = newDriver.driver_id;
        }
      }

      const transporterPartyId = Number(req.body.partyId || req.body.transporterPartyId) || 1;
      const apptCount = await prisma.appointment.count();
      const apptNo = req.body.apptNo || req.body.appointmentNo || `APT-26-0${apptCount + 4130}`;
      const slotStart = new Date(req.body.slotStart || req.body.slotTime || Date.now() + 3600000);
      const slotEnd = new Date(req.body.slotEnd || slotStart.getTime() + 3600000);

      const created = await prisma.appointment.create({
        data: {
          site_id: siteId,
          visit_type_id: vtId,
          transporter_party_id: transporterPartyId,
          appointment_no: apptNo,
          truck_id: truckId,
          driver_id: driverId,
          slot_start: slotStart,
          slot_end: slotEnd,
          status: "BOOKED",
          booked_via: "PORTAL",
          createdby: "portal",
        },
        include: {
          m_truck: true,
          m_driver: true,
        },
      });

      return sendCreated(res, {
        appointmentId: Number(created.appointment_id),
        apptNo: created.appointment_no,
        appointmentNo: created.appointment_no,
        slotStart: created.slot_start.toISOString(),
        slotEnd: created.slot_end.toISOString(),
        plateNo: created.m_truck?.plate_no || plateNo,
        driverName: created.m_driver?.driver_name || req.body.driverName || "Driver",
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
      const a = await prisma.appointment.findFirst({
        where: isNum
          ? { OR: [{ appointment_id: BigInt(Number(idStr)) }, { appointment_no: idStr }] }
          : { appointment_no: idStr },
        include: {
          appointments_visit_types: true,
          m_party_appointment: true,
          m_truck: true,
          m_driver: true,
        },
      });

      if (!a) return sendError(res, "Appointment not found", 404);

      const slotStartDate = a.slot_start ? new Date(a.slot_start) : new Date();
      const slotEndDate = a.slot_end
        ? new Date(a.slot_end)
        : new Date(Date.now() + 3600000);

      return sendSuccess(res, {
        appointmentId: Number(a.appointment_id),
        apptNo: a.appointment_no,
        appointmentNo: a.appointment_no,
        date: slotStartDate.toISOString().slice(0, 10),
        hour: slotStartDate.getHours(),
        slotStart: slotStartDate.toISOString(),
        slotEnd: slotEndDate.toISOString(),
        slotTime: slotStartDate.toISOString(),
        visitTypeCode: a.appointments_visit_types?.visit_type_code || "IMPORT_PICKUP",
        visitTypeName: a.appointments_visit_types?.visit_type_name,
        plateNo: a.m_truck?.plate_no,
        partyId: a.transporter_party_id,
        partyName: a.m_party_appointment?.party_name,
        driverName: a.m_driver?.driver_name,
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
      const existing = await prisma.appointment.findFirst({
        where: isNum
          ? { OR: [{ appointment_id: BigInt(Number(idStr)) }, { appointment_no: idStr }] }
          : { appointment_no: idStr },
      });
      if (!existing) return sendError(res, "Appointment not found", 404);

      const updated = await prisma.appointment.update({
        where: { appointment_id: existing.appointment_id },
        data: { status: "CANCELLED" },
      });

      return sendSuccess(res, { success: true, appointment: { ...updated, appointment_id: Number(updated.appointment_id) } });
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
      const existing = await prisma.appointment.findFirst({
        where: isNum
          ? { OR: [{ appointment_id: BigInt(Number(idStr)) }, { appointment_no: idStr }] }
          : { appointment_no: idStr },
      });
      if (!existing) return sendError(res, "Appointment not found", 404);

      const slotStart = req.body.slotStart ? new Date(req.body.slotStart) : existing.slot_start;
      const slotEnd = req.body.slotEnd ? new Date(req.body.slotEnd) : existing.slot_end;

      const updated = await prisma.appointment.update({
        where: { appointment_id: existing.appointment_id },
        data: {
          slot_start: slotStart,
          slot_end: slotEnd,
          status: "BOOKED",
        },
      });

      return sendSuccess(res, { success: true, appointment: { ...updated, appointment_id: Number(updated.appointment_id) } });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };
}

export const appointmentsController = new AppointmentsController();
