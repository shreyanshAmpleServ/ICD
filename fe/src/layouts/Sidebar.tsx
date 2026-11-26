import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { isPhase2 } from '@/app/nav';
import { useT } from '@/app/i18n';
import { Ms, cx } from '@/ds/components';
import { useVisibleNavGroups } from './components/ModuleSearchModal';

export interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [query, setQuery] = useState('');
  const t = useT();
  const groups = useVisibleNavGroups(query);

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

      <div className="rail-search">
        <Search size={14} className="rail-search-icon" aria-hidden />
        <input
          type="search"
          className="rail-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules..."
          aria-label="Search sidebar modules"
        />
        {query && (
          <button
            type="button"
            className="rail-search-clear"
            aria-label="Clear module search"
            onClick={() => setQuery('')}
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="rail-scroll">
        {groups.length === 0 ? (
          <div className="rail-empty">
            <div className="xs muted">No matching modules</div>
            <button type="button" className="rail-empty-btn" onClick={() => setQuery('')}>
              Clear search
            </button>
          </div>
        ) : (
          groups.map((g) => (
            <div className="rail-group" key={g.label}>
              <h4>{g.displayLabel}</h4>
              {g.items.map((i) => (
                <NavLink
                  key={i.path}
                  to={i.path}
                  end={i.path === '/' || i.path === '/gate'}
                  onClick={() => onClose?.()}
                  className={({ isActive }) => cx(isActive && 'active')}
                >
                  <i.icon aria-hidden />
                  <span>{t(i.label)}</span>
                  {isPhase2(i.ms) && <Ms m={i.ms} />}
                </NavLink>
              ))}
            </div>
          ))
        )}
      </div>
      <div className="rail-foot">DCC Logistics Suite</div>
    </nav>
  );
}

export default Sidebar;

