import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { parties, vessels, equipment } from "../../data/core";
import { getPrisma, isDbLive } from "../../db/prisma";

const router = Router();

// In-memory trucks and drivers with active mock list
let trucks = [
  {
    truckId: 1,
    plateNo: "T 124 DFH",
    countryCode: "TZ",
    carrierPartyId: 7,
    carrierName: "Upepo Transporters",
    isBlacklisted: false,
    logInst: 1,
  },
  {
    truckId: 2,
    plateNo: "T 882 CZK",
    countryCode: "TZ",
    carrierPartyId: 8,
    carrierName: "Simba Haulage Co.",
    isBlacklisted: false,
    logInst: 1,
  },
  {
    truckId: 3,
    plateNo: "T 902 DMB",
    countryCode: "TZ",
    carrierPartyId: 7,
    carrierName: "Upepo Transporters",
    isBlacklisted: false,
    logInst: 1,
  },
];

let drivers = [
  {
    driverId: 1,
    licenceNo: "DL-TZ-98214",
    fullName: "Juma Ramadhani",
    phone: "+255 71 345 6789",
    isBlacklisted: false,
    logInst: 1,
  },
  {
    driverId: 2,
    licenceNo: "DL-TZ-44102",
    fullName: "Emmanuel Mwamba",
    phone: "+255 75 901 2233",
    isBlacklisted: false,
    logInst: 1,
  },
  {
    driverId: 3,
    licenceNo: "DL-TZ-55198",
    fullName: "Salim Kassim",
    phone: "+255 78 440 1199",
    isBlacklisted: false,
    logInst: 1,
  },
];

let ports = [
  {
    portId: 1,
    portCode: "TZDAR",
    portName: "Port of Dar es Salaam",
    countryCode: "TZ",
    logInst: 1,
  },
  {
    portId: 2,
    portCode: "KEMBA",
    portName: "Port of Mombasa",
    countryCode: "KE",
    logInst: 1,
  },
  {
    portId: 3,
    portCode: "ZADUR",
    portName: "Port of Durban",
    countryCode: "ZA",
    logInst: 1,
  },
];

let commodities = [
  {
    commodityId: 1,
    commodityCode: "TILES",
    description: "Ceramic floor tiles",
    isHazardous: false,
    hsCode: "6907.21",
    logInst: 1,
  },
  {
    commodityId: 2,
    commodityCode: "CABLES",
    description: "Copper cable drums",
    isHazardous: false,
    hsCode: "8544.49",
    logInst: 1,
  },
  {
    commodityId: 3,
    commodityCode: "CHEMICALS",
    description: "Industrial cement additives (DG Class 8)",
    isHazardous: true,
    unNo: "1760",
    hsCode: "3824.40",
    logInst: 1,
  },
  {
    commodityId: 4,
    commodityCode: "VEHICLES",
    description: "Used motor vehicles",
    isHazardous: false,
    hsCode: "8703.23",
    logInst: 1,
  },
];

const partyContacts: Record<string, any[]> = {
  "1": [
    {
      contactId: 1,
      fullName: "Maersk Desk",
      role: "OPERATIONS",
      email: "tz.import@maersk.com",
      phone: "+255 22 211 0000",
    },
  ],
};

// Parties domain moved to v1/routes/parties.routes.ts

// ------------------------------------------------------------------ Trucks (Global 🌐)
router.get(
  "/trucks",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    const { plateNo, q } = req.query;
    let items: any[] = [];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbTrucks = await prisma.m_truck.findMany({
            include: { m_party: true },
            orderBy: { truck_id: "desc" },
          });
          if (dbTrucks && dbTrucks.length > 0) {
            items = dbTrucks.map((t) => ({
              truckId: t.truck_id,
              plateNo: t.plate_no,
              plateDisplay: t.plate_display || t.plate_no,
              countryCode: t.country_code || "TZ",
              transporterPartyId: t.transporter_party_id,
              carrierPartyId: t.transporter_party_id,
              carrierName: t.m_party?.party_name || "Independent Haulier",
              vehicleKind: t.vehicle_kind || "TRUCK",
              makeModel: t.make_model || "Standard Hauler",
              axleCount: t.axle_count || 3,
              tareKg: t.tare_kg || 9000,
              source: t.source,
              syncStatus: t.sync_status,
              isBlacklisted: !t.is_active,
              isActive: t.is_active,
              logInst: t.log_inst,
            }));
          }
        } catch (err: any) {
          console.warn("[MastersRouter] DB query error on trucks:", err.message);
        }
      }
    }

    if (!items.length) {
      items = trucks;
    }

    const search = String(plateNo || q || "").toLowerCase().trim();
    if (search) {
      items = items.filter(
        (t) =>
          t.plateNo?.toLowerCase().includes(search) ||
          t.plateDisplay?.toLowerCase().includes(search) ||
          t.carrierName?.toLowerCase().includes(search)
      );
    }
    res.json({ items, nextCursor: null, total: items.length });
  }
);

