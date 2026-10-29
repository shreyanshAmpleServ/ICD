import http from 'http';
import { app } from './app';
import { ENV } from './configs/env';
import { initJobs } from './jobs';

export function startServer(): http.Server {
  // Initialize Scheduled Cron Tasks
  initJobs();

  const server = http.createServer(app);

  server.listen(ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`  🚀 DCC NG ICD Backend Service`);
    console.log(`  📡 API Base URL:  http://localhost:${ENV.PORT}${ENV.API_PREFIX}`);
    console.log(`  📦 V1 Endpoints:  http://localhost:${ENV.PORT}${ENV.API_PREFIX}/v1`);
    console.log(`  📚 Swagger Docs:  http://localhost:${ENV.PORT}${ENV.API_PREFIX}/docs`);
    console.log(`  🩺 Health Check: http://localhost:${ENV.PORT}${ENV.API_PREFIX}/health`);
    console.log(`  💾 Target DB:     Microsoft SQL Server (MSSQL) via Prisma`);
    console.log(`====================================================`);
  });

  // Graceful Shutdown
  const handleShutdown = (signal: string) => {
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
