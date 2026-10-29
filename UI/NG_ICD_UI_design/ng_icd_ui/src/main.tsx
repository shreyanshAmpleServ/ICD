import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import './ds/tokens.css';
import './ds/ds.css';
import './app/shell.css';
import { SessionProvider, useSession } from './app/session';
import { ToastProvider, Page, PageHeader, Empty } from './ds/components';
import { Shell } from './app/Shell';
import { ROUTES } from './app/routes';
import { allNavItems } from './app/nav';

const qc = new QueryClient();

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
      <div className="panel"><Empty title={item ? 'This screen is in the plan but not in the prototype yet' : 'There is no page at this address'}>Use the menu or the search box to find what you need.</Empty></div>
    </Page>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <SessionProvider>
        <ToastProvider>
          <HashRouter>
            <Shell>
              <Routes>
                {ROUTES.map((r) => <Route key={r.path} path={r.path} element={<PortalOnly path={r.path}>{r.element}</PortalOnly>} />)}
                <Route path="*" element={<NotBuilt />} />
              </Routes>
            </Shell>
          </HashRouter>
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
