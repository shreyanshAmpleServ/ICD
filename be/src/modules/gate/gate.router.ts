import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { gates, checkpoints, visitTypes } from "../../data/admin";
import { visits } from "../../data/gate";
import { getPrisma, isDbLive } from "../../db/prisma";

const router = Router();

// ------------------------------------------------------------------ Gate Setup (Site-scoped)
router.get(
  "/gates",
  requireSite(false),
  requirePermission("masters.view"),
  async (req, res) => {
    let items: any[] = gates;
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbGates = await prisma.gates.findMany({
            include: { gate_lanes: true },
            orderBy: { gate_id: "asc" },
          });
          if (dbGates && dbGates.length > 0) {
            const mapped = dbGates.map((g) => ({
              gateId: g.gate_id,
              siteId: g.site_id,
              gateCode: g.gate_code,
              gateName: g.gate_name,
              gateKind: (g.gate_kind as any) || "OUTER",
              gateType: g.gate_kind || "ROAD",
              lanes: g.gate_lanes?.length || 2,
              isActive: g.is_active ?? true,
              logInst: 1,
            }));
            const dbIds = new Set(mapped.map((m) => m.gateId));
            items = [...mapped, ...gates.filter((g) => !dbIds.has(g.gateId!))];
          }
        } catch (err) {
          console.warn("[GateRouter] DB query error on gates:", err);
        }
      }
    }
    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/gates",
  requireSite(false),
  requirePermission("admin.gate.configure", "DO"),
  (req, res) => {
    const newGate = {
      gateId: gates.length + 1,
      siteId: 1,
      gateCode: req.body.gateCode || `GATE-${gates.length + 1}`,
      gateName: req.body.gateName || "Auxiliary Gate",
      gateType: req.body.gateType || "ROAD",
      lanes: req.body.lanes || 2,
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    gates.push(newGate as any);
    res.status(201).json(newGate);
  },
);

router.get(
  "/gates/:gateId",
  requireSite(false),
  requirePermission("masters.view"),
  (req, res) => {
    const g = gates.find(
      (x) =>
        String(x.gateId) === req.params.gateId ||
        x.gateCode === req.params.gateId,
    );
    if (!g) return res.status(404).json({ error: "Gate not found" });
    res.json(g);
  },
);

router.patch(
  "/gates/:gateId",
  requireSite(false),
  requirePermission("admin.gate.configure", "DO"),
  (req, res) => {
    const g = gates.find(
      (x) =>
        String(x.gateId) === req.params.gateId ||
        x.gateCode === req.params.gateId,
    );
    if (!g) return res.status(404).json({ error: "Gate not found" });
    Object.assign(g, req.body);
    res.json(g);
  },
);

router.get(
  "/checkpoints",
  requireSite(false),
  requirePermission("masters.view"),
  async (req, res) => {
    let items: any[] = checkpoints;
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbCps = await prisma.checkpoints.findMany({
            orderBy: { checkpoint_id: "asc" },
          });
          if (dbCps && dbCps.length > 0) {
            const mapped = dbCps.map((c, idx) => ({
              checkpointId: c.checkpoint_id,
              siteId: 1,
              checkpointCode: c.checkpoint_code,
              checkpointName: c.checkpoint_name,
              checkpointKind: (c.checkpoint_kind as any) || "OUTER_IN",
              seqNo: idx + 1,
              isActive: c.is_active ?? true,
              logInst: 1,
            }));
            const dbCodes = new Set(mapped.map((m) => m.checkpointCode));
            items = [
              ...mapped,
              ...checkpoints.filter((cp) => !dbCodes.has(cp.checkpointCode!)),
            ];
          }
        } catch (err) {
          console.warn("[GateRouter] DB query error on checkpoints:", err);
        }
      }
    }
    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/checkpoints",
  requireSite(false),
  requirePermission("admin.gate.configure", "DO"),
  (req, res) => {
    const newCp = {
      checkpointId: checkpoints.length + 1,
      siteId: 1,
      checkpointCode: req.body.checkpointCode || `CP_${checkpoints.length + 1}`,
      checkpointName: req.body.checkpointName || "New Checkpoint",
      seqNo: req.body.seqNo || checkpoints.length + 1,
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    checkpoints.push(newCp as any);
    res.status(201).json(newCp);
  },
);

router.get(
  "/checkpoints/:checkpointId",
  requireSite(false),
  requirePermission("masters.view"),
  (req, res) => {
    const cp = checkpoints.find(
      (x) =>
        String(x.checkpointId) === req.params.checkpointId ||
        x.checkpointCode === req.params.checkpointId,
    );
    if (!cp) return res.status(404).json({ error: "Checkpoint not found" });
    res.json(cp);
  },
);

