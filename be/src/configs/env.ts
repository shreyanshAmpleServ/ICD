import dotenv from "dotenv";
import { resolve } from "path";
import fs from "fs";

if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL found in environment variables");
} else {
  let envMode = (
    process.env.APP_ENV ||
    process.env.NODE_ENV ||
    process.env.env ||
    ""
  ).toLowerCase();

  if (!envMode || envMode === "production" || envMode === "prod") {
    if (__dirname.includes("dist-testing")) envMode = "testing";
    else if (__dirname.includes("dist-staging")) envMode = "staging";
    else if (__dirname.includes("dist-demo")) envMode = "demo";
    else if (!envMode) envMode = "development";
  }

  const isProduction = envMode === "production" || envMode === "prod";

  const isTesting = envMode === "testing" || envMode === "test";

  const isStaging = envMode === "staging" || envMode === "stage";

  const isDemo = envMode === "demo";

  const possiblePaths: string[] = [
    ...(isProduction
      ? [
          resolve(process.cwd(), ".env.production"),
          resolve(process.cwd(), "be/.env.production"),
          resolve(__dirname, "../../.env.production"),
          resolve(__dirname, "../../../.env.production"),
        ]
      : []),
    ...(isTesting
      ? [
          resolve(process.cwd(), ".env.testing"),
          resolve(process.cwd(), "be/.env.testing"),
          resolve(__dirname, "../../.env.testing"),
          resolve(__dirname, "../../../.env.testing"),
        ]
      : []),
    ...(isStaging
      ? [
          resolve(process.cwd(), ".env.staging"),
          resolve(process.cwd(), "be/.env.staging"),
          resolve(__dirname, "../../.env.staging"),
          resolve(__dirname, "../../../.env.staging"),
        ]
      : []),
    ...(isDemo
      ? [
          resolve(process.cwd(), ".env.demo"),
          resolve(process.cwd(), "be/.env.demo"),
          resolve(__dirname, "../../.env.demo"),
          resolve(__dirname, "../../../.env.demo"),
        ]
      : []),

    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "be/.env"),
    resolve(process.cwd(), ".env.development"),
    resolve(process.cwd(), "be/.env.development"),
    resolve(__dirname, "../../.env"),
    resolve(__dirname, "../../../.env"),
    ".env",
  ];

  let envLoaded = false;
  for (const p of possiblePaths) {
    try {
      if (!fs.existsSync(p)) continue;
      const result = dotenv.config({ path: p });
      if (result.error) {
        continue;
      }
      if (process.env.DATABASE_URL) {
        envLoaded = true;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!envLoaded && !process.env.DATABASE_URL) {
    console.warn("Warning: DATABASE_URL not found in any .env file");
    console.warn("Attempted paths:", possiblePaths);
    console.warn(
      "Available env vars:",
      Object.keys(process.env).filter((key) => key.includes("DATABASE")),
    );
    console.warn("Current working directory:", process.cwd());
    console.warn("Module directory:", __dirname);
    console.warn("NODE_ENV:", process.env.NODE_ENV);
  }
}

function resolveOpenApiSpecPath(): string {
  if (
    process.env.OPENAPI_SPEC_PATH &&
    fs.existsSync(process.env.OPENAPI_SPEC_PATH)
  ) {
    return process.env.OPENAPI_SPEC_PATH;
  }
  const localBackendSpec = resolve(process.cwd(), "ng_icd_api.yaml");
  if (fs.existsSync(localBackendSpec)) {
    return localBackendSpec;
  }
  const docsSpec = resolve(__dirname, "../docs/ng_icd_api.yaml");
  if (fs.existsSync(docsSpec)) {
    return docsSpec;
  }
  return resolve(process.cwd(), "../API/NG_ICD_API_contract/ng_icd_api.yaml");
}

function parsePort(val?: string, defaultPort: number = 4000): number | string {
  if (!val) return defaultPort;
  if (val.startsWith("\\\\.\\pipe\\") || isNaN(Number(val))) {
    return val;
  }
  return parseInt(val, 10);
}

export const ENV = {
  PORT: parsePort(process.env.PORT, 4000),
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_ENV: process.env.APP_ENV || process.env.NODE_ENV || "development",
  API_PREFIX: process.env.API_PREFIX || "/api",
  DATABASE_URL: process.env.DATABASE_URL || "",
  ENABLE_FALLBACK_STORE: process.env.ENABLE_FALLBACK_STORE !== "false",
  CORS_ORIGIN: (
    process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000"
  ).split(","),
  JWT_SECRET:
    process.env.JWT_SECRET || "icd-dev-secret-key-change-in-production-2026",
  SWAGGER_ENABLED: process.env.SWAGGER_ENABLED !== "false",
  DEFAULT_SITE_ID: process.env.DEFAULT_SITE_ID || "DAR1",
  OPENAPI_SPEC_PATH: resolveOpenApiSpecPath(),
};

export const config = {
  database: {
    url: ENV.DATABASE_URL,
  },
  jwt: {
    secret: ENV.JWT_SECRET,
  },
  server: {
    port:
      typeof ENV.PORT === "number"
        ? ENV.PORT
        : parseInt(String(ENV.PORT), 10) || 4000,
    apiPrefix: ENV.API_PREFIX,
  },
};

export default ENV;
