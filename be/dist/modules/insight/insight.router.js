"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insightRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const insight_1 = require("../../data/insight");
const admin_1 = require("../../data/admin");
const cargo_1 = require("../../data/cargo");
const prisma_1 = require("../../db/prisma");
const router = (0, express_1.Router)();
// In-memory reports runs
const reportRuns = [
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
let aivaConversations = [
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
let aivaDrafts = [
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
router.get(["/dashboards/control-tower", "/control-tower"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("dashboard.control_tower"), async (req, res) => {
    const baseData = (0, insight_1.controlTower)(Number(req.siteId) || 1);
    if ((0, prisma_1.isDbLive)()) {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            try {
                const [truckCount, excCount] = await Promise.all([
                    prisma.truck_visits.count(),
                    prisma.exception_cases.count({ where: { status: "OPEN" } }),
                ]);
                if (baseData && baseData.kpis) {
                    baseData.kpis.trucksOnSite = truckCount;
                    baseData.kpis.openExceptions = excCount;
                }
            }
            catch (err) {
                console.warn("[InsightRouter] DB query error on control-tower:", err);
            }
        }
    }
    res.json(baseData);
});
router.get("/dashboards/:dashboardCode", (0, siteScope_1.requireSite)(false), (req, res) => {
    res.json({
        dashboardCode: req.params.dashboardCode,
        siteId: 1,
        updatedAt: new Date().toISOString(),
        kpis: insight_1.kpiTiles,
        series: insight_1.kpiSeries,
    });
});
router.get(["/kpis", "/kpis/tiles"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("dashboard.executive"), (req, res) => {
    res.json({
        items: insight_1.kpiTiles,
        series: insight_1.kpiSeries,
        total: insight_1.kpiTiles.length,
        nextCursor: null,
    });
});
router.get("/kpis/series", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("dashboard.executive"), (req, res) => {
    res.json({
        items: insight_1.kpiSeries,
        total: Object.keys(insight_1.kpiSeries).length,
        nextCursor: null,
    });
});
// ------------------------------------------------------------------ 2. Reports (Site-scoped)
router.get("/reports", (0, siteScope_1.requireSite)(false), (req, res) => {
    res.json({ items: insight_1.reports, total: insight_1.reports.length, nextCursor: null });
});
router.post("/reports/:reportCode/runs", (0, siteScope_1.requireSite)(false), (req, res) => {
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
router.get("/report-runs/:reportRunId", (0, siteScope_1.requireSite)(false), (req, res) => {
    const r = reportRuns.find((x) => String(x.reportRunId) === req.params.reportRunId);
    if (!r)
        return res.status(404).json({ error: "Report run not found" });
    res.json(r);
});
router.get("/report-runs/:reportRunId/file", (0, siteScope_1.requireSite)(false), (req, res) => {
    res.json({
        reportRunId: req.params.reportRunId,
        fileName: `report-${req.params.reportRunId}.xlsx`,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        downloadUrl: `https://downloads.icd.dcc/reports/${req.params.reportRunId}.xlsx`,
    });
});
router.get("/saved-reports", (0, siteScope_1.requireSite)(false), (req, res) => {
    res.json({
        items: insight_1.savedReports,
        total: insight_1.savedReports.length,
        nextCursor: null,
    });
});
router.post("/saved-reports", (0, siteScope_1.requireSite)(false), (req, res) => {
    const newSr = {
        savedReportId: insight_1.savedReports.length + 1,
        name: req.body.name || "Custom Saved Report",
        reportCode: req.body.reportCode || "YARD_STOCK",
        parameters: req.body.parameters || {},
        createdBy: req.user?.username || "Current User",
        createdAt: new Date().toISOString(),
        logInst: 1,
        ...req.body,
    };
    insight_1.savedReports.push(newSr);
    res.status(201).json(newSr);
});
router.get("/saved-reports/:savedReportId", (0, siteScope_1.requireSite)(false), (req, res) => {
    const sr = insight_1.savedReports.find((x) => String(x.savedReportId) === req.params.savedReportId);
    if (!sr)
        return res.status(404).json({ error: "Saved report not found" });
    res.json(sr);
});
router.patch("/saved-reports/:savedReportId", (0, siteScope_1.requireSite)(false), (req, res) => {
    const sr = insight_1.savedReports.find((x) => String(x.savedReportId) === req.params.savedReportId);
    if (!sr)
        return res.status(404).json({ error: "Saved report not found" });
    Object.assign(sr, req.body);
    res.json(sr);
});
router.delete("/saved-reports/:savedReportId", (0, siteScope_1.requireSite)(false), (req, res) => {
    const idx = insight_1.savedReports.findIndex((x) => String(x.savedReportId) === req.params.savedReportId);
    if (idx >= 0)
        insight_1.savedReports.splice(idx, 1);
    res.status(204).end();
});
router.get("/notifications/inbox", (0, siteScope_1.requireSite)(true), async (req, res) => {
    let items = cargo_1.notifications;
    if ((0, prisma_1.isDbLive)()) {
        const prisma = (0, prisma_1.getPrisma)();
        if (prisma) {
            try {
                const dbNotifs = await prisma.notifications.findMany({
                    orderBy: { notification_id: "desc" },
                });
                if (dbNotifs && dbNotifs.length > 0) {
                    const mapped = dbNotifs.map((n) => {
                        let kind = "EXCEPTION";
                        if (n.event_type?.includes("HOLD"))
                            kind = "HOLD";
                        else if (n.event_type?.includes("APPROVAL"))
                            kind = "APPROVAL";
                        else if (n.event_type?.includes("RELEASE"))
                            kind = "RELEASE";
                        else if (n.event_type?.includes("PAYMENT"))
                            kind = "PAYMENT";
                        return {
                            notificationId: n.notification_id,
                            kind,
                            subject: n.title,
                            body: n.message,
                            to: kind === "HOLD"
                                ? "/gate"
                                : kind === "APPROVAL"
                                    ? "/approvals"
                                    : "/units",
                            createdAt: n.created_at?.toISOString() || new Date().toISOString(),
                            readAt: n.is_read ? new Date().toISOString() : undefined,
                        };
                    });
                    const dbIds = new Set(mapped.map((m) => m.notificationId));
                    items = [
                        ...mapped,
                        ...cargo_1.notifications.filter((nt) => !dbIds.has(nt.notificationId)),
                    ];
                }
            }
            catch (err) {
                console.warn("[InsightRouter] DB query error on notifications/inbox:", err);
            }
        }
    }
    res.json({
        items,
        total: items.length,
        unreadCount: items.filter((n) => !n.readAt).length,
        nextCursor: null,
    });
});
router.post("/notifications/:notificationId([0-9a-zA-Z_.-]+):read", (0, siteScope_1.requireSite)(false), (req, res) => {
    const n = cargo_1.notifications.find((x) => String(x.notificationId) === req.params.notificationId);
    if (n)
        n.read = true;
    res.json({ success: true, notification: n });
});
router.post("/notifications:read-all", (0, siteScope_1.requireSite)(false), (req, res) => {
    cargo_1.notifications.forEach((n) => {
        n.read = true;
    });
    res.json({ success: true, count: cargo_1.notifications.length });
});
router.get("/notification-templates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), (req, res) => {
    res.json({
        items: admin_1.notificationTemplates,
        total: admin_1.notificationTemplates.length,
        nextCursor: null,
    });
});
router.post("/notification-templates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newTmpl = {
        notificationTemplateId: admin_1.notificationTemplates.length + 1,
        templateCode: req.body.templateCode || `NOTIF_${admin_1.notificationTemplates.length + 1}`,
        templateName: req.body.templateName || "Custom Notification",
        channel: req.body.channel || "SMS",
        bodyTemplate: req.body.bodyTemplate || "Alert: {MESSAGE}",
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    admin_1.notificationTemplates.push(newTmpl);
    res.status(201).json(newTmpl);
});
router.get("/notification-templates/:notificationTemplateId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), (req, res) => {
    const t = admin_1.notificationTemplates.find((x) => String(x.notificationTemplateId) ===
        req.params.notificationTemplateId ||
        x.code === req.params.notificationTemplateId);
    if (!t)
        return res.status(404).json({ error: "Notification template not found" });
    res.json(t);
});
router.patch("/notification-templates/:notificationTemplateId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const t = admin_1.notificationTemplates.find((x) => String(x.notificationTemplateId) ===
        req.params.notificationTemplateId ||
        x.code === req.params.notificationTemplateId);
    if (!t)
        return res.status(404).json({ error: "Notification template not found" });
    Object.assign(t, req.body);
    res.json(t);
});
router.get("/notification-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), (req, res) => {
    res.json({
        items: admin_1.notificationRules,
        total: admin_1.notificationRules.length,
        nextCursor: null,
    });
});
router.post("/notification-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newRule = {
        notificationRuleId: admin_1.notificationRules.length + 1,
        eventType: req.body.eventType || "CUSTOM",
        templateCode: req.body.templateCode || "GENERIC_ALERT",
        recipientKind: req.body.recipientKind || "ROLE",
        channel: req.body.channel || "IN_APP",
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    admin_1.notificationRules.push(newRule);
    res.status(201).json(newRule);
});
router.get("/notification-rules/:notificationRuleId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), (req, res) => {
    const r = admin_1.notificationRules.find((x) => String(x.notificationRuleId) === req.params.notificationRuleId);
    if (!r)
        return res.status(404).json({ error: "Notification rule not found" });
    res.json(r);
});
router.patch("/notification-rules/:notificationRuleId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const r = admin_1.notificationRules.find((x) => String(x.notificationRuleId) === req.params.notificationRuleId);
    if (!r)
        return res.status(404).json({ error: "Notification rule not found" });
    Object.assign(r, req.body);
    res.json(r);
});
// ------------------------------------------------------------------ 4. Printing (Site-scoped)
router.get("/print-templates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), (req, res) => {
    res.json({
        items: admin_1.printTemplates,
        total: admin_1.printTemplates.length,
        nextCursor: null,
    });
});
router.post("/print-templates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newPt = {
        printTemplateId: admin_1.printTemplates.length + 1,
        templateName: req.body.templateName || "Custom Print Template",
        docKind: req.body.docKind || "GENERAL",
        languageCode: req.body.languageCode || "en",
        templateHtml: req.body.templateHtml || "<html><body>Print Template</body></html>",
        paperSize: req.body.paperSize || "A4",
        status: "ACTIVE",
        logInst: 1,
        ...req.body,
    };
    admin_1.printTemplates.push(newPt);
    res.status(201).json(newPt);
});
router.get("/print-templates/:printTemplateId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), (req, res) => {
    const pt = admin_1.printTemplates.find((x) => String(x.printTemplateId) === req.params.printTemplateId);
    if (!pt)
        return res.status(404).json({ error: "Print template not found" });
    res.json(pt);
});
router.patch("/print-templates/:printTemplateId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const pt = admin_1.printTemplates.find((x) => String(x.printTemplateId) === req.params.printTemplateId);
    if (!pt)
        return res.status(404).json({ error: "Print template not found" });
    Object.assign(pt, req.body);
    res.json(pt);
});
router.post("/print", (0, siteScope_1.requireSite)(false), (req, res) => {
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
router.get("/aiva/conversations", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use"), (req, res) => {
    res.json({
        items: aivaConversations,
        total: aivaConversations.length,
        nextCursor: null,
    });
});
router.post("/aiva/conversations", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use", "DO"), (req, res) => {
    const newConv = {
        aivaConversationId: aivaConversations.length + 1,
        title: req.body.title || "New ICD Assistant Chat",
        createdAt: new Date().toISOString(),
        messages: [],
    };
    aivaConversations.push(newConv);
    res.status(201).json(newConv);
});
router.get("/aiva/conversations/:aivaConversationId/messages", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use"), (req, res) => {
    const conv = aivaConversations.find((c) => String(c.aivaConversationId) === req.params.aivaConversationId);
    if (!conv)
        return res.status(404).json({ error: "Conversation not found" });
    res.json({
        items: conv.messages || [],
        total: (conv.messages || []).length,
        nextCursor: null,
    });
});
router.post("/aiva/conversations/:aivaConversationId/messages", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use", "DO"), (req, res) => {
    const conv = aivaConversations.find((c) => String(c.aivaConversationId) === req.params.aivaConversationId);
    if (!conv)
        return res.status(404).json({ error: "Conversation not found" });
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
});
router.post([
    "/aiva/messages/:aivaMessageId/feedback",
    "/aiva/messages/:aivaMessageId([0-9a-zA-Z_.-]+)/feedback",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use", "DO"), (req, res) => {
    res.json({
        success: true,
        messageId: req.params.aivaMessageId,
        rating: req.body.rating || "UPVOTE",
    });
});
router.get("/aiva/messages/:aivaMessageId/tool-calls", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use"), (req, res) => {
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
});
router.get("/aiva/tools", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use"), (req, res) => {
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
});
router.get("/aiva/drafts", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use"), (req, res) => {
    res.json({ items: aivaDrafts, total: aivaDrafts.length, nextCursor: null });
});
router.post("/aiva/drafts/:aivaDraftActionId([0-9a-zA-Z_.-]+):submit", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use", "DO"), (req, res) => {
    const draft = aivaDrafts.find((d) => String(d.aivaDraftActionId) === req.params.aivaDraftActionId);
    if (draft)
        draft.status = "EXECUTED";
    res.json({ success: true, draft });
});
router.post("/aiva/drafts/:aivaDraftActionId([0-9a-zA-Z_.-]+):discard", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("aiva.use", "DO"), (req, res) => {
    const draft = aivaDrafts.find((d) => String(d.aivaDraftActionId) === req.params.aivaDraftActionId);
    if (draft)
        draft.status = "DISCARDED";
    res.json({ success: true, draft });
});
exports.insightRouter = router;
