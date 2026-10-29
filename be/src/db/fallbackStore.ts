// Dynamic in-memory seed store mirroring MSSQL schema for instant dev/mock fallback
export interface SiteItem {
  siteId: string;
  siteCode: string;
  siteName: string;
  siteType: 'CONTAINER' | 'VEHICLE' | 'CFS';
  city: string;
  country: string;
  isActive: boolean;
  logInst: number;
}

export interface UnitItem {
  unitStayId: string;
  siteId: string;
  unitNo: string;
  unitTypeCode: string;
  flow: 'IMPORT' | 'EXPORT' | 'DOMESTIC';
  status: 'EXPECTED' | 'GATED_IN' | 'IN_YARD' | 'GATED_OUT';
  sealNo?: string;
  yardLocation?: string;
  grossWeightKg?: number;
  customsStatus: 'PENDING' | 'EXAMINING' | 'CLEARED' | 'HELD';
  releaseStatus: 'BLOCKED' | 'PENDING_CHARGES' | 'READY' | 'RELEASED';
  logInst: number;
}

export interface TruckVisitItem {
  truckVisitId: string;
  siteId: string;
  visitNo: string;
  plateNo: string;
  driverName: string;
  visitType: 'DROP_OFF' | 'PICK_UP' | 'CFS';
  status: 'IN_LANE' | 'INSPECTING' | 'YARD' | 'COMPLETED' | 'TURNED_BACK';
  arrivedAt: string;
  logInst: number;
}

export interface InvoiceItem {
  invoiceId: string;
  siteId: string;
  invoiceNo: string;
  partyName: string;
  status: 'PROFORMA' | 'ISSUED' | 'PAID' | 'CANCELLED';
  currency: string;
  totalAmount: number;
  createdAt: string;
}

class FallbackStore {
  sites: SiteItem[] = [
    { siteId: 'DAR1', siteCode: 'DAR1', siteName: 'Dar es Salaam Container Terminal (DAR1)', siteType: 'CONTAINER', city: 'Dar es Salaam', country: 'TZ', isActive: true, logInst: 1 },
    { siteId: 'DAR2', siteCode: 'DAR2', siteName: 'Dar es Salaam Vehicle Yard (DAR2)', siteType: 'VEHICLE', city: 'Dar es Salaam', country: 'TZ', isActive: true, logInst: 1 },
    { siteId: 'KBH1', siteCode: 'KBH1', siteName: 'Kibaha Warehouse & CFS (KBH1)', siteType: 'CFS', city: 'Kibaha', country: 'TZ', isActive: true, logInst: 1 }
  ];

  companies = [
    { companyId: 'comp-01', companyCode: 'DCC', companyName: 'Depot & Container Control Ltd', taxId: 'TAX-TZ-98721', currencyCode: 'USD', logInst: 1 }
  ];

  numberSequences = [
    { sequenceId: 'seq-ro', code: 'RELEASE_ORDER', prefix: 'RO-DAR1-26-', nextNo: 1943, padLength: 5 },
    { sequenceId: 'seq-inv', code: 'TAX_INVOICE', prefix: 'INV-2026-', nextNo: 840, padLength: 6 },
    { sequenceId: 'seq-vis', code: 'TRUCK_VISIT', prefix: 'VIS-', nextNo: 4412, padLength: 4 }
  ];

  fieldRules = [
    { ruleId: 'fr-01', screenCode: 'GATE_IN', fieldName: 'sealNo', isMandatory: true, isHidden: false, isReadOnly: false },
    { ruleId: 'fr-02', screenCode: 'GATE_IN', fieldName: 'tareWeight', isMandatory: false, isHidden: false, isReadOnly: false }
  ];

  parties = [
    { partyId: 'p-01', partyCode: 'MSK', name: 'Maersk Line A/S', partyType: 'SHIPPING_LINE', taxNo: '100-291-01', email: 'tz.import@maersk.com', phone: '+255 22 211 0000', creditLimit: 250000, isProvisional: false, logInst: 1 },
    { partyId: 'p-02', partyCode: 'CMA', name: 'CMA CGM Tanzania', partyType: 'SHIPPING_LINE', taxNo: '100-452-99', email: 'ops@cma-cgm.tz', phone: '+255 22 212 3344', creditLimit: 180000, isProvisional: false, logInst: 1 },
    { partyId: 'p-03', partyCode: 'BLL', name: 'Bollore Transport & Logistics', partyType: 'CLEARING_AGENT', taxNo: '101-778-32', email: 'agent@bollore.tz', phone: '+255 22 286 1100', creditLimit: 50000, isProvisional: false, logInst: 1 }
  ];

