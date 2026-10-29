import type { RouteDef } from '@/app/routeTypes';
import { Portal } from './portal';
import { ServiceRequests } from './service-requests';
import { Parties, PartyDetail } from './parties';
import {
  ControlTower,
  Kpis,
  Reports,
  Forecasts,
  Audit,
} from '../insight/components';

// Export child section modules & API
export * from './portal';
export * from './service-requests';
export * from './parties';
export * from './api';

/* Customers module routes, plus the insight screens (control tower, KPIs,
   reports, forecasts, audit) which live in ../insight but are registered
   here because the app route list is shared. */
export const routes: RouteDef[] = [
  { path: '/portal', element: <Portal /> },
  { path: '/service-requests', element: <ServiceRequests /> },
  { path: '/parties', element: <Parties /> },
  { path: '/parties/:partyId', element: <PartyDetail /> },
  { path: '/control-tower', element: <ControlTower /> },
  { path: '/kpis', element: <Kpis /> },
  { path: '/reports', element: <Reports /> },
  { path: '/forecasts', element: <Forecasts /> },
  { path: '/audit', element: <Audit /> },
];
