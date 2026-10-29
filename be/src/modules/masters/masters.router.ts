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

// ------------------------------------------------------------------ Parties (Global 🌐)
router.get(
  "/parties",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const { role, q } = req.query;
    let items = parties;
    if (role) {
      items = items.filter((p) =>
        p.roles?.includes(String(role).toUpperCase() as any),
      );
    }
    if (q) {
      const query = String(q).toLowerCase();
      items = items.filter(
        (p) =>
          p.partyName.toLowerCase().includes(query) ||
          p.partyCode.toLowerCase().includes(query),
      );
    }
    res.json({ items, nextCursor: null, total: items.length });
  },
);

router.post(
  "/parties",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  (req, res) => {
    const newP = {
      partyId: parties.length + 1,
      partyCode: req.body.partyCode || `C-LOCAL${parties.length + 1}`,
      partyName: req.body.partyName,
      roles: req.body.roles || ["CUSTOMER"],
      countryCode: req.body.countryCode || "TZ",
      city: req.body.city || "Dar es Salaam",
      creditStatus: req.body.creditStatus || "CASH",
      creditLimit: req.body.creditLimit || "0.00",
      source: "LOCAL" as const,
      syncStatus: "PROVISIONAL" as const,
      isActive: true,
      defaultCurrency: "USD",
      logInst: 1,
      ...req.body,
    };
    parties.push(newP);
    res.status(201).json(newP);
  },
);

router.get(
  "/parties/:partyId",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const p = parties.find(
      (x) =>
        String(x.partyId) === req.params.partyId ||
        x.partyCode === req.params.partyId,
    );
    if (!p) return res.status(404).json({ error: "Party not found" });
    res.json(p);
  },
);

router.patch(
  "/parties/:partyId",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  (req, res) => {
    const p = parties.find(
      (x) =>
        String(x.partyId) === req.params.partyId ||
        x.partyCode === req.params.partyId,
    );
    if (!p) return res.status(404).json({ error: "Party not found" });
    Object.assign(p, req.body, { logInst: ((p as any).logInst || 1) + 1 });
    res.json(p);
  },
);

router.post(
  "/parties:provisional",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  (req, res) => {
    const newP = {
      partyId: parties.length + 1,
      partyCode: req.body.partyCode || `PROV-${Date.now()}`,
      partyName: req.body.partyName || "Provisional Party",
      roles: req.body.roles || ["CUSTOMER"],
      source: "LOCAL" as const,
      syncStatus: "PROVISIONAL" as const,
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    parties.push(newP as any);
    res.status(201).json(newP);
  },
);

router.post(
  "/parties/:partyId([0-9a-zA-Z_.-]+):match",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  (req, res) => {
    const p = parties.find(
      (x) =>
        String(x.partyId) === req.params.partyId ||
        x.partyCode === req.params.partyId,
    );
    if (!p) return res.status(404).json({ error: "Party not found" });
    (p as any).syncStatus = "SYNCED";
    (p as any).matchedMasterPartyId = req.body.matchedMasterPartyId || 101;
    res.json({
      success: true,
      party: p,
      message: "Provisional party successfully linked to master record.",
    });
  },
);

router.get(
  "/parties/:partyId/contacts",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const contacts = partyContacts[req.params.partyId] || [
      {
        contactId: 1,
        fullName: "Operations Desk",
        role: "OPERATIONS",
        email: "ops@party.example",
        phone: "+255 22 100 200",
      },
      {
        contactId: 2,
        fullName: "Finance Desk",
        role: "FINANCE",
        email: "accounts@party.example",
        phone: "+255 22 100 201",
      },
    ];
    res.json({ items: contacts, total: contacts.length, nextCursor: null });
  },
);

router.put(
  "/parties/:partyId/contacts",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  (req, res) => {
    partyContacts[req.params.partyId] = Array.isArray(req.body)
      ? req.body
      : [req.body];
    res.json({
      items: partyContacts[req.params.partyId],
      total: partyContacts[req.params.partyId].length,
    });
  },
);

// ------------------------------------------------------------------ Trucks (Global 🌐)
router.get(
  "/trucks",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    const { plateNo } = req.query;
    let items: any[] = trucks;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbTrucks = await prisma.trucks.findMany({
            include: { parties: true },
            orderBy: { truck_id: "desc" },
          });
          if (dbTrucks && dbTrucks.length > 0) {
            const mapped = dbTrucks.map((t: any) => ({
              truckId: t.truck_id,
              plateNo: t.plate_no,
              countryCode: t.country_code || "TZ",
              carrierPartyId: t.transporter_party_id,
              carrierName:
                t.parties?.party_name ||
                t.parties?.short_name ||
                "Independent Haulier",
              isBlacklisted: false,
              logInst: 1,
            }));
            const dbPlates = new Set(mapped.map((m: any) => m.plateNo));
            items = [
              ...mapped,
              ...trucks.filter((t: any) => !dbPlates.has(t.plateNo)),
            ];
          }
        } catch (err) {
          console.warn("[MastersRouter] DB query error on trucks:", err);
        }
      }
    }

    if (plateNo) {
      items = items.filter((t) =>
        t.plateNo?.toLowerCase().includes(String(plateNo).toLowerCase()),
      );
    }
    res.json({ items, nextCursor: null, total: items.length });
  },
);

