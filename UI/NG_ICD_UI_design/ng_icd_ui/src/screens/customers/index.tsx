import type { RouteDef } from '@/app/routeTypes';
import { Portal } from './Portal';
import { ServiceRequests } from './ServiceRequests';
import { Parties, PartyDetail } from './Parties';
import { ControlTower } from '../insight/ControlTower';
import { Kpis } from '../insight/Kpis';
import { Reports } from '../insight/Reports';
import { Forecasts } from '../insight/Forecasts';
import { Audit } from '../insight/Audit';

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
