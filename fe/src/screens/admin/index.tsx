import type { RouteDef } from '@/app/routeTypes';
import { Sites } from './sites';
import { YardDesigner } from './yard';
import { Gates } from './gates';
import { UnitTypes } from './units';
import { Masters } from './masters';
import { Users } from './users';
import { Rules } from './rules';
import { Inspection } from './inspection';
import { Finance } from './finance';
import { Notifications } from './notifications';
import { Documents } from './documents';
import { Devices } from './devices';
import { SyncScreen } from './sync';
import { Models } from './models';
import { Settings } from './settings';

// Export all child section modules & API
export * from './sites';
export * from './yard';
export * from './gates';
export * from './units';
export * from './masters';
export * from './users';
export * from './rules';
export * from './inspection';
export * from './finance';
export * from './notifications';
export * from './documents';
export * from './devices';
export * from './sync';
export * from './models';
export * from './settings';
export * from './shared';
export * from './api';

export const routes: RouteDef[] = [
  { path: '/admin/sites', element: <Sites /> },
  { path: '/admin/yard', element: <YardDesigner /> },
  { path: '/admin/gates', element: <Gates /> },
  { path: '/admin/units', element: <UnitTypes /> },
  { path: '/admin/masters', element: <Masters /> },
  { path: '/admin/users', element: <Users /> },
  { path: '/admin/rules', element: <Rules /> },
  { path: '/admin/inspection', element: <Inspection /> },
  { path: '/admin/finance', element: <Finance /> },
  { path: '/admin/notifications', element: <Notifications /> },
  { path: '/admin/documents', element: <Documents /> },
  { path: '/admin/devices', element: <Devices /> },
  { path: '/admin/sync', element: <SyncScreen /> },
  { path: '/admin/models', element: <Models /> },
  { path: '/admin/settings', element: <Settings /> },
];
