import { Router } from 'express';
import { requireSite } from '../../middleware/siteScope';
import { requirePermission } from '../../middleware/permission';
import {
  appointments, slotRules, contractors, jobs, lotBalances, reefers,
  repairCodes, estimates
} from '../../data/ops';
import {
  occupancyForecast, dwellPredictions, suggestionLog, serviceRequests
} from '../../data/insight';
import { dgLines, segregationWarnings, IMO_CLASSES } from '../../data/cargo';
import { integrations, integrationMessages, models } from '../../data/admin';
import { getPrisma, isDbLive } from '../../db/prisma';

const router = Router();

// In-memory portal invitations
let portalInvitations = [
  { invitationId: 1, email: 'agent@bollore.tz', partyName: 'Bollore Transport', role: 'CLEARING_AGENT', status: 'ACCEPTED', sentAt: '2026-10-01T10:00:00Z', logInst: 1 },
  { invitationId: 2, email: 'ops@cma-cgm.tz', partyName: 'CMA CGM Tanzania', role: 'SHIPPING_LINE', status: 'PENDING', sentAt: '2026-10-05T14:30:00Z', logInst: 1 }
];

// In-memory device reads
let deviceReads = [
  { deviceReadId: 1, integrationKind: 'ANPR', payload: { plateNo: 'T 124 DFH', confidence: 0.98 }, status: 'MATCHED', capturedAt: new Date(Date.now() - 3600000).toISOString() },
  { deviceReadId: 2, integrationKind: 'CONTAINER_OCR', payload: { unitNo: 'MSKU 882014 9', confidence: 0.94 }, status: 'MATCHED', capturedAt: new Date(Date.now() - 3500000).toISOString() }
];

// In-memory reefer readings
const reeferReadingsStore: Record<string, any[]> = {
  '1': [
    { readingId: 1, setTempC: -18.0, supplyTempC: -17.8, returnTempC: -17.2, powerKw: 4.8, recordedAt: new Date(Date.now() - 3600000).toISOString() }
  ]
};

// In-memory appointment rules
let appointmentSlotRules = [
  { appointmentSlotRuleId: 1, flow: 'IMPORT_PICKUP', startHour: 6, endHour: 18, maxSlotsPerHour: 20, isActive: true, logInst: 1 },
  { appointmentSlotRuleId: 2, flow: 'EXPORT_DROP', startHour: 6, endHour: 20, maxSlotsPerHour: 15, isActive: true, logInst: 1 }
];

// In-memory dg segregation matrix
let segregationMatrix = {
  warnings: segregationWarnings,
  classes: IMO_CLASSES
};

// In-memory handling job lines store
const jobLinesStore: Record<string, any[]> = {};

// ------------------------------------------------------------------ 1. Appointments (Site-scoped)
router.get('/appointment-slot-rules', requireSite(false), requirePermission('appointment.manage'), (req, res) => {
  res.json({ items: appointmentSlotRules, total: appointmentSlotRules.length, nextCursor: null });
});

router.post('/appointment-slot-rules', requireSite(false), requirePermission('appointment.manage', 'DO'), (req, res) => {
  const newRule = {
    appointmentSlotRuleId: appointmentSlotRules.length + 1,
    flow: req.body.flow || 'IMPORT_PICKUP',
    startHour: req.body.startHour || 8,
    endHour: req.body.endHour || 17,
    maxSlotsPerHour: req.body.maxSlotsPerHour || 20,
    isActive: true,
    logInst: 1,
    ...req.body
  };
  appointmentSlotRules.push(newRule);
  res.status(201).json(newRule);
});

router.get('/appointment-slot-rules/:appointmentSlotRuleId', requireSite(false), requirePermission('appointment.manage'), (req, res) => {
  const r = appointmentSlotRules.find(x => String(x.appointmentSlotRuleId) === req.params.appointmentSlotRuleId);
  if (!r) return res.status(404).json({ error: 'Slot rule not found' });
  res.json(r);
});

router.patch('/appointment-slot-rules/:appointmentSlotRuleId', requireSite(false), requirePermission('appointment.manage', 'DO'), (req, res) => {
  const r = appointmentSlotRules.find(x => String(x.appointmentSlotRuleId) === req.params.appointmentSlotRuleId);
  if (!r) return res.status(404).json({ error: 'Slot rule not found' });
  Object.assign(r, req.body);
  res.json(r);
});