router.patch(
  "/checkpoints/:checkpointId",
  requireSite(false),
  requirePermission("admin.gate.configure", "DO"),
  (req, res) => {
    const cp = checkpoints.find(
      (x) =>
        String(x.checkpointId) === req.params.checkpointId ||
        x.checkpointCode === req.params.checkpointId,
    );
    if (!cp) return res.status(404).json({ error: "Checkpoint not found" });
    Object.assign(cp, req.body);
    res.json(cp);
  },
);

router.get(
  "/visit-types",
  requireSite(false),
  requirePermission("masters.view"),
  async (req, res) => {
    let items: any[] = visitTypes;
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbVts = await prisma.visit_types.findMany({
            orderBy: { visit_type_id: "asc" },
          });
          if (dbVts && dbVts.length > 0) {
            const mapped = dbVts.map((v) => ({
              visitTypeId: v.visit_type_id,
              visitTypeCode: v.visit_code,
              visitTypeName: v.visit_name,
              direction: v.visit_code.includes("PICK") ? "OUTBOUND" : "INBOUND",
              checkpoints: [],
              isActive: v.is_active ?? true,
              logInst: 1,
            }));
            const dbCodes = new Set(mapped.map((m) => m.visitTypeCode));
            items = [
              ...mapped,
              ...visitTypes.filter((vt) => !dbCodes.has(vt.visitTypeCode!)),
            ];
          }
        } catch (err) {
          console.warn("[GateRouter] DB query error on visit-types:", err);
        }
      }
    }
    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/visit-types",
  requireSite(false),
  requirePermission("admin.gate.configure", "DO"),
  (req, res) => {
    const newVt = {
      visitTypeId: visitTypes.length + 1,
      visitTypeCode: req.body.visitTypeCode || `VT_${visitTypes.length + 1}`,
      visitTypeName: req.body.visitTypeName || "Custom Visit Type",
      direction: req.body.direction || "INBOUND",
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    visitTypes.push(newVt as any);
    res.status(201).json(newVt);
  },
);

router.get(
  "/visit-types/:visitTypeId",
  requireSite(false),
  requirePermission("masters.view"),
  (req, res) => {
    const vt = visitTypes.find(
      (x) =>
        String(x.visitTypeId) === req.params.visitTypeId ||
        x.visitTypeCode === req.params.visitTypeId,
    );
    if (!vt) return res.status(404).json({ error: "Visit type not found" });
    res.json(vt);
  },
);

router.patch(
  "/visit-types/:visitTypeId",
  requireSite(false),
  requirePermission("admin.gate.configure", "DO"),
  (req, res) => {
    const vt = visitTypes.find(
      (x) =>
        String(x.visitTypeId) === req.params.visitTypeId ||
        x.visitTypeCode === req.params.visitTypeId,
    );
    if (!vt) return res.status(404).json({ error: "Visit type not found" });
    Object.assign(vt, req.body);
    res.json(vt);
  },
);

