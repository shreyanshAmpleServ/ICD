import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import {
  controlTower,
  kpiSeries,
  kpiTiles,
  reports,
  reportPreview,
  savedReports,
  exportLog,
} from "../../data/insight";
import {
  notificationTemplates,
  notificationRules,
  printTemplates,
} from "../../data/admin";
import { notifications } from "../../data/cargo";
import { getPrisma, isDbLive } from "../../db/prisma";

const router = Router();

// In-memory reports runs
const reportRuns: any[] = [
  {
    reportRunId: 88120,
    reportCode: "YARD_STOCK",
    format: "XLSX",
    requestedAt: new Date(Date.now() - 3600000).toISOString(),
    status: "COMPLETED",
    rowCount: 342,
    fileUrl: "/api/report-runs/88120/file",
  },
  {
    reportRunId: 88097,
    reportCode: "GATE_REGISTER",
    format: "PDF",
    requestedAt: new Date(Date.now() - 7200000).toISOString(),
    status: "COMPLETED",
    rowCount: 1204,
    fileUrl: "/api/report-runs/88097/file",
  },
];

// In-memory Aiva state
let aivaConversations: any[] = [
  {
    aivaConversationId: 1,
    title: "Container Dwelling Inquiry",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    messages: [
      {
        aivaMessageId: 1,
        sender: "USER",
        text: "Which containers have been in the yard for more than 14 days?",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        aivaMessageId: 2,
        sender: "AIVA",
        text: "There are currently 12 containers with dwell time exceeding 14 days, primarily in Block A.",
        createdAt: new Date(Date.now() - 86395000).toISOString(),
      },
    ],
  },
];

let aivaDrafts: any[] = [
  {
    aivaDraftActionId: 1,
    actionType: "FREE_DAY_EXTENSION_REPLY",
    summary: "Drafted reply to Kilele regarding free-day waiver for BL-9901",
    proposedPayload: {
      unitNo: "MSKU 882014 9",
      days: 3,
      reason: "Customs delay",
    },
    status: "PENDING_REVIEW",
    createdAt: new Date().toISOString(),
  },
];

router.get(
  ["/dashboards/control-tower", "/control-tower"],
  requireSite(false),
  requirePermission("dashboard.control_tower"),
  async (req, res) => {
    const baseData = controlTower(Number(req.siteId) || 1);
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const [truckCount, excCount] = await Promise.all([
            prisma.truck_visits.count(),
            prisma.exception_cases.count({ where: { status: "OPEN" } }),
          ]);
          if (baseData && (baseData as any).kpis) {
            (baseData as any).kpis.trucksOnSite = truckCount;
            (baseData as any).kpis.openExceptions = excCount;
          }
        } catch (err) {
          console.warn("[InsightRouter] DB query error on control-tower:", err);
        }
      }
    }
    res.json(baseData);
  },
);

router.get("/dashboards/:dashboardCode", requireSite(false), (req, res) => {
  res.json({
    dashboardCode: req.params.dashboardCode,
    siteId: 1,
    updatedAt: new Date().toISOString(),
    kpis: kpiTiles,
    series: kpiSeries,
  });
});

router.get(
  ["/kpis", "/kpis/tiles"],
  requireSite(false),
  requirePermission("dashboard.executive"),
  (req, res) => {
    res.json({
      items: kpiTiles,
      series: kpiSeries,
      total: kpiTiles.length,
      nextCursor: null,
    });
  },
);

router.get(
  "/kpis/series",
  requireSite(false),
  requirePermission("dashboard.executive"),
  (req, res) => {
    res.json({
      items: kpiSeries,
      total: Object.keys(kpiSeries).length,
      nextCursor: null,
    });
  },
);

// ------------------------------------------------------------------ 2. Reports (Site-scoped)
router.get("/reports", requireSite(false), (req, res) => {
  res.json({ items: reports, total: reports.length, nextCursor: null });
});

router.post("/reports/:reportCode/runs", requireSite(false), (req, res) => {
  const newRun = {
    reportRunId: Date.now(),
    reportCode: req.params.reportCode,
    format: req.body.format || "XLSX",
    parameters: req.body.parameters || {},
    status: "COMPLETED",
    requestedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    rowCount: 148,
    fileUrl: `/api/report-runs/${Date.now()}/file`,
  };
  reportRuns.push(newRun);
  res.status(201).json(newRun);
});

router.get("/report-runs/:reportRunId", requireSite(false), (req, res) => {
  const r = reportRuns.find(
    (x) => String(x.reportRunId) === req.params.reportRunId,
  );
  if (!r) return res.status(404).json({ error: "Report run not found" });
  res.json(r);
});