router.get('/appointments/availability', requireSite(false), requirePermission('appointment.book'), (req, res) => {
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const slots = [
    { slotTime: `${date}T08:00:00Z`, available: 12, capacity: 20 },
    { slotTime: `${date}T10:00:00Z`, available: 8, capacity: 20 },
    { slotTime: `${date}T12:00:00Z`, available: 15, capacity: 20 },
    { slotTime: `${date}T14:00:00Z`, available: 6, capacity: 20 },
    { slotTime: `${date}T16:00:00Z`, available: 18, capacity: 20 }
  ];
  res.json({ date, slots });
});

router.get('/appointments', requireSite(false), requirePermission('appointment.book'), async (req, res) => {
  let items: any[] = appointments;
  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbAppts = await prisma.appointments.findMany({
          include: { visit_types: true, parties: true },
          orderBy: { appointment_id: 'desc' }
        });
        if (dbAppts && dbAppts.length > 0) {
          const mapped = dbAppts.map(a => {
            const slotStartDate = a.slot_start ? new Date(a.slot_start) : new Date();
            const slotEndDate = a.slot_end ? new Date(a.slot_end) : new Date(Date.now() + 3600000);
            return {
              appointmentId: a.appointment_id,
              apptNo: a.appointment_no,
              date: slotStartDate.toISOString().slice(0, 10),
              hour: slotStartDate.getHours(),
              slotStart: slotStartDate.toISOString(),
              slotEnd: slotEndDate.toISOString(),
              visitTypeCode: a.visit_types?.visit_code || 'IMPORT_PICKUP',
              plateNo: a.truck_plate || 'T 118 DPE',
              partyId: a.transporter_party_id || 1,
              driverName: 'Juma Ramadhani',
              driverPhone: '+255 712 111 222',
              unitNo: 'MSKU 882014 9',
              status: (a.status as any) || 'ARRIVED',
              logInst: 1
            };
          });
          const dbNos = new Set(mapped.map(m => m.apptNo));
          items = [...mapped, ...appointments.filter(ap => !dbNos.has((ap as any).apptNo || (ap as any).appointmentNo))];
        }
      } catch (err) {
        console.warn('[DepthRouter] DB query error on appointments:', err);
      }
    }
  }
  res.json({ items, total: items.length, nextCursor: null });
});

router.post('/appointments', requireSite(false), requirePermission('appointment.book', 'DO'), (req, res) => {
  const newAppt = {
    appointmentId: appointments.length + 4120,
    apptNo: `APT-26-0${appointments.length + 4120}`,
    unitStayId: req.body.unitStayId || 5001,
    unitNo: req.body.unitNo || 'MSKU 882014 9',
    slotStart: req.body.slotStart || new Date(Date.now() + 86400000).toISOString(),
    slotEnd: req.body.slotEnd || new Date(Date.now() + 90000000).toISOString(),
    plateNo: req.body.plateNo || 'T 124 DFH',
    driverName: req.body.driverName || 'Driver',
    status: 'CONFIRMED',
    logInst: 1,
    ...req.body
  };
  appointments.push(newAppt as any);
  res.status(201).json(newAppt);
});

router.get('/appointments/:appointmentId', requireSite(false), requirePermission('appointment.book'), (req, res) => {
  const a = (appointments as any[]).find(x => String(x.appointmentId) === req.params.appointmentId || x.apptNo === req.params.appointmentId);
  if (!a) return res.status(404).json({ error: 'Appointment not found' });
  res.json(a);
});

router.post('/appointments/:appointmentId([0-9a-zA-Z_.-]+):cancel', requireSite(false), requirePermission('appointment.book', 'DO'), (req, res) => {
  const a = (appointments as any[]).find(x => String(x.appointmentId) === req.params.appointmentId);
  if (a) a.status = 'CANCELLED';
  res.json({ success: true, appointment: a });
});

router.post('/appointments/:appointmentId([0-9a-zA-Z_.-]+):reschedule', requireSite(false), requirePermission('appointment.book', 'DO'), (req, res) => {
  const a = (appointments as any[]).find(x => String(x.appointmentId) === req.params.appointmentId);
  if (a) {
    a.slotStart = req.body.slotStart || a.slotStart;
    a.slotEnd = req.body.slotEnd || a.slotEnd;
    a.status = 'CONFIRMED';
  }
  res.json({ success: true, appointment: a });
});

// ------------------------------------------------------------------ 2. CFS Operations (Site-scoped)
router.get('/labour-contractors', requireSite(false), requirePermission('cfs.job.manage'), (req, res) => {
  res.json({ items: contractors, total: contractors.length, nextCursor: null });
});