router.post(
  "/trucks",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  async (req, res) => {
    const { plateNo, plateDisplay, countryCode, carrierPartyId, transporterPartyId, carrierName, makeModel, axleCount, tareKg, vehicleKind } = req.body;
    const effPartyId = carrierPartyId || transporterPartyId || null;
    const cleanPlate = (plateNo || `T ${Math.floor(100 + Math.random() * 900)} ABC`).replace(/\s/g, '').toUpperCase();
    const displayPlate = plateDisplay || plateNo || cleanPlate;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.m_truck.create({
            data: {
              plate_no: cleanPlate,
              plate_display: displayPlate,
              country_code: countryCode || "TZ",
              transporter_party_id: effPartyId ? Number(effPartyId) : null,
              make_model: makeModel || null,
              axle_count: axleCount ? Number(axleCount) : 3,
              tare_kg: tareKg ? Number(tareKg) : 9000,
              vehicle_kind: vehicleKind === 'TRAILER' ? 'TRAILER' : 'TRUCK',
              source: 'LOCAL',
              sync_status: 'SYNCED',
              is_active: true,
              createdby: 'system',
            },
            include: { m_party: true },
          });
          const mapped = {
            truckId: created.truck_id,
            plateNo: created.plate_no,
            plateDisplay: created.plate_display,
            countryCode: created.country_code || "TZ",
            transporterPartyId: created.transporter_party_id,
            carrierPartyId: created.transporter_party_id,
            carrierName: created.m_party?.party_name || carrierName || "Independent Haulier",
            vehicleKind: created.vehicle_kind,
            makeModel: created.make_model,
            axleCount: created.axle_count,
            tareKg: created.tare_kg,
            isBlacklisted: false,
            logInst: 1,
          };
          return res.status(201).json(mapped);
        } catch (err: any) {
          console.warn("[MastersRouter] DB insert error on truck:", err.message);
        }
      }
    }

    const newT = {
      truckId: trucks.length + 1,
      plateNo: cleanPlate,
      plateDisplay: displayPlate,
      countryCode: countryCode || "TZ",
      transporterPartyId: effPartyId || 7,
      carrierPartyId: effPartyId || 7,
      carrierName: carrierName || "Independent Haulier",
      vehicleKind: vehicleKind || "TRUCK",
      isBlacklisted: false,
      logInst: 1,
      ...req.body,
    };
    trucks.push(newT);
    res.status(201).json(newT);
  }
);

router.get(
  "/trucks/:truckId",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    const id = Number(req.params.truckId);
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const t = await prisma.m_truck.findFirst({
            where: Number.isFinite(id)
              ? { OR: [{ truck_id: id }, { plate_no: req.params.truckId }] }
              : { plate_no: req.params.truckId },
            include: { m_party: true },
          });
          if (t) {
            return res.json({
              truckId: t.truck_id,
              plateNo: t.plate_no,
              plateDisplay: t.plate_display,
              countryCode: t.country_code,
              transporterPartyId: t.transporter_party_id,
              carrierName: t.m_party?.party_name,
              vehicleKind: t.vehicle_kind,
              makeModel: t.make_model,
              axleCount: t.axle_count,
              tareKg: t.tare_kg,
              isActive: t.is_active,
              logInst: t.log_inst,
            });
          }
        } catch (err: any) {
          console.warn("[MastersRouter] DB query error on truck:", err.message);
        }
      }
    }

    const t = trucks.find(
      (x) => String(x.truckId) === req.params.truckId || x.plateNo === req.params.truckId
    );
    if (!t) return res.status(404).json({ error: "Truck not found" });
    res.json(t);
  }
);

