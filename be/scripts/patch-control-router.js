const fs = require('fs');
const path = require('path');

// 1. Patch control.router.ts
const controlPath = path.resolve(__dirname, '../src/modules/control/control.router.ts');
let control = fs.readFileSync(controlPath, 'utf8');

if (!control.includes('import { cargoService } from "../cargo/cargo.service";')) {
  control = control.replace(
    'import { getPrisma, isDbLive } from "../../db/prisma";',
    'import { getPrisma, isDbLive } from "../../db/prisma";\nimport { cargoService } from "../cargo/cargo.service";'
  );
}

// Replace Customs Refs GET
control = control.replace(
  /router\.get\(\s*\["\/customs\/refs",\s*"\/customs-declarations"\][\s\S]*?res\.json\(\{ items, total: items\.length, nextCursor: null \}\);\s*\},?\s*\);/,
  `router.get(
  ["/customs/refs", "/customs-declarations"],
  requireSite(false),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const items = await cargoService.getCustomsRefs(req.query);
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);`
);

// Replace Customs Refs POST
control = control.replace(
  /router\.post\(\s*"\/customs\/refs"[\s\S]*?res\.status\(201\)\.json\(newRef\);\s*\},?\s*\);/,
  `router.post(
  "/customs/refs",
  requireSite(false),
  requirePermission("customs.ref.edit", "DO"),
  async (req, res) => {
    try {
      const newRef = await cargoService.createCustomsRef(req.body);
      res.status(201).json(newRef);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);`
);

// Replace Exams GET & POST & COMPLETE
control = control.replace(
  /router\.get\(\s*"\/exams"[\s\S]*?router\.post\(\s*"\/exams\/:examId\(\[0-9a-zA-Z_\.-\]\+\):complete"[\s\S]*?res\.json\(\{ success: true, exam \}\);\s*\},?\s*\);/,
  `router.get(
  "/exams",
  requireSite(false),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const items = await cargoService.getCustomsExams();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/exams",
  requireSite(false),
  requirePermission("customs.exam.record", "DO"),
  async (req, res) => {
    try {
      const newExam = await cargoService.createCustomsExam(req.body);
      res.status(201).json(newExam);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/exams/:examId([0-9a-zA-Z_.-]+):complete",
  requireSite(false),
  requirePermission("customs.exam.record", "DO"),
  async (req, res) => {
    try {
      const result = await cargoService.completeCustomsExam(req.params.examId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);`
);

// Replace Holds GET, POST, LIFT
control = control.replace(
  /router\.get\(\s*"\/holds",[\s\S]*?router\.post\(\s*"\/holds\/:holdId\(\[0-9a-zA-Z_\.-\]\+\):lift"[\s\S]*?res\.json\(\{ success: true, hold: h \}\);\s*\},?\s*\);/,
  `router.get(
  "/holds",
  requireSite(false),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const items = await cargoService.getHolds(req.query);
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  ["/holds", "/holds:place"],
  requireSite(false),
  requirePermission("customs.hold.place", "DO"),
  async (req, res) => {
    try {
      const placed = await cargoService.placeHold(req.body, req.user?.username);
      res.status(201).json(Array.isArray(placed) ? placed[0] : placed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get(
  "/holds/:holdId",
  requireSite(false),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const holds = await cargoService.getHolds({});
      const h = holds.find((x: any) => String(x.holdId) === req.params.holdId);
      if (!h) return res.status(404).json({ error: "Hold not found" });
      res.json(h);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/holds/:holdId([0-9a-zA-Z_.-]+):lift",
  requireSite(false),
  requirePermission("customs.hold.lift", "DO"),
  async (req, res) => {
    try {
      const result = await cargoService.liftHold(req.params.holdId, req.body, req.user?.username);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);`
);