router.get("/report-runs/:reportRunId/file", requireSite(false), (req, res) => {
  res.json({
    reportRunId: req.params.reportRunId,
    fileName: `report-${req.params.reportRunId}.xlsx`,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    downloadUrl: `https://downloads.icd.dcc/reports/${req.params.reportRunId}.xlsx`,
  });
});

router.get("/saved-reports", requireSite(false), (req, res) => {
  res.json({
    items: savedReports,
    total: savedReports.length,
    nextCursor: null,
  });
});

router.post("/saved-reports", requireSite(false), (req, res) => {
  const newSr = {
    savedReportId: savedReports.length + 1,
    name: req.body.name || "Custom Saved Report",
    reportCode: req.body.reportCode || "YARD_STOCK",
    parameters: req.body.parameters || {},
    createdBy: req.user?.username || "Current User",
    createdAt: new Date().toISOString(),
    logInst: 1,
    ...req.body,
  };
  savedReports.push(newSr as any);
  res.status(201).json(newSr);
});

router.get("/saved-reports/:savedReportId", requireSite(false), (req, res) => {
  const sr = (savedReports as any[]).find(
    (x) => String(x.savedReportId) === req.params.savedReportId,
  );
  if (!sr) return res.status(404).json({ error: "Saved report not found" });
  res.json(sr);
});

router.patch(
  "/saved-reports/:savedReportId",
  requireSite(false),
  (req, res) => {
    const sr = (savedReports as any[]).find(
      (x) => String(x.savedReportId) === req.params.savedReportId,
    );
    if (!sr) return res.status(404).json({ error: "Saved report not found" });
    Object.assign(sr, req.body);
    res.json(sr);
  },
);

router.delete(
  "/saved-reports/:savedReportId",
  requireSite(false),
  (req, res) => {
    const idx = (savedReports as any[]).findIndex(
      (x) => String(x.savedReportId) === req.params.savedReportId,
    );
    if (idx >= 0) savedReports.splice(idx, 1);
    res.status(204).end();
  },
);

router.get("/notifications/inbox", requireSite(true), async (req, res) => {
  let items = notifications;

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbNotifs = await prisma.notifications.findMany({
          orderBy: { notification_id: "desc" },
        });
        if (dbNotifs && dbNotifs.length > 0) {
          const mapped = dbNotifs.map((n) => {
            let kind:
              | "RELEASE"
              | "FREE_TIME"
              | "EXCEPTION"
              | "HOLD"
              | "PAYMENT"
              | "APPROVAL"
              | "CUSTOMS"
              | "MANIFEST" = "EXCEPTION";
            if (n.event_type?.includes("HOLD")) kind = "HOLD";
            else if (n.event_type?.includes("APPROVAL")) kind = "APPROVAL";
            else if (n.event_type?.includes("RELEASE")) kind = "RELEASE";
            else if (n.event_type?.includes("PAYMENT")) kind = "PAYMENT";

            return {
              notificationId: n.notification_id,
              kind,
              subject: n.title,
              body: n.message,
              to:
                kind === "HOLD"
                  ? "/gate"
                  : kind === "APPROVAL"
                    ? "/approvals"
                    : "/units",
              createdAt:
                n.created_at?.toISOString() || new Date().toISOString(),
              readAt: n.is_read ? new Date().toISOString() : undefined,
            };
          });
          const dbIds = new Set(mapped.map((m) => m.notificationId));
          items = [
            ...mapped,
            ...notifications.filter((nt) => !dbIds.has(nt.notificationId)),
          ];
        }
      } catch (err) {
        console.warn(
          "[InsightRouter] DB query error on notifications/inbox:",
          err,
        );
      }
    }
  }

  res.json({
    items,
    total: items.length,
    unreadCount: items.filter((n) => !(n as any).readAt).length,
    nextCursor: null,
  });
});

router.post(
  "/notifications/:notificationId([0-9a-zA-Z_.-]+):read",
  requireSite(false),
  (req, res) => {
    const n = (notifications as any[]).find(
      (x) => String(x.notificationId) === req.params.notificationId,
    );
    if (n) n.read = true;
    res.json({ success: true, notification: n });
  },
);

router.post("/notifications:read-all", requireSite(false), (req, res) => {
  (notifications as any[]).forEach((n) => {
    n.read = true;
  });
  res.json({ success: true, count: notifications.length });
});

router.get(
  "/notification-templates",
  requireSite(false),
  requirePermission("admin.config.manage"),
  (req, res) => {
    res.json({
      items: notificationTemplates,
      total: notificationTemplates.length,
      nextCursor: null,
    });
  },
);

