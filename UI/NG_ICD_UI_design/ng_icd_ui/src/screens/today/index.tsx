import type { RouteDef } from '@/app/routeTypes';
import { Home } from './Home';
import { Inbox } from './Inbox';

export const routes: RouteDef[] = [
  { path: '/', element: <Home /> },
  { path: '/inbox', element: <Inbox /> },
];