router.patch(
  "/trucks/:truckId",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  async (req, res) => {
    const id = Number(req.params.truckId);
    if (isDbLive() && Number.isFinite(id)) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const updated = await prisma.m_truck.update({
            where: { truck_id: id },
            data: {
              ...(req.body.makeModel !== undefined ? { make_model: req.body.makeModel } : {}),
              ...(req.body.tareKg !== undefined ? { tare_kg: Number(req.body.tareKg) } : {}),
              ...(req.body.axleCount !== undefined ? { axle_count: Number(req.body.axleCount) } : {}),
              ...(req.body.isActive !== undefined ? { is_active: Boolean(req.body.isActive) } : {}),
            },
            include: { m_party: true },
          });
          return res.json({
            truckId: updated.truck_id,
            plateNo: updated.plate_no,
            plateDisplay: updated.plate_display,
            countryCode: updated.country_code,
            transporterPartyId: updated.transporter_party_id,
            carrierName: updated.m_party?.party_name,
            vehicleKind: updated.vehicle_kind,
            makeModel: updated.make_model,
            axleCount: updated.axle_count,
            tareKg: updated.tare_kg,
            isActive: updated.is_active,
            logInst: updated.log_inst,
          });
        } catch (err: any) {
          console.warn("[MastersRouter] DB update error on truck:", err.message);
        }
      }
    }

    const t = trucks.find(
      (x) => String(x.truckId) === req.params.truckId || x.plateNo === req.params.truckId
    );
    if (!t) return res.status(404).json({ error: "Truck not found" });
    Object.assign(t, req.body, { logInst: (t.logInst || 1) + 1 });
    res.json(t);
  }
);

// ------------------------------------------------------------------ Drivers (Global 🌐)
router.get(
  "/drivers",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    const { licenceNo, name, q } = req.query;
    let items: any[] = [];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbDrivers = await prisma.m_driver.findMany({
            include: { m_party: true },
            orderBy: { driver_id: "desc" },
          });
          if (dbDrivers && dbDrivers.length > 0) {
            items = dbDrivers.map((d) => ({
              driverId: d.driver_id,
              licenceNo: d.licence_no,
              fullName: d.driver_name,
              driverName: d.driver_name,
              licenceClass: d.licence_class || "CLASS_E",
              licenceCountry: d.licence_country || "TZ",
              licenceExpiry: d.licence_expiry ? d.licence_expiry.toISOString().split("T")[0] : null,
              phone: d.phone || "+255 70 000 0000",
              transporterPartyId: d.transporter_party_id,
              carrierPartyId: d.transporter_party_id,
              carrierName: d.m_party?.party_name || "Independent Haulier",
              isBlacklisted: !d.is_active,
              isActive: d.is_active,
              source: d.source,
              syncStatus: d.sync_status,
              logInst: d.log_inst,
            }));
          }
        } catch (err: any) {
          console.warn("[MastersRouter] DB query error on drivers:", err.message);
        }
      }
    }

    if (!items.length) {
      items = drivers;
    }

    const search = String(name || licenceNo || q || "").toLowerCase().trim();
    if (search) {
      items = items.filter(
        (d) =>
          d.fullName?.toLowerCase().includes(search) ||
          d.licenceNo?.toLowerCase().includes(search) ||
          d.carrierName?.toLowerCase().includes(search)
      );
    }
    res.json({ items, nextCursor: null, total: items.length });
  }
);