router.post(
  "/notification-templates",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const newTmpl = {
      notificationTemplateId: notificationTemplates.length + 1,
      templateCode:
        req.body.templateCode || `NOTIF_${notificationTemplates.length + 1}`,
      templateName: req.body.templateName || "Custom Notification",
      channel: req.body.channel || "SMS",
      bodyTemplate: req.body.bodyTemplate || "Alert: {MESSAGE}",
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    notificationTemplates.push(newTmpl as any);
    res.status(201).json(newTmpl);
  },
);

router.get(
  "/notification-templates/:notificationTemplateId",
  requireSite(false),
  requirePermission("admin.config.manage"),
  (req, res) => {
    const t = (notificationTemplates as any[]).find(
      (x) =>
        String(x.notificationTemplateId) ===
          req.params.notificationTemplateId ||
        x.code === req.params.notificationTemplateId,
    );
    if (!t)
      return res.status(404).json({ error: "Notification template not found" });
    res.json(t);
  },
);

router.patch(
  "/notification-templates/:notificationTemplateId",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const t = (notificationTemplates as any[]).find(
      (x) =>
        String(x.notificationTemplateId) ===
          req.params.notificationTemplateId ||
        x.code === req.params.notificationTemplateId,
    );
    if (!t)
      return res.status(404).json({ error: "Notification template not found" });
    Object.assign(t, req.body);
    res.json(t);
  },
);

router.get(
  "/notification-rules",
  requireSite(false),
  requirePermission("admin.config.manage"),
  (req, res) => {
    res.json({
      items: notificationRules,
      total: notificationRules.length,
      nextCursor: null,
    });
  },
);

router.post(
  "/notification-rules",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const newRule = {
      notificationRuleId: notificationRules.length + 1,
      eventType: req.body.eventType || "CUSTOM",
      templateCode: req.body.templateCode || "GENERIC_ALERT",
      recipientKind: req.body.recipientKind || "ROLE",
      channel: req.body.channel || "IN_APP",
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    notificationRules.push(newRule as any);
    res.status(201).json(newRule);
  },
);

router.get(
  "/notification-rules/:notificationRuleId",
  requireSite(false),
  requirePermission("admin.config.manage"),
  (req, res) => {
    const r = (notificationRules as any[]).find(
      (x) => String(x.notificationRuleId) === req.params.notificationRuleId,
    );
    if (!r)
      return res.status(404).json({ error: "Notification rule not found" });
    res.json(r);
  },
);

router.patch(
  "/notification-rules/:notificationRuleId",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const r = (notificationRules as any[]).find(
      (x) => String(x.notificationRuleId) === req.params.notificationRuleId,
    );
    if (!r)
      return res.status(404).json({ error: "Notification rule not found" });
    Object.assign(r, req.body);
    res.json(r);
  },
);

// ------------------------------------------------------------------ 4. Printing (Site-scoped)
router.get(
  "/print-templates",
  requireSite(false),
  requirePermission("admin.config.manage"),
  (req, res) => {
    res.json({
      items: printTemplates,
      total: printTemplates.length,
      nextCursor: null,
    });
  },
);

router.post(
  "/print-templates",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const newPt = {
      printTemplateId: printTemplates.length + 1,
      templateName: req.body.templateName || "Custom Print Template",
      docKind: req.body.docKind || "GENERAL",
      languageCode: req.body.languageCode || "en",
      templateHtml:
        req.body.templateHtml || "<html><body>Print Template</body></html>",
      paperSize: req.body.paperSize || "A4",
      status: "ACTIVE",
      logInst: 1,
      ...req.body,
    };
    printTemplates.push(newPt as any);
    res.status(201).json(newPt);
  },
);

router.get(
  "/print-templates/:printTemplateId",
  requireSite(false),
  requirePermission("admin.config.manage"),
  (req, res) => {
    const pt = (printTemplates as any[]).find(
      (x) => String(x.printTemplateId) === req.params.printTemplateId,
    );
    if (!pt) return res.status(404).json({ error: "Print template not found" });
    res.json(pt);
  },
);

router.patch(
  "/print-templates/:printTemplateId",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const pt = (printTemplates as any[]).find(
      (x) => String(x.printTemplateId) === req.params.printTemplateId,
    );
    if (!pt) return res.status(404).json({ error: "Print template not found" });
    Object.assign(pt, req.body);
    res.json(pt);
  },
);

router.post("/print", requireSite(false), (req, res) => {
  res.status(201).json({
    printJobId: Date.now(),
    templateId: req.body.templateId,
    docKind: req.body.docKind || "TAX_INVOICE",
    targetPrinter: req.body.printer || "GATE_PRINTER_01",
    status: "QUEUED",
    submittedAt: new Date().toISOString(),
  });
});