router.post('/labour-contractors', requireSite(false), requirePermission('cfs.job.manage', 'DO'), (req, res) => {
  const newCont = {
    labourContractorId: contractors.length + 1,
    contractorName: req.body.contractorName || 'New Labour Contractor',
    gangCount: req.body.gangCount || 4,
    ratePerHourUsd: req.body.ratePerHourUsd || 15.0,
    isActive: true,
    ...req.body
  };
  contractors.push(newCont as any);
  res.status(201).json(newCont);
});

router.get('/labour-contractors/:labourContractorId', requireSite(false), requirePermission('cfs.job.manage'), (req, res) => {
  const c = (contractors as any[]).find(x => String(x.labourContractorId) === req.params.labourContractorId);
  if (!c) return res.status(404).json({ error: 'Contractor not found' });
  res.json(c);
});

router.patch('/labour-contractors/:labourContractorId', requireSite(false), requirePermission('cfs.job.manage', 'DO'), (req, res) => {
  const c = (contractors as any[]).find(x => String(x.labourContractorId) === req.params.labourContractorId);
  if (!c) return res.status(404).json({ error: 'Contractor not found' });
  Object.assign(c, req.body);
  res.json(c);
});

router.get(['/handling-jobs', '/cfs/jobs'], requireSite(false), requirePermission('cfs.job.manage'), async (req, res) => {
  let items: any[] = jobs;
  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbJobs = await prisma.handling_jobs.findMany({
          include: {
            unit_stays: true,
            handling_job_lines: true
          },
          orderBy: { handling_job_id: 'desc' }
        });
        if (dbJobs && dbJobs.length > 0) {
          const mapped = dbJobs.map(j => ({
            handlingJobId: j.handling_job_id,
            jobNo: `JOB-26-0${j.handling_job_id}`,
            jobKind: j.job_type === 'CFS_DESTUFFING' ? 'DESTUFF' : 'STUFF',
            jobType: j.job_type === 'CFS_DESTUFFING' ? 'STRIP' : 'STUFF',
            unitStayId: j.unit_stay_id,
            unitNo: j.unit_stays?.unit_no || 'TCLU 551902 4',
            plannedAt: j.started_at?.toISOString() || new Date().toISOString(),
            status: j.status || 'IN_PROGRESS',
            contractorName: 'Kilima Gang',
            lines: (j.handling_job_lines || []).length > 0 ? (j.handling_job_lines || []).map(l => ({
              lineNo: l.line_no,
              packageKind: l.uom || 'CARTONS',
              pieces: l.package_count || 450,
              goodsDesc: l.cargo_description || 'Industrial equipment',
              cargoWeightKg: 12400,
              shortQty: 0,
              excessQty: 0,
              damagedQty: 0
            })) : [
              { lineNo: 1, packageKind: 'CARTONS', pieces: 450, goodsDesc: 'Industrial pump components', cargoWeightKg: 12400, shortQty: 0, excessQty: 0, damagedQty: 0 }
            ]
          }));
          const dbIds = new Set(mapped.map(m => m.handlingJobId));
          items = [...mapped, ...jobs.filter(jb => !dbIds.has((jb as any).handlingJobId))];
        }
      } catch (err) {
        console.warn('[DepthRouter] DB query error on handling-jobs:', err);
      }
    }
  }
  res.json({ items, total: items.length, nextCursor: null });
});

router.post(['/handling-jobs', '/cfs/jobs'], requireSite(false), requirePermission('cfs.job.manage', 'DO'), (req, res) => {
  const newJob = {
    handlingJobId: jobs.length + 9001,
    jobNo: `JOB-26-0${jobs.length + 9001}`,
    jobType: req.body.jobType || 'STRIP',
    unitStayId: req.body.unitStayId || 5001,
    unitNo: req.body.unitNo || 'MSKU 882014 9',
    status: 'PLANNED',
    contractorName: req.body.contractorName || 'Kilima Gang',
    scheduledAt: new Date().toISOString(),
    lines: req.body.lines || [],
    ...req.body
  };
  jobs.push(newJob as any);
  res.status(201).json(newJob);
});

router.get(['/handling-jobs/:handlingJobId', '/cfs/jobs/:handlingJobId'], requireSite(false), requirePermission('cfs.job.manage'), (req, res) => {
  const j = (jobs as any[]).find(x => String(x.handlingJobId) === req.params.handlingJobId || x.jobNo === req.params.handlingJobId);
  if (!j) return res.status(404).json({ error: 'Handling job not found' });
  res.json(j);
});

