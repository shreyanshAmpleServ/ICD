import { PrismaClient } from '@prisma/client';
import { ENV } from './env';

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

    // Provide model aliases for plural/legacy naming compatibility
    const p = prisma as any;
    p.unit_stays = p.unit_stay;
    p.appointments = p.appointment;
    p.invoices = p.invoice;
    p.invoice_lines = p.invoice_line;
    p.documents = p.document;
    p.service_requests = p.service_request;
    p.portal_invitations = p.portal_invitation;
    p.visit_types = p.m_visit_type;
    p.parties = p.m_party;
    p.unit_types = p.m_unit_type;
    p.yard_locations = p.m_yard_location;
    p.holds = p.hold;
    p.yard_moves = p.yard_move;
    p.reefer_sessions = p.reefer_session;
    p.reefer_readings = p.reefer_reading;
    p.repair_codes = p.m_repair_code;
    p.repair_estimates = p.repair_estimate;
    p.labour_contractors = p.labour_contractor;
    p.handling_jobs = p.handling_job;
    p.handling_job_lines = p.handling_job_line;
    p.appointment_slot_rules = p.m_appointment_slot_rule;
    p.device_integrations = p.m_device_integration;
    p.truck_visits = p.truck_visit;
    p.sites = p.m_site;
    p.roles = p.m_role;
    p.permissions = p.m_permission;
    p.companies = p.m_company;
    p.users = p.app_user;
    p.cargo_regimes = p.m_cargo_regime;
    p.drivers = p.m_driver;
    p.trucks = p.m_truck;
    p.equipment = p.m_equipment;
    p.consignments = p.consignment;

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

