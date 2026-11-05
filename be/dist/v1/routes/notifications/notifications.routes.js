"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const notifications_controller_1 = require("../../controllers/notifications.controller");
exports.notificationsRouter = (0, express_1.Router)();
// Dynamic Inbox notifications from DB
exports.notificationsRouter.get('/notifications/inbox', (0, siteScope_1.requireSite)(true), notifications_controller_1.notificationsController.getInbox);
exports.notificationsRouter.get('/me/inbox', (0, siteScope_1.requireSite)(true), notifications_controller_1.notificationsController.getInbox);
exports.notificationsRouter.post('/notifications/:notificationId:read', (0, siteScope_1.requireSite)(false), notifications_controller_1.notificationsController.markRead);
exports.notificationsRouter.post('/notifications/:notificationId/read', (0, siteScope_1.requireSite)(false), notifications_controller_1.notificationsController.markRead);
exports.notificationsRouter.post('/me/inbox/:notificationId/mark-read', (0, siteScope_1.requireSite)(false), notifications_controller_1.notificationsController.markRead);
exports.notificationsRouter.post('/notifications:read-all', (0, siteScope_1.requireSite)(false), notifications_controller_1.notificationsController.markAllRead);
exports.notificationsRouter.post('/notifications/read-all', (0, siteScope_1.requireSite)(false), notifications_controller_1.notificationsController.markAllRead);
exports.notificationsRouter.post('/me/inbox/mark-all-read', (0, siteScope_1.requireSite)(false), notifications_controller_1.notificationsController.markAllRead);
exports.default = exports.notificationsRouter;