router.patch('/handling-jobs/:handlingJobId', requireSite(false), requirePermission('cfs.job.manage', 'DO'), (req, res) => {
  const j = (jobs as any[]).find(x => String(x.handlingJobId) === req.params.handlingJobId);
  if (!j) return res.status(404).json({ error: 'Handling job not found' });
  Object.assign(j, req.body);
  res.json(j);
});

router.put('/handling-jobs/:handlingJobId/lines', requireSite(false), requirePermission('cfs.job.manage', 'DO'), (req, res) => {
  jobLinesStore[req.params.handlingJobId] = req.body;
  res.json({ success: true, lines: req.body });
});

router.post('/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):start', requireSite(false), requirePermission('cfs.job.manage', 'DO'), (req, res) => {
  const j = (jobs as any[]).find(x => String(x.handlingJobId) === req.params.handlingJobId);
  if (j) {
    j.status = 'IN_PROGRESS';
    j.startedAt = new Date().toISOString();
  }
  res.json({ success: true, job: j });
});

router.post('/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):complete', requireSite(false), requirePermission('cfs.job.manage', 'DO'), (req, res) => {
  const j = (jobs as any[]).find(x => String(x.handlingJobId) === req.params.handlingJobId);
  if (j) {
    j.status = 'COMPLETED';
    j.completedAt = new Date().toISOString();
  }
  res.json({ success: true, job: j });
});

router.post('/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):approve', requireSite(false), requirePermission('cfs.job.approve', 'DO'), (req, res) => {
  const j = (jobs as any[]).find(x => String(x.handlingJobId) === req.params.handlingJobId);
  if (j) {
    j.status = 'APPROVED';
    j.approvedBy = req.user?.username || 'CFS Supervisor';
  }
  res.json({ success: true, job: j });
});

router.get('/lots/:unitStayId/balance', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  const b = (lotBalances as any[]).find(l => String(l.unitStayId) === req.params.unitStayId) || { unitStayId: req.params.unitStayId, totalPackages: 450, strippedPackages: 450, deliveredPackages: 0, remainingPackages: 450 };
  res.json(b);
});

// ------------------------------------------------------------------ 3. Customer Portal (Site-scoped)
router.get('/portal/invitations', requireSite(false), requirePermission('portal.invite'), (req, res) => {
  res.json({ items: portalInvitations, total: portalInvitations.length, nextCursor: null });
});

router.post('/portal/invitations', requireSite(false), requirePermission('portal.invite', 'DO'), (req, res) => {
  const inv = {
    invitationId: portalInvitations.length + 1,
    email: req.body.email,
    partyName: req.body.partyName || 'Portal User',
    role: req.body.role || 'CLEARING_AGENT',
    status: 'PENDING',
    sentAt: new Date().toISOString(),
    logInst: 1,
    ...req.body
  };
  portalInvitations.push(inv);
  res.status(201).json(inv);
});

router.post('/portal/invitations/:invitationId([0-9a-zA-Z_.-]+):revoke', requireSite(false), requirePermission('portal.invite', 'DO'), (req, res) => {
  const inv = portalInvitations.find(i => String(i.invitationId) === req.params.invitationId);
  if (inv) inv.status = 'REVOKED';
  res.json({ success: true, invitation: inv });
});

router.post('/portal/invitations:accept', requireSite(false), (req, res) => {
  res.json({ success: true, message: 'Portal invitation accepted successfully.' });
});

router.get('/service-requests', requireSite(false), requirePermission('portal.request.submit'), (req, res) => {
  res.json({ items: serviceRequests, total: serviceRequests.length, nextCursor: null });
});

router.post('/service-requests', requireSite(false), requirePermission('portal.request.submit', 'DO'), (req, res) => {
  const newSr = {
    serviceRequestId: serviceRequests.length + 7101,
    srNo: `SR-2026-0${serviceRequests.length + 7101}`,
    requestKind: req.body.requestKind || 'FREE_DAY_EXTENSION',
    partyName: req.body.partyName || 'Customer',
    unitNo: req.body.unitNo || 'MSKU 882014 9',
    status: 'SUBMITTED',
    createdAt: new Date().toISOString(),
    ...req.body
  };
  serviceRequests.push(newSr as any);
  res.status(201).json(newSr);
});

