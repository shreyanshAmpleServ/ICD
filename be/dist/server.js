"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const env_1 = require("./configs/env");
const jobs_1 = require("./jobs");
function startServer() {
    // Initialize Scheduled Cron Tasks
    (0, jobs_1.initJobs)();
    const server = http_1.default.createServer(app_1.app);
    server.listen(env_1.ENV.PORT, () => {
        console.log(`====================================================`);
        console.log(`  🚀 DCC NG ICD Backend Service`);
        console.log(`  📡 API Base URL:  http://localhost:${env_1.ENV.PORT}${env_1.ENV.API_PREFIX}`);
        console.log(`  📦 V1 Endpoints:  http://localhost:${env_1.ENV.PORT}${env_1.ENV.API_PREFIX}/v1`);
        console.log(`  📚 Swagger Docs:  http://localhost:${env_1.ENV.PORT}${env_1.ENV.API_PREFIX}/docs`);
        console.log(`  🩺 Health Check: http://localhost:${env_1.ENV.PORT}${env_1.ENV.API_PREFIX}/health`);
        console.log(`  💾 Target DB:     Microsoft SQL Server (MSSQL) via Prisma`);
        console.log(`====================================================`);
    });
    // Graceful Shutdown
    const handleShutdown = (signal) => {
        console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
        server.close(() => {
            console.log('[Server] HTTP listener closed.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    return server;
}
