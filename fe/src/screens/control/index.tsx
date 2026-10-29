import type { RouteDef } from '@/app/routeTypes';
import { Approvals } from './approvals';
import { Exceptions, ExceptionDetail } from './exceptions';

// Export child section modules & API
export * from './approvals';
export * from './exceptions';
export * from './api';

export const routes: RouteDef[] = [
  { path: '/approvals', element: <Approvals /> },
  { path: '/exceptions', element: <Exceptions /> },
  { path: '/exceptions/:exceptionCaseId', element: <ExceptionDetail /> },
];
