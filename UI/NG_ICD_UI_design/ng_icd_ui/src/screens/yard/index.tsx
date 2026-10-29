import type { RouteDef } from '@/app/routeTypes';
import { YardMap } from './YardMap';
import { Moves } from './Moves';
import { Inspections } from './Inspections';
import { InspectionForm } from './InspectionForm';
import { Keys } from './Keys';
import { Cfs } from './Cfs';
import { CfsJob } from './CfsJob';
import { Reefers } from './Reefers';
import { Repairs } from './Repairs';
import { RepairEstimate } from './RepairEstimate';

export const routes: RouteDef[] = [
  { path: '/yard', element: <YardMap /> },
  { path: '/moves', element: <Moves /> },
  { path: '/inspections', element: <Inspections /> },
  { path: '/inspections/:inspectionId', element: <InspectionForm /> },
  { path: '/keys', element: <Keys /> },
  { path: '/cfs', element: <Cfs /> },
  { path: '/cfs/:handlingJobId', element: <CfsJob /> },
  { path: '/reefers', element: <Reefers /> },
  { path: '/repairs', element: <Repairs /> },
  { path: '/repairs/:repairEstimateId', element: <RepairEstimate /> },
];
