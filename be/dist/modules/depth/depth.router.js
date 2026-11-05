"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depthRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../db/prisma");
const cargo_service_1 = require("../cargo/cargo.service");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const insight_1 = require("../../data/insight");
const cargo_1 = require("../../data/cargo");
const admin_1 = require("../../data/admin");
const router = (0, express_1.Router)();
// In-memory dg segregation matrix
let segregationMatrix = {
    warnings: cargo_1.segregationWarnings,
    classes: cargo_1.IMO_CLASSES,
};
// In-memory handling job lines store
const jobLinesStore = {};
let appointmentSlotRules = [
    { appointmentSlotRuleId: 1, flow: "IMPORT_PICKUP", startHour: 8, endHour: 17, maxSlotsPerHour: 20, isActive: true, logInst: 1 },
    { appointmentSlotRuleId: 2, flow: "EXPORT_DELIVERY", startHour: 8, endHour: 17, maxSlotsPerHour: 20, isActive: true, logInst: 1 },
    { appointmentSlotRuleId: 3, flow: "EMPTY_DROP", startHour: 8, endHour: 17, maxSlotsPerHour: 30, isActive: true, logInst: 1 },
    { appointmentSlotRuleId: 4, flow: "EMPTY_PICKUP", startHour: 8, endHour: 17, maxSlotsPerHour: 30, isActive: true, logInst: 1 },
];
let appointments = [
    {
        appointmentId: 1,
        apptNo: "APT-2026-001",
        date: new Date().toISOString().slice(0, 10),
        hour: 9,
        slotStart: `${new Date().toISOString().slice(0, 10)}T09:00:00Z`,
        slotEnd: `${new Date().toISOString().slice(0, 10)}T10:00:00Z`,
        visitTypeCode: "IMPORT_PICKUP",
        plateNo: "T 118 DPE",
        partyId: 1,
        driverName: "Juma Ramadhani",
        driverPhone: "+255 712 111 222",
        unitNo: "MSKU 882014 9",
        status: "BOOKED",
        logInst: 1,
    },
    {
        appointmentId: 2,
        apptNo: "APT-2026-002",
        date: new Date().toISOString().slice(0, 10),
        hour: 11,
        slotStart: `${new Date().toISOString().slice(0, 10)}T11:00:00Z`,
        slotEnd: `${new Date().toISOString().slice(0, 10)}T12:00:00Z`,
        visitTypeCode: "EXPORT_DELIVERY",
        plateNo: "T 492 EFA",
        partyId: 2,
        driverName: "Baraka Omari",
        driverPhone: "+255 754 333 444",
        unitNo: "MEDU 391024 1",
        status: "ARRIVED",
        logInst: 1,
    },
];
// ------------------------------------------------------------------ 1. Appointments (Site-scoped)
router.get("/appointment-slot-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage"), (req, res) => {
    res.json({
        items: appointmentSlotRules,
        total: appointmentSlotRules.length,
        nextCursor: null,
    });
});
router.post("/appointment-slot-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage", "DO"), (req, res) => {
    const newRule = {
        appointmentSlotRuleId: appointmentSlotRules.length + 1,
        flow: req.body.flow || "IMPORT_PICKUP",
        startHour: req.body.startHour || 8,
        endHour: req.body.endHour || 17,
        maxSlotsPerHour: req.body.maxSlotsPerHour || 20,
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    appointmentSlotRules.push(newRule);
    res.status(201).json(newRule);
});
router.get("/appointment-slot-rules/:appointmentSlotRuleId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage"), (req, res) => {
    const r = appointmentSlotRules.find((x) => String(x.appointmentSlotRuleId) === req.params.appointmentSlotRuleId);
    if (!r)
        return res.status(404).json({ error: "Slot rule not found" });
    res.json(r);
});
router.patch("/appointment-slot-rules/:appointmentSlotRuleId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.manage", "DO"), (req, res) => {
    const r = appointmentSlotRules.find((x) => String(x.appointmentSlotRuleId) === req.params.appointmentSlotRuleId);
    if (!r)
        return res.status(404).json({ error: "Slot rule not found" });
    Object.assign(r, req.body);
    res.json(r);
});
router.get("/appointments/availability", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book"), (req, res) => {
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const slots = [
        { slotTime: `${date}T08:00:00Z`, available: 12, capacity: 20 },
        { slotTime: `${date}T10:00:00Z`, available: 8, capacity: 20 },
        { slotTime: `${date}T12:00:00Z`, available: 15, capacity: 20 },
        { slotTime: `${date}T14:00:00Z`, available: 6, capacity: 20 },
        { slotTime: `${date}T16:00:00Z`, available: 18, capacity: 20 },
    ];
    res.json({ date, slots });
});
router.get("/appointments", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book"), async (req, res) => {
    let items = appointments;
    if ((0, prisma_1.isDbLive)()) {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            try {
                const dbAppts = await prisma.appointments.findMany({
                    include: { visit_types: true, parties: true },
                    orderBy: { appointment_id: "desc" },
                });
                if (dbAppts && dbAppts.length > 0) {
                    const mapped = dbAppts.map((a) => {
                        const slotStartDate = a.slot_start
                            ? new Date(a.slot_start)
                            : new Date();
                        const slotEndDate = a.slot_end
                            ? new Date(a.slot_end)
                            : new Date(Date.now() + 3600000);
                        return {
                            appointmentId: a.appointment_id,
                            apptNo: a.appointment_no,
                            date: slotStartDate.toISOString().slice(0, 10),
                            hour: slotStartDate.getHours(),
                            slotStart: slotStartDate.toISOString(),
                            slotEnd: slotEndDate.toISOString(),
                            visitTypeCode: a.visit_types?.visit_code || "IMPORT_PICKUP",
                            plateNo: a.truck_plate || "T 118 DPE",
                            partyId: a.transporter_party_id || 1,
                            driverName: "Juma Ramadhani",
                            driverPhone: "+255 712 111 222",
                            unitNo: "MSKU 882014 9",
                            status: a.status || "ARRIVED",
                            logInst: 1,
                        };
                    });
                    const dbNos = new Set(mapped.map((m) => m.apptNo));
                    items = [
                        ...mapped,
                        ...appointments.filter((ap) => !dbNos.has(ap.apptNo || ap.appointmentNo)),
                    ];
                }
            }
            catch (err) {
                console.warn("[DepthRouter] DB query error on appointments:", err);
            }
        }
    }
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/appointments", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book", "DO"), (req, res) => {
    const newAppt = {
        appointmentId: appointments.length + 4120,
        apptNo: `APT-26-0${appointments.length + 4120}`,
        unitStayId: req.body.unitStayId || 5001,
        unitNo: req.body.unitNo || "MSKU 882014 9",
        slotStart: req.body.slotStart || new Date(Date.now() + 86400000).toISOString(),
        slotEnd: req.body.slotEnd || new Date(Date.now() + 90000000).toISOString(),
        plateNo: req.body.plateNo || "T 124 DFH",
        driverName: req.body.driverName || "Driver",
        status: "CONFIRMED",
        logInst: 1,
        ...req.body,
    };
    appointments.push(newAppt);
    res.status(201).json(newAppt);
});
router.get("/appointments/:appointmentId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book"), (req, res) => {
    const a = appointments.find((x) => String(x.appointmentId) === req.params.appointmentId ||
        x.apptNo === req.params.appointmentId);
    if (!a)
        return res.status(404).json({ error: "Appointment not found" });
    res.json(a);
});
router.post("/appointments/:appointmentId([0-9a-zA-Z_.-]+):cancel", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book", "DO"), (req, res) => {
    const a = appointments.find((x) => String(x.appointmentId) === req.params.appointmentId);
    if (a)
        a.status = "CANCELLED";
    res.json({ success: true, appointment: a });
});
router.post("/appointments/:appointmentId([0-9a-zA-Z_.-]+):reschedule", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("appointment.book", "DO"), (req, res) => {
    const a = appointments.find((x) => String(x.appointmentId) === req.params.appointmentId);
    if (a) {
        a.slotStart = req.body.slotStart || a.slotStart;
        a.slotEnd = req.body.slotEnd || a.slotEnd;
        a.status = "CONFIRMED";
    }
    res.json({ success: true, appointment: a });
});
// ------------------------------------------------------------------ 2. CFS Operations (Site-scoped)
router.get("/labour-contractors", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage"), (req, res) => {
    res.json({
        items: contractors,
        total: contractors.length,
        nextCursor: null,
    });
});
router.post("/labour-contractors", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (req, res) => {
    const newCont = {
        labourContractorId: contractors.length + 1,
        contractorName: req.body.contractorName || "New Labour Contractor",
        gangCount: req.body.gangCount || 4,
        ratePerHourUsd: req.body.ratePerHourUsd || 15.0,
        isActive: true,
        ...req.body,
    };
    contractors.push(newCont);
    res.status(201).json(newCont);
});
router.get("/labour-contractors/:labourContractorId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage"), (req, res) => {
    const c = contractors.find((x) => String(x.labourContractorId) === req.params.labourContractorId);
    if (!c)
        return res.status(404).json({ error: "Contractor not found" });
    res.json(c);
});
router.patch("/labour-contractors/:labourContractorId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (req, res) => {
    const c = contractors.find((x) => String(x.labourContractorId) === req.params.labourContractorId);
    if (!c)
        return res.status(404).json({ error: "Contractor not found" });
    Object.assign(c, req.body);
    res.json(c);
});
router.get(["/handling-jobs", "/cfs/jobs"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage"), async (req, res) => {
    let items = jobs;
    if ((0, prisma_1.isDbLive)()) {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            try {
                const dbJobs = await prisma.handling_jobs.findMany({
                    include: {
                        unit_stays: true,
                        handling_job_lines: true,
                    },
                    orderBy: { handling_job_id: "desc" },
                });
                if (dbJobs && dbJobs.length > 0) {
                    const mapped = dbJobs.map((j) => ({
                        handlingJobId: j.handling_job_id,
                        jobNo: `JOB-26-0${j.handling_job_id}`,
                        jobKind: j.job_type === "CFS_DESTUFFING" ? "DESTUFF" : "STUFF",
                        jobType: j.job_type === "CFS_DESTUFFING" ? "STRIP" : "STUFF",
                        unitStayId: j.unit_stay_id,
                        unitNo: j.unit_stays?.unit_no || "TCLU 551902 4",
                        plannedAt: j.started_at?.toISOString() || new Date().toISOString(),
                        status: j.status || "IN_PROGRESS",
                        contractorName: "Kilima Gang",
                        lines: (j.handling_job_lines || []).length > 0
                            ? (j.handling_job_lines || []).map((l) => ({
                                lineNo: l.line_no,
                                packageKind: l.uom || "CARTONS",
                                pieces: l.package_count || 450,
                                goodsDesc: l.cargo_description || "Industrial equipment",
                                cargoWeightKg: 12400,
                                shortQty: 0,
                                excessQty: 0,
                                damagedQty: 0,
                            }))
                            : [
                                {
                                    lineNo: 1,
                                    packageKind: "CARTONS",
                                    pieces: 450,
                                    goodsDesc: "Industrial pump components",
                                    cargoWeightKg: 12400,
                                    shortQty: 0,
                                    excessQty: 0,
                                    damagedQty: 0,
                                },
                            ],
                    }));
                    const dbIds = new Set(mapped.map((m) => m.handlingJobId));
                    items = [
                        ...mapped,
                        ...jobs.filter((jb) => !dbIds.has(jb.handlingJobId)),
                    ];
                }
            }
            catch (err) {
                console.warn("[DepthRouter] DB query error on handling-jobs:", err);
            }
        }
    }
    res.json({ items, total: items.length, nextCursor: null });
});
router.post(["/handling-jobs", "/cfs/jobs"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (req, res) => {
    const newJob = {
        handlingJobId: jobs.length + 9001,
        jobNo: `JOB-26-0${jobs.length + 9001}`,
        jobType: req.body.jobType || "STRIP",
        unitStayId: req.body.unitStayId || 5001,
        unitNo: req.body.unitNo || "MSKU 882014 9",
        status: "PLANNED",
        contractorName: req.body.contractorName || "Kilima Gang",
        scheduledAt: new Date().toISOString(),
        lines: req.body.lines || [],
        ...req.body,
    };
    jobs.push(newJob);
    res.status(201).json(newJob);
});
router.get(["/handling-jobs/:handlingJobId", "/cfs/jobs/:handlingJobId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage"), (req, res) => {
    const j = jobs.find((x) => String(x.handlingJobId) === req.params.handlingJobId ||
        x.jobNo === req.params.handlingJobId);
    if (!j)
        return res.status(404).json({ error: "Handling job not found" });
    res.json(j);
});
router.patch("/handling-jobs/:handlingJobId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (req, res) => {
    const j = jobs.find((x) => String(x.handlingJobId) === req.params.handlingJobId);
    if (!j)
        return res.status(404).json({ error: "Handling job not found" });
    Object.assign(j, req.body);
    res.json(j);
});
router.put("/handling-jobs/:handlingJobId/lines", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (req, res) => {
    jobLinesStore[req.params.handlingJobId] = req.body;
    res.json({ success: true, lines: req.body });
});
router.post("/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):start", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (req, res) => {
    const j = jobs.find((x) => String(x.handlingJobId) === req.params.handlingJobId);
    if (j) {
        j.status = "IN_PROGRESS";
        j.startedAt = new Date().toISOString();
    }
    res.json({ success: true, job: j });
});
router.post("/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):complete", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (req, res) => {
    const j = jobs.find((x) => String(x.handlingJobId) === req.params.handlingJobId);
    if (j) {
        j.status = "COMPLETED";
        j.completedAt = new Date().toISOString();
    }
    res.json({ success: true, job: j });
});
router.post("/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):approve", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.approve", "DO"), (req, res) => {
    const j = jobs.find((x) => String(x.handlingJobId) === req.params.handlingJobId);
    if (j) {
        j.status = "APPROVED";
        j.approvedBy = req.user?.username || "CFS Supervisor";
    }
    res.json({ success: true, job: j });
});
router.get("/lots/:unitStayId/balance", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    const b = lotBalances.find((l) => String(l.unitStayId) === req.params.unitStayId) || {
        unitStayId: req.params.unitStayId,
        totalPackages: 450,
        strippedPackages: 450,
        deliveredPackages: 0,
        remainingPackages: 450,
    };
    res.json(b);
});
// ------------------------------------------------------------------ 3. Customer Portal (Site-scoped)
router.get("/portal/invitations", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("portal.invite"), (req, res) => {
    res.json({
        items: portalInvitations,
        total: portalInvitations.length,
        nextCursor: null,
    });
});
router.post("/portal/invitations", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("portal.invite", "DO"), (req, res) => {
    const inv = {
        invitationId: portalInvitations.length + 1,
        email: req.body.email,
        partyName: req.body.partyName || "Portal User",
        role: req.body.role || "CLEARING_AGENT",
        status: "PENDING",
        sentAt: new Date().toISOString(),
        logInst: 1,
        ...req.body,
    };
    portalInvitations.push(inv);
    res.status(201).json(inv);
});
router.post("/portal/invitations/:invitationId([0-9a-zA-Z_.-]+):revoke", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("portal.invite", "DO"), (req, res) => {
    const inv = portalInvitations.find((i) => String(i.invitationId) === req.params.invitationId);
    if (inv)
        inv.status = "REVOKED";
    res.json({ success: true, invitation: inv });
});
router.post("/portal/invitations:accept", (0, siteScope_1.requireSite)(false), (req, res) => {
    res.json({
        success: true,
        message: "Portal invitation accepted successfully.",
    });
});
router.get("/service-requests", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("portal.request.submit"), (req, res) => {
    res.json({
        items: serviceRequests,
        total: serviceRequests.length,
        nextCursor: null,
    });
});
router.post("/service-requests", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("portal.request.submit", "DO"), (req, res) => {
    const newSr = {
        serviceRequestId: serviceRequests.length + 7101,
        srNo: `SR-2026-0${serviceRequests.length + 7101}`,
        requestKind: req.body.requestKind || "FREE_DAY_EXTENSION",
        partyName: req.body.partyName || "Customer",
        unitNo: req.body.unitNo || "MSKU 882014 9",
        status: "SUBMITTED",
        createdAt: new Date().toISOString(),
        ...req.body,
    };
    serviceRequests.push(newSr);
    res.status(201).json(newSr);
});
router.get("/service-requests/:serviceRequestId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("portal.request.submit"), (req, res) => {
    const sr = serviceRequests.find((s) => String(s.serviceRequestId) === req.params.serviceRequestId);
    if (!sr)
        return res.status(404).json({ error: "Service request not found" });
    res.json(sr);
});
router.post("/service-requests/:serviceRequestId([0-9a-zA-Z_.-]+):respond", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("portal.request.handle", "DO"), (req, res) => {
    const sr = serviceRequests.find((s) => String(s.serviceRequestId) === req.params.serviceRequestId);
    if (sr) {
        sr.status = "RESOLVED";
        sr.resolutionNotes = req.body.replyText || req.body.notes;
        sr.resolvedAt = new Date().toISOString();
    }
    res.json({ success: true, serviceRequest: sr });
});
router.get(["/reefer-sessions", "/reefers"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage"), async (req, res) => {
    let items = reefers;
    if ((0, prisma_1.isDbLive)()) {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            try {
                const dbReefers = await prisma.reefer_sessions.findMany({
                    include: {
                        unit_stays: true,
                        reefer_readings: { orderBy: { recorded_at: "desc" }, take: 10 },
                    },
                    orderBy: { reefer_session_id: "desc" },
                });
                if (dbReefers && dbReefers.length > 0) {
                    const mapped = dbReefers.map((r) => {
                        const readings = (r.reefer_readings || []).map((rd) => ({
                            recordedAt: rd.recorded_at?.toISOString() || new Date().toISOString(),
                            supplyTempC: Number(rd.supply_temp_c ?? -17.9),
                            returnTempC: Number(rd.return_temp_c ?? -17.4),
                            ambientTempC: 30.5,
                            powerKw: Number(rd.power_kw ?? 4.8),
                        }));
                        if (readings.length === 0) {
                            readings.push({
                                recordedAt: new Date().toISOString(),
                                supplyTempC: -17.9,
                                returnTempC: -17.4,
                                ambientTempC: 30.5,
                                powerKw: 4.8,
                            });
                        }
                        return {
                            reeferSessionId: r.reefer_session_id,
                            unitStayId: r.unit_stay_id,
                            unitNo: r.unit_stays?.unit_no || "CMAU 773120 1",
                            plugNo: r.plug_code || "R-01",
                            pluggedAt: r.plugged_at?.toISOString() ||
                                new Date(Date.now() - 360 * 60000).toISOString(),
                            unpluggedAt: undefined,
                            setTempC: Number(r.target_temp_c ?? -18),
                            readings,
                            alarm: undefined,
                        };
                    });
                    const dbIds = new Set(mapped.map((m) => m.reeferSessionId));
                    items = [
                        ...mapped,
                        ...reefers.filter((rf) => !dbIds.has(rf.reeferSessionId)),
                    ];
                }
            }
            catch (err) {
                console.warn("[DepthRouter] DB query error on reefer-sessions:", err);
            }
        }
    }
    res.json({ items, total: items.length, nextCursor: null });
});
router.post(["/reefer-sessions", "/reefers"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage", "DO"), (req, res) => {
    const newReefer = {
        reeferSessionId: reefers.length + 1,
        unitStayId: req.body.unitStayId || 5001,
        unitNo: req.body.unitNo || "MSKU 882014 9",
        plugCode: req.body.plugCode || `R-0${reefers.length + 1}`,
        pluggedAt: new Date().toISOString(),
        targetTempC: req.body.targetTempC || -18.0,
        status: "ACTIVE",
        ...req.body,
    };
    reefers.push(newReefer);
    res.status(201).json(newReefer);
});
router.get(["/reefer-sessions/:reeferSessionId", "/reefers/:reeferSessionId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage"), (req, res) => {
    const r = reefers.find((x) => String(x.reeferSessionId) === req.params.reeferSessionId);
    if (!r)
        return res.status(404).json({ error: "Reefer session not found" });
    res.json(r);
});
router.post("/reefer-sessions/:reeferSessionId([0-9a-zA-Z_.-]+):unplug", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage", "DO"), (req, res) => {
    const r = reefers.find((x) => String(x.reeferSessionId) === req.params.reeferSessionId);
    if (r) {
        r.status = "UNPLUGGED";
        r.unpluggedAt = new Date().toISOString();
    }
    res.json({ success: true, session: r });
});
router.get([
    "/reefer-sessions/:reeferSessionId/readings",
    "/reefers/:reeferSessionId/readings",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage"), (req, res) => {
    const readings = reeferReadingsStore[req.params.reeferSessionId] || [
        {
            readingId: 1,
            setTempC: -18.0,
            supplyTempC: -17.9,
            returnTempC: -17.4,
            recordedAt: new Date().toISOString(),
        },
    ];
    res.json({ items: readings, total: readings.length, nextCursor: null });
});
router.post([
    "/reefer-sessions/:reeferSessionId/readings",
    "/reefers/:reeferSessionId/readings",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage", "DO"), (req, res) => {
    if (!reeferReadingsStore[req.params.reeferSessionId])
        reeferReadingsStore[req.params.reeferSessionId] = [];
    const reading = {
        readingId: Date.now(),
        setTempC: req.body.setTempC || -18.0,
        supplyTempC: req.body.supplyTempC || -17.8,
        returnTempC: req.body.returnTempC || -17.2,
        powerKw: req.body.powerKw || 4.5,
        recordedAt: new Date().toISOString(),
    };
    reeferReadingsStore[req.params.reeferSessionId].push(reading);
    res.status(201).json(reading);
});
// ------------------------------------------------------------------ 5. Dangerous Goods (Site-scoped)
router.get(["/imo-classes", "/dg-classes"], (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), (req, res) => {
    res.json({
        items: cargo_1.IMO_CLASSES,
        total: cargo_1.IMO_CLASSES.length,
        nextCursor: null,
    });
});
router.get("/segregation-rules", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), (req, res) => {
    res.json(segregationMatrix);
});
router.put("/segregation-rules", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    segregationMatrix = req.body;
    res.json({ success: true, segregationMatrix });
});
router.get("/units/:unitStayId/dg-lines", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (req, res) => {
    const lines = cargo_1.dgLines.filter((d) => String(d.unitStayId) === req.params.unitStayId);
    res.json({ items: lines, total: lines.length, nextCursor: null });
});
router.put("/units/:unitStayId/dg-lines", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("dg.manage", "DO"), async (req, res) => {
    try {
        const lines = Array.isArray(req.body) ? req.body : [req.body];
        const saved = await cargo_service_1.cargoService.saveDgLines(req.params.unitStayId, lines);
        res.json({ success: true, unitStayId: req.params.unitStayId, dgLines: saved });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ------------------------------------------------------------------ 2. EDI & Integration (Site-scoped)
router.get("/integration-messages", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("integration.monitor"), (req, res) => {
    res.json({
        items: admin_1.integrationMessages,
        total: admin_1.integrationMessages.length,
        nextCursor: null,
    });
});
router.get("/integration-messages/:integrationMessageId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("integration.monitor"), (req, res) => {
    const m = admin_1.integrationMessages.find((x) => String(x.id) === req.params.integrationMessageId ||
        String(x.integrationMessageId) === req.params.integrationMessageId);
    if (!m)
        return res.status(404).json({ error: "Integration message not found" });
    res.json(m);
});
router.post("/integration-messages/:integrationMessageId([0-9a-zA-Z_.-]+):retry", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("integration.monitor", "DO"), (req, res) => {
    const m = admin_1.integrationMessages.find((x) => String(x.id) === req.params.integrationMessageId ||
        String(x.integrationMessageId) === req.params.integrationMessageId);
    if (m)
        m.status = "SENT";
    res.json({ success: true, message: m });
});
router.post("/edi/inbound/:partnerCode", (0, siteScope_1.requireSite)(false), (req, res) => {
    res.status(202).json({
        messageId: `EDI-MSG-${Date.now()}`,
        partnerCode: req.params.partnerCode,
        status: "QUEUED",
        receivedAt: new Date().toISOString(),
    });
});
// ------------------------------------------------------------------ 3. Intelligence & Forecasting (Site-scoped)
router.get("/models", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), (req, res) => {
    res.json({ items: admin_1.models, total: admin_1.models.length, nextCursor: null });
});
router.post("/models/:mlModelVersionId([0-9a-zA-Z_.-]+):activate", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const mod = admin_1.models.find((m) => String(m.modelId) === req.params.mlModelVersionId ||
        m.name === req.params.mlModelVersionId);
    if (mod)
        mod.status = "ACTIVE";
    res.json({ success: true, model: mod });
});
router.get(["/forecasts/dwell", "/predictions/dwell"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("yard.map.view"), (req, res) => {
    const siteId = Number(req.query.siteId || req.siteId) || 1;
    const items = (0, insight_1.dwellPredictions)(siteId);
    res.json({ items, total: items.length, nextCursor: null });
});
router.get(["/forecasts/occupancy", "/forecast/occupancy"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("yard.map.view"), (req, res) => {
    const siteId = Number(req.query.siteId || req.siteId) || 1;
    const block = String(req.query.block || "ALL");
    const items = (0, insight_1.occupancyForecast)(siteId, block);
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/yard/suggestion-log", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("yard.allocate"), (req, res) => {
    res.json({
        items: insight_1.suggestionLog,
        total: insight_1.suggestionLog.length,
        nextCursor: null,
    });
});
exports.depthRouter = router;