// ------------------------------------------------------------------ Truck Visits (Site-scoped)
router.get(
  ["/truck-visits", "/gate/visits"],
  requireSite(false),
  requirePermission("gate.visit.checkin"),
  async (req, res) => {
    const { status, plateNo, visitTypeCode } = req.query;
    let items: any[] = visits;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbVisits = await prisma.truck_visits.findMany({
            include: {
              trucks: true,
              drivers: true,
              parties: true,
              gates: true,
              gate_lanes: true,
              visit_types: true,
              truck_visit_units: {
                include: {
                  unit_stays: true,
                },
              },
            },
            orderBy: { truck_visit_id: "desc" },
          });

          if (dbVisits && dbVisits.length > 0) {
            const mappedDbVisits = dbVisits.map((v) => {
              const arrivedDate = v.arrived_at
                ? new Date(v.arrived_at)
                : new Date();
              const waitingMin = Math.max(
                0,
                Math.round((Date.now() - arrivedDate.getTime()) / 60000),
              );
              return {
                truckVisitId: v.truck_visit_id,
                visitNo: v.visit_no,
                visitTypeCode: v.visit_types?.visit_code || "IMPORT_PICKUP",
                conveyance: "TRUCK",
                plateNo: v.trucks?.plate_no || "T 000 AAA",
                driverName: v.drivers?.driver_name || "Driver",
                transporter:
                  v.parties?.party_name ||
                  v.parties?.short_name ||
                  "Dar Trucking Transporters Ltd",
                status: v.status || "ADMITTED",
                currentSeqNo: 1,
                nextCheckpointCode:
                  v.status === "ADMITTED" ? "INNER_IN" : "OUTER_IN",
                arrivedAt:
                  v.arrived_at?.toISOString() || new Date().toISOString(),
                waitingMin,
                lane: v.gate_lanes?.lane_code || "In 1",
                units: (v.truck_visit_units || []).map((u) => ({
                  visitUnitTxnId: u.truck_visit_unit_id,
                  unitStayId: u.unit_stay_id,
                  unitNo: u.unit_stays?.unit_no || "MSKU 882014 9",
                  direction: u.direction || "PICK",
                  status: u.status || "IN_PROGRESS",
                  sealExpected: u.seal_no || undefined,
                })),
                checkpoints: [],
                logInst: 1,
              };
            });

            const dbIds = new Set(mappedDbVisits.map((m) => m.truckVisitId));
            items = [
              ...mappedDbVisits,
              ...visits.filter((v) => !dbIds.has(v.truckVisitId!)),
            ];
          }
        } catch (err) {
          console.warn("[GateRouter] DB query error on truck-visits:", err);
        }
      }
    }

    if (status) {
      items = items.filter((v) => v.status === status);
    }
    if (plateNo) {
      items = items.filter((v) =>
        v.plateNo?.toLowerCase().includes(String(plateNo).toLowerCase()),
      );
    }
    if (visitTypeCode) {
      items = items.filter((v) => v.visitTypeCode === visitTypeCode);
    }
    res.json({ items, nextCursor: null, total: items.length });
  },
);

