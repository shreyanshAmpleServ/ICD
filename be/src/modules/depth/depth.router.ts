import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import {
  occupancyForecast,
  dwellPredictions,
  suggestionLog,
} from "../../data/insight";
import { dgLines, segregationWarnings, IMO_CLASSES } from "../../data/cargo";
import { integrationMessages, models } from "../../data/admin";

const router = Router();

// In-memory dg segregation matrix
let segregationMatrix = {
  warnings: segregationWarnings,
  classes: IMO_CLASSES,
};

// ------------------------------------------------------------------ 1. Dangerous Goods (Site-scoped)
router.get(
  ["/imo-classes", "/dg-classes"],
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    res.json({
      items: IMO_CLASSES,
      total: IMO_CLASSES.length,
      nextCursor: null,
    });
  },
);

router.get(
  "/segregation-rules",
  requireSite(true),
  requirePermission("masters.view"),
  (req, res) => {
    res.json(segregationMatrix);
  },
);

router.put(
  "/segregation-rules",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    segregationMatrix = req.body;
    res.json({ success: true, segregationMatrix });
  },
);

router.get(
  "/units/:unitStayId/dg-lines",
  requireSite(false),
  requirePermission("consignment.view"),
  (req, res) => {
    const lines = dgLines.filter(
      (d) => String(d.unitStayId) === req.params.unitStayId,
    );
    res.json({ items: lines, total: lines.length, nextCursor: null });
  },
);

router.put(
  "/units/:unitStayId/dg-lines",
  requireSite(false),
  requirePermission("dg.manage", "DO"),
  (req, res) => {
    res.json({
      success: true,
      unitStayId: req.params.unitStayId,
      dgLines: req.body,
    });
  },
);

// ------------------------------------------------------------------ 2. EDI & Integration (Site-scoped)
router.get(
  "/integration-messages",
  requireSite(false),
  requirePermission("integration.monitor"),
  (req, res) => {
    res.json({
      items: integrationMessages,
      total: integrationMessages.length,
      nextCursor: null,
    });
  },
);

router.get(
  "/integration-messages/:integrationMessageId",
  requireSite(false),
  requirePermission("integration.monitor"),
  (req, res) => {
    const m = (integrationMessages as any[]).find(
      (x) =>
        String(x.id) === req.params.integrationMessageId ||
        String(x.integrationMessageId) === req.params.integrationMessageId,
    );
    if (!m)
      return res.status(404).json({ error: "Integration message not found" });
    res.json(m);
  },
);

router.post(
  "/integration-messages/:integrationMessageId([0-9a-zA-Z_.-]+):retry",
  requireSite(false),
  requirePermission("integration.monitor", "DO"),
  (req, res) => {
    const m = (integrationMessages as any[]).find(
      (x) =>
        String(x.id) === req.params.integrationMessageId ||
        String(x.integrationMessageId) === req.params.integrationMessageId,
    );
    if (m) m.status = "SENT";
    res.json({ success: true, message: m });
  },
);

router.post("/edi/inbound/:partnerCode", requireSite(false), (req, res) => {
  res.status(202).json({
    messageId: `EDI-MSG-${Date.now()}`,
    partnerCode: req.params.partnerCode,
    status: "QUEUED",
    receivedAt: new Date().toISOString(),
  });
});

// ------------------------------------------------------------------ 3. Intelligence & Forecasting (Site-scoped)
router.get(
  "/models",
  requireSite(false),
  requirePermission("admin.config.manage"),
  (req, res) => {
    res.json({ items: models, total: models.length, nextCursor: null });
  },
);

router.post(
  "/models/:mlModelVersionId([0-9a-zA-Z_.-]+):activate",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const mod = (models as any[]).find(
      (m) =>
        String(m.modelId) === req.params.mlModelVersionId ||
        m.name === req.params.mlModelVersionId,
    );
    if (mod) mod.status = "ACTIVE";
    res.json({ success: true, model: mod });
  },
);

router.get(
  ["/forecasts/dwell", "/predictions/dwell"],
  requireSite(false),
  requirePermission("yard.map.view"),
  (req, res) => {
    const siteId = Number(req.query.siteId || req.siteId) || 1;
    const items = dwellPredictions(siteId);
    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.get(
  ["/forecasts/occupancy", "/forecast/occupancy"],
  requireSite(false),
  requirePermission("yard.map.view"),
  (req, res) => {
    const siteId = Number(req.query.siteId || req.siteId) || 1;
    const block = String(req.query.block || "ALL");
    const items = occupancyForecast(siteId, block);
    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.get(
  "/yard/suggestion-log",
  requireSite(false),
  requirePermission("yard.allocate"),
  (req, res) => {
    res.json({
      items: suggestionLog,
      total: suggestionLog.length,
      nextCursor: null,
    });
  },
);

export const depthRouter = router;
