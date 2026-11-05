"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customersRoutes = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const customers_1 = require("../../controllers/customers");
exports.customersRoutes = (0, express_1.Router)();
// Customer Portal
exports.customersRoutes.get('/portal/overview', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('portal.request.submit'), customers_1.customerPortalController.getOverview);
exports.customersRoutes.get('/portal/requests', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('portal.request.submit'), customers_1.customerPortalController.getRequests);
// Service Requests
exports.customersRoutes.get('/service-requests', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('portal.request.handle'), customers_1.customerServiceRequestsController.getServiceRequests);
exports.customersRoutes.post('/service-requests', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('portal.request.handle', 'DO'), customers_1.customerServiceRequestsController.createServiceRequest);
