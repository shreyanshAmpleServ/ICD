import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { cargoRegimes } from "../../data/admin";
import { cargoService } from "./cargo.service";

const router = Router();

// ------------------------------------------------------------------ Vessel Calls (Global 🌐)
router.get(
  "/vessel-calls",
  requireSite(true),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const items = await cargoService.getVesselCalls(req.query);
      res.json({ items, nextCursor: null, total: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/vessel-calls",
  requireSite(true),
  requirePermission("consignment.edit", "DO"),
  async (req, res) => {
    try {
      const newCall = await cargoService.createVesselCall(req.body);
      res.status(201).json(newCall);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/vessel-calls/:vesselCallId",
  requireSite(true),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const call = await cargoService.getVesselCall(req.params.vesselCallId);
      if (!call) return res.status(404).json({ error: "Vessel call not found" });
      res.json(call);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch(
  "/vessel-calls/:vesselCallId",
  requireSite(true),
  requirePermission("consignment.edit", "DO"),
  async (req, res) => {
    try {
      const updated = await cargoService.updateVesselCall(req.params.vesselCallId, req.body);
      if (!updated) return res.status(404).json({ error: "Vessel call not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ------------------------------------------------------------------ Manifests (Global 🌐)
router.get(
  "/manifests",
  requireSite(true),
  requirePermission("manifest.import"),
  async (req, res) => {
    try {
      const items = await cargoService.getManifests();
      res.json({ items, nextCursor: null, total: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  ["/manifests", "/manifests:import"],
  requireSite(true),
  requirePermission("manifest.import", "DO"),
  async (req, res) => {
    try {
      const newMan = await cargoService.createManifest(req.body);
      res.status(201).json(newMan);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/manifests/:manifestId",
  requireSite(true),
  requirePermission("manifest.import"),
  async (req, res) => {
    try {
      const man = await cargoService.getManifest(req.params.manifestId);
      if (!man) return res.status(404).json({ error: "Manifest not found" });
      res.json(man);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/manifests/:manifestId/lines",
  requireSite(true),
  requirePermission("manifest.import"),
  async (req, res) => {
    try {
      const man = (await cargoService.getManifest(req.params.manifestId)) as any;
      const lines = man?.lines || [];
      res.json({ items: lines, total: lines.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch(
  "/manifests/:manifestId/lines/:manifestLineId",
  requireSite(true),
  requirePermission("manifest.import", "DO"),
  async (req, res) => {
    try {
      const result = await cargoService.updateManifestLine(req.params.manifestLineId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/manifests/:manifestId([0-9a-zA-Z_.-]+):apply",
  requireSite(true),
  requirePermission("manifest.import", "DO"),
  async (req, res) => {
    try {
      const result = await cargoService.applyManifest(req.params.manifestId);
      res.json({
        success: true,
        manifest: result.manifest,
        appliedAt: new Date().toISOString(),
        consignmentsCreated: 4,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/manifests/:manifestId([0-9a-zA-Z_.-]+):cancel",
  requireSite(true),
  requirePermission("manifest.import", "DO"),
  async (req, res) => {
    res.json({
      success: true,
      cancelledAt: new Date().toISOString(),
    });
  }
);

// ------------------------------------------------------------------ Consignments (Global 🌐)
router.get(
  "/consignments",
  requireSite(true),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const items = await cargoService.getConsignments(req.query);
      res.json({ items, nextCursor: null, total: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  "/consignments",
  requireSite(true),
  requirePermission("consignment.edit", "DO"),
  async (req, res) => {
    try {
      const newC = await cargoService.createConsignment(req.body);
      res.status(201).json(newC);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/consignments/:consignmentId",
  requireSite(true),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const c = await cargoService.getConsignment(req.params.consignmentId);
      if (!c) return res.status(404).json({ error: "Consignment not found" });
      res.json(c);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch(
  "/consignments/:consignmentId",
  requireSite(true),
  requirePermission("consignment.edit", "DO"),
  async (req, res) => {
    try {
      const updated = await cargoService.updateConsignment(req.params.consignmentId, req.body);
      if (!updated) return res.status(404).json({ error: "Consignment not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/consignments/:consignmentId/lines",
  requireSite(true),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const lines = await cargoService.getConsignmentLines(req.params.consignmentId);
      res.json({ items: lines, total: lines.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put(
  "/consignments/:consignmentId/lines",
  requireSite(true),
  requirePermission("consignment.edit", "DO"),
  async (req, res) => {
    try {
      const lines = Array.isArray(req.body) ? req.body : [req.body];
      const saved = await cargoService.saveConsignmentLines(req.params.consignmentId, lines);
      res.json({ items: saved, total: saved.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  "/consignments/:consignmentId/units",
  requireSite(true),
  requirePermission("consignment.view"),
  async (req, res) => {
    try {
      const units = await cargoService.getConsignmentUnits(req.params.consignmentId);
      res.json({ items: units, total: units.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ------------------------------------------------------------------ Cargo Regimes (Global 🌐)
router.get(
  "/cargo-regimes",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    res.json({
      items: cargoRegimes,
      total: cargoRegimes.length,
      nextCursor: null,
    });
  }
);

router.get(
  "/cargo-regimes/:regimeCode",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    const item = cargoRegimes.find(
      (r) =>
        r.regimeCode === req.params.regimeCode ||
        String((r as any).cargoRegimeId) === req.params.regimeCode
    );
    if (!item) return res.status(404).json({ error: "Cargo regime not found" });
    res.json(item);
  }
);

export const cargoRouter = router;
