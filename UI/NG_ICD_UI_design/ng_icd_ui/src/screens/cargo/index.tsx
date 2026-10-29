import type { RouteDef } from '@/app/routeTypes';
import { Units } from './Units';
import { UnitCard } from './UnitCard';
import { Consignments } from './Consignments';
import { ConsignmentDetail } from './ConsignmentDetail';
import { VesselCalls } from './VesselCalls';
import { Manifests } from './Manifests';
import { Customs } from './Customs';
import { Holds } from './Holds';
import { Releases } from './Releases';
import { ReleaseDetail } from './ReleaseDetail';
import { DangerousGoods } from './DangerousGoods';

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
