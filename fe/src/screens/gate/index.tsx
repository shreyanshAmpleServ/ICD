import type { RouteDef } from '@/app/routeTypes';
import { GateQueueView } from './queue';
import { GateLaneView } from './lane';
import { TruckVisitView } from './visits';
import { AppointmentsView } from './appointments';
import { WeighbridgeView } from './weighbridge';

// Export all gate child modules & components & API & types
export * from './appointments';
export * from './queue';
export * from './lane';
export * from './visits';
export * from './weighbridge';
export * from './components';
export * from './api';
export * from './types';

export const routes: RouteDef[] = [
  { path: '/gate', element: <GateQueueView /> },
  { path: '/gate/lane', element: <GateLaneView /> },
  { path: '/gate/visits/:truckVisitId', element: <TruckVisitView /> },
  { path: '/appointments', element: <AppointmentsView /> },
  { path: '/weighbridge', element: <WeighbridgeView /> },
];