router.post(
  "/truck-visits",
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  async (req, res) => {
    let createdVisit: any = null;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          // 1. Truck
          let truckId = req.body.truckId ? Number(req.body.truckId) : null;
          if (!truckId && req.body.plateNo) {
            let tr = await prisma.trucks.findFirst({
              where: { plate_no: req.body.plateNo },
            });
            if (!tr) {
              tr = await prisma.trucks.create({
                data: {
                  plate_no: req.body.plateNo,
                  vehicle_kind: "TRUCK",
                  country_code: "TZ",
                  is_active: true,
                },
              });
            }
            truckId = tr.truck_id;
          }

          // 2. Driver
          let driverId = req.body.driverId ? Number(req.body.driverId) : null;
          if (!driverId && req.body.driverName) {
            let dr = await prisma.drivers.findFirst({
              where: {
                OR: [
                  { driver_name: req.body.driverName },
                  ...(req.body.driverLicence
                    ? [{ licence_no: req.body.driverLicence }]
                    : []),
                ],
              },
            });
            if (!dr) {
              dr = await prisma.drivers.create({
                data: {
                  driver_name: req.body.driverName,
                  licence_no:
                    req.body.driverLicence ||
                    `DL-${Date.now().toString().slice(-6)}`,
                  phone: req.body.driverPhone || "+255 700 000000",
                  is_active: true,
                },
              });
            }
            driverId = dr.driver_id;
          }

          // 3. Visit Type
          let vt = await prisma.visit_types.findFirst({
            where: { visit_code: req.body.visitTypeCode || "IMPORT_PICKUP" },
          });
          const visitTypeId = vt?.visit_type_id || 1;

          // 4. Gate & Lane
          let lane = await prisma.gate_lanes.findFirst({
            where: { is_active: true },
          });
          const gateLaneId = lane?.gate_lane_id || 1;
          const gateId = lane?.gate_id || 1;

          const count = await prisma.truck_visits.count();
          const visitNo =
            req.body.visitNo || `TV-26-${String(count + 1).padStart(5, "0")}`;

          const dbCreated = await prisma.truck_visits.create({
            data: {
              site_id: 1,
              visit_no: visitNo,
              visit_type_id: visitTypeId,
              truck_id: truckId,
              driver_id: driverId,
              transporter_party_id: req.body.transporterPartyId
                ? Number(req.body.transporterPartyId)
                : null,
              gate_id: gateId,
              gate_lane_id: gateLaneId,
              status: req.body.status || "AT_OUTER_GATE",
              arrived_at: new Date(),
            },
            include: {
              trucks: true,
              drivers: true,
              parties: true,
              gate_lanes: true,
              visit_types: true,
            },
          });

          // 5. Units if provided
          const createdUnits: any[] = [];
          if (Array.isArray(req.body.units) && req.body.units.length > 0) {
            for (const u of req.body.units) {
              try {
                let stayId = u.unitStayId ? Number(u.unitStayId) : null;
                if (!stayId && u.unitNo) {
                  const stay = await prisma.unit_stays.findFirst({
                    where: { unit_no: u.unitNo },
                  });
                  stayId = stay?.unit_stay_id || null;
                }
                if (stayId) {
                  const tvUnit = await prisma.truck_visit_units.create({
                    data: {
                      truck_visit_id: dbCreated.truck_visit_id,
                      unit_stay_id: stayId,
                      direction: u.direction || "PICK",
                      status: "PLANNED",
                      seal_no: u.sealExpected || null,
                    },
                    include: { unit_stays: true },
                  });
                  createdUnits.push({
                    visitUnitTxnId: tvUnit.truck_visit_unit_id,
                    unitStayId: tvUnit.unit_stay_id,
                    unitNo: tvUnit.unit_stays?.unit_no || u.unitNo,
                    direction: tvUnit.direction,
                    status: tvUnit.status,
                    sealExpected: tvUnit.seal_no || undefined,
                  });
                }
              } catch (uErr) {
                console.warn(
                  "[GateRouter] Error attaching unit to new visit:",
                  uErr,
                );
              }
            }
          }

          createdVisit = {
            truckVisitId: dbCreated.truck_visit_id,
            visitNo: dbCreated.visit_no,
            visitTypeCode:
              dbCreated.visit_types?.visit_code ||
              req.body.visitTypeCode ||
              "IMPORT_PICKUP",
            conveyance: "TRUCK",
            plateNo:
              dbCreated.trucks?.plate_no || req.body.plateNo || "T 000 AAA",
            driverName:
              dbCreated.drivers?.driver_name || req.body.driverName || "Driver",
            driverLicence: dbCreated.drivers?.licence_no,
            driverPhone: dbCreated.drivers?.phone,
            transporter:
              dbCreated.parties?.party_name ||
              req.body.transporter ||
              "Independent",
            status: dbCreated.status,
            currentSeqNo: 0,
            nextCheckpointCode: "OUTER_IN",
            arrivedAt:
              dbCreated.arrived_at?.toISOString() || new Date().toISOString(),
            waitingMin: 0,
            lane: dbCreated.gate_lanes?.lane_code || req.body.lane || "In 1",
            units:
              createdUnits.length > 0 ? createdUnits : req.body.units || [],
            checkpoints: [],
            logInst: 1,
          };
        } catch (err) {
          console.warn("[GateRouter] DB error creating truck visit:", err);
        }
      }
    }

    const newV = createdVisit || {
      truckVisitId: visits.length + 4501,
      visitNo: `TV-26-${String(visits.length + 4501).padStart(5, "0")}`,
      visitTypeCode: req.body.visitTypeCode || "IMPORT_PICKUP",
      conveyance: "TRUCK" as const,
      plateNo: req.body.plateNo || "T 000 AAA",
      driverName: req.body.driverName || "Driver",
      transporter: req.body.transporter || "Independent",
      status: "AT_OUTER_GATE" as const,
      currentSeqNo: 0,
      nextCheckpointCode: "OUTER_IN",
      arrivedAt: new Date().toISOString(),
      waitingMin: 0,
      lane: req.body.lane || "In 1",
      units: req.body.units || [],
      checkpoints: [],
      logInst: 1,
      ...req.body,
    };

    visits.unshift(newV);
    res.status(201).json(newV);
  },
);