  trucks = [
    { truckId: 'trk-01', plateNo: 'T 124 DFH', countryCode: 'TZ', transporter: 'Bollore Transport', isBlacklisted: false },
    { truckId: 'trk-02', plateNo: 'T 882 CZK', countryCode: 'TZ', transporter: 'Al-Haq Logistics', isBlacklisted: false }
  ];

  drivers = [
    { driverId: 'drv-01', licenseNo: 'DL-TZ-98214', fullName: 'Juma Ramadhani', phone: '+255 71 345 6789', isBlacklisted: false },
    { driverId: 'drv-02', licenseNo: 'DL-TZ-44102', fullName: 'Emmanuel Mwamba', phone: '+255 75 901 2233', isBlacklisted: false }
  ];

  units: UnitItem[] = [
    { unitStayId: 'unit-01', siteId: 'DAR1', unitNo: 'BMLU 402117 3', unitTypeCode: '40HC', flow: 'IMPORT', status: 'IN_YARD', sealNo: 'ML-TZ-9012', yardLocation: 'A-02-04-2', grossWeightKg: 28450, customsStatus: 'CLEARED', releaseStatus: 'PENDING_CHARGES', logInst: 1 },
    { unitStayId: 'unit-02', siteId: 'DAR1', unitNo: 'MSKU 882014 9', unitTypeCode: '20GP', flow: 'IMPORT', status: 'IN_YARD', sealNo: 'MSK-7718', yardLocation: 'B-01-01-1', grossWeightKg: 19800, customsStatus: 'HELD', releaseStatus: 'BLOCKED', logInst: 1 },
    { unitStayId: 'unit-03', siteId: 'DAR1', unitNo: 'CMAU 551920 4', unitTypeCode: '40HC', flow: 'EXPORT', status: 'GATED_IN', sealNo: 'CMA-4491', yardLocation: 'C-05-02-1', grossWeightKg: 30100, customsStatus: 'CLEARED', releaseStatus: 'READY', logInst: 1 }
  ];

  truckVisits: TruckVisitItem[] = [
    { truckVisitId: 'vis-4410', siteId: 'DAR1', visitNo: 'VIS-4410', plateNo: 'T 124 DFH', driverName: 'Juma Ramadhani', visitType: 'PICK_UP', status: 'IN_LANE', arrivedAt: new Date().toISOString(), logInst: 1 },
    { truckVisitId: 'vis-4402', siteId: 'DAR1', visitNo: 'VIS-4402', plateNo: 'T 882 CZK', driverName: 'Emmanuel Mwamba', visitType: 'DROP_OFF', status: 'COMPLETED', arrivedAt: new Date(Date.now() - 3600000).toISOString(), logInst: 1 }
  ];

  invoices: InvoiceItem[] = [
    { invoiceId: 'inv-01', siteId: 'DAR1', invoiceNo: 'INV-2026-000839', partyName: 'Bollore Transport & Logistics', status: 'ISSUED', currency: 'USD', totalAmount: 1420.50, createdAt: new Date().toISOString() },
    { invoiceId: 'inv-02', siteId: 'DAR1', invoiceNo: 'INV-2026-000838', partyName: 'Superfreight Forwarders', status: 'PAID', currency: 'USD', totalAmount: 890.00, createdAt: new Date(Date.now() - 86400000).toISOString() }
  ];

  yardBlocks = [
    { blockCode: 'A', siteId: 'DAR1', kind: 'DRY_40', totalSlots: 480, occupiedSlots: 312, usableSlots: 470 },
    { blockCode: 'B', siteId: 'DAR1', kind: 'DRY_20', totalSlots: 600, occupiedSlots: 420, usableSlots: 590 },
    { blockCode: 'R', siteId: 'DAR1', kind: 'REEFER', totalSlots: 96, occupiedSlots: 44, usableSlots: 96 }
  ];

  holds = [
    { holdId: 'h-01', siteId: 'DAR1', unitStayId: 'unit-02', holdType: 'CUSTOMS', reason: 'Tanzania Revenue Authority examination request', status: 'ACTIVE', placedBy: 'TRA Officer K. Selemani', placedAt: new Date().toISOString() }
  ];

  approvals = [
    { approvalId: 'appr-01', siteId: 'DAR1', approvalType: 'RELEASE_OVERRIDE', refNo: 'RO-DAR1-26-01942', requestedBy: 'Gate Officer', status: 'PENDING', reason: 'Storage charge waiver approved by finance, pending supervisor release confirmation', requestedAt: new Date().toISOString() }
  ];
}

export const fallbackStore = new FallbackStore();
