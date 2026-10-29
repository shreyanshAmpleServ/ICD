import { NavLink } from 'react-router-dom';
import { NAV, isPhase2 } from '@/app/nav';
import { useSession } from '@/app/session';
import { useT } from '@/app/i18n';
import { Ms, cx } from '@/ds/components';

export interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

export function Sidebar({ open }: SidebarProps) {
  const { can, phase, site, isExternal } = useSession();
  const t = useT();

  return (
    <nav className={cx('rail', open && 'open')} aria-label="Main">
      <div className="brand">
        <div className="brand-mark" aria-hidden>
          ICD
        </div>
        <div>
          <div className="brand-name">NG ICD</div>
          <div className="brand-sub">DCC Logistics Suite</div>
        </div>
      </div>
      <div className="rail-scroll">
        {NAV.map((g) => {
          const items = g.items.filter(
            (i) =>
              can(i.perm) &&
              (phase === 2 || !isPhase2(i.ms)) &&
              (!i.facility || site.facilities.includes(i.facility)) &&
              (!isExternal || !!i.external)
          );
          if (!items.length) return null;
          return (
            <div className="rail-group" key={g.label}>
              <h4>{t(g.label)}</h4>
              {items.map((i) => (
                <NavLink
                  key={i.path}
                  to={i.path}
                  end={i.path === '/' || i.path === '/gate'}
                  className={({ isActive }) => cx(isActive && 'active')}
                >
                  <i.icon aria-hidden />
                  <span>{t(i.label)}</span>
                  {isPhase2(i.ms) && <Ms m={i.ms} />}
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>
      <div className="rail-foot">DCC Logistics Suite</div>
    </nav>
  );
}

export default Sidebar;

