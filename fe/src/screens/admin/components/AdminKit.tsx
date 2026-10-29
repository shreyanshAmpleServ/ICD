import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Database, History, Minus, RefreshCw, Search } from 'lucide-react';
import {
  Banner, Button, Drawer, Field, Page, PageHeader, Panel, Pill, SearchInput, Textarea, cx,
} from '@/ds/components';
import type { Grant } from '@/app/roles';
import { useQ, delay } from '@/api/query';
import type { Source } from '@/mock/admin';
import './admin.css';

/* Shared building blocks for the Setup screens. Every setup page has the
   same frame: title + milestone, where the data lives in the database,
   a left list / right detail (or tabs), and edits in a drawer that end in
   the audit trail. These are local because the design system has no
   split-view or seed-source primitives yet. */

/** Page frame for every setup screen. */
export function SetupPage({ title, ms, sub, sources, actions, children, wide }: {
  title: string; ms: string; sub: ReactNode; sources?: Source[]; actions?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  return (
    <Page wide={wide}>
      <PageHeader title={title} ms={ms} sub={sub} actions={actions}
        crumbs={[['Setup'], [title]]}>
        {sources && sources.length > 0 && <SourceLine sources={sources} />}
      </PageHeader>
      <div className="stack-lg adm-page">{children}</div>
    </Page>
  );
}

/** "Stored in m_x · seeded by M2" so the admin knows what ships with the database. */
export function SourceLine({ sources }: { sources: Source[] }) {
  return (
    <div className="adm-source">
      <Database size={13} aria-hidden />
      {sources.map((s, i) => (
        <span key={i}>
          <code>{s.table}</code>{s.seed ? <> · seeded by {s.seed}</> : <> · entered here</>}{i < sources.length - 1 ? ';' : ''}
        </span>
      ))}
    </div>
  );
}

export function AuditNote({ children }: { children?: ReactNode }) {
  return (
    <div className="adm-audit">
      <History aria-hidden />
      <span>{children ?? 'Changes are logged in the audit trail with your name, the time and the old and new values.'}{' '}<Link to="/audit">Open audit trail</Link></span>
    </div>
  );
}

/** Left list, right detail. */
export function Split({ list, children, narrow }: { list: ReactNode; children: ReactNode; narrow?: boolean }) {
  return <div className={cx('adm-split', narrow && 'adm-split-narrow')}><div>{list}</div><div className="stack-lg" style={{ minWidth: 0 }}>{children}</div></div>;
}

export interface ListItem { id: string | number; title: ReactNode; sub?: ReactNode; aside?: ReactNode; lead?: ReactNode }
export function ListPanel({ title, items, selected, onSelect, actions, searchable, filter, empty }: {
  title: ReactNode; items: ListItem[]; selected?: string | number | null; onSelect: (id: string | number) => void;
  actions?: ReactNode; searchable?: string; filter?: ReactNode; empty?: ReactNode;
}) {
  const [q, setQ] = useState('');
  const shown = q ? items.filter((i) => `${typeof i.title === 'string' ? i.title : ''} ${typeof i.sub === 'string' ? i.sub : ''} ${i.id}`.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <Panel flush title={title} actions={actions}>
      {(searchable || filter) && (
        <div className="toolbar">
          {searchable && <div style={{ flex: '1 1 100%' }}><SearchInput icon={<Search />} placeholder={searchable} value={q} onChange={(e) => setQ(e.target.value)} aria-label={searchable} /></div>}
          {filter}
        </div>
      )}
      {shown.length === 0 ? (empty ?? <p className="small muted" style={{ padding: 16, margin: 0 }}>Nothing matches. Clear the search to see everything.</p>) : (
        <ul className="adm-list">
          {shown.map((i) => (
            <li key={i.id}>
              <button aria-current={selected === i.id} onClick={() => onSelect(i.id)}>
                {i.lead}
                <span className="grow"><span className="t" style={{ display: 'block' }}>{i.title}</span>{i.sub && <span className="s">{i.sub}</span>}</span>
                {i.aside}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Edit drawer: Cancel + one action that says what happens, optional reason, audit note. */
export function EditDrawer({ open, onClose, title, saveLabel, onSave, perm, level, children, reason, wide, danger, disabled }: {
  open: boolean; onClose: () => void; title: ReactNode; saveLabel: string; onSave: (reason: string) => void; perm: string; level?: Grant;
  children: ReactNode; reason?: string; wide?: boolean; danger?: boolean; disabled?: boolean;
}) {
  const [why, setWhy] = useState('');
  const needWhy = !!reason && why.trim().length < 5;
  return (
    <Drawer open={open} onClose={onClose} title={title} wide={wide}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} perm={perm} level={level} disabled={disabled || needWhy}
          onClick={() => { onSave(why); setWhy(''); onClose(); }}>{saveLabel}</Button>
      </>}>
      <div className="stack">
        {children}
        {reason && (
          <Field label="Reason for the change" required hint={reason}>
            <Textarea value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why, and who asked for it" />
          </Field>
        )}
        <AuditNote />
      </div>
    </Drawer>
  );
}

export function YesNo({ v, label }: { v: boolean | null | undefined; label?: string }) {
  return v
    ? <span className="adm-yes" title={label ? `${label}: yes` : 'Yes'}><Check aria-label="Yes" /></span>
    : <span className="adm-no" title={label ? `${label}: no` : 'No'}><Minus size={14} aria-label="No" /></span>;
}

export function VerifyPill({ children = 'Verify before use' }: { children?: ReactNode }) {
  return <Pill tone="wait" icon={<AlertTriangle />}>{children}</Pill>;
}
export function NgPill() {
  return <Pill tone="info" icon={<RefreshCw />}>Synced from NG</Pill>;
}
export function SourcePill({ source, sync }: { source?: string | null; sync?: string | null }) {
  if (sync === 'PROVISIONAL') return <Pill tone="wait">Provisional · match to NG</Pill>;
  if (source === 'LOCAL') return <Pill tone="info">Local only</Pill>;
  return <NgPill />;
}

export function GrantChip({ g }: { g: Grant | null | undefined }) {
  if (!g) return <span className="adm-g adm-g-none" aria-label="No grant">·</span>;
  const title = { DO: 'Can do it', REQ: 'Can request (needs approval)', APPR: 'Can approve', VIEW: 'Can view' }[g];
  return <span className={`adm-g adm-g-${g}`} title={title}>{g}</span>;
}

/** Read from the mock API, then keep local edits for the session. */
export function useEditable<T>(key: string, src: T[]) {
  const { data } = useQ(['admin', key], () => delay(src));
  const [over, setOver] = useState<T[] | null>(null);
  const rows = over ?? data ?? [];
  const update = (fn: (r: T[]) => T[]) => setOver(fn(over ?? data ?? src));
  return [rows, update, !data] as const;
}

export function SeedBanner({ children }: { children: ReactNode }) {
  return <Banner tone="wait" title="Seeded as an assumption: verify before go-live">{children}</Banner>;
}

export const hrs = (min: number) => (min < 60 ? `${min} min` : min % 1440 === 0 ? `${min / 1440} day${min === 1440 ? '' : 's'}` : min % 60 === 0 ? `${min / 60} h` : `${(min / 60).toFixed(1)} h`);
export const label = (code: string) => code.charAt(0).toUpperCase() + code.slice(1).toLowerCase().replace(/_/g, ' ');

/** Audit note on the left, undo/save on the right; wraps cleanly on narrow screens. */
export function SaveBar({ note, children }: { note?: ReactNode; children: ReactNode }) {
  return <div className="adm-savebar"><div className="adm-savebar-note"><AuditNote>{note}</AuditNote></div><div className="row" style={{ marginLeft: 'auto' }}>{children}</div></div>;
}