// ------------------------------------------------------------------ Truck Visit Details
router.get(
  ["/truck-visits/:truckVisitId", "/gate/visits/:truckVisitId"],
  requireSite(false),
  requirePermission("gate.visit.checkin"),
  async (req, res) => {
    const param = req.params.truckVisitId;
    const numId = parseInt(param, 10);

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbV = await prisma.truck_visits.findFirst({
            where: {
              OR: [
                ...(isNaN(numId) ? [] : [{ truck_visit_id: numId }]),
                { visit_no: param },
              ],
            },
            include: {
              trucks: true,
              drivers: true,
              parties: true,
              gates: true,
              gate_lanes: true,
              visit_types: true,
              truck_visit_units: {
                include: {
                  unit_stays: true,
                },
              },
            },
          });

          if (dbV) {
            const arrivedDate = dbV.arrived_at
              ? new Date(dbV.arrived_at)
              : new Date();
            const waitingMin = Math.max(
              0,
              Math.round((Date.now() - arrivedDate.getTime()) / 60000),
            );
            return res.json({
              truckVisitId: dbV.truck_visit_id,
              visitNo: dbV.visit_no,
              visitTypeCode: dbV.visit_types?.visit_code || "IMPORT_PICKUP",
              conveyance: "TRUCK",
              plateNo: dbV.trucks?.plate_no || "T 000 AAA",
              driverName: dbV.drivers?.driver_name || "Driver",
              transporter:
                dbV.parties?.party_name ||
                dbV.parties?.short_name ||
                "Dar Trucking Transporters Ltd",
              status: dbV.status || "ADMITTED",
              currentSeqNo: 1,
              nextCheckpointCode:
                dbV.status === "ADMITTED" ? "INNER_IN" : "OUTER_IN",
              arrivedAt:
                dbV.arrived_at?.toISOString() || new Date().toISOString(),
              waitingMin,
              lane: dbV.gate_lanes?.lane_code || "In 1",
              units: (dbV.truck_visit_units || []).map((u) => ({
                visitUnitTxnId: u.truck_visit_unit_id,
                unitStayId: u.unit_stay_id,
                unitNo: u.unit_stays?.unit_no || "MSKU 882014 9",
                direction: u.direction || "PICK",
                status: u.status || "IN_PROGRESS",
                sealExpected: u.seal_no || undefined,
              })),
              checkpoints: [],
              logInst: 1,
            });
          }
        } catch (err) {
          console.warn(
            "[GateRouter] DB query error on truck visit detail:",
            err,
          );
        }
      }
    }

    const v = visits.find(
      (x) => String(x.truckVisitId) === param || x.visitNo === param,
    );
    if (!v) return res.status(404).json({ error: "Truck visit not found" });
    res.json(v);
  },
);

router.get(
  "/gate-passes/:passToken",
  requireSite(false),
  requirePermission("gate.visit.checkin"),
  (req, res) => {
    const v = visits.find(
      (x) =>
        (x as any).gatePassNo === req.params.passToken ||
        String(x.truckVisitId) === req.params.passToken,
    );
    res.json({
      passToken: req.params.passToken,
      truckVisitId: v?.truckVisitId || 4414,
      gatePassNo:
        (v as any)?.gatePassNo || `GP-26-${req.params.passToken.slice(0, 5)}`,
      plateNo: v?.plateNo || "T 230 DLX",
      driverName: v?.driverName || "Elia Mrema",
      issuedAt: new Date().toISOString(),
      isValid: true,
      units: v?.units || [],
    });
  },
);

router.get(
  "/truck-visits/:truckVisitId/checkpoint-events",
  requireSite(false),
  requirePermission("gate.visit.checkin"),
  (req, res) => {
    const v = visits.find(
      (x) => String(x.truckVisitId) === req.params.truckVisitId,
    );
    if (!v) return res.status(404).json({ error: "Truck visit not found" });
    res.json({
      items: v.checkpoints || [],
      total: (v.checkpoints || []).length,
      nextCursor: null,
    });
  },
);

router.post(
  "/truck-visits/:truckVisitId/checkpoint-events",
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  (req, res) => {
    const v = visits.find(
      (x) => String(x.truckVisitId) === req.params.truckVisitId,
    );
    const event = {
      checkpointCode: req.body.checkpointCode || "INNER_IN",
      seqNo: (v?.checkpoints?.length || 0) + 1,
      result: req.body.result || "PASSED",
      failureReason: req.body.failureReason,
      occurredAt: new Date().toISOString(),
      by: req.user?.username || "Gate Officer",
      isOffline: !!req.body.isOffline,
    };
    if (v) {
      if (!(v as any).checkpoints) (v as any).checkpoints = [];
      (v as any).checkpoints.push(event as any);
    }
    res.status(201).json(event);
  },
);

router.post(
  "/truck-visits/:truckVisitId/units",
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  (req, res) => {
    const v = visits.find(
      (x) => String(x.truckVisitId) === req.params.truckVisitId,
    );
    const unit = {
      visitUnitTxnId: Date.now(),
      unitStayId: req.body.unitStayId || 5001,
      unitNo: req.body.unitNo || "MSKU 000000 0",
      direction: req.body.direction || "PICK",
      status: "PLANNED",
      sealExpected: req.body.sealExpected,
      ...req.body,
    };
    if (v) {
      if (!(v as any).units) (v as any).units = [];
      (v as any).units.push(unit);
    }
    res.status(201).json(unit);
  },
);

