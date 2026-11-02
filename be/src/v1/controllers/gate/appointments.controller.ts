import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const gateAppointmentsController = {
  getAppointments: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const appts = await prisma.appointment.findMany({
            include: {
              m_truck: true,
              m_driver: true,
              m_party_appointment: true,
              appointments_visit_types: true,
              appointments_sites: true,
            },
            orderBy: { appointment_id: 'desc' },
          });

          if (appts && appts.length > 0) {
            const items = appts.map((a: any) => {
              const start = a.slot_start ? new Date(a.slot_start) : new Date();
              const end = a.slot_end ? new Date(a.slot_end) : new Date(Date.now() + 3600000);
              return {
                appointmentId: Number(a.appointment_id),
                appointmentNo: a.appointment_no,
                apptNo: a.appointment_no,
                date: start.toISOString().slice(0, 10),
                hour: start.getHours(),
                slotStart: start.toISOString(),
                slotEnd: end.toISOString(),
                status: a.status,
                bookedVia: a.booked_via,
                truckPlate: a.m_truck?.plate_no || 'T 000 AAA',
                plateNo: a.m_truck?.plate_no || 'T 000 AAA',
                plate: a.m_truck?.plate_no || 'T 000 AAA',
                driverName: a.m_driver?.driver_name || 'Driver',
                driverPhone: a.m_driver?.phone,
                partyId: a.transporter_party_id,
                partyName: a.m_party_appointment?.party_name || 'Global Transporter',
                visitType: a.appointments_visit_types?.visit_type_name || a.appointments_visit_types?.visit_type_code || 'IMPORT_PICKUP',
                visitTypeCode: a.appointments_visit_types?.visit_type_code || 'IMPORT_PICKUP',
                visitTypeName: a.appointments_visit_types?.visit_type_name,
                createdDate: a.createdate?.toISOString(),
              };
            });
            return res.json({ items, total: items.length });
          }
        }
      }

      res.json({ items: [], total: 0 });
    } catch (err: any) {
      console.error('getAppointments error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getAppointmentById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const prisma = getPrisma();
      if (prisma) {
        const numId = Number(id);
        const a = await prisma.appointment.findFirst({
          where: {
            OR: [
              ...(isNaN(numId) ? [] : [{ appointment_id: BigInt(numId) }]),
              { appointment_no: String(id) },
            ],
          },
          include: {
            m_truck: true,
            m_driver: true,
            m_party_appointment: true,
            appointments_visit_types: true,
          },
        });

        if (a) {
          const start = a.slot_start ? new Date(a.slot_start) : new Date();
          const end = a.slot_end ? new Date(a.slot_end) : new Date(Date.now() + 3600000);
          return res.json({
            appointmentId: Number(a.appointment_id),
            appointmentNo: a.appointment_no,
            apptNo: a.appointment_no,
            date: start.toISOString().slice(0, 10),
            hour: start.getHours(),
            slotStart: start.toISOString(),
            slotEnd: end.toISOString(),
            status: a.status,
            bookedVia: a.booked_via,
            truckPlate: a.m_truck?.plate_no,
            plateNo: a.m_truck?.plate_no,
            driverName: a.m_driver?.driver_name,
            driverPhone: a.m_driver?.phone,
            partyName: a.m_party_appointment?.party_name,
            visitType: a.appointments_visit_types?.visit_type_name || a.appointments_visit_types?.visit_type_code,
            visitTypeCode: a.appointments_visit_types?.visit_type_code,
            createdDate: a.createdate?.toISOString(),
          });
        }
      }
      res.status(404).json({ error: 'Appointment not found' });
    } catch (err: any) {
      console.error('getAppointmentById error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  createAppointment: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) return res.status(500).json({ error: 'Database unavailable' });

      let truckId = req.body.truckId ? Number(req.body.truckId) : undefined;
      let driverId = req.body.driverId ? Number(req.body.driverId) : undefined;
      let partyId = req.body.partyId || req.body.transporterPartyId ? Number(req.body.partyId || req.body.transporterPartyId) : undefined;
      let visitTypeId = req.body.visitTypeId ? Number(req.body.visitTypeId) : undefined;

      const plateNo = req.body.truckPlate || req.body.plateNo || req.body.plate;
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
              truck_type: 'SEMI_TRAILER',
              createdby: 'portal',
            },
          });
          truckId = newTruck.truck_id;
        }
      }

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
              createdby: 'portal',
            },
          });
          driverId = newDriver.driver_id;
        }
      }

      if (!partyId) {
        const firstParty = await prisma.m_party.findFirst();
        partyId = firstParty?.party_id || 1;
      }

      if (!visitTypeId) {
        if (req.body.visitTypeCode) {
          const vt = await prisma.m_visit_type.findFirst({
            where: { visit_type_code: req.body.visitTypeCode },
          });
          if (vt) visitTypeId = vt.visit_type_id;
        }
        if (!visitTypeId) {
          const firstVt = await prisma.m_visit_type.findFirst();
          visitTypeId = firstVt?.visit_type_id || 1;
        }
      }

      const slotStart = new Date(req.body.slotStart || req.body.slotTime || Date.now() + 1800000);
      const slotEnd = new Date(req.body.slotEnd || slotStart.getTime() + 3600000);
      const apptNo = req.body.appointmentNo || req.body.apptNo || `APT-${new Date().toISOString().slice(2, 4)}-${Math.floor(10000 + Math.random() * 90000)}`;

      const created = await prisma.appointment.create({
        data: {
          site_id: Number(req.body.siteId) || 1,
          appointment_no: apptNo,
          slot_start: slotStart,
          slot_end: slotEnd,
          transporter_party_id: partyId,
          truck_id: truckId,
          driver_id: driverId,
          visit_type_id: visitTypeId,
          status: req.body.status || 'BOOKED',
          booked_via: req.body.bookedVia || 'PORTAL',
          createdby: 'portal',
        },
        include: {
          m_truck: true,
          m_driver: true,
          m_party_appointment: true,
          appointments_visit_types: true,
        },
      });

      res.status(201).json({
        appointmentId: Number(created.appointment_id),
        appointmentNo: created.appointment_no,
        apptNo: created.appointment_no,
        date: created.slot_start.toISOString().slice(0, 10),
        hour: created.slot_start.getHours(),
        slotStart: created.slot_start.toISOString(),
        slotEnd: created.slot_end.toISOString(),
        status: created.status,
        truckPlate: created.m_truck?.plate_no || plateNo,
        plateNo: created.m_truck?.plate_no || plateNo,
        driverName: created.m_driver?.driver_name,
        partyName: created.m_party_appointment?.party_name,
        visitType: created.appointments_visit_types?.visit_type_name,
        visitTypeCode: created.appointments_visit_types?.visit_type_code,
      });
    } catch (err: any) {
      console.error('createAppointment error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  updateAppointmentStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const status = req.body.status || 'CONFIRMED';
      const prisma = getPrisma();
      if (prisma) {
        const numId = Number(id);
        const updated = await prisma.appointment.update({
          where: isNaN(numId) ? { appointment_no: id } as any : { appointment_id: BigInt(numId) },
          data: { status, updatedate: new Date() },
        });
        return res.json({
          success: true,
          appointmentId: Number(updated.appointment_id),
          status: updated.status,
        });
      }
      res.json({ success: true, appointmentId: Number(id), status });
    } catch (err: any) {
      console.error('updateAppointmentStatus error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getSlotRules: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) return res.json({ items: [], total: 0 });

      const dbRules = await prisma.m_appointment_slot_rule.findMany({
        include: { m_visit_type: true },
        orderBy: { appointment_slot_rule_id: 'asc' },
      });

      const items = (dbRules || []).map((r: any) => ({
        appointmentSlotRuleId: r.appointment_slot_rule_id,
        ruleId: r.appointment_slot_rule_id,
        flow: r.m_visit_type?.visit_type_code || 'IMPORT_PICKUP',
        visitTypeCode: r.m_visit_type?.visit_type_code,
        visitTypeName: r.m_visit_type?.visit_type_name,
        slotDurationMin: 60,
        maxSlotsPerHour: r.capacity_trucks || 20,
        isActive: r.is_active ?? true,
      }));

      res.json({ items, total: items.length });
    } catch (err: any) {
      console.error('getSlotRules error:', err);
      res.status(500).json({ error: err.message });
    }
  },
};