// ------------------------------------------------------------------ 5. Aiva Agent (Site-scoped)
router.get(
  "/aiva/conversations",
  requireSite(false),
  requirePermission("aiva.use"),
  (req, res) => {
    res.json({
      items: aivaConversations,
      total: aivaConversations.length,
      nextCursor: null,
    });
  },
);

router.post(
  "/aiva/conversations",
  requireSite(false),
  requirePermission("aiva.use", "DO"),
  (req, res) => {
    const newConv = {
      aivaConversationId: aivaConversations.length + 1,
      title: req.body.title || "New ICD Assistant Chat",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    aivaConversations.push(newConv);
    res.status(201).json(newConv);
  },
);

router.get(
  "/aiva/conversations/:aivaConversationId/messages",
  requireSite(false),
  requirePermission("aiva.use"),
  (req, res) => {
    const conv = aivaConversations.find(
      (c) => String(c.aivaConversationId) === req.params.aivaConversationId,
    );
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    res.json({
      items: conv.messages || [],
      total: (conv.messages || []).length,
      nextCursor: null,
    });
  },
);

router.post(
  "/aiva/conversations/:aivaConversationId/messages",
  requireSite(false),
  requirePermission("aiva.use", "DO"),
  (req, res) => {
    const conv = aivaConversations.find(
      (c) => String(c.aivaConversationId) === req.params.aivaConversationId,
    );
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    const userMsg = {
      aivaMessageId: Date.now(),
      sender: "USER",
      text: req.body.text || req.body.message || "",
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(userMsg);

    // Auto-generate Aiva intelligence reply
    const replyMsg = {
      aivaMessageId: Date.now() + 1,
      sender: "AIVA",
      text: `I examined terminal operations for "${userMsg.text}". Current yard utilization is 61.2% with 98 containers in Block A and 42 in Block B. Gate queue is running with an average 14 min dwell time.`,
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(replyMsg);
    res.status(201).json(replyMsg);
  },
);

router.post(
  [
    "/aiva/messages/:aivaMessageId/feedback",
    "/aiva/messages/:aivaMessageId([0-9a-zA-Z_.-]+)/feedback",
  ],
  requireSite(false),
  requirePermission("aiva.use", "DO"),
  (req, res) => {
    res.json({
      success: true,
      messageId: req.params.aivaMessageId,
      rating: req.body.rating || "UPVOTE",
    });
  },
);

router.get(
  "/aiva/messages/:aivaMessageId/tool-calls",
  requireSite(false),
  requirePermission("aiva.use"),
  (req, res) => {
    res.json({
      messageId: req.params.aivaMessageId,
      toolCalls: [
        {
          toolName: "getYardOccupancy",
          input: { siteId: 1 },
          result: { utilizationPct: 61.25 },
        },
      ],
    });
  },
);

router.get(
  "/aiva/tools",
  requireSite(false),
  requirePermission("aiva.use"),
  (req, res) => {
    res.json({
      items: [
        {
          toolName: "getYardOccupancy",
          description: "Query current block and slot utilization",
        },
        {
          toolName: "getGateVisitStatus",
          description: "Look up real-time truck position in gate lanes",
        },
        {
          toolName: "calculateTariff",
          description: "Simulate invoice charges and storage accruals",
        },
      ],
    });
  },
);

router.get(
  "/aiva/drafts",
  requireSite(false),
  requirePermission("aiva.use"),
  (req, res) => {
    res.json({ items: aivaDrafts, total: aivaDrafts.length, nextCursor: null });
  },
);

router.post(
  "/aiva/drafts/:aivaDraftActionId([0-9a-zA-Z_.-]+):submit",
  requireSite(false),
  requirePermission("aiva.use", "DO"),
  (req, res) => {
    const draft = aivaDrafts.find(
      (d) => String(d.aivaDraftActionId) === req.params.aivaDraftActionId,
    );
    if (draft) draft.status = "EXECUTED";
    res.json({ success: true, draft });
  },
);

router.post(
  "/aiva/drafts/:aivaDraftActionId([0-9a-zA-Z_.-]+):discard",
  requireSite(false),
  requirePermission("aiva.use", "DO"),
  (req, res) => {
    const draft = aivaDrafts.find(
      (d) => String(d.aivaDraftActionId) === req.params.aivaDraftActionId,
    );
    if (draft) draft.status = "DISCARDED";
    res.json({ success: true, draft });
  },
);

export const insightRouter = router;