router.delete(
  "/truck-visits/:truckVisitId/units/:visitUnitId",
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  (req, res) => {
    const v = visits.find(
      (x) => String(x.truckVisitId) === req.params.truckVisitId,
    );
    if (v && v.units) {
      const idx = (v.units as any[]).findIndex(
        (u) =>
          String(u.visitUnitTxnId) === req.params.visitUnitId ||
          String(u.unitStayId) === req.params.visitUnitId,
      );
      if (idx >= 0) (v.units as any[]).splice(idx, 1);
    }
    res.status(204).end();
  },
);

router.post(
  "/truck-visits/:truckVisitId/units/:visitUnitId([0-9a-zA-Z_.-]+):complete",
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  (req, res) => {
    const v = visits.find(
      (x) => String(x.truckVisitId) === req.params.truckVisitId,
    );
    const unit = ((v?.units || []) as any[]).find(
      (u) =>
        String(u.visitUnitTxnId) === req.params.visitUnitId ||
        String(u.unitStayId) === req.params.visitUnitId,
    );
    if (unit) unit.status = "DONE";
    res.json({ success: true, visitUnit: unit });
  },
);

router.patch(
  ["/truck-visits/:truckVisitId", "/gate/visits/:truckVisitId"],
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  async (req, res) => {
    const param = req.params.truckVisitId;
    const numId = parseInt(param, 10);
    let updatedVisit: any = null;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma && !isNaN(numId)) {
        try {
          const dataToUpdate: any = {};
          if (req.body.status) dataToUpdate.status = req.body.status;
          if (req.body.driverId)
            dataToUpdate.driver_id = Number(req.body.driverId);
          if (req.body.truckId)
            dataToUpdate.truck_id = Number(req.body.truckId);
          if (req.body.gateLaneId)
            dataToUpdate.gate_lane_id = Number(req.body.gateLaneId);

          // If driverName was supplied, find or create driver
          if (!dataToUpdate.driver_id && req.body.driverName) {
            let dr = await prisma.drivers.findFirst({
              where: {
                OR: [
                  { driver_name: req.body.driverName },
                  ...(req.body.driverLicence
                    ? [{ licence_no: req.body.driverLicence }]
                    : []),
                ],
              },
            });
            if (!dr) {
              dr = await prisma.drivers.create({
                data: {
                  driver_name: req.body.driverName,
                  licence_no:
                    req.body.driverLicence ||
                    `DL-${Date.now().toString().slice(-6)}`,
                  phone: req.body.driverPhone || "+255 700 000000",
                  is_active: true,
                },
              });
            }
            dataToUpdate.driver_id = dr.driver_id;
          }

          if (Object.keys(dataToUpdate).length > 0) {
            const dbU = await prisma.truck_visits.update({
              where: { truck_visit_id: numId },
              data: dataToUpdate,
              include: {
                trucks: true,
                drivers: true,
                parties: true,
                gate_lanes: true,
                visit_types: true,
                truck_visit_units: { include: { unit_stays: true } },
              },
            });
            if (dbU) {
              updatedVisit = {
                truckVisitId: dbU.truck_visit_id,
                visitNo: dbU.visit_no,
                visitTypeCode: dbU.visit_types?.visit_code || "IMPORT_PICKUP",
                plateNo: dbU.trucks?.plate_no || "T 000 AAA",
                driverName: dbU.drivers?.driver_name || "Driver",
                driverLicence: dbU.drivers?.licence_no,
                driverPhone: dbU.drivers?.phone,
                transporter: dbU.parties?.party_name || "Independent",
                status: dbU.status,
                currentSeqNo: 1,
                nextCheckpointCode:
                  dbU.status === "ADMITTED" ? "INNER_IN" : "OUTER_IN",
                lane: dbU.gate_lanes?.lane_code || "In 1",
                units: (dbU.truck_visit_units || []).map((u) => ({
                  visitUnitTxnId: u.truck_visit_unit_id,
                  unitStayId: u.unit_stay_id,
                  unitNo: u.unit_stays?.unit_no || "MSKU 882014 9",
                  direction: u.direction || "PICK",
                  status: u.status || "IN_PROGRESS",
                  sealExpected: u.seal_no || undefined,
                })),
              };
            }
          }
        } catch (err) {
          console.warn(
            "[GateRouter] DB update error on truck visit patch:",
            err,
          );
        }
      }
    }

    const v = visits.find(
      (x) => String(x.truckVisitId) === param || x.visitNo === param,
    );
    if (v) {
      Object.assign(v, req.body);
      if (!updatedVisit) updatedVisit = v;
    }
    res.json(updatedVisit || { success: true });
  },
);