router.post(
  "/drivers",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  async (req, res) => {
    const { licenceNo, fullName, driverName, phone, transporterPartyId, carrierPartyId, licenceCountry, licenceClass, licenceExpiry } = req.body;
    const name = fullName || driverName || "New Driver";
    const lic = licenceNo || `DL-${Date.now().toString().slice(-6)}`;
    const effPartyId = transporterPartyId || carrierPartyId || null;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.m_driver.create({
            data: {
              licence_no: lic,
              driver_name: name,
              licence_country: licenceCountry || "TZ",
              licence_class: licenceClass || "CLASS_E",
              licence_expiry: licenceExpiry ? new Date(licenceExpiry) : null,
              phone: phone || null,
              transporter_party_id: effPartyId ? Number(effPartyId) : null,
              source: "LOCAL",
              sync_status: "SYNCED",
              is_active: true,
              createdby: "system",
            },
            include: { m_party: true },
          });
          const mapped = {
            driverId: created.driver_id,
            licenceNo: created.licence_no,
            fullName: created.driver_name,
            driverName: created.driver_name,
            licenceClass: created.licence_class,
            licenceCountry: created.licence_country,
            licenceExpiry: created.licence_expiry ? created.licence_expiry.toISOString().split("T")[0] : null,
            phone: created.phone || "+255 70 000 0000",
            transporterPartyId: created.transporter_party_id,
            carrierPartyId: created.transporter_party_id,
            carrierName: created.m_party?.party_name || "Independent Haulier",
            isBlacklisted: false,
            logInst: 1,
          };
          return res.status(201).json(mapped);
        } catch (err: any) {
          console.warn("[MastersRouter] DB insert error on driver:", err.message);
        }
      }
    }

    const newD = {
      driverId: drivers.length + 1,
      licenceNo: lic,
      fullName: name,
      driverName: name,
      phone: phone || "+255 70 000 0000",
      carrierPartyId: effPartyId || 7,
      transporterPartyId: effPartyId || 7,
      carrierName: "Independent Haulier",
      isBlacklisted: false,
      logInst: 1,
      ...req.body,
    };
    drivers.push(newD);
    res.status(201).json(newD);
  }
);

router.get(
  "/drivers/:driverId",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    const id = Number(req.params.driverId);
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const d = await prisma.m_driver.findFirst({
            where: Number.isFinite(id)
              ? { OR: [{ driver_id: id }, { licence_no: req.params.driverId }] }
              : { licence_no: req.params.driverId },
            include: { m_party: true },
          });
          if (d) {
            return res.json({
              driverId: d.driver_id,
              licenceNo: d.licence_no,
              fullName: d.driver_name,
              driverName: d.driver_name,
              licenceClass: d.licence_class,
              licenceCountry: d.licence_country,
              licenceExpiry: d.licence_expiry ? d.licence_expiry.toISOString().split("T")[0] : null,
              phone: d.phone,
              transporterPartyId: d.transporter_party_id,
              carrierName: d.m_party?.party_name,
              isActive: d.is_active,
              logInst: d.log_inst,
            });
          }
        } catch (err: any) {
          console.warn("[MastersRouter] DB query error on driver:", err.message);
        }
      }
    }

    const d = drivers.find(
      (x) => String(x.driverId) === req.params.driverId || x.licenceNo === req.params.driverId
    );
    if (!d) return res.status(404).json({ error: "Driver not found" });
    res.json(d);
  }
);

router.patch(
  "/drivers/:driverId",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  async (req, res) => {
    const id = Number(req.params.driverId);
    if (isDbLive() && Number.isFinite(id)) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const updated = await prisma.m_driver.update({
            where: { driver_id: id },
            data: {
              ...(req.body.phone !== undefined ? { phone: req.body.phone } : {}),
              ...(req.body.licenceExpiry ? { licence_expiry: new Date(req.body.licenceExpiry) } : {}),
              ...(req.body.isActive !== undefined ? { is_active: Boolean(req.body.isActive) } : {}),
            },
            include: { m_party: true },
          });
          return res.json({
            driverId: updated.driver_id,
            licenceNo: updated.licence_no,
            fullName: updated.driver_name,
            driverName: updated.driver_name,
            phone: updated.phone,
            licenceExpiry: updated.licence_expiry ? updated.licence_expiry.toISOString().split("T")[0] : null,
            isActive: updated.is_active,
            logInst: updated.log_inst,
          });
        } catch (err: any) {
          console.warn("[MastersRouter] DB update error on driver:", err.message);
        }
      }
    }

    const d = drivers.find(
      (x) => String(x.driverId) === req.params.driverId || x.licenceNo === req.params.driverId
    );
    if (!d) return res.status(404).json({ error: "Driver not found" });
    Object.assign(d, req.body, { logInst: (d.logInst || 1) + 1 });
    res.json(d);
  }
);

