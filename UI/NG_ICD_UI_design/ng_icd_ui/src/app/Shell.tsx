import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, ShieldCheck, Sparkles, WifiOff, X } from 'lucide-react';
import { NAV, isPhase2 } from './nav';
import { ALL_ROLE, SITES, useSession } from './session';
import { ROLES } from './roles';
import { useT } from './i18n';
import { Button, Ms, Segmented, Select, StatusPill, cx } from '@/ds/components';
import { search, type Group } from '@/mock/search';
import { approvals } from '@/mock/control';
import { AivaPanel } from './Aiva';

export function Shell({ children }: { children: ReactNode }) {
  const [railOpen, setRailOpen] = useState(false);
  const [aiva, setAiva] = useState(false);
  const loc = useLocation();
  useEffect(() => setRailOpen(false), [loc.pathname]);
  return (
    <div className={cx('shell', aiva && 'with-aiva')}>
      <Rail open={railOpen} />
      {railOpen && <div className="scrim" style={{ zIndex: 49 }} onClick={() => setRailOpen(false)} />}
      <TopBar onMenu={() => setRailOpen((o) => !o)} onAiva={() => setAiva((a) => !a)} aivaOpen={aiva} />
      <main className="main" id="main">{children}</main>
      {aiva && <AivaPanel onClose={() => setAiva(false)} />}
    </div>
  );
}