router.post(
  ["/truck-visits/:truckVisitId/driver", "/gate/visits/:truckVisitId/driver"],
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  async (req, res) => {
    const param = req.params.truckVisitId;
    const numId = parseInt(param, 10);
    const { driverId, driverName, licenceNo, phone } = req.body;
    let finalDriverId = driverId ? Number(driverId) : null;
    let finalDriverName = driverName;
    let finalLicence = licenceNo;
    let finalPhone = phone;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          if (finalDriverId) {
            const dr = await prisma.drivers.findUnique({
              where: { driver_id: finalDriverId },
            });
            if (dr) {
              finalDriverName = dr.driver_name;
              finalLicence = dr.licence_no;
              finalPhone = dr.phone || finalPhone;
            }
          } else if (driverName) {
            let dr = await prisma.drivers.findFirst({
              where: {
                OR: [
                  { driver_name: driverName },
                  ...(licenceNo ? [{ licence_no: licenceNo }] : []),
                ],
              },
            });
            if (!dr) {
              dr = await prisma.drivers.create({
                data: {
                  driver_name: driverName,
                  licence_no:
                    licenceNo || `DL-${Date.now().toString().slice(-6)}`,
                  phone: phone || "+255 700 000000",
                  is_active: true,
                },
              });
            }
            finalDriverId = dr.driver_id;
            finalDriverName = dr.driver_name;
            finalLicence = dr.licence_no;
            finalPhone = dr.phone;
          }

          if (finalDriverId && !isNaN(numId)) {
            await prisma.truck_visits.update({
              where: { truck_visit_id: numId },
              data: { driver_id: finalDriverId },
            });
          }
        } catch (err) {
          console.warn("[GateRouter] Error assigning driver to visit:", err);
        }
      }
    }

    const v = visits.find(
      (x) => String(x.truckVisitId) === param || x.visitNo === param,
    );
    if (v) {
      if (finalDriverName) (v as any).driverName = finalDriverName;
      if (finalLicence) (v as any).driverLicence = finalLicence;
    }
    res.json({
      success: true,
      driverId: finalDriverId,
      driverName: finalDriverName,
      driverLicence: finalLicence,
      driverPhone: finalPhone,
    });
  },
);

router.post(
  [
    "/truck-visits/:truckVisitId/turn-back",
    "/truck-visits/:truckVisitId/cancel",
    "/truck-visits/:truckVisitId([0-9a-zA-Z_.-]+):turn-back",
    "/truck-visits/:truckVisitId([0-9a-zA-Z_.-]+):cancel",
  ],
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  async (req, res) => {
    const param = req.params.truckVisitId;
    const numId = parseInt(param, 10);
    const reason =
      req.body?.reason || req.body?.failureReason || "Checks failed at gate";

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma && !isNaN(numId)) {
        try {
          await prisma.truck_visits.update({
            where: { truck_visit_id: numId },
            data: { status: "CANCELLED" },
          });
        } catch (err) {
          console.warn(
            "[GateRouter] DB update error on cancel/turn-back:",
            err,
          );
        }
      }
    }
    const v = visits.find(
      (x) => String(x.truckVisitId) === param || x.visitNo === param,
    );
    if (v) {
      (v as any).status = "TURNED_BACK";
      (v as any).blockedReason = reason;
    }
    res.json({ success: true, visit: v, reason });
  },
);

router.post(
  [
    "/truck-visits/:truckVisitId/override-request",
    "/truck-visits/:truckVisitId([0-9a-zA-Z_.-]+):override-request",
  ],
  requireSite(false),
  requirePermission("gate.checkout.override", "DO"),
  async (req, res) => {
    const param = req.params.truckVisitId;
    const numId = parseInt(param, 10);
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma && !isNaN(numId)) {
        try {
          await prisma.truck_visits.update({
            where: { truck_visit_id: numId },
            data: { status: "HELD" },
          });
        } catch (err) {
          console.warn(
            "[GateRouter] DB update error on override-request:",
            err,
          );
        }
      }
    }
    const v = visits.find(
      (x) => String(x.truckVisitId) === param || x.visitNo === param,
    );
    if (v) {
      (v as any).status = "HELD";
      (v as any).blockedReason =
        req.body?.reason || "Override requested from Operations Manager";
    }
    res.json({
      success: true,
      message: "Override request recorded for Duty Manager decision",
    });
  },
);

