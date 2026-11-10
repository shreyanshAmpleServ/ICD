import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

function resolveOpenApiSpecPath(): string {
  if (process.env.OPENAPI_SPEC_PATH && fs.existsSync(process.env.OPENAPI_SPEC_PATH)) {
    return process.env.OPENAPI_SPEC_PATH;
  }
  const localBackendSpec = path.resolve(process.cwd(), 'ng_icd_api.yaml');
  if (fs.existsSync(localBackendSpec)) {
    return localBackendSpec;
  }
  const docsSpec = path.resolve(__dirname, '../docs/ng_icd_api.yaml');
  if (fs.existsSync(docsSpec)) {
    return docsSpec;
  }
  return path.resolve(process.cwd(), '../API/NG_ICD_API_contract/ng_icd_api.yaml');
}

function parsePort(val?: string, defaultPort: number = 4000): number | string {
  if (!val) return defaultPort;
  // If Windows named pipe (iisnode) or non-numeric port string, return as string
  if (val.startsWith('\\\\.\\pipe\\') || isNaN(Number(val))) {
    return val;
  }
  return parseInt(val, 10);
}

export const ENV = {
  PORT: parsePort(process.env.PORT, 4000),
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
