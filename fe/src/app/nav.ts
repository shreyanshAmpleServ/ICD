import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck, Banknote, BarChart3, Bell, BookOpen, Boxes, Building2, Calculator, CalendarClock, Car, ClipboardCheck,
  Coins, Container, Cpu, FileCog, FileSpreadsheet, FileText, Flame, Forklift, Gauge, History, Home, Inbox, KeyRound,
  Landmark, LayoutGrid, LineChart, Lock, Map, MessagesSquare, Package, Printer, Radar, Receipt, RefreshCw, Route, Scale,
  ScanLine, Search, Settings2, ShieldAlert, ShieldCheck, Ship, Siren, Snowflake, Sparkles, Truck, Undo2, Users, Wallet, Wrench,
} from 'lucide-react';

/* Information architecture. One entry per screen in the left rail.
   perm: the permission (VIEW or above) that shows the entry.
   ms:   the roadmap milestone that delivers it (M5/M6 = Phase 2).
   facility: show only at sites that run that facility. */
export interface NavItem {
  path: string; label: string; icon: LucideIcon; ms: string; perm?: string; facility?: string; external?: boolean; internalOnly?: boolean;
}
export interface NavGroup { label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { label: 'Today', items: [
    { path: '/', label: 'Home', icon: Home, ms: 'M4' },
    { path: '/control-tower', label: 'Control tower', icon: Radar, ms: 'M4', perm: 'dashboard.control_tower' },
    { path: '/inbox', label: 'Inbox', icon: Inbox, ms: 'M2' },
  ] },
  { label: 'Gate & yard', items: [
    { path: '/gate', label: 'Gate queue', icon: Truck, ms: 'M1', perm: 'gate.visit.checkin' },
    { path: '/gate/lane', label: 'Gate lane (tablet)', icon: ScanLine, ms: 'M1', perm: 'gate.visit.checkin' },
    { path: '/appointments', label: 'Appointments', icon: CalendarClock, ms: 'M5', perm: 'appointment.manage' },
    { path: '/yard', label: 'Yard map', icon: Map, ms: 'M1', perm: 'yard.map.view' },
    { path: '/moves', label: 'Move orders', icon: Forklift, ms: 'M1', perm: 'yard.move.execute' },
    { path: '/inspections', label: 'Inspections', icon: ClipboardCheck, ms: 'M1', perm: 'inspection.perform' },
    { path: '/weighbridge', label: 'Weighbridge', icon: Scale, ms: 'M1', perm: 'weighbridge.ticket' },
    { path: '/keys', label: 'Vehicle keys', icon: KeyRound, ms: 'M1', perm: 'yard.key.custody', facility: 'ICDV' },
    { path: '/cfs', label: 'CFS jobs', icon: Package, ms: 'M5', perm: 'cfs.job.manage' },
    { path: '/reefers', label: 'Reefers', icon: Snowflake, ms: 'M5', perm: 'reefer.manage' },
    { path: '/repairs', label: 'Repairs (M&R)', icon: Wrench, ms: 'M5', perm: 'repair.estimate' },
  ] },
  { label: 'Cargo', items: [
    { path: '/units', label: 'Units', icon: Container, ms: 'M1', perm: 'consignment.view' },
    { path: '/consignments', label: 'Consignments', icon: Boxes, ms: 'M1', perm: 'consignment.view' },
    { path: '/vessel-calls', label: 'Vessel calls', icon: Ship, ms: 'M1', perm: 'consignment.view' },
    { path: '/manifests', label: 'Manifest import', icon: FileSpreadsheet, ms: 'M1', perm: 'manifest.import' },
    { path: '/customs', label: 'Customs & exams', icon: Landmark, ms: 'M2', perm: 'consignment.view' },
    { path: '/holds', label: 'Holds', icon: ShieldAlert, ms: 'M2', perm: 'consignment.view' },
    { path: '/releases', label: 'Release orders', icon: BadgeCheck, ms: 'M2', perm: 'consignment.view' },
    { path: '/dangerous-goods', label: 'Dangerous goods', icon: Flame, ms: 'M5', perm: 'dg.manage' },
  ] },
  { label: 'Money', items: [
    { path: '/charges', label: 'Charges', icon: Calculator, ms: 'M3', perm: 'billing.invoice.view' },
    { path: '/invoices', label: 'Invoices', icon: Receipt, ms: 'M3', perm: 'billing.invoice.view' },
    { path: '/cashier', label: 'Cashier', icon: Wallet, ms: 'M3', perm: 'payment.record' },
    { path: '/refunds', label: 'Refunds', icon: Undo2, ms: 'M3', perm: 'payment.refund' },
    { path: '/disbursements', label: 'Disbursements', icon: Coins, ms: 'M3', perm: 'finance.disbursement.record' },
    { path: '/statements', label: 'Statements', icon: FileText, ms: 'M3', perm: 'billing.invoice.view' },
    { path: '/tariffs', label: 'Tariffs', icon: BookOpen, ms: 'M3', perm: 'billing.rates.view' },
    { path: '/exchange-rates', label: 'Exchange rates', icon: Banknote, ms: 'M3', perm: 'billing.rates.view' },
    { path: '/ledger', label: 'Ledger postings', icon: Route, ms: 'M3', perm: 'finance.period.close' },
  ] },
  { label: 'Control', items: [
    { path: '/approvals', label: 'Approvals', icon: ShieldCheck, ms: 'M2' },
    { path: '/exceptions', label: 'Exceptions', icon: Siren, ms: 'M2', perm: 'exception.view' },
    { path: '/reports', label: 'Reports', icon: BarChart3, ms: 'M4', perm: 'reports.operational' },
    { path: '/kpis', label: 'KPIs & trends', icon: LineChart, ms: 'M4', perm: 'dashboard.executive' },
    { path: '/forecasts', label: 'Forecasts', icon: Gauge, ms: 'M6', perm: 'yard.map.view' },
    { path: '/audit', label: 'Audit trail', icon: History, ms: 'M0', perm: 'admin.audit.view' },
  ] },
  { label: 'Customers', items: [
    { path: '/portal', label: 'Customer portal', icon: Building2, ms: 'M5', perm: 'portal.request.submit', external: true },
    { path: '/service-requests', label: 'Service requests', icon: MessagesSquare, ms: 'M5', perm: 'portal.request.handle' },
    { path: '/parties', label: 'Customers & parties', icon: Users, ms: 'M0', perm: 'masters.view', internalOnly: true },
  ] },
  { label: 'Setup', items: [
    { path: '/admin/sites', label: 'Company & sites', icon: Building2, ms: 'M0', perm: 'admin.site.manage' },
    { path: '/admin/yard', label: 'Yard designer', icon: LayoutGrid, ms: 'M0', perm: 'admin.yard.design' },
    { path: '/admin/gates', label: 'Gates & visit types', icon: Route, ms: 'M0', perm: 'admin.gate.configure' },
    { path: '/admin/units', label: 'Unit types & checks', icon: Car, ms: 'M0', perm: 'admin.config.manage' },
    { path: '/admin/masters', label: 'Trucks, drivers, vessels', icon: Truck, ms: 'M0', perm: 'masters.view' },
    { path: '/admin/users', label: 'Users & roles', icon: Lock, ms: 'M0', perm: 'admin.users.manage' },
    { path: '/admin/rules', label: 'Holds, release & approvals', icon: ShieldCheck, ms: 'M2', perm: 'admin.config.manage' },
    { path: '/admin/inspection', label: 'Inspection checklists', icon: ClipboardCheck, ms: 'M1', perm: 'admin.config.manage' },
    { path: '/admin/finance', label: 'Finance setup', icon: Landmark, ms: 'M3', perm: 'finance.period.close' },
    { path: '/admin/notifications', label: 'Notifications & printing', icon: Bell, ms: 'M4', perm: 'admin.config.manage' },
    { path: '/admin/documents', label: 'Numbering & documents', icon: FileCog, ms: 'M0', perm: 'admin.config.manage' },
    { path: '/admin/devices', label: 'Devices & integrations', icon: Cpu, ms: 'M0', perm: 'admin.device.manage' },
    { path: '/admin/sync', label: 'NG sync & messages', icon: RefreshCw, ms: 'M0', perm: 'admin.config.manage' },
    { path: '/admin/models', label: 'Prediction models', icon: Sparkles, ms: 'M6', perm: 'admin.config.manage' },
    { path: '/admin/settings', label: 'Field rules & calendars', icon: Settings2, ms: 'M0', perm: 'admin.config.manage' },
  ] },
];

export const PRINTER_ICON = Printer;
export const SEARCH_ICON = Search;
export const isPhase2 = (ms: string) => ms === 'M5' || ms === 'M6';
export const allNavItems = () => NAV.flatMap((g) => g.items);
