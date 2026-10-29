import type { RouteDef } from '@/app/routeTypes';
import { Approvals } from './Approvals';
import { Exceptions } from './Exceptions';
import { ExceptionDetail } from './ExceptionDetail';

export const routes: RouteDef[] = [
  { path: '/approvals', element: <Approvals /> },
  { path: '/exceptions', element: <Exceptions /> },
  { path: '/exceptions/:exceptionCaseId', element: <ExceptionDetail /> },
];
