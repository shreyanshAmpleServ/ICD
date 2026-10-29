import type { RouteDef } from '@/app/routeTypes';
import { Home, Inbox } from './components';

// Export all today components & API
export * from './components';
export * from './api';

export const routes: RouteDef[] = [
  { path: '/', element: <Home /> },
  { path: '/inbox', element: <Inbox /> },
];
