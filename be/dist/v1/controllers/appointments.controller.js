"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentsController = exports.AppointmentsController = void 0;
const prisma_1 = require("../../configs/prisma");
const utils_1 = require("../../utils");
function generateRollingAppointments() {
    const base = new Date();
    const drivers = ['Juma Selemani', 'Athumani Said', 'Godfrey Mollel', 'Ramadhani Issa', 'Emmanuel Mushi', 'Salim Hamad', 'Zuberi Kitwana', 'Joseph Mbwambo', 'Omari Shabani'];
    const plates = ['T 412 DKL', 'T 902 DMB', 'T 118 DPE', 'T 771 DGH', 'T 340 DRC', 'T 655 DQA', 'T 882 DJK', 'T 234 DLM', 'T 519 DGT'];
    const parties = ['Simba Haulage Co.', 'Upepo Transporters', 'Kilele Clearing & Forwarding', 'Mzizi Traders Ltd'];
    const types = ['IMPORT_PICKUP', 'EXPORT_DROP', 'EMPTY_RETURN', 'EMPTY_PICKUP'];
    const items = [];
    let id = 4200;
    for (let offset = -1; offset <= 6; offset++) {
        const d = new Date(base.getTime() + offset * 86400000);
        const dateStr = d.toISOString().slice(0, 10);
        const wd = d.getUTCDay();
        if (wd === 0)
            continue; // Closed Sunday
        const hours = [8, 9, 10, 11, 14, 15, 16];
        for (const h of hours) {
            const count = 1 + (h % 3);
            for (let i = 0; i < count; i++) {
                id++;
                const vt = types[(h + i) % types.length];
                const slotStart = new Date(`${dateStr}T${String(h).padStart(2, '0')}:00:00.000Z`);
                const slotEnd = new Date(slotStart.getTime() + 3600000);
                const isPast = slotStart.getTime() < Date.now();
                let status = 'BOOKED';
                if (isPast) {
                    const r = (id + h) % 10;
                    if (r < 2)
                        status = 'CANCELLED';
                    else if (r < 4)
                        status = 'MISSED';
                    else if (r < 7)
                        status = 'COMPLETED';
                    else
                        status = 'ARRIVED';
                }
                items.push({
                    appointmentId: id,
                    apptNo: `AP-26-${id}`,
                    appointmentNo: `AP-26-${id}`,
                    date: dateStr,
                    hour: h,
                    slotStart: slotStart.toISOString(),
                    slotEnd: slotEnd.toISOString(),
                    slotTime: slotStart.toISOString(),
                    visitTypeCode: vt,
                    visitTypeName: vt.replace(/_/g, ' ').toLowerCase(),
                    plateNo: plates[(id + i) % plates.length],
                    plate: plates[(id + i) % plates.length],
                    truckPlate: plates[(id + i) % plates.length],
                    partyId: ((id + i) % 4) + 1,
                    partyName: parties[(id + i) % parties.length],
                    driverName: drivers[(id + i) % drivers.length],
                    driverPhone: '+255 712 111 222',
                    status,
                    logInst: 1,
                });
            }
        }
    }
    return items;
}
class AppointmentsController {
    getSlotRules = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            try {
                const dbRules = await prisma.m_appointment_slot_rule.findMany({
                    include: { m_visit_type: true },
                    orderBy: { appointment_slot_rule_id: "asc" },
                });
                if (dbRules && dbRules.length > 0) {
                    const items = dbRules.map((r) => ({
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
                    return (0, utils_1.sendSuccess)(res, { items, total: items.length, nextCursor: null });
                }
            }
            catch (err) {
                console.warn('[AppointmentsController.getSlotRules] DB error:', err.message);
            }
        }
        const fallbackRules = [
            { appointmentSlotRuleId: 1, ruleId: 1, flow: 'IMPORT_PICKUP', visitTypeCode: 'IMPORT_PICKUP', visitTypeName: 'Import pick-up', startHour: 6, endHour: 18, slotDurationMin: 60, maxSlotsPerHour: 6, isActive: true, logInst: 1 },
            { appointmentSlotRuleId: 2, ruleId: 2, flow: 'EXPORT_DROP', visitTypeCode: 'EXPORT_DROP', visitTypeName: 'Export drop-off', startHour: 6, endHour: 18, slotDurationMin: 60, maxSlotsPerHour: 4, isActive: true, logInst: 1 },
            { appointmentSlotRuleId: 3, ruleId: 3, flow: 'EMPTY_RETURN', visitTypeCode: 'EMPTY_RETURN', visitTypeName: 'Empty return', startHour: 6, endHour: 18, slotDurationMin: 60, maxSlotsPerHour: 4, isActive: true, logInst: 1 },
            { appointmentSlotRuleId: 4, ruleId: 4, flow: 'EMPTY_PICKUP', visitTypeCode: 'EMPTY_PICKUP', visitTypeName: 'Empty pick-up', startHour: 6, endHour: 18, slotDurationMin: 60, maxSlotsPerHour: 3, isActive: true, logInst: 1 },
            { appointmentSlotRuleId: 5, ruleId: 5, flow: 'TRANSFER_IN', visitTypeCode: 'TRANSFER_IN', visitTypeName: 'Transfer from port', startHour: 6, endHour: 22, slotDurationMin: 60, maxSlotsPerHour: 8, isActive: true, logInst: 1 },
        ];
        return (0, utils_1.sendSuccess)(res, { items: fallbackRules, total: fallbackRules.length, nextCursor: null });
    };
    createSlotRule = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
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
            return (0, utils_1.sendCreated)(res, {
                appointmentSlotRuleId: created.appointment_slot_rule_id,
                ruleId: created.appointment_slot_rule_id,
                flow: created.m_visit_type?.visit_type_code,
                slotDurationMin: 60,
                maxSlotsPerHour: created.capacity_trucks,
                isActive: created.is_active,
                logInst: 1,
            });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    getSlotRuleById = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const id = parseInt(req.params.appointmentSlotRuleId, 10);
            const r = await prisma.m_appointment_slot_rule.findUnique({
                where: { appointment_slot_rule_id: id },
                include: { m_visit_type: true },
            });
            if (!r)
                return (0, utils_1.sendError)(res, "Slot rule not found", 404);
            return (0, utils_1.sendSuccess)(res, {
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
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    updateSlotRule = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
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
            return (0, utils_1.sendSuccess)(res, {
                appointmentSlotRuleId: updated.appointment_slot_rule_id,
                ruleId: updated.appointment_slot_rule_id,
                flow: updated.m_visit_type?.visit_type_code,
                slotDurationMin: 60,
                maxSlotsPerHour: updated.capacity_trucks,
                isActive: updated.is_active,
            });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    getAvailability = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
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
            return (0, utils_1.sendSuccess)(res, { date, slots });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    getAppointments = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
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
                if (dbAppts && dbAppts.length > 0) {
                    const items = dbAppts.map((a) => {
                        const slotStartDate = a.slot_start ? new Date(a.slot_start) : new Date();
                        const slotEndDate = a.slot_end
                            ? new Date(a.slot_end)
                            : new Date(Date.now() + 3600000);
                        return {
                            appointmentId: Number(a.appointment_id),
                            apptNo: a.appointment_no,
                            appointmentNo: a.appointment_no,
                            date: slotStartDate.toISOString().slice(0, 10),
                            hour: slotStartDate.getUTCHours(),
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
                    return (0, utils_1.sendSuccess)(res, { items, total: items.length, nextCursor: null });
                }
            }
            catch (err) {
                console.warn('[AppointmentsController.getAppointments] DB error:', err.message);
            }
        }
        const fallbackItems = generateRollingAppointments();
        return (0, utils_1.sendSuccess)(res, { items: fallbackItems, total: fallbackItems.length, nextCursor: null });
    };
    createAppointment = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
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
                }
                else {
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
                }
                else {
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
            return (0, utils_1.sendCreated)(res, {
                appointmentId: Number(created.appointment_id),
                apptNo: created.appointment_no,
                appointmentNo: created.appointment_no,
                slotStart: created.slot_start.toISOString(),
                slotEnd: created.slot_end.toISOString(),
                plateNo: created.m_truck?.plate_no || plateNo,
                driverName: created.m_driver?.driver_name || req.body.driverName || "Driver",
                status: created.status,
            });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    getAppointmentById = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
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
            if (!a)
                return (0, utils_1.sendError)(res, "Appointment not found", 404);
            const slotStartDate = a.slot_start ? new Date(a.slot_start) : new Date();
            const slotEndDate = a.slot_end
                ? new Date(a.slot_end)
                : new Date(Date.now() + 3600000);
            return (0, utils_1.sendSuccess)(res, {
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
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    cancelAppointment = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const idStr = String(req.params.appointmentId);
            const isNum = !isNaN(Number(idStr));
            const existing = await prisma.appointment.findFirst({
                where: isNum
                    ? { OR: [{ appointment_id: BigInt(Number(idStr)) }, { appointment_no: idStr }] }
                    : { appointment_no: idStr },
            });
            if (!existing)
                return (0, utils_1.sendError)(res, "Appointment not found", 404);
            const updated = await prisma.appointment.update({
                where: { appointment_id: existing.appointment_id },
                data: { status: "CANCELLED" },
            });
            return (0, utils_1.sendSuccess)(res, { success: true, appointment: { ...updated, appointment_id: Number(updated.appointment_id) } });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    rescheduleAppointment = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        if (!prisma) {
            return (0, utils_1.sendError)(res, "Database unavailable", 500);
        }
        try {
            const idStr = String(req.params.appointmentId);
            const isNum = !isNaN(Number(idStr));
            const existing = await prisma.appointment.findFirst({
                where: isNum
                    ? { OR: [{ appointment_id: BigInt(Number(idStr)) }, { appointment_no: idStr }] }
                    : { appointment_no: idStr },
            });
            if (!existing)
                return (0, utils_1.sendError)(res, "Appointment not found", 404);
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
            return (0, utils_1.sendSuccess)(res, { success: true, appointment: { ...updated, appointment_id: Number(updated.appointment_id) } });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    updateAppointmentStatus = async (req, res) => {
        const prisma = (0, prisma_1.getPrisma)();
        const idStr = String(req.params.appointmentId);
        const status = req.body.status || "BOOKED";
        if (prisma) {
            try {
                const isNum = !isNaN(Number(idStr));
                const existing = await prisma.appointment.findFirst({
                    where: isNum
                        ? { OR: [{ appointment_id: BigInt(Number(idStr)) }, { appointment_no: idStr }] }
                        : { appointment_no: idStr },
                });
                if (existing) {
                    const updated = await prisma.appointment.update({
                        where: { appointment_id: existing.appointment_id },
                        data: { status, updatedate: new Date() },
                    });
                    return (0, utils_1.sendSuccess)(res, { success: true, appointment: { ...updated, appointment_id: Number(updated.appointment_id) } });
                }
            }
            catch (err) {
                console.warn('[AppointmentsController.updateAppointmentStatus] DB error:', err.message);
            }
        }
        return (0, utils_1.sendSuccess)(res, { success: true, appointmentId: idStr, status });
    };
}
exports.AppointmentsController = AppointmentsController;
exports.appointmentsController = new AppointmentsController();