router.post(
  "/trucks",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  async (req, res) => {
    const { plateNo, countryCode, carrierPartyId, carrierName } = req.body;
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.trucks.create({
            data: {
              plate_no:
                plateNo || `T ${Math.floor(100 + Math.random() * 900)} ABC`,
              country_code: countryCode || "TZ",
              transporter_party_id: carrierPartyId
                ? Number(carrierPartyId)
                : null,
              is_active: true,
            },
            include: { parties: true },
          });
          const mapped = {
            truckId: created.truck_id,
            plateNo: created.plate_no,
            countryCode: created.country_code || "TZ",
            carrierPartyId: created.transporter_party_id,
            carrierName:
              created.parties?.party_name ||
              carrierName ||
              "Independent Haulier",
            isBlacklisted: false,
            logInst: 1,
          };
          trucks.unshift(mapped as any);
          return res.status(201).json(mapped);
        } catch (err) {
          console.warn("[MastersRouter] DB insert error on truck:", err);
        }
      }
    }

    const newT = {
      truckId: trucks.length + 1,
      plateNo: plateNo || `T ${Math.floor(100 + Math.random() * 900)} ABC`,
      countryCode: countryCode || "TZ",
      carrierPartyId: carrierPartyId || 7,
      carrierName: carrierName || "Independent Haulier",
      isBlacklisted: false,
      logInst: 1,
      ...req.body,
    };
    trucks.push(newT);
    res.status(201).json(newT);
  },
);

router.get(
  "/trucks/:truckId",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const t = trucks.find(
      (x) =>
        String(x.truckId) === req.params.truckId ||
        x.plateNo === req.params.truckId,
    );
    if (!t) return res.status(404).json({ error: "Truck not found" });
    res.json(t);
  },
);

router.patch(
  "/trucks/:truckId",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  (req, res) => {
    const t = trucks.find(
      (x) =>
        String(x.truckId) === req.params.truckId ||
        x.plateNo === req.params.truckId,
    );
    if (!t) return res.status(404).json({ error: "Truck not found" });
    Object.assign(t, req.body, { logInst: t.logInst + 1 });
    res.json(t);
  },
);

// ------------------------------------------------------------------ Drivers (Global 🌐)
router.get(
  "/drivers",
  requireSite(true),
  requirePermission("masters.view"),
  async (req, res) => {
    const { licenceNo, name } = req.query;
    let items: any[] = drivers;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbDrivers = await prisma.drivers.findMany({
            include: { parties: true },
            orderBy: { driver_id: "desc" },
          });
          if (dbDrivers && dbDrivers.length > 0) {
            const mapped = dbDrivers.map((d: any) => ({
              driverId: d.driver_id,
              licenceNo: d.licence_no,
              fullName: d.driver_name,
              phone: d.phone || "+255 70 000 0000",
              carrierPartyId: d.transporter_party_id,
              carrierName:
                d.parties?.party_name ||
                d.parties?.short_name ||
                "Independent Haulier",
              isBlacklisted: !(d.is_active ?? true),
              logInst: 1,
            }));
            const dbLicences = new Set(mapped.map((m: any) => m.licenceNo));
            items = [
              ...mapped,
              ...drivers.filter((d: any) => !dbLicences.has(d.licenceNo)),
            ];
          }
        } catch (err) {
          console.warn("[MastersRouter] DB query error on drivers:", err);
        }
      }
    }

    if (licenceNo) {
      items = items.filter((d) =>
        d.licenceNo?.toLowerCase().includes(String(licenceNo).toLowerCase()),
      );
    }
    if (name) {
      items = items.filter((d) =>
        d.fullName?.toLowerCase().includes(String(name).toLowerCase()),
      );
    }
    res.json({ items, nextCursor: null, total: items.length });
  },
);

router.post(
  "/drivers",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  async (req, res) => {
    const { licenceNo, fullName, phone, transporterPartyId, carrierName } =
      req.body;
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.drivers.create({
            data: {
              licence_no: licenceNo || `DL-${Date.now().toString().slice(-6)}`,
              driver_name: fullName || "New Driver",
              phone: phone || null,
              transporter_party_id: transporterPartyId
                ? Number(transporterPartyId)
                : null,
              is_active: true,
            },
            include: { parties: true },
          });
          const mapped = {
            driverId: created.driver_id,
            licenceNo: created.licence_no,
            fullName: created.driver_name,
            phone: created.phone || "+255 70 000 0000",
            carrierPartyId: created.transporter_party_id,
            carrierName:
              created.parties?.party_name ||
              carrierName ||
              "Independent Haulier",
            isBlacklisted: false,
            logInst: 1,
          };
          drivers.unshift(mapped as any);
          return res.status(201).json(mapped);
        } catch (err) {
          console.warn("[MastersRouter] DB insert error on driver:", err);
        }
      }
    }

    const newD = {
      driverId: drivers.length + 1,
      licenceNo: licenceNo || `DL-${Date.now().toString().slice(-6)}`,
      fullName: fullName || "New Driver",
      phone: phone || "+255 70 000 0000",
      carrierName: carrierName || "Independent Haulier",
      isBlacklisted: false,
      logInst: 1,
      ...req.body,
    };
    drivers.push(newD);
    res.status(201).json(newD);
  },
);

