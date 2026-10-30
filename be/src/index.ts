(BigInt.prototype as any).toJSON = function() { return Number(this); };
import { initPrisma } from './configs/prisma';
import { startServer } from './server';

async function bootstrap(): Promise<void> {
  // 1. Initialize Database Connection (MSSQL with fallback)
  await initPrisma();

  // 2. Start HTTP Server & Port Listener
  startServer();
}

bootstrap().catch(err => {
  console.error('[Bootstrap] Fatal error during startup:', err);
  process.exit(1);
});

