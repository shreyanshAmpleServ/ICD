import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from '@/app/session';
import { Page, PageHeader, Empty } from '@/ds/components';
import { Shell } from '@/app/Shell';
import { allNavItems } from '@/app/nav';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './routes';

/* Portal users (agents, customers) only ever see the portal. The API scopes
   their data to their own party as well; this keeps the UI consistent. */
function PortalOnly({ path, children }: { path: string; children: ReactNode }) {
  const { isExternal } = useSession();
  if (isExternal && !path.startsWith('/portal')) return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

function NotBuilt() {
  const loc = useLocation();
  const item = allNavItems().find((i) => i.path === loc.pathname);
  return (
    <Page>
      <PageHeader title={item?.label ?? 'Page not found'} ms={item?.ms} />
      <div className="panel">
        <Empty title={item ? 'This screen is in the plan but not in the prototype yet' : 'There is no page at this address'}>
          Use the menu or the search box to find what you need.
        </Empty>
      </div>
    </Page>
  );
}

export function AppRouter() {
  return (
    <Routes>
      {/* Standalone Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Application Routes Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        {ROUTES.filter((r) => r.path !== '/login').map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={<PortalOnly path={r.path}>{r.element}</PortalOnly>}
          />
        ))}
        <Route path="*" element={<NotBuilt />} />
      </Route>
    </Routes>
  );
}

export * from './routeConfig';
export * from './routes';
export * from './ProtectedRoute';
