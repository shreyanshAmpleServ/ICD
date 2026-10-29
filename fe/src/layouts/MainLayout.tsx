import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AivaPanel } from '@/app/Aiva';
import { cx } from '@/ds/components';

export interface MainLayoutProps {
  children?: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [railOpen, setRailOpen] = useState(false);
  const [aiva, setAiva] = useState(false);
  const loc = useLocation();

  useEffect(() => setRailOpen(false), [loc.pathname]);

  return (
    <div className={cx('shell', aiva && 'with-aiva')}>
      <Sidebar open={railOpen} onClose={() => setRailOpen(false)} />
      {railOpen && (
        <div
          className="scrim"
          style={{ zIndex: 49 }}
          onClick={() => setRailOpen(false)}
        />
      )}
      <Header
        onMenu={() => setRailOpen((o) => !o)}
        onAiva={() => setAiva((a) => !a)}
        aivaOpen={aiva}
      />
      <main className="main" id="main">
        {children ?? <Outlet />}
      </main>
      {aiva && <AivaPanel onClose={() => setAiva(false)} />}
    </div>
  );
}

export default MainLayout;
