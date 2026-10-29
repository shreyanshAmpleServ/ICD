import type { RouteDef } from '@/app/routeTypes';
import { Units, UnitCard } from './units';
import { Consignments, ConsignmentDetail } from './consignments';
import { VesselCalls } from './vessel-calls';
import { Manifests } from './manifests';
import { Customs } from './customs';
import { Holds } from './holds';
import { Releases, ReleaseDetail } from './releases';
import { DangerousGoods } from './dangerous-goods';

// Re-export all child sections, components, shared items & API
export * from './units';
export * from './consignments';
export * from './vessel-calls';
export * from './manifests';
export * from './customs';
export * from './holds';
export * from './releases';
export * from './dangerous-goods';
export * from './shared';
export * from './api';

export const routes: RouteDef[] = [
  { path: '/units', element: <Units /> },
  { path: '/units/:unitStayId', element: <UnitCard /> },
  { path: '/consignments', element: <Consignments /> },
  { path: '/consignments/:consignmentId', element: <ConsignmentDetail /> },
  { path: '/vessel-calls', element: <VesselCalls /> },
  { path: '/manifests', element: <Manifests /> },
  { path: '/customs', element: <Customs /> },
  { path: '/holds', element: <Holds /> },
  { path: '/releases', element: <Releases /> },
  { path: '/releases/:releaseOrderId', element: <ReleaseDetail /> },
  { path: '/dangerous-goods', element: <DangerousGoods /> },
];