router.get('/service-requests/:serviceRequestId', requireSite(false), requirePermission('portal.request.submit'), (req, res) => {
  const sr = (serviceRequests as any[]).find(s => String(s.serviceRequestId) === req.params.serviceRequestId);
  if (!sr) return res.status(404).json({ error: 'Service request not found' });
  res.json(sr);
});

router.post('/service-requests/:serviceRequestId([0-9a-zA-Z_.-]+):respond', requireSite(false), requirePermission('portal.request.handle', 'DO'), (req, res) => {
  const sr = (serviceRequests as any[]).find(s => String(s.serviceRequestId) === req.params.serviceRequestId);
  if (sr) {
    sr.status = 'RESOLVED';
    sr.resolutionNotes = req.body.replyText || req.body.notes;
    sr.resolvedAt = new Date().toISOString();
  }
  res.json({ success: true, serviceRequest: sr });
});

router.get(['/reefer-sessions', '/reefers'], requireSite(false), requirePermission('reefer.manage'), async (req, res) => {
  let items: any[] = reefers;
  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbReefers = await prisma.reefer_sessions.findMany({
          include: {
            unit_stays: true,
            reefer_readings: { orderBy: { recorded_at: 'desc' }, take: 10 }
          },
          orderBy: { reefer_session_id: 'desc' }
        });
        if (dbReefers && dbReefers.length > 0) {
          const mapped = dbReefers.map(r => {
            const readings = (r.reefer_readings || []).map(rd => ({
              recordedAt: rd.recorded_at?.toISOString() || new Date().toISOString(),
              supplyTempC: Number(rd.supply_temp_c ?? -17.9),
              returnTempC: Number(rd.return_temp_c ?? -17.4),
              ambientTempC: 30.5,
              powerKw: Number(rd.power_kw ?? 4.8)
            }));
            if (readings.length === 0) {
              readings.push({
                recordedAt: new Date().toISOString(),
                supplyTempC: -17.9,
                returnTempC: -17.4,
                ambientTempC: 30.5,
                powerKw: 4.8
              });
            }
            return {
              reeferSessionId: r.reefer_session_id,
              unitStayId: r.unit_stay_id,
              unitNo: r.unit_stays?.unit_no || 'CMAU 773120 1',
              plugNo: r.plug_code || 'R-01',
              pluggedAt: r.plugged_at?.toISOString() || new Date(Date.now() - 360 * 60000).toISOString(),
              unpluggedAt: undefined,
              setTempC: Number(r.target_temp_c ?? -18),
              readings,
              alarm: undefined
            };
          });
          const dbIds = new Set(mapped.map(m => m.reeferSessionId));
          items = [...mapped, ...reefers.filter(rf => !dbIds.has((rf as any).reeferSessionId))];
        }
      } catch (err) {
        console.warn('[DepthRouter] DB query error on reefer-sessions:', err);
      }
    }
  }
  res.json({ items, total: items.length, nextCursor: null });
});

router.post(['/reefer-sessions', '/reefers'], requireSite(false), requirePermission('reefer.manage', 'DO'), (req, res) => {
  const newReefer = {
    reeferSessionId: reefers.length + 1,
    unitStayId: req.body.unitStayId || 5001,
    unitNo: req.body.unitNo || 'MSKU 882014 9',
    plugCode: req.body.plugCode || `R-0${reefers.length + 1}`,
    pluggedAt: new Date().toISOString(),
    targetTempC: req.body.targetTempC || -18.0,
    status: 'ACTIVE',
    ...req.body
  };
  reefers.push(newReefer as any);
  res.status(201).json(newReefer);
});

router.get(['/reefer-sessions/:reeferSessionId', '/reefers/:reeferSessionId'], requireSite(false), requirePermission('reefer.manage'), (req, res) => {
  const r = (reefers as any[]).find(x => String(x.reeferSessionId) === req.params.reeferSessionId);
  if (!r) return res.status(404).json({ error: 'Reefer session not found' });
  res.json(r);
});

router.post('/reefer-sessions/:reeferSessionId([0-9a-zA-Z_.-]+):unplug', requireSite(false), requirePermission('reefer.manage', 'DO'), (req, res) => {
  const r = (reefers as any[]).find(x => String(x.reeferSessionId) === req.params.reeferSessionId);
  if (r) {
    r.status = 'UNPLUGGED';
    r.unpluggedAt = new Date().toISOString();
  }
  res.json({ success: true, session: r });
});

