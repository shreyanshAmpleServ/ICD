import type { RouteDef } from './routeConfig';
import { routes as today } from '@/screens/today';
import { routes as gate } from '@/screens/gate';
import { routes as yard } from '@/screens/yard';
import { routes as cargo } from '@/screens/cargo';
import { routes as money } from '@/screens/money';
import { routes as control } from '@/screens/control';
import { routes as customers } from '@/screens/customers';
import { routes as admin } from '@/screens/admin';
import { LoginPage } from '@/features/auth/pages/LoginPage';

export const ROUTES: RouteDef[] = [
  ...today,
  ...gate,
  ...yard,
  ...cargo,
  ...money,
  ...control,
  ...customers,
  ...admin,
  { path: '/login', element: <LoginPage /> },
];
