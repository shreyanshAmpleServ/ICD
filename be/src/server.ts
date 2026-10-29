import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ENV } from './config/env';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initPrisma } from './db/prisma';

async function bootstrap() {
  const app = express();

  // Basic Middlewares
  app.use(cors({
    origin: (origin, callback) => callback(null, true), // Allow frontend dev servers
    credentials: true,
    exposedHeaders: ['Idempotency-Key', 'If-Match', 'ETag', 'X-Site-Id']
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // Initialize Database Connection
  await initPrisma();

  // Mount API Routers
  app.use(ENV.API_PREFIX, apiRouter);

  // Global Error Handler
  app.use(errorHandler);

  // Start HTTP Listener
  app.listen(ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`  🚀 DCC NG ICD Backend Server is Running!`);
    console.log(`  📡 API Base URL:  http://localhost:${ENV.PORT}${ENV.API_PREFIX}`);
    console.log(`  📚 Swagger Docs:  http://localhost:${ENV.PORT}${ENV.API_PREFIX}/docs`);
    console.log(`  🩺 Health Check: http://localhost:${ENV.PORT}${ENV.API_PREFIX}/health`);
    console.log(`  💾 Target DB:     Microsoft SQL Server (MSSQL) via Prisma`);
    console.log(`====================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal error during backend server startup:', err);
  process.exit(1);
});