router.get(['/reefer-sessions/:reeferSessionId/readings', '/reefers/:reeferSessionId/readings'], requireSite(false), requirePermission('reefer.manage'), (req, res) => {
  const readings = reeferReadingsStore[req.params.reeferSessionId] || [
    { readingId: 1, setTempC: -18.0, supplyTempC: -17.9, returnTempC: -17.4, recordedAt: new Date().toISOString() }
  ];
  res.json({ items: readings, total: readings.length, nextCursor: null });
});

router.post(['/reefer-sessions/:reeferSessionId/readings', '/reefers/:reeferSessionId/readings'], requireSite(false), requirePermission('reefer.manage', 'DO'), (req, res) => {
  if (!reeferReadingsStore[req.params.reeferSessionId]) reeferReadingsStore[req.params.reeferSessionId] = [];
  const reading = {
    readingId: Date.now(),
    setTempC: req.body.setTempC || -18.0,
    supplyTempC: req.body.supplyTempC || -17.8,
    returnTempC: req.body.returnTempC || -17.2,
    powerKw: req.body.powerKw || 4.5,
    recordedAt: new Date().toISOString()
  };
  reeferReadingsStore[req.params.reeferSessionId].push(reading);
  res.status(201).json(reading);
});

// ------------------------------------------------------------------ 5. Dangerous Goods (Site-scoped)
router.get(['/imo-classes', '/dg-classes'], requireSite(true), requirePermission('masters.view'), (req, res) => {
  res.json({ items: IMO_CLASSES, total: IMO_CLASSES.length, nextCursor: null });
});

router.get('/segregation-rules', requireSite(true), requirePermission('masters.view'), (req, res) => {
  res.json(segregationMatrix);
});

router.put('/segregation-rules', requireSite(true), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  segregationMatrix = req.body;
  res.json({ success: true, segregationMatrix });
});

router.get('/units/:unitStayId/dg-lines', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  const lines = dgLines.filter(d => String(d.unitStayId) === req.params.unitStayId);
  res.json({ items: lines, total: lines.length, nextCursor: null });
});

router.put('/units/:unitStayId/dg-lines', requireSite(false), requirePermission('dg.manage', 'DO'), (req, res) => {
  res.json({ success: true, unitStayId: req.params.unitStayId, dgLines: req.body });
});

// ------------------------------------------------------------------ 6. M&R Maintenance & Repair (Site-scoped)
router.get('/repair-codes', requireSite(false), requirePermission('repair.estimate'), (req, res) => {
  res.json({ items: repairCodes, total: repairCodes.length, nextCursor: null });
});

router.post('/repair-codes', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newRc = {
    repairCodeId: repairCodes.length + 1,
    code: req.body.code || `RC_${repairCodes.length + 1}`,
    name: req.body.name || 'Patch Panel',
    component: req.body.component || 'PANEL',
    standardHours: req.body.standardHours || 2.0,
    ...req.body
  };
  repairCodes.push(newRc as any);
  res.status(201).json(newRc);
});

router.get('/repair-codes/:repairCodeId', requireSite(false), requirePermission('repair.estimate'), (req, res) => {
  const rc = (repairCodes as any[]).find(x => String(x.repairCodeId) === req.params.repairCodeId || x.code === req.params.repairCodeId);
  if (!rc) return res.status(404).json({ error: 'Repair code not found' });
  res.json(rc);
});

router.patch('/repair-codes/:repairCodeId', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const rc = (repairCodes as any[]).find(x => String(x.repairCodeId) === req.params.repairCodeId || x.code === req.params.repairCodeId);
  if (!rc) return res.status(404).json({ error: 'Repair code not found' });
  Object.assign(rc, req.body);
  res.json(rc);
});

router.get(['/repair-estimates', '/repairs'], requireSite(false), requirePermission('repair.estimate'), async (req, res) => {
  let items: any[] = estimates;
  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbEst = await prisma.repair_estimates.findMany({
          orderBy: { estimate_id: 'desc' }
        });
        if (dbEst && dbEst.length > 0) {
          const mapped = dbEst.map(e => ({
            repairEstimateId: e.estimate_id,
            estimateNo: `EST-26-0${e.estimate_id}`,
            createdAt: e.created_at?.toISOString() || new Date().toISOString(),
            unitStayId: e.unit_stay_id,
            unitNo: 'TCLU 551902 4',
            unitType: '20GP',
            location: 'A-01-02-1',
            lineCode: 'MSK',
            partyName: 'Maersk Line Tanzania',
            totalLabour: 140,
            totalMaterial: 140,
            totalAmount: Number(e.total_amount ?? 280),
            status: (e.status as any) || 'APPROVED',
            approverRef: 'APP-2026-9912',
            lines: [
              { lineNo: 1, component: 'PANEL', damageCode: 'SCRATCH', repairCode: 'RP-01', description: 'Straighten and paint side panel', hours: Number(e.total_hours ?? 3.5), labourCost: 140, materialCost: 140, lineStatus: 'APPROVED' }
            ]
          }));
          const dbIds = new Set(mapped.map(m => m.repairEstimateId));
          items = [...mapped, ...estimates.filter(es => !dbIds.has((es as any).repairEstimateId))];
        }
      } catch (err) {
        console.warn('[DepthRouter] DB query error on repair-estimates:', err);
      }
    }
  }
  res.json({ items, total: items.length, nextCursor: null });
});

