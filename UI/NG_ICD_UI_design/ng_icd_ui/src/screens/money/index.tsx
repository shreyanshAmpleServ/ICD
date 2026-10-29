import type { RouteDef } from '@/app/routeTypes';
import { Charges } from './Charges';
import { Invoices } from './Invoices';
import { InvoiceNew } from './InvoiceNew';
import { InvoiceDetail } from './InvoiceDetail';
import { Cashier } from './Cashier';
import { Refunds } from './Refunds';
import { Disbursements } from './Disbursements';
import { Statements } from './Statements';
import { TariffEditor, Tariffs } from './Tariffs';
import { ExchangeRates } from './ExchangeRates';
import { Ledger } from './Ledger';

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