// ------------------------------------------------------------------ Vessels (Global 🌐)
router.get(
  "/vessels",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    let items: any[] = [];
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbVessels = await prisma.m_vessel.findMany({
            include: { m_party: true },
            orderBy: { vessel_id: "asc" },
          });
          if (dbVessels && dbVessels.length > 0) {
            items = dbVessels.map((v) => ({
              vesselId: v.vessel_id,
              vesselName: v.vessel_name,
              imoNo: v.imo_no || `IMO${v.vessel_id}00000`,
              lloydsNo: v.imo_no || `IMO${v.vessel_id}00000`,
              callSign: v.call_sign || "CALL-1",
              flagCountry: v.flag_country || "PA",
              countryCode: v.flag_country || "PA",
              operatorPartyId: v.operator_party_id,
              operatorName: v.m_party?.party_name || "Shipping Line Operator",
              isActive: v.is_active,
              logInst: v.log_inst,
            }));
          }
        } catch (err: any) {
          console.warn("[MastersRouter] DB query error on vessels:", err.message);
        }
      }
    }
    if (!items.length) items = vessels;
    res.json({ items, total: items.length, nextCursor: null });
  }
);

router.post(
  "/vessels",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  async (req, res) => {
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.m_vessel.create({
            data: {
              vessel_name: req.body.vesselName,
              imo_no: req.body.imoNo || req.body.lloydsNo || null,
              call_sign: req.body.callSign || null,
              flag_country: req.body.flagCountry || req.body.countryCode || null,
              operator_party_id: req.body.operatorPartyId ? Number(req.body.operatorPartyId) : null,
              is_active: true,
              createdby: "system",
            },
            include: { m_party: true },
          });
          return res.status(201).json({
            vesselId: created.vessel_id,
            vesselName: created.vessel_name,
            imoNo: created.imo_no,
            lloydsNo: created.imo_no,
            callSign: created.call_sign,
            flagCountry: created.flag_country,
            operatorPartyId: created.operator_party_id,
            operatorName: created.m_party?.party_name,
            isActive: created.is_active,
            logInst: 1,
          });
        } catch (err: any) {
          console.warn("[MastersRouter] DB insert error on vessel:", err.message);
        }
      }
    }

    const newV = {
      vesselId: vessels.length + 1,
      vesselName: req.body.vesselName,
      lloydsNo: req.body.lloydsNo || `IMO${9000000 + vessels.length}`,
      countryCode: req.body.countryCode || "PA",
      callSign: req.body.callSign || "3XYZ",
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    vessels.push(newV as any);
    res.status(201).json(newV);
  }
);

router.get(
  "/vessels/:vesselId",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    const id = Number(req.params.vesselId);
    if (isDbLive() && Number.isFinite(id)) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const v = await prisma.m_vessel.findUnique({
            where: { vessel_id: id },
            include: { m_party: true },
          });
          if (v) {
            return res.json({
              vesselId: v.vessel_id,
              vesselName: v.vessel_name,
              imoNo: v.imo_no,
              callSign: v.call_sign,
              flagCountry: v.flag_country,
              operatorPartyId: v.operator_party_id,
              operatorName: v.m_party?.party_name,
              isActive: v.is_active,
              logInst: v.log_inst,
            });
          }
        } catch (err: any) {
          console.warn("[MastersRouter] DB query error on vessel:", err.message);
        }
      }
    }

    const v = vessels.find(
      (x) => String(x.vesselId) === req.params.vesselId || x.vesselName === req.params.vesselId
    );
    if (!v) return res.status(404).json({ error: "Vessel not found" });
    res.json(v);
  }
);

router.patch(
  "/vessels/:vesselId",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  async (req, res) => {
    const id = Number(req.params.vesselId);
    if (isDbLive() && Number.isFinite(id)) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const v = await prisma.m_vessel.update({
            where: { vessel_id: id },
            data: {
              ...(req.body.callSign ? { call_sign: req.body.callSign } : {}),
              ...(req.body.isActive !== undefined ? { is_active: Boolean(req.body.isActive) } : {}),
            },
          });
          return res.json(v);
        } catch (err: any) {
          console.warn("[MastersRouter] DB update error on vessel:", err.message);
        }
      }
    }

    const v = vessels.find(
      (x) => String(x.vesselId) === req.params.vesselId || x.vesselName === req.params.vesselId
    );
    if (!v) return res.status(404).json({ error: "Vessel not found" });
    Object.assign(v, req.body);
    res.json(v);
  }
);