router.post('/repair-estimates', requireSite(false), requirePermission('repair.estimate', 'DO'), (req, res) => {
  const newEst = {
    repairEstimateId: estimates.length + 1,
    estimateNo: `EST-26-0${estimates.length + 101}`,
    unitStayId: req.body.unitStayId || 5001,
    unitNo: req.body.unitNo || 'MSKU 882014 9',
    partyName: req.body.partyName || 'Maersk Line',
    totalLaborUsd: req.body.totalLaborUsd || 120.0,
    totalMaterialUsd: req.body.totalMaterialUsd || 85.0,
    totalAmountUsd: (req.body.totalLaborUsd || 120.0) + (req.body.totalMaterialUsd || 85.0),
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    ...req.body
  };
  estimates.push(newEst as any);
  res.status(201).json(newEst);
});

router.get(['/repair-estimates/:repairEstimateId', '/repairs/:repairEstimateId'], requireSite(false), requirePermission('repair.estimate'), (req, res) => {
  const est = (estimates as any[]).find(e => String(e.repairEstimateId) === req.params.repairEstimateId || e.estimateNo === req.params.repairEstimateId);
  if (!est) return res.status(404).json({ error: 'Repair estimate not found' });
  res.json(est);
});

router.patch('/repair-estimates/:repairEstimateId', requireSite(false), requirePermission('repair.estimate', 'DO'), (req, res) => {
  const est = (estimates as any[]).find(e => String(e.repairEstimateId) === req.params.repairEstimateId);
  if (!est) return res.status(404).json({ error: 'Repair estimate not found' });
  Object.assign(est, req.body);
  res.json(est);
});

router.post('/repair-estimates/:repairEstimateId([0-9a-zA-Z_.-]+):send', requireSite(false), requirePermission('repair.estimate', 'DO'), (req, res) => {
  const est = (estimates as any[]).find(e => String(e.repairEstimateId) === req.params.repairEstimateId);
  if (est) est.status = 'SENT';
  res.json({ success: true, estimate: est });
});

router.post('/repair-estimates/:repairEstimateId([0-9a-zA-Z_.-]+):decision', requireSite(false), requirePermission('repair.estimate', 'DO'), (req, res) => {
  const est = (estimates as any[]).find(e => String(e.repairEstimateId) === req.params.repairEstimateId);
  if (est) {
    est.status = req.body.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    est.decisionNotes = req.body.notes;
  }
  res.json({ success: true, estimate: est });
});

router.post('/repair-estimates/:repairEstimateId([0-9a-zA-Z_.-]+):complete', requireSite(false), requirePermission('repair.estimate', 'DO'), (req, res) => {
  const est = (estimates as any[]).find(e => String(e.repairEstimateId) === req.params.repairEstimateId);
  if (est) est.status = 'COMPLETED';
  res.json({ success: true, estimate: est });
});

// ------------------------------------------------------------------ 7. Devices & OCR/ANPR (Site-scoped)
router.get('/device-integrations', requireSite(false), requirePermission('device.configure'), (req, res) => {
  res.json({ items: integrations, total: integrations.length, nextCursor: null });
});

router.post('/device-integrations', requireSite(false), requirePermission('device.configure', 'DO'), (req, res) => {
  const newInt = {
    deviceIntegrationId: integrations.length + 1,
    integrationKind: req.body.integrationKind || 'ANPR',
    lane: req.body.lane || 'Main Gate In 1',
    vendor: req.body.vendor || 'Hikvision',
    model: req.body.model || 'iDS-TCM403',
    laneMode: req.body.laneMode || 'ASSISTED',
    isActive: true,
    health: 'OK',
    ...req.body
  };
  integrations.push(newInt as any);
  res.status(201).json(newInt);
});

