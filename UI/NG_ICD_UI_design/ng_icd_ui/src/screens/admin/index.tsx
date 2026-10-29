import type { RouteDef } from '@/app/routeTypes';
import { Sites } from './Sites';
import { YardDesigner } from './YardDesigner';
import { Gates } from './Gates';
import { UnitTypes } from './UnitTypes';
import { Masters } from './Masters';
import { Users } from './Users';
import { Rules } from './Rules';
import { Inspection } from './Inspection';
import { Finance } from './Finance';
import { Notifications } from './Notifications';
import { Documents } from './Documents';
import { Devices } from './Devices';
import { SyncScreen } from './Sync';
import { Models } from './Models';
import { Settings } from './Settings';

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