// Replace Release Orders GET, POST, GET/:id, APPROVE, CANCEL, REVALIDATE
control = control.replace(
  /router\.get\(\s*"\/release-orders",[\s\S]*?router\.post\(\s*"\/release-orders\/:releaseOrderId\(\[0-9a-zA-Z_\.-\]\+\):revalidate"[\s\S]*?res\.json\(\{[\s\S]*?message: "Validity extended by 48 hours\."[\s\S]*?\}\);\s*\},?\s*\);/,
  `router.get(
  "/release-orders",
  requireSite(false),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const items = await cargoService.getReleaseOrders(req.query);
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/release-orders",
  requireSite(false),
  requirePermission("release.issue", "DO"),
  async (req, res) => {
    try {
      const newRo = await cargoService.createReleaseOrder(req.body, req.user?.username);
      res.status(201).json(newRo);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get(
  "/release-orders/:releaseOrderId",
  requireSite(false),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const ro = await cargoService.getReleaseOrder(req.params.releaseOrderId);
      if (!ro) return res.status(404).json({ error: "Release order not found" });
      res.json(ro);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get(
  "/release-qr/:qrToken",
  requireSite(false),
  requirePermission("gate.visit.checkout"),
  async (req, res) => {
    const list = await cargoService.getReleaseOrders({});
    const ro = list[0];
    res.json({
      qrToken: req.params.qrToken,
      isValid: true,
      releaseOrderNo: ro?.releaseOrderNo || "RO-DAR1-26-01943",
      status: ro?.status || "APPROVED",
      validTo: ro?.validTo || new Date(Date.now() + 86400000).toISOString(),
      units: ro?.units || ["MSKU 882014 9"],
    });
  },
);

router.post(
  [
    "/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):evaluate",
    "/release-orders:evaluate",
  ],
  requireSite(false),
  requirePermission("consignment.view"),
  (req, res) => {
    const unitStayId = req.body.unitStayId || 5001;
    const stay =
      allStays.find((s) => s.unitStayId === Number(unitStayId)) || allStays[0];
    const checks = evaluate(stay, "PREVIEW");
    const canRelease = checks.every(
      (c) => c.result === "PASS" || c.result === "NOT_APPLIC",
    );
    res.json({ unitStayId: stay.unitStayId, canRelease, checks });
  },
);

router.post(
  "/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):approve",
  requireSite(false),
  requirePermission("release.issue", "DO"),
  async (req, res) => {
    try {
      const ro = await cargoService.approveReleaseOrder(req.params.releaseOrderId, req.user?.username);
      res.json({ success: true, releaseOrder: ro });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):cancel",
  requireSite(false),
  requirePermission("release.issue", "DO"),
  async (req, res) => {
    try {
      const ro = await cargoService.cancelReleaseOrder(req.params.releaseOrderId);
      res.json({ success: true, releaseOrder: ro });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):revalidate",
  requireSite(false),
  requirePermission("release.issue", "DO"),
  async (req, res) => {
    try {
      const ro = await cargoService.revalidateReleaseOrder(req.params.releaseOrderId);
      res.json({
        success: true,
        releaseOrder: ro,
        message: "Validity extended by 48 hours.",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);`
);

// Replace Dangerous Goods
control = control.replace(
  /router\.get\(\s*\["\/dg-classes",\s*"\/dg-lines"\][\s\S]*?res\.json\(\{ items, total: items\.length, nextCursor: null \}\);\s*\},?\s*\);/,
  `router.get(
  ["/dg-classes", "/dg-lines"],
  requireSite(false),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const items = await cargoService.getDgLines();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);`
);

fs.writeFileSync(controlPath, control, 'utf8');
console.log('Successfully patched control.router.ts');

// 2. Patch depth.router.ts for PUT /units/:unitStayId/dg-lines
const depthPath = path.resolve(__dirname, '../src/modules/depth/depth.router.ts');
let depth = fs.readFileSync(depthPath, 'utf8');

if (!depth.includes('import { cargoService } from "../cargo/cargo.service";')) {
  depth = depth.replace(
    'import { Router } from "express";',
    'import { Router } from "express";\nimport { cargoService } from "../cargo/cargo.service";'
  );
}

depth = depth.replace(
  /router\.put\(\s*"\/units\/:unitStayId\/dg-lines"[\s\S]*?res\.json\(\{[\s\S]*?dgLines: req\.body,[\s\S]*?\}\);\s*\},?\s*\);/,
  `router.put(
  "/units/:unitStayId/dg-lines",
  requireSite(false),
  requirePermission("dg.manage", "DO"),
  async (req, res) => {
    try {
      const lines = Array.isArray(req.body) ? req.body : [req.body];
      const saved = await cargoService.saveDgLines(req.params.unitStayId, lines);
      res.json({ success: true, unitStayId: req.params.unitStayId, dgLines: saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);`
);

fs.writeFileSync(depthPath, depth, 'utf8');
console.log('Successfully patched depth.router.ts');

