"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.docsRouter = void 0;
const express_1 = require("express");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yaml_1 = __importDefault(require("yaml"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../configs/env");
const router = (0, express_1.Router)();
if (env_1.ENV.SWAGGER_ENABLED && fs_1.default.existsSync(env_1.ENV.OPENAPI_SPEC_PATH)) {
    try {
        const rawYaml = fs_1.default.readFileSync(env_1.ENV.OPENAPI_SPEC_PATH, 'utf8');
        const swaggerDocument = yaml_1.default.parse(rawYaml);
        // Serve swagger UI assets & document
        router.use('/docs', swagger_ui_express_1.default.serve);
        router.get('/docs', swagger_ui_express_1.default.setup(swaggerDocument, {
            customSiteTitle: 'DCC NG ICD API Specification',
            customCss: '.swagger-ui .topbar { display: none }',
            swaggerOptions: {
                docExpansion: 'list',
                filter: true
            }
        }));
        // Raw OpenAPI specification JSON endpoint
        router.get('/openapi.json', (req, res) => {
            res.json(swaggerDocument);
        });
        console.log('[Swagger] API Documentation mounted at /api/docs');
    }
    catch (err) {
        console.warn('[Swagger] Failed to load OpenAPI YAML:', err.message);
    }
}
exports.docsRouter = router;
