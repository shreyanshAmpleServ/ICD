import type { RouteDef } from '@/app/routeTypes';
import {
  YardMap,
  Moves,
  Inspections,
  InspectionForm,
  Keys,
  Cfs,
  CfsJob,
  Reefers,
  Repairs,
  RepairEstimate,
} from './components';

// Export all yard components & API
export * from './components';
export * from './api';

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