router.get(
  "/drivers/:driverId",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const d = drivers.find(
      (x) =>
        String(x.driverId) === req.params.driverId ||
        x.licenceNo === req.params.driverId,
    );
    if (!d) return res.status(404).json({ error: "Driver not found" });
    res.json(d);
  },
);

router.patch(
  "/drivers/:driverId",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  (req, res) => {
    const d = drivers.find(
      (x) =>
        String(x.driverId) === req.params.driverId ||
        x.licenceNo === req.params.driverId,
    );
    if (!d) return res.status(404).json({ error: "Driver not found" });
    Object.assign(d, req.body, { logInst: d.logInst + 1 });
    res.json(d);
  },
);

// ------------------------------------------------------------------ Vessels (Global 🌐)
router.get(
  "/vessels",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    res.json({ items: vessels, total: vessels.length, nextCursor: null });
  },
);

router.post(
  "/vessels",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  (req, res) => {
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
  },
);

router.get(
  "/vessels/:vesselId",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const v = vessels.find(
      (x) =>
        String(x.vesselId) === req.params.vesselId ||
        x.vesselName === req.params.vesselId,
    );
    if (!v) return res.status(404).json({ error: "Vessel not found" });
    res.json(v);
  },
);

router.patch(
  "/vessels/:vesselId",
  requireSite(true),
  requirePermission("masters.local.edit", "DO"),
  (req, res) => {
    const v = vessels.find(
      (x) =>
        String(x.vesselId) === req.params.vesselId ||
        x.vesselName === req.params.vesselId,
    );
    if (!v) return res.status(404).json({ error: "Vessel not found" });
    Object.assign(v, req.body);
    res.json(v);
  },
);

// ------------------------------------------------------------------ Ports (Global 🌐)
router.get(
  "/ports",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    res.json({ items: ports, total: ports.length, nextCursor: null });
  },
);

router.post(
  "/ports",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
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
  },
);

router.get(
  "/ports/:portId",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const p = ports.find(
      (x) =>
        String(x.portId) === req.params.portId ||
        x.portCode === req.params.portId,
    );
    if (!p) return res.status(404).json({ error: "Port not found" });
    res.json(p);
  },
);

router.patch(
  "/ports/:portId",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const p = ports.find(
      (x) =>
        String(x.portId) === req.params.portId ||
        x.portCode === req.params.portId,
    );
    if (!p) return res.status(404).json({ error: "Port not found" });
    Object.assign(p, req.body);
    res.json(p);
  },
);

// ------------------------------------------------------------------ Commodities (Global 🌐)
router.get(
  "/commodities",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    res.json({
      items: commodities,
      total: commodities.length,
      nextCursor: null,
    });
  },
);

router.post(
  "/commodities",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
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
  },
);

router.get(
  "/commodities/:commodityId",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const c = commodities.find(
      (x) =>
        String(x.commodityId) === req.params.commodityId ||
        x.commodityCode === req.params.commodityId,
    );
    if (!c) return res.status(404).json({ error: "Commodity not found" });
    res.json(c);
  },
);

router.patch(
  "/commodities/:commodityId",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const c = commodities.find(
      (x) =>
        String(x.commodityId) === req.params.commodityId ||
        x.commodityCode === req.params.commodityId,
    );
    if (!c) return res.status(404).json({ error: "Commodity not found" });
    Object.assign(c, req.body);
    res.json(c);
  },
);

// ------------------------------------------------------------------ Equipment (Site-scoped)
router.get(
  "/equipment",
  requireSite(false),
  requirePermission("masters.view"),
  (req, res) => {
    res.json({ items: equipment, total: equipment.length, nextCursor: null });
  },
);

router.post(
  "/equipment",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
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
  },
);

router.get(
  "/equipment/:equipmentId",
  requireSite(false),
  requirePermission("masters.view"),
  (req, res) => {
    const eq = equipment.find(
      (x) =>
        String(x.equipmentId) === req.params.equipmentId ||
        x.equipmentCode === req.params.equipmentId,
    );
    if (!eq) return res.status(404).json({ error: "Equipment not found" });
    res.json(eq);
  },
);

router.patch(
  "/equipment/:equipmentId",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const eq = equipment.find(
      (x) =>
        String(x.equipmentId) === req.params.equipmentId ||
        x.equipmentCode === req.params.equipmentId,
    );
    if (!eq) return res.status(404).json({ error: "Equipment not found" });
    Object.assign(eq, req.body);
    res.json(eq);
  },
);

export const mastersRouter = router;
