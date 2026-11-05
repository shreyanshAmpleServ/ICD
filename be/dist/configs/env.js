"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
function resolveOpenApiSpecPath() {
    if (process.env.OPENAPI_SPEC_PATH && fs_1.default.existsSync(process.env.OPENAPI_SPEC_PATH)) {
        return process.env.OPENAPI_SPEC_PATH;
    }
    const localBackendSpec = path_1.default.resolve(process.cwd(), 'ng_icd_api.yaml');
    if (fs_1.default.existsSync(localBackendSpec)) {
        return localBackendSpec;
    }
    const docsSpec = path_1.default.resolve(__dirname, '../docs/ng_icd_api.yaml');
    if (fs_1.default.existsSync(docsSpec)) {
        return docsSpec;
    }
    return path_1.default.resolve(process.cwd(), '../API/NG_ICD_API_contract/ng_icd_api.yaml');
}
exports.ENV = {
    PORT: parseInt(process.env.PORT || '4000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    API_PREFIX: process.env.API_PREFIX || '/api',
    DATABASE_URL: process.env.DATABASE_URL || '',
    ENABLE_FALLBACK_STORE: process.env.ENABLE_FALLBACK_STORE !== 'false',
    CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(','),
    JWT_SECRET: process.env.JWT_SECRET || 'icd-dev-secret-key-change-in-production-2026',
    SWAGGER_ENABLED: process.env.SWAGGER_ENABLED !== 'false',
    DEFAULT_SITE_ID: process.env.DEFAULT_SITE_ID || 'DAR1',
    OPENAPI_SPEC_PATH: resolveOpenApiSpecPath()
};
