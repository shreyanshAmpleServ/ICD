import type { RouteDef } from './routeConfig';

// 1. Auth
import { LoginPage } from '@/features/auth/pages/LoginPage';

// 2. Dashboard
import { DashboardPage, InboxPage } from '@/features/dashboard/pages';

// 3. Gate Operations
import {
  GateQueuePage,
  GateLanePage,
  TruckVisitPage,
  AppointmentsPage,
  WeighbridgePage,
} from '@/features/gate-management/pages';

// 4. Container Management & Cargo
import {
  ContainerList,
  ContainerDetails,
} from '@/features/container-management/pages';
import { Consignments, ConsignmentDetail } from '@/features/container-management/consignments';
import { VesselCalls } from '@/features/container-management/vessel-calls';
import { Manifests } from '@/features/container-management/manifests';
import { Holds } from '@/features/container-management/holds';
import { Releases, ReleaseDetail } from '@/features/container-management/releases';
import { DangerousGoods } from '@/features/container-management/dangerous-goods';

// 5. Yard & CFS Operations
import {
  YardMapPage,
  MovesPage,
  InspectionsPage,
  InspectionFormPage,
  KeysPage,
  CfsPage,
  CfsJobPage,
  ReefersPage,
  RepairsPage,
  RepairEstimatePage,
} from '@/features/yard-management/pages';

// 6. Customs
import { CustomsPage } from '@/features/customs/pages';

// 7. Transport & Control Tower
import {
  ApprovalsPage,
  ExceptionsPage,
  ExceptionDetail,
} from '@/features/transport/pages';

// 8. Billing & Cashier
import {
  ChargesPage,
  InvoicesPage,
  InvoiceNewPage,
  InvoiceDetailPage,
  CashierPage,
  RefundsPage,
  DisbursementsPage,
  StatementsPage,
  TariffsPage,
  TariffEditorPage,
  ExchangeRatesPage,
  LedgerPage,
} from '@/features/billing/pages';

// 9. Reports & Insights
import {
  ControlTowerPage,
  KpisPage,
  ReportsPage,
  ForecastsPage,
  AuditPage,
} from '@/features/reports/pages';

// 10. Customer Management
import {
  PortalPage,
  ServiceRequestsPage,
  PartiesPage,
  PartyDetail,
} from '@/features/customer-management/pages';

// 11. Master Data & Admin
import {
  SitesPage,
  YardDesignerPage,
  GatesPage,
  UnitTypesPage,
  MastersPage,
  UsersPage,
  RulesPage,
  InspectionPage,
  FinancePage,
  NotificationsPage,
  DocumentsPage,
  DevicesPage,
  SyncPage,
  ModelsPage,
  SettingsPage,
} from '@/features/master-data/pages';

/**
 * All Application Routes
 * Declared centrally and exclusively in this file.
 */
export const ROUTES: RouteDef[] = [
  // Public
  { path: '/login', element: <LoginPage /> },

  // Dashboard & Personal Inbox
  { path: '/', element: <DashboardPage /> },
  { path: '/inbox', element: <InboxPage /> },

  // Gate Management
  { path: '/gate', element: <GateQueuePage /> },
  { path: '/gate/lane', element: <GateLanePage /> },
  { path: '/gate/visits/:truckVisitId', element: <TruckVisitPage /> },
  { path: '/appointments', element: <AppointmentsPage /> },
  { path: '/weighbridge', element: <WeighbridgePage /> },

  // Container Management
  { path: '/units', element: <ContainerList /> },
  { path: '/units/:unitStayId', element: <ContainerDetails /> },
  { path: '/consignments', element: <Consignments /> },
  { path: '/consignments/:consignmentId', element: <ConsignmentDetail /> },
  { path: '/vessel-calls', element: <VesselCalls /> },
  { path: '/manifests', element: <Manifests /> },
  { path: '/holds', element: <Holds /> },
  { path: '/releases', element: <Releases /> },
  { path: '/releases/:releaseOrderId', element: <ReleaseDetail /> },
  { path: '/dangerous-goods', element: <DangerousGoods /> },

  // Yard Management
  { path: '/yard', element: <YardMapPage /> },
  { path: '/moves', element: <MovesPage /> },
  { path: '/inspections', element: <InspectionsPage /> },
  { path: '/inspections/:inspectionId', element: <InspectionFormPage /> },
  { path: '/keys', element: <KeysPage /> },
  { path: '/cfs', element: <CfsPage /> },
  { path: '/cfs/:handlingJobId', element: <CfsJobPage /> },
  { path: '/reefers', element: <ReefersPage /> },
  { path: '/repairs', element: <RepairsPage /> },
  { path: '/repairs/:repairEstimateId', element: <RepairEstimatePage /> },

  // Customs
  { path: '/customs', element: <CustomsPage /> },

  // Transport & Control
  { path: '/approvals', element: <ApprovalsPage /> },
  { path: '/exceptions', element: <ExceptionsPage /> },
  { path: '/exceptions/:exceptionCaseId', element: <ExceptionDetail /> },

  // Billing
  { path: '/charges', element: <ChargesPage /> },
  { path: '/invoices', element: <InvoicesPage /> },
  { path: '/invoices/new', element: <InvoiceNewPage /> },
  { path: '/invoices/:invoiceId', element: <InvoiceDetailPage /> },
  { path: '/cashier', element: <CashierPage /> },
  { path: '/refunds', element: <RefundsPage /> },
  { path: '/disbursements', element: <DisbursementsPage /> },
  { path: '/statements', element: <StatementsPage /> },
  { path: '/statements/:partyId', element: <StatementsPage /> },
  { path: '/tariffs', element: <TariffsPage /> },
  { path: '/tariffs/:tariffId', element: <TariffEditorPage /> },
  { path: '/exchange-rates', element: <ExchangeRatesPage /> },
  { path: '/ledger', element: <LedgerPage /> },

  // Reports
  { path: '/control-tower', element: <ControlTowerPage /> },
  { path: '/kpis', element: <KpisPage /> },
  { path: '/reports', element: <ReportsPage /> },
  { path: '/forecasts', element: <ForecastsPage /> },
  { path: '/audit', element: <AuditPage /> },

  // Customer Management
  { path: '/portal', element: <PortalPage /> },
  { path: '/service-requests', element: <ServiceRequestsPage /> },
  { path: '/parties', element: <PartiesPage /> },
  { path: '/parties/:partyId', element: <PartyDetail /> },

  // Master Data & Administration
  { path: '/admin/sites', element: <SitesPage /> },
  { path: '/admin/yard', element: <YardDesignerPage /> },
  { path: '/admin/gates', element: <GatesPage /> },
  { path: '/admin/units', element: <UnitTypesPage /> },
  { path: '/admin/masters', element: <MastersPage /> },
  { path: '/admin/users', element: <UsersPage /> },
  { path: '/admin/rules', element: <RulesPage /> },
  { path: '/admin/inspection', element: <InspectionPage /> },
  { path: '/admin/finance', element: <FinancePage /> },
  { path: '/admin/notifications', element: <NotificationsPage /> },
  { path: '/admin/documents', element: <DocumentsPage /> },
  { path: '/admin/devices', element: <DevicesPage /> },
  { path: '/admin/sync', element: <SyncPage /> },
  { path: '/admin/models', element: <ModelsPage /> },
  { path: '/admin/settings', element: <SettingsPage /> },
];

export default ROUTES;