// ------------------------------------------------------------------ Ports (Global 🌐)
router.get(
  "/ports",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    let items: any[] = [];
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbPorts = await prisma.m_port.findMany({
            orderBy: { port_id: "asc" },
          });
          if (dbPorts && dbPorts.length > 0) {
            items = dbPorts.map((p) => ({
              portId: p.port_id,
              portCode: p.unlocode || `PORT-${p.port_id}`,
              unlocode: p.unlocode,
              portName: p.port_name,
              countryCode: p.country_code,
              portKind: p.port_kind,
              isActive: p.is_active,
              logInst: p.log_inst,
            }));
          }
        } catch (err: any) {
          console.warn("[MastersRouter] DB query error on ports:", err.message);
        }
      }
    }
    if (!items.length) items = ports;
    res.json({ items, total: items.length, nextCursor: null });
  }
);

router.post(
  "/ports",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  async (req, res) => {
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.m_port.create({
            data: {
              unlocode: req.body.unlocode || req.body.portCode || null,
              port_name: req.body.portName,
              country_code: req.body.countryCode || "TZ",
              port_kind: req.body.portKind || "SEAPORT",
              is_active: true,
              createdby: "system",
            },
          });
          return res.status(201).json({
            portId: created.port_id,
            portCode: created.unlocode,
            unlocode: created.unlocode,
            portName: created.port_name,
            countryCode: created.country_code,
            portKind: created.port_kind,
            isActive: created.is_active,
            logInst: 1,
          });
        } catch (err: any) {
          console.warn("[MastersRouter] DB insert error on port:", err.message);
        }
      }
    }

    const newP = {
      portId: ports.length + 1,
      portCode: req.body.portCode || `PORT${ports.length + 1}`,
      portName: req.body.portName,
      countryCode: req.body.countryCode || "TZ",
      logInst: 1,
      ...req.body,
    };
    ports.push(newP);
    res.status(201).json(newP);
  }
);

router.get(
  "/ports/:portId",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const p = ports.find(
      (x) => String(x.portId) === req.params.portId || x.portCode === req.params.portId
    );
    if (!p) return res.status(404).json({ error: "Port not found" });
    res.json(p);
  }
);

router.patch(
  "/ports/:portId",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const p = ports.find(
      (x) => String(x.portId) === req.params.portId || x.portCode === req.params.portId
    );
    if (!p) return res.status(404).json({ error: "Port not found" });
    Object.assign(p, req.body);
    res.json(p);
  }
);

// ------------------------------------------------------------------ Commodities (Global 🌐)
router.get(
  "/commodities",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    let items: any[] = [];
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbComms = await prisma.m_commodity.findMany({
            orderBy: { commodity_id: "asc" },
          });
          if (dbComms && dbComms.length > 0) {
            items = dbComms.map((c) => ({
              commodityId: c.commodity_id,
              commodityCode: c.commodity_code,
              commodityName: c.commodity_name,
              description: c.commodity_name,
              hsCode: c.hs_code || "0000.00",
              isHazardous: c.is_hazardous,
              isActive: c.is_active,
              logInst: c.log_inst,
            }));
          }
        } catch (err: any) {
          console.warn("[MastersRouter] DB query error on commodities:", err.message);
        }
      }
    }
    if (!items.length) items = commodities;
    res.json({ items, total: items.length, nextCursor: null });
  }
);

router.post(
  "/commodities",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  async (req, res) => {
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.m_commodity.create({
            data: {
              commodity_code: req.body.commodityCode || `COMM-${Date.now().toString().slice(-5)}`,
              commodity_name: req.body.commodityName || req.body.description || "General Goods",
              hs_code: req.body.hsCode || "0000.00",
              is_hazardous: Boolean(req.body.isHazardous),
              is_active: true,
              createdby: "system",
            },
          });
          return res.status(201).json({
            commodityId: created.commodity_id,
            commodityCode: created.commodity_code,
            commodityName: created.commodity_name,
            description: created.commodity_name,
            hsCode: created.hs_code,
            isHazardous: created.is_hazardous,
            isActive: created.is_active,
            logInst: 1,
          });
        } catch (err: any) {
          console.warn("[MastersRouter] DB insert error on commodity:", err.message);
        }
      }
    }

    const newC = {
      commodityId: commodities.length + 1,
      commodityCode: req.body.commodityCode || `COMM${commodities.length + 1}`,
      description: req.body.description,
      isHazardous: !!req.body.isHazardous,
      hsCode: req.body.hsCode || "0000.00",
      logInst: 1,
      ...req.body,
    };
    commodities.push(newC);
    res.status(201).json(newC);
  }
);

