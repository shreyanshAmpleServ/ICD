import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { NAV, isPhase2, type NavGroup, type NavItem } from '@/app/nav';
import { useSession } from '@/app/session';
import { useT } from '@/app/i18n';
import { Modal, Ms, cx } from '@/ds/components';

export interface VisibleNavGroup {
  label: string;
  displayLabel: string;
  items: NavItem[];
}

/**
 * Shared hook returning sidebar/modal navigation groups filtered by user permissions,
 * active phase, site facilities, and optional search query.
 */
export function useVisibleNavGroups(query = ''): VisibleNavGroup[] {
  const { can, phase, site, isExternal } = useSession();
  const t = useT();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const isMilestoneQuery = /^m\d$/.test(q);

    return NAV.map((g: NavGroup) => {
      const displayLabel = t(g.label);
      const groupMatches =
        !q ||
        (q.length >= 2 &&
          (displayLabel.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)));

      const allowedItems = g.items.filter(
        (i) =>
          can(i.perm) &&
          (phase === 2 || !isPhase2(i.ms)) &&
          (!i.facility || site.facilities.includes(i.facility)) &&
          (!isExternal || !!i.external)
      );

      const matched = groupMatches
        ? allowedItems
        : allowedItems.filter((i) => {
            const label = t(i.label).toLowerCase();
            return (
              label.includes(q) ||
              i.label.toLowerCase().includes(q) ||
              i.path.toLowerCase().includes(q) ||
              (isMilestoneQuery && i.ms.toLowerCase() === q)
            );
          });

      const items = !q
        ? matched
        : [...matched].sort((a, b) => {
            const aStarts = t(a.label).toLowerCase().startsWith(q) ? 0 : 1;
            const bStarts = t(b.label).toLowerCase().startsWith(q) ? 0 : 1;
            return aStarts - bStarts;
          });

      return { label: g.label, displayLabel, items };
    }).filter((g) => g.items.length > 0);
  }, [can, phase, site, isExternal, t, query]);
}

export interface ModuleSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function ModuleSearchModal({ open, onClose }: ModuleSearchModalProps) {
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const t = useT();

  const groups = useVisibleNavGroups(query);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSel(0);
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (sel >= flat.length) {
      setSel(0);
    }
  }, [flat.length, sel]);

  const go = (path: string) => {
    nav(path);
    onClose();
  };

  let idx = -1;

  return (
    <Modal open={open} onClose={onClose} title="Search modules & screens">
      <div className="mod-search-box">
        <div className="input-icon">
          <Search size={16} />
          <input
            ref={inputRef}
            className="input"
            value={query}
            placeholder="Type module name (e.g. Gate queue, Inspections, Cashier)..."
            aria-label="Search modules"
            onChange={(e) => {
              setQuery(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((x) => Math.min(Math.max(flat.length - 1, 0), x + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((x) => Math.max(0, x - 1));
              } else if (e.key === 'Enter' && flat[sel]) {
                e.preventDefault();
                go(flat[sel].path);
              }
            }}
          />
          {query && (
            <button
              type="button"
              className="mod-search-clear"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mod-search-list" role="listbox" aria-label="Modules">
        {groups.length === 0 ? (
          <div className="small muted" style={{ padding: '18px 8px', textAlign: 'center' }}>
            No modules match “{query}”.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mod-search-group">
              <h4>{g.displayLabel}</h4>
              {g.items.map((item) => {
                idx++;
                const currentIdx = idx;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    role="option"
                    aria-selected={currentIdx === sel}
                    className={cx('mod-search-item')}
                    onMouseEnter={() => setSel(currentIdx)}
                    onClick={() => go(item.path)}
                  >
                    <Icon size={16} aria-hidden />
                    <span className="mod-search-name">{t(item.label)}</span>
                    <span className="xs faint mod-search-path">{item.path}</span>
                    {isPhase2(item.ms) && <Ms m={item.ms} />}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
