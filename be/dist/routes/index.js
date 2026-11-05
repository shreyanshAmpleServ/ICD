"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const swagger_1 = require("../configs/swagger");
const routes_1 = require("../v1/routes");
exports.apiRouter = (0, express_1.Router)();
// Mount Documentation (/api/docs, /api/openapi.json)
exports.apiRouter.use(swagger_1.swaggerRouter);
// Health check endpoint (/api/health)
exports.apiRouter.get('/health', (_req, res) => {
    res.json({
        status: 'HEALTHY',
        service: 'DCC NG ICD Backend',
        version: '1.0.0',
        architecture: 'dcc-sfa-layered',
        timestamp: new Date().toISOString()
    });
});
// Version 1 API Layer (/api/v1/...)
exports.apiRouter.use('/v1', routes_1.v1Router);
// Direct mount for 100% backward compatibility with existing UI / OpenAPI contract
exports.apiRouter.use(routes_1.v1Router);
exports.default = exports.apiRouter;