router.get(
  "/commodities/:commodityId",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const c = commodities.find(
      (x) =>
        String(x.commodityId) === req.params.commodityId ||
        x.commodityCode === req.params.commodityId
    );
    if (!c) return res.status(404).json({ error: "Commodity not found" });
    res.json(c);
  }
);

router.patch(
  "/commodities/:commodityId",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const c = commodities.find(
      (x) =>
        String(x.commodityId) === req.params.commodityId ||
        x.commodityCode === req.params.commodityId
    );
    if (!c) return res.status(404).json({ error: "Commodity not found" });
    Object.assign(c, req.body);
    res.json(c);
  }
);

// ------------------------------------------------------------------ Equipment (Site-scoped)
router.get(
  "/equipment",
  requireSite(false),
  requirePermission("masters.view"),
  async (req, res) => {
    let items: any[] = [];
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbEq = await prisma.m_equipment.findMany({
            include: { m_site: true },
            orderBy: { equipment_id: "asc" },
          });
          if (dbEq && dbEq.length > 0) {
            items = dbEq.map((e) => ({
              equipmentId: e.equipment_id,
              equipmentCode: e.equipment_code,
              equipmentName: e.equipment_name,
              equipmentType: e.equipment_type,
              capacityKg: e.capacity_kg || 45000,
              siteId: e.site_id,
              status: "AVAILABLE",
              isActive: e.is_active,
              logInst: e.log_inst,
            }));
          }
        } catch (err: any) {
          console.warn("[MastersRouter] DB query error on equipment:", err.message);
        }
      }
    }
    if (!items.length) items = equipment;
    res.json({ items, total: items.length, nextCursor: null });
  }
);

router.post(
  "/equipment",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  async (req, res) => {
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.m_equipment.create({
            data: {
              site_id: req.body.siteId ? Number(req.body.siteId) : 1,
              equipment_code: req.body.equipmentCode || `EQ-${Date.now().toString().slice(-4)}`,
              equipment_name: req.body.equipmentName || "Heavy Yard Equipment",
              equipment_type: req.body.equipmentType || "REACH_STACKER",
              capacity_kg: req.body.capacityKg ? Number(req.body.capacityKg) : 45000,
              is_active: true,
              createdby: "system",
            },
          });
          return res.status(201).json({
            equipmentId: created.equipment_id,
            equipmentCode: created.equipment_code,
            equipmentName: created.equipment_name,
            equipmentType: created.equipment_type,
            capacityKg: created.capacity_kg,
            siteId: created.site_id,
            status: "AVAILABLE",
            isActive: created.is_active,
            logInst: 1,
          });
        } catch (err: any) {
          console.warn("[MastersRouter] DB insert error on equipment:", err.message);
        }
      }
    }

    const newEq = {
      equipmentId: equipment.length + 1,
      equipmentCode: req.body.equipmentCode || `EQ-${equipment.length + 1}`,
      equipmentType: req.body.equipmentType || "REACH_STACKER",
      siteId: 1,
      status: "AVAILABLE",
      logInst: 1,
      ...req.body,
    };
    equipment.push(newEq as any);
    res.status(201).json(newEq);
  }
);

router.get(
  "/equipment/:equipmentId",
  requireSite(false),
  requirePermission("masters.view"),
  (req, res) => {
    const eq = equipment.find(
      (x) =>
        String(x.equipmentId) === req.params.equipmentId ||
        x.equipmentCode === req.params.equipmentId
    );
    if (!eq) return res.status(404).json({ error: "Equipment not found" });
    res.json(eq);
  }
);

router.patch(
  "/equipment/:equipmentId",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const eq = equipment.find(
      (x) =>
        String(x.equipmentId) === req.params.equipmentId ||
        x.equipmentCode === req.params.equipmentId
    );
    if (!eq) return res.status(404).json({ error: "Equipment not found" });
    Object.assign(eq, req.body);
    res.json(eq);
  }
);

export const mastersRouter = router;
