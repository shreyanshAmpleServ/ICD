import http from 'http';
import { app } from './app';
import { ENV } from './configs/env';
import { initJobs } from './jobs';

export function startServer(): http.Server {
  // Initialize Scheduled Cron Tasks
  initJobs();

  const server = http.createServer(app);

  const isPipe = typeof ENV.PORT === 'string' && (ENV.PORT.startsWith('\\\\.\\pipe\\') || isNaN(Number(ENV.PORT)));

  if (isPipe) {
    server.listen(ENV.PORT as string, () => {
      console.log(`====================================================`);
      console.log(`  🚀 DCC NG ICD Backend Service (iisnode / Windows named pipe)`);
      console.log(`  📡 Named Pipe:    ${ENV.PORT}`);
      console.log(`  📦 V1 Endpoints:  ${ENV.API_PREFIX}/v1`);
      console.log(`  📚 Swagger Docs:  ${ENV.API_PREFIX}/docs`);
      console.log(`  🩺 Health Check: ${ENV.API_PREFIX}/health`);
      console.log(`  💾 Target DB:     Microsoft SQL Server (MSSQL) via Prisma`);
      console.log(`====================================================`);
    });
  } else {
    const port = typeof ENV.PORT === 'number' ? ENV.PORT : parseInt(String(ENV.PORT), 10) || 4000;
    server.listen(port, () => {
      console.log(`====================================================`);
      console.log(`  🚀 DCC NG ICD Backend Service`);
      console.log(`  📡 API Base URL:  http://localhost:${port}${ENV.API_PREFIX}`);
      console.log(`  📦 V1 Endpoints:  http://localhost:${port}${ENV.API_PREFIX}/v1`);
      console.log(`  📚 Swagger Docs:  http://localhost:${port}${ENV.API_PREFIX}/docs`);
      console.log(`  🩺 Health Check: http://localhost:${port}${ENV.API_PREFIX}/health`);
      console.log(`  💾 Target DB:     Microsoft SQL Server (MSSQL) via Prisma`);
      console.log(`====================================================`);
    });
  }

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
