import type { RouteDef } from '@/app/routeTypes';
import {
  Charges,
  Invoices,
  InvoiceNew,
  InvoiceDetail,
  Cashier,
  Refunds,
  Disbursements,
  Statements,
  TariffEditor,
  Tariffs,
  ExchangeRates,
  Ledger,
} from './components';

// Export all money components & API
export * from './components';
export * from './api';

export const routes: RouteDef[] = [
  { path: '/charges', element: <Charges /> },
  { path: '/invoices', element: <Invoices /> },
  { path: '/invoices/new', element: <InvoiceNew /> },
  { path: '/invoices/:invoiceId', element: <InvoiceDetail /> },
  { path: '/cashier', element: <Cashier /> },
  { path: '/refunds', element: <Refunds /> },
  { path: '/disbursements', element: <Disbursements /> },
  { path: '/statements', element: <Statements /> },
  { path: '/statements/:partyId', element: <Statements /> },
  { path: '/tariffs', element: <Tariffs /> },
  { path: '/tariffs/:tariffId', element: <TariffEditor /> },
  { path: '/exchange-rates', element: <ExchangeRates /> },
  { path: '/ledger', element: <Ledger /> },
];