router.get('/device-integrations/:deviceIntegrationId', requireSite(false), requirePermission('device.configure'), (req, res) => {
  const item = integrations.find(i => String(i.deviceIntegrationId) === req.params.deviceIntegrationId);
  if (!item) return res.status(404).json({ error: 'Device integration not found' });
  res.json(item);
});

router.patch('/device-integrations/:deviceIntegrationId', requireSite(false), requirePermission('device.configure', 'DO'), (req, res) => {
  const item = integrations.find(i => String(i.deviceIntegrationId) === req.params.deviceIntegrationId);
  if (!item) return res.status(404).json({ error: 'Device integration not found' });
  Object.assign(item, req.body);
  res.json(item);
});

router.post('/device-reads:ingest', requireSite(false), (req, res) => {
  const read = {
    deviceReadId: deviceReads.length + 1,
    integrationKind: req.body.integrationKind || 'ANPR',
    payload: req.body.payload || req.body,
    status: 'INGESTED',
    capturedAt: new Date().toISOString()
  };
  deviceReads.push(read);
  res.status(201).json(read);
});

router.get('/device-reads', requireSite(false), requirePermission('device.configure'), (req, res) => {
  res.json({ items: deviceReads, total: deviceReads.length, nextCursor: null });
});

router.post('/device-reads/:deviceReadId([0-9a-zA-Z_.-]+):match', requireSite(false), requirePermission('gate.visit.checkin', 'DO'), (req, res) => {
  const read = deviceReads.find(d => String(d.deviceReadId) === req.params.deviceReadId);
  if (read) read.status = 'MATCHED';
  res.json({ success: true, deviceRead: read });
});

// ------------------------------------------------------------------ 8. EDI & Integration (Site-scoped)
router.get('/integration-messages', requireSite(false), requirePermission('integration.monitor'), (req, res) => {
  res.json({ items: integrationMessages, total: integrationMessages.length, nextCursor: null });
});

router.get('/integration-messages/:integrationMessageId', requireSite(false), requirePermission('integration.monitor'), (req, res) => {
  const m = (integrationMessages as any[]).find(x => String(x.id) === req.params.integrationMessageId || String(x.integrationMessageId) === req.params.integrationMessageId);
  if (!m) return res.status(404).json({ error: 'Integration message not found' });
  res.json(m);
});

router.post('/integration-messages/:integrationMessageId([0-9a-zA-Z_.-]+):retry', requireSite(false), requirePermission('integration.monitor', 'DO'), (req, res) => {
  const m = (integrationMessages as any[]).find(x => String(x.id) === req.params.integrationMessageId || String(x.integrationMessageId) === req.params.integrationMessageId);
  if (m) m.status = 'SENT';
  res.json({ success: true, message: m });
});

router.post('/edi/inbound/:partnerCode', requireSite(false), (req, res) => {
  res.status(202).json({
    messageId: `EDI-MSG-${Date.now()}`,
    partnerCode: req.params.partnerCode,
    status: 'QUEUED',
    receivedAt: new Date().toISOString()
  });
});

// ------------------------------------------------------------------ 9. Intelligence & Forecasting (Site-scoped)
router.get('/models', requireSite(false), requirePermission('admin.config.manage'), (req, res) => {
  res.json({ items: models, total: models.length, nextCursor: null });
});

router.post('/models/:mlModelVersionId([0-9a-zA-Z_.-]+):activate', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const mod = (models as any[]).find(m => String(m.modelId) === req.params.mlModelVersionId || m.name === req.params.mlModelVersionId);
  if (mod) mod.status = 'ACTIVE';
  res.json({ success: true, model: mod });
});

router.get(['/forecasts/dwell', '/predictions/dwell'], requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  const siteId = Number(req.query.siteId || req.siteId) || 1;
  const items = dwellPredictions(siteId);
  res.json({ items, total: items.length, nextCursor: null });
});

router.get(['/forecasts/occupancy', '/forecast/occupancy'], requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  const siteId = Number(req.query.siteId || req.siteId) || 1;
  const block = String(req.query.block || 'ALL');
  const items = occupancyForecast(siteId, block);
  res.json({ items, total: items.length, nextCursor: null });
});

router.get('/yard/suggestion-log', requireSite(false), requirePermission('yard.allocate'), (req, res) => {
  res.json({ items: suggestionLog, total: suggestionLog.length, nextCursor: null });
});

export const depthRouter = router;
