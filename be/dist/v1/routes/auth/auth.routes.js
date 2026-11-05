"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const auth_1 = require("../../controllers/auth");
exports.authRoutes = (0, express_1.Router)();
// Session & User Profile
exports.authRoutes.get('/me', (0, siteScope_1.requireSite)(true), auth_1.authSessionController.getMe);
exports.authRoutes.get('/auth/me', (0, siteScope_1.requireSite)(true), auth_1.authSessionController.getMe);
exports.authRoutes.patch('/me', (0, siteScope_1.requireSite)(true), auth_1.authSessionController.updateProfile);
exports.authRoutes.put('/me', (0, siteScope_1.requireSite)(true), auth_1.authSessionController.updateProfile);
exports.authRoutes.patch('/me/profile', (0, siteScope_1.requireSite)(true), auth_1.authSessionController.updateProfile);
exports.authRoutes.patch('/users/profile', (0, siteScope_1.requireSite)(true), auth_1.authSessionController.updateProfile);
exports.authRoutes.post('/session/switch-site', (0, siteScope_1.requireSite)(true), auth_1.authSessionController.switchSite);
// Access
exports.authRoutes.get('/access/permissions', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('masters.view'), auth_1.authAccessController.getPermissions);
exports.authRoutes.get('/access/roles/:roleCode/grants', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('masters.view'), auth_1.authAccessController.getRoleGrants);
