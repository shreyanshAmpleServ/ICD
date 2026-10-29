import { PrismaClient } from '@prisma/client';
import { ENV } from '../config/env';

let prisma: PrismaClient | null = null;
let isMssqlConnected = false;

export async function initPrisma(): Promise<{ prisma: PrismaClient | null; isConnected: boolean }> {
  if (!ENV.DATABASE_URL || ENV.DATABASE_URL.includes('YourStrong@Passw0rd')) {
    console.log('[MSSQL / Prisma] DATABASE_URL is not configured with live credentials. Operating with dynamic seed repository.');
    return { prisma: null, isConnected: false };
  }

  try {
    prisma = new PrismaClient({
      datasources: {
        db: { url: ENV.DATABASE_URL }
      },
      log: ENV.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });

    await prisma.$connect();
    isMssqlConnected = true;
    console.log('[MSSQL / Prisma] Connected successfully to Microsoft SQL Server.');
    return { prisma, isConnected: true };
  } catch (err: any) {
    console.warn('[MSSQL / Prisma] Unable to reach SQL Server (' + (err.message || 'Connection refused') + ').');
    console.warn('[MSSQL / Prisma] Dynamic fallback in-memory store is active for development & UI testing.');
    isMssqlConnected = false;
    return { prisma: null, isConnected: false };
  }
}

export function getPrisma(): PrismaClient | null {
  return prisma;
}

export function isDbLive(): boolean {
  return isMssqlConnected;
}
