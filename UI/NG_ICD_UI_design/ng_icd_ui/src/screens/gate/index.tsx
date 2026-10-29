import type { RouteDef } from '@/app/routeTypes';
import { GateQueue } from './GateQueue';
import { GateLane } from './GateLane';
import { TruckVisit } from './TruckVisit';
import { Appointments } from './Appointments';
import { Weighbridge } from './Weighbridge';

export const routes: RouteDef[] = [
  { path: '/gate', element: <GateQueue /> },
  { path: '/gate/lane', element: <GateLane /> },
  { path: '/gate/visits/:truckVisitId', element: <TruckVisit /> },
  { path: '/appointments', element: <Appointments /> },
  { path: '/weighbridge', element: <Weighbridge /> },
];