function Rail({ open }: { open: boolean }) {
  const { can, phase, site, isExternal } = useSession();
  const t = useT();
  return (
    <nav className={cx('rail', open && 'open')} aria-label="Main">
      <div className="brand">
        <div className="brand-mark" aria-hidden>ICD</div>
        <div>
          <div className="brand-name">NG ICD</div>
          <div className="brand-sub">DCC Logistics Suite</div>
        </div>
      </div>
      <div className="rail-scroll">
        {NAV.map((g) => {
          const items = g.items.filter((i) =>
            can(i.perm) && (phase === 2 || !isPhase2(i.ms)) && (!i.facility || site.facilities.includes(i.facility)) &&
            (!isExternal || !!i.external));
          if (!items.length) return null;
          return (
            <div className="rail-group" key={g.label}>
              <h4>{t(g.label)}</h4>
              {items.map((i) => (
                <NavLink key={i.path} to={i.path} end={i.path === '/' || i.path === '/gate'} className={({ isActive }) => cx(isActive && 'active')}>
                  <i.icon aria-hidden />
                  <span>{t(i.label)}</span>
                  {isPhase2(i.ms) && <Ms m={i.ms} />}
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>
      <div className="rail-foot">Prototype with sample data</div>
    </nav>
  );
}

function TopBar({ onMenu, onAiva, aivaOpen }: { onMenu: () => void; onAiva: () => void; aivaOpen: boolean }) {
  const s = useSession();
  const t = useT();
  const nav = useNavigate();
  const pending = approvals.filter((a) => a.status === 'PENDING' && a.canDecide).length;
  return (
    <header className="topbar">
      <Button variant="ghost" className="menu-toggle" aria-label="Open menu" icon={<Menu />} onClick={onMenu} />
      {!s.isExternal ? <OneSearch /> : <div className="spacer" />}
      <div className="site-switch">
        <span className="site-name xs faint">Site</span>
        <select aria-label="Site" value={s.site.siteId} onChange={(e) => s.setSiteId(Number(e.target.value))}>
          {SITES.map((x) => <option key={x.siteId} value={x.siteId}>{x.siteCode} · {x.siteName}</option>)}
        </select>
      </div>
      {s.offline && <span className="offline-flag"><WifiOff size={14} />{t('Working offline')} · 3 queued</span>}
      <div className="spacer" />
      {!s.isExternal && (
        <div className="top-icon">
          <Button variant="ghost" aria-label={`Approvals, ${pending} waiting`} icon={<ShieldCheck />} onClick={() => nav('/approvals')} />
          {pending > 0 && <span className="badge">{pending}</span>}
        </div>
      )}
      <div className="top-icon">
        <Button variant="ghost" aria-label="Notifications, 4 unread" icon={<Bell />} onClick={() => nav('/inbox')} />
        <span className="badge">4</span>
      </div>
      {s.can('aiva.use') && (
        <Button variant={aivaOpen ? 'primary' : 'secondary'} className="aiva-btn" aria-label={t('Ask Aiva')} icon={<Sparkles />} onClick={onAiva}><span className="aiva-label">{t('Ask Aiva')}</span></Button>
      )}
      <MeMenu />
    </header>
  );
}

function OneSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const t = useT();
  const groups: Group[] = search(q);
  const flat = groups.flatMap((g) => g.hits);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); ref.current?.focus(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const go = (to: string) => { nav(to); setOpen(false); setQ(''); ref.current?.blur(); };
  let idx = -1;
  return (
    <div className="search" role="combobox" aria-expanded={open && groups.length > 0} aria-haspopup="listbox">
      <div className="input-icon">
        <Search />
        <input
          ref={ref} className="input" value={q} placeholder={t('Search container, VIN, plate, BL, invoice or customer')}
          aria-label="Search" onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { setQ(e.target.value); setSel(0); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((x) => Math.min(flat.length - 1, x + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((x) => Math.max(0, x - 1)); }
            if (e.key === 'Enter' && flat[sel]) go(flat[sel].to);
            if (e.key === 'Escape') { setOpen(false); ref.current?.blur(); }
          }}
        />
      </div>
      {!q && <span className="kbd">/</span>}
      {open && q.length >= 2 && (
        <div className="pop sr" role="listbox">
          {groups.length === 0 && <div className="small muted" style={{ padding: '8px 16px' }}>No match for “{q}”. Try the last 4 digits of a container or the end of a VIN.</div>}
          {groups.map((g) => (
            <div key={g.label}>
              <h4>{g.label}</h4>
              {g.hits.map((h) => {
                idx++;
                const i = idx;
                return (
                  <a key={h.to} href={'#' + h.to} role="option" aria-selected={i === sel} onMouseDown={(e) => { e.preventDefault(); go(h.to); }}>
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
  const role = ROLES.find((r) => r.code === s.roleCode);
  const initials = s.userName.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
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
          <div className="pop menu" role="dialog" aria-label="Account and demo settings">
            <div className="row"><strong className="spacer">Demo settings</strong><Button size="sm" variant="ghost" aria-label="Close" icon={<X />} onClick={() => setOpen(false)} /></div>
            <h3>See the app as</h3>
            <Select aria-label="Role" value={s.roleCode} onChange={(e) => s.setRoleCode(e.target.value)}
              options={[[ALL_ROLE, 'All permissions (design review)'], ...ROLES.map((r) => [r.code, r.name] as [string, string])]} />
            <p className="xs faint" style={{ marginTop: 6 }}>Menus, buttons and columns follow the role’s grants from the database seed.</p>
            <h3>Scope</h3>
            <Segmented label="Phase" value={String(s.phase) as '1' | '2'} onChange={(v) => s.setPhase(Number(v) as 1 | 2)}
              options={[{ id: '1', label: 'Phase 1 (M0–M4)' }, { id: '2', label: 'Phase 1 + 2' }]} />
            <h3>Theme</h3>
            <Segmented label="Theme" value={s.theme} onChange={s.setTheme} options={[{ id: 'system', label: 'System' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} />
            <h3>Language</h3>
            <Segmented label="Language" value={s.lang} onChange={s.setLang} options={[{ id: 'en', label: 'English' }, { id: 'sw', label: 'Kiswahili' }]} />
            <h3>Connection</h3>
            <Segmented label="Connection" value={s.offline ? 'off' : 'on'} onChange={(v) => s.setOffline(v === 'off')} options={[{ id: 'on', label: 'Online' }, { id: 'off', label: 'Offline (gate demo)' }]} />
          </div>
        </>
      )}
    </div>
  );
}
