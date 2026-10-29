import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, ShieldCheck, Sparkles, WifiOff, X } from 'lucide-react';
import { ALL_ROLE, SITES, useSession } from '@/app/session';
import { ROLES } from '@/app/roles';
import { useT } from '@/app/i18n';
import { Button, Segmented, Select, StatusPill } from '@/ds/components';
import { search, type Group } from '@/mock/search';
import { approvals } from '@/mock/control';
import { useAuth } from '@/features/auth';
import { api } from '@/api/client';
import { useQ } from '@/api/query';

export interface HeaderProps {
  onMenu: () => void;
  onAiva: () => void;
  aivaOpen: boolean;
}

export function Header({ onMenu, onAiva, aivaOpen }: HeaderProps) {
  const s = useSession();
  const t = useT();
  const nav = useNavigate();

  // Dynamic live pending approvals from backend
  const { data: approvalsData = [] } = useQ<any[]>(['approvals', s.site?.siteId], async () => {
    try {
      const res = await api.get<any>(`/approvals?status=PENDING&siteId=${s.site?.siteId || 1}`);
      return res?.items || (Array.isArray(res) ? res : []);
    } catch {
      return approvals;
    }
  });

  const pending = Array.isArray(approvalsData)
    ? approvalsData.filter((a: any) => a.status === 'PENDING' && a.canDecide !== false).length
    : 0;

  // Dynamic live inbox notifications from backend
  const { data: inboxRes } = useQ<any>(['inbox'], async () => {
    try {
      return await api.get<any>('/notifications/inbox');
    } catch {
      return { items: [], unreadCount: 0 };
    }
  });

  const unreadCount = useMemo(() => {
    if (Array.isArray(inboxRes)) {
      return inboxRes.filter((n: any) => !n.read && !n.readAt).length;
    }
    if (inboxRes && typeof inboxRes === 'object') {
      if (typeof inboxRes.unreadCount === 'number') return inboxRes.unreadCount;
      if (Array.isArray(inboxRes.items)) {
        return inboxRes.items.filter((n: any) => !n.read && !n.readAt).length;
      }
    }
    return 0;
  }, [inboxRes]);

  const siteList = s.sites && s.sites.length > 0 ? s.sites : SITES;

  return (
    <header className="topbar">
      <Button variant="ghost" className="menu-toggle" aria-label="Open menu" icon={<Menu />} onClick={onMenu} />
      {!s.isExternal ? <OneSearch /> : <div className="spacer" />}
      <div className="site-switch">
        <span className="site-name xs faint">Site</span>
        <select
          aria-label="Site"
          value={s.site.siteId}
          onChange={(e) => s.setSiteId(Number(e.target.value))}
        >
          {siteList.map((x) => (
            <option key={x.siteId} value={x.siteId}>
              {x.siteCode} · {x.siteName}
            </option>
          ))}
        </select>
      </div>
      {s.offline && (
        <span className="offline-flag">
          <WifiOff size={14} />
          {t('Working offline')} · 3 queued
        </span>
      )}
      <div className="spacer" />
      {!s.isExternal && (
        <div className="top-icon">
          <Button
            variant="ghost"
            aria-label={`Approvals, ${pending} waiting`}
            icon={<ShieldCheck />}
            onClick={() => nav('/approvals')}
          />
          {pending > 0 && <span className="badge">{pending}</span>}
        </div>
      )}
      <div className="top-icon">
        <Button
          variant="ghost"
          aria-label={`Notifications, ${unreadCount} unread`}
          icon={<Bell />}
          onClick={() => nav('/inbox')}
        />
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </div>
      {s.can('aiva.use') && (
        <Button
          variant={aivaOpen ? 'primary' : 'secondary'}
          className="aiva-btn"
          aria-label={t('Ask Aiva')}
          icon={<Sparkles />}
          onClick={onAiva}
        >
          <span className="aiva-label">{t('Ask Aiva')}</span>
        </Button>
      )}
      <MeMenu />
    </header>
  );
}

function OneSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const [results, setResults] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const t = useT();

  // Dynamic search calling backend /api/search
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get<{ groups?: Group[]; query?: string; total?: number }>(
          `/search?q=${encodeURIComponent(trimmed)}`
        );
        if (res && Array.isArray(res.groups)) {
          setResults(res.groups);
        } else {
          setResults(search(trimmed));
        }
      } catch {
        setResults(search(trimmed));
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [q]);

  const groups: Group[] = results.length > 0 ? results : q.trim().length >= 2 && !loading ? search(q.trim()) : [];
  const flat = groups.flatMap((g) => g.hits);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const go = (to: string) => {
    nav(to);
    setOpen(false);
    setQ('');
    ref.current?.blur();
  };

  let idx = -1;
  return (
    <div className="search" role="combobox" aria-expanded={open && (groups.length > 0 || loading)} aria-haspopup="listbox">
      <div className="input-icon">
        <Search />
        <input
          ref={ref}
          className="input"
          value={q}
          placeholder={t('Search container, VIN, plate, BL, invoice or customer')}
          aria-label="Search"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((x) => Math.min(flat.length - 1, x + 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((x) => Math.max(0, x - 1));
            }
            if (e.key === 'Enter' && flat[sel]) go(flat[sel].to);
            if (e.key === 'Escape') {
              setOpen(false);
              ref.current?.blur();
            }
          }}
        />
      </div>
      {!q && <span className="kbd">/</span>}
      {open && q.length >= 2 && (
        <div className="pop sr" role="listbox">
          {loading && (
            <div className="small muted" style={{ padding: '8px 16px' }}>
              Searching live system...
            </div>
          )}
          {!loading && groups.length === 0 && (
            <div className="small muted" style={{ padding: '8px 16px' }}>
              No match for “{q}”. Try the last 4 digits of a container or the end of a VIN.
            </div>
          )}
          {!loading &&
            groups.map((g) => (
              <div key={g.label}>
                <h4>{g.label}</h4>
                {g.hits.map((h) => {
                  idx++;
                  const i = idx;
                  return (
                    <a
                      key={h.to}
                      href={'#' + h.to}
                      role="option"
                      aria-selected={i === sel}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        go(h.to);
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="strong cond">{h.title}</div>
                        {h.subtitle && <div className="sub">{h.subtitle}</div>}
                      </div>
                      {h.status && <StatusPill value={h.status} track="physical" />}
                    </a>
                  );
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function MeMenu() {
  const s = useSession();
  const [open, setOpen] = useState(false);
  const currentRoles = s.roles && s.roles.length > 0 ? s.roles : ROLES;
  const role = currentRoles.find((r) => r.code === s.roleCode);
  const initials =
    (s.userName || 'Ashok Kumar')
      .replace(/[^A-Za-z ]/g, '')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const siteList = s.sites && s.sites.length > 0 ? s.sites : SITES;

  return (
    <div style={{ position: 'relative' }}>
      <button className="me-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
        <span className="avatar">{initials}</span>
        <span className="me-name" style={{ textAlign: 'left' }}>
          <div className="small strong">{s.userName}</div>
          <div className="xs faint">{role?.name ?? 'All permissions'}</div>
        </span>
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 29 }} onClick={() => setOpen(false)} />
          <div className="pop menu" role="dialog" aria-label="Account and user settings">
            <div className="row" style={{ alignItems: 'center', marginBottom: 12, gap: 10 }}>
              <span className="avatar" style={{ width: 34, height: 34, flexShrink: 0 }}>
                {initials}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong
                  style={{
                    display: 'block',
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.userName}
                </strong>
                {s.userEmail && (
                  <span
                    className="xs faint"
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.userEmail}
                  </span>
                )}
              </div>
              <Button size="sm" variant="ghost" aria-label="Close" icon={<X />} onClick={() => setOpen(false)} />
            </div>

            <h3>Active Role</h3>
            <Select
              aria-label="Role"
              value={s.roleCode}
              onChange={(e) => s.setRoleCode(e.target.value)}
              options={[
                [ALL_ROLE, 'All permissions (design review)'],
                ...currentRoles.map((r) => [r.code, r.name] as [string, string]),
              ]}
            />
            <p className="xs faint" style={{ marginTop: 6 }}>
              Role determines authorization grants, permissions, and screen access.
            </p>

            <h3>Operating Site</h3>
            <Select
              aria-label="Active Site"
              value={String(s.site.siteId)}
              onChange={(e) => s.setSiteId(Number(e.target.value))}
              options={siteList.map((st) => [String(st.siteId), `${st.siteCode} · ${st.siteName}`])}
            />

            <h3>Scope</h3>
            <Segmented
              label="Phase"
              value={String(s.phase) as '1' | '2'}
              onChange={(v) => s.setPhase(Number(v) as 1 | 2)}
              options={[
                { id: '1', label: 'Phase 1 (M0–M4)' },
                { id: '2', label: 'Phase 1 + 2' },
              ]}
            />
            <h3>Theme</h3>
            <Segmented
              label="Theme"
              value={s.theme}
              onChange={s.setTheme}
              options={[
                { id: 'system', label: 'System' },
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ]}
            />
            <h3>Language</h3>
            <Segmented
              label="Language"
              value={s.lang}
              onChange={s.setLang}
              options={[
                { id: 'en', label: 'English' },
                { id: 'sw', label: 'Kiswahili' },
              ]}
            />
            <h3>Connection</h3>
            <Segmented
              label="Connection"
              value={s.offline ? 'off' : 'on'}
              onChange={(v) => s.setOffline(v === 'off')}
              options={[
                { id: 'on', label: 'Online' },
                { id: 'off', label: 'Offline (gate demo)' },
              ]}
            />
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--steel)' }}>
              <SignOutButton onClose={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SignOutButton({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  return (
    <Button
      variant="secondary"
      icon={<LogOut size={15} />}
      style={{ width: '100%', justifyContent: 'center' }}
      onClick={async () => {
        onClose();
        await logout();
      }}
    >
      Sign out
    </Button>
  );
}

export default Header;