// Printing gate pass
router.post(
  [
    "/truck-visits/:truckVisitId/gate-pass:print",
    "/truck-visits/:truckVisitId([0-9a-zA-Z_.-]+)/gate-pass:print",
  ],
  requireSite(false),
  requirePermission("gate.pass.print", "DO"),
  (req, res) => {
    const v = visits.find(
      (x) => String(x.truckVisitId) === req.params.truckVisitId,
    );
    const gatePassNo =
      (v as any)?.gatePassNo || `GP-26-${String(Date.now()).slice(-5)}`;
    res.json({
      gatePassNo,
      truckVisitId: v?.truckVisitId || req.params.truckVisitId,
      printedAt: new Date().toISOString(),
      reprintCount: 0,
      status: "PRINTED",
    });
  },
);

// Check-in and Checkout operations
router.post(
  [
    "/truck-visits/:truckVisitId:checkin",
    "/truck-visits/:truckVisitId([0-9a-zA-Z_.-]+):checkin",
  ],
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  async (req, res) => {
    const param = req.params.truckVisitId;
    const numId = parseInt(param, 10);
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma && !isNaN(numId)) {
        try {
          await prisma.truck_visits.update({
            where: { truck_visit_id: numId },
            data: { status: "ADMITTED" },
          });
        } catch (err) {
          console.warn("[GateRouter] DB update error on checkin:", err);
        }
      }
    }
    const v = visits.find(
      (x) => String(x.truckVisitId) === param || x.visitNo === param,
    );
    if (v) {
      (v as any).status = "ADMITTED";
      (v as any).admittedAt = new Date().toISOString();
      (v as any).currentSeqNo = 1;
      (v as any).nextCheckpointCode = "INNER_IN";
    }
    res.json({ success: true, visit: v });
  },
);

router.post(
  [
    "/truck-visits/:truckVisitId:checkout",
    "/truck-visits/:truckVisitId([0-9a-zA-Z_.-]+):checkout",
  ],
  requireSite(false),
  requirePermission("gate.visit.checkout", "DO"),
  async (req, res) => {
    const param = req.params.truckVisitId;
    const numId = parseInt(param, 10);
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma && !isNaN(numId)) {
        try {
          await prisma.truck_visits.update({
            where: { truck_visit_id: numId },
            data: { status: "EXITED", departed_at: new Date() },
          });
        } catch (err) {
          console.warn("[GateRouter] DB update error on checkout:", err);
        }
      }
    }
    const v = visits.find(
      (x) => String(x.truckVisitId) === param || x.visitNo === param,
    );
    if (v) {
      (v as any).status = "EXITED";
      (v as any).exitedAt = new Date().toISOString();
      (v as any).currentSeqNo = 4;
    }
    res.json({ success: true, visit: v });
  },
);

router.post(
  [
    "/truck-visits/:truckVisitId:override-checkout",
    "/truck-visits/:truckVisitId([0-9a-zA-Z_.-]+):override-checkout",
  ],
  requireSite(false),
  requirePermission("gate.checkout.override", "DO"),
  async (req, res) => {
    const param = req.params.truckVisitId;
    const numId = parseInt(param, 10);
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma && !isNaN(numId)) {
        try {
          await prisma.truck_visits.update({
            where: { truck_visit_id: numId },
            data: { status: "EXITED", departed_at: new Date() },
          });
        } catch (err) {
          console.warn(
            "[GateRouter] DB update error on override checkout:",
            err,
          );
        }
      }
    }
    const v = visits.find(
      (x) => String(x.truckVisitId) === param || x.visitNo === param,
    );
    if (v) {
      (v as any).status = "EXITED";
      (v as any).exitedAt = new Date().toISOString();
    }
    res.json({
      success: true,
      visit: v,
      overrideApprovedBy: req.user?.username || "OPS_MANAGER",
    });
  },
);

router.get(
  "/gate/lanes",
  requireSite(false),
  requirePermission("masters.view"),
  (req, res) => {
    res.json({
      items: [
        {
          laneId: 1,
          laneCode: "IN-1",
          laneName: "Inbound Lane 1",
          direction: "IN",
          status: "OPEN",
          activeTruckVisitId: 1,
        },
        {
          laneId: 2,
          laneCode: "IN-2",
          laneName: "Inbound Lane 2",
          direction: "IN",
          status: "OPEN",
          activeTruckVisitId: 2,
        },
        {
          laneId: 3,
          laneCode: "OUT-1",
          laneName: "Outbound Lane 1",
          direction: "OUT",
          status: "OPEN",
          activeTruckVisitId: 3,
        },
      ],
    });
  },
);

router.post(
  "/gate/lanes/:laneId/open-barrier",
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  (req, res) => {
    res.json({
      success: true,
      message: `Barrier for lane ${req.params.laneId} opened successfully`,
    });
  },
);

export const gateRouter = router;
