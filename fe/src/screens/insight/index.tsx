import type { RouteDef } from '@/app/routeTypes';
import {
  ControlTower,
  Kpis,
  Reports,
  Forecasts,
  Audit,
} from './components';

// Export all insight child sections & components & API
export * from './control-tower';
export * from './kpis';
export * from './reports';
export * from './forecasts';
export * from './audit';
export * from './components';
export * from './api';

export const routes: RouteDef[] = [
  { path: '/control-tower', element: <ControlTower /> },
  { path: '/kpis', element: <Kpis /> },
  { path: '/reports', element: <Reports /> },
  { path: '/forecasts', element: <Forecasts /> },
  { path: '/audit', element: <Audit /> },
];
