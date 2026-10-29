import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Check as CheckIcon, CheckCircle2, ChevronRight, CircleSlash, Info, Lock, OctagonX, ShieldAlert, X,
} from 'lucide-react';
import { useSession } from '@/app/session';
import type { Grant } from '@/app/roles';
import { BILLING, CUSTOMS, GENERIC, PHYSICAL, RELEASE, look, type Tone } from './status';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

/* ------------------------------------------------------------------ buttons */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'xl';
  icon?: ReactNode;
  /** Permission needed. Without it the button is disabled and says why. */
  perm?: string;
  level?: Grant;
};
export function Button({ variant = 'secondary', size = 'md', icon, perm, level = 'DO', className, children, title, disabled, type = 'button', ...rest }: BtnProps) {
  const { can } = useSession();
  const allowed = can(perm, level);
  // A REQ grant still lets the user act: the action becomes an approval request.
  const viaRequest = !!perm && !allowed && level === 'DO' && can(perm, 'REQ');
  const blocked = !allowed && !viaRequest;
  return (
    <button
      type={type}
      className={cx('btn', variant !== 'secondary' && `btn-${variant}`, size !== 'md' && `btn-${size}`, !children && 'btn-icon', className)}
      disabled={disabled || blocked}
      title={blocked ? `Needs permission ${perm}` : viaRequest ? 'Sends an approval request' : title}
      {...rest}
    >
      {blocked ? <Lock /> : icon}
      {children}
      {viaRequest && <span className="xs faint">(request)</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ pills */
export function Pill({ tone = 'idle', children, icon }: { tone?: Tone | 'hold'; children: ReactNode; icon?: ReactNode }) {
  return <span className={cx('pill', tone !== 'idle' && `pill-${tone}`)}>{icon}{children}</span>;
}
type Track = 'physical' | 'customs' | 'billing' | 'release' | 'generic';
const MAPS = { physical: PHYSICAL, customs: CUSTOMS, billing: BILLING, release: RELEASE, generic: GENERIC };
export function StatusPill({ value, track = 'generic' }: { value: string | null | undefined; track?: Track }) {
  const [label, tone] = look(MAPS[track], value);
  return <Pill tone={tone}>{label}</Pill>;
}
export function HoldPill({ count }: { count: number }) {
  if (!count) return null;
  return <Pill tone="hold" icon={<ShieldAlert />}>{count === 1 ? 'Hold' : `${count} holds`}</Pill>;
}
export function Ms({ m }: { m: string }) {
  const p2 = m === 'M5' || m === 'M6';
  return <span className={cx('ms', p2 && 'ms-p2')} title={p2 ? 'Phase 2' : 'Phase 1'}>{m}</span>;
}
export function Tag({ children }: { children: ReactNode }) { return <span className="tag">{children}</span>; }

/* ------------------------------------------------------------------ unit number plate */
export function UnitNo({ no, category = 'CONTAINER', size = 'sm', to }: {
  no: string; category?: 'CONTAINER' | 'VEHICLE' | 'LOT' | string; size?: 'sm' | 'md' | 'lg'; to?: string;
}) {
  let body: ReactNode = no;
  const c = no.replace(/\s/g, '');
  if (category === 'CONTAINER' && /^[A-Z]{4}\d{7}$/.test(c)) {
    body = (<><span className="owner">{c.slice(0, 4)}</span><span>{c.slice(4, 10)}</span><span className="cd" aria-label={`check digit ${c[10]}`}>{c[10]}</span></>);
  } else if (category === 'VEHICLE' && c.length === 17) {
    // VIN: the last 8 characters (serial) are what people read aloud
    body = (<><span className="vin-head">{c.slice(0, 9)}</span><span className="vin-tail">{c.slice(9)}</span></>);
  }
  const el = <span className={cx('unitno', `unitno-${size}`)}>{body}</span>;
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{el}</Link> : el;
}

/* ------------------------------------------------------------------ status tracks */
export interface TrackInput {
  physicalStatus?: string | null; customsStatus?: string | null; billingStatus?: string | null; releaseStatus?: string | null;
  activeHoldCount?: number | null;
}
export function Tracks({ s, notes }: { s: TrackInput; notes?: Partial<Record<'physical' | 'customs' | 'billing' | 'release', ReactNode>> }) {
  const items: [string, 'physical' | 'customs' | 'billing' | 'release', Record<string, [string, Tone]>, string | null | undefined][] = [
    ['Where it is', 'physical', PHYSICAL, s.physicalStatus],
    ['Customs', 'customs', CUSTOMS, s.customsStatus],
    ['Charges', 'billing', BILLING, s.billingStatus],
    ['Release', 'release', RELEASE, s.releaseStatus],
  ];
  return (
    <div className="tracks" role="list" aria-label="Status tracks">
      {items.map(([label, key, map, v]) => {
        const [text, tone] = look(map, v);
        return (
          <div key={key} role="listitem" className={cx('track', tone !== 'idle' && tone !== 'info' && `track-${tone}`)}>
            <div className="t-label">{label}</div>
            <div className="t-value">{text}</div>
            {notes?.[key] && <div className="t-note">{notes[key]}</div>}
          </div>
        );
      })}
    </div>
  );
}
/** Four tiny squares for tables: physical, customs, charges, release. */
export function MiniTracks({ s }: { s: TrackInput }) {
  const t = (m: Record<string, [string, Tone]>, v?: string | null) => look(m, v);
  const parts = [t(PHYSICAL, s.physicalStatus), t(CUSTOMS, s.customsStatus), t(BILLING, s.billingStatus), t(RELEASE, s.releaseStatus)];
  const label = ['Where', 'Customs', 'Charges', 'Release'].map((n, i) => `${n}: ${parts[i][0]}`).join(', ');
  return <span className="mini-tracks" title={label} aria-label={label}>{parts.map(([, tone], i) => <i key={i} className={tone} />)}</span>;
}

/* ------------------------------------------------------------------ page scaffolding */
export function PageHeader({ title, sub, actions, crumbs, ms, children }: {
  title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumbs?: [string, string?][]; ms?: string; children?: ReactNode;
}) {
  return (
    <>
      {crumbs && (
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map(([label, to], i) => (
            <span key={i} className="row" style={{ gap: 8 }}>
              {to ? <Link to={to}>{label}</Link> : <span>{label}</span>}
              {i < crumbs.length - 1 && <ChevronRight size={14} />}
            </span>
          ))}
        </nav>
      )}
      <header className="page-head">
        <div className="titles">
          <div className="row" style={{ gap: 10 }}>
            <h1>{title}</h1>
            {ms && <Ms m={ms} />}
          </div>
          {sub && <div className="sub">{sub}</div>}
          {children}
        </div>
        {actions && <div className="row-wrap">{actions}</div>}
      </header>
    </>
  );
}
export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <div className={cx('page', wide && 'page-wide')}>{children}</div>;
}
export function Panel({ title, actions, children, flush, className, sub }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string; sub?: ReactNode;
}) {
  return (
    <section className={cx('panel', className)}>
      {(title || actions) && (
        <div className="panel-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            {typeof title === 'string' ? <h2>{title}</h2> : title}
            {sub && <div className="xs muted">{sub}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className={flush ? 'panel-flush' : 'panel-body'}>{children}</div>
    </section>
  );
}
export function Banner({ tone = 'idle', title, children, action }: { tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const Icon = tone === 'stop' ? OctagonX : tone === 'go' ? CheckCircle2 : tone === 'wait' ? AlertTriangle : Info;
  return (
    <div className={cx('banner', tone !== 'idle' && tone !== 'info' && `banner-${tone}`)} role={tone === 'stop' ? 'alert' : 'status'}>
      <Icon />
      <div style={{ flex: 1 }}>
        {title && <div className="strong">{title}</div>}
        {children && <div className="small">{children}</div>}
      </div>
      {action}
    </div>
  );
}
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>;
}

/* ------------------------------------------------------------------ data table */
export interface Col<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  num?: boolean;
  width?: number | string;
  /** Column is hidden unless the user holds this permission (field rules). */
  perm?: string;
}
export function DataTable<T>({ cols, rows, rowKey, onRow, selected, empty, foot, dense }: {
  cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string | number; onRow?: (r: T) => void;
  selected?: string | number | null; empty?: ReactNode; foot?: ReactNode; dense?: boolean;
}) {
  const { can } = useSession();
  const visible = cols.filter((c) => can(c.perm));
  if (!rows.length) return <>{empty ?? <Empty title="Nothing here yet" />}</>;
  return (
    <div className="table-wrap">
      <table className="dt" style={dense ? { fontSize: 12 } : undefined}>
        <thead>
          <tr>{visible.map((c) => <th key={c.key} className={c.num ? 'num' : undefined} style={{ width: c.width }}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const k = rowKey(r);
            return (
              <tr
                key={k}
                className={cx(onRow && 'clickable', selected === k && 'selected')}
                onClick={onRow ? () => onRow(r) : undefined}
                onKeyDown={onRow ? (e) => { if (e.key === 'Enter') onRow(r); } : undefined}
                tabIndex={onRow ? 0 : undefined}
              >
                {visible.map((c) => (
                  <td key={c.key} className={c.num ? 'num' : undefined}>
                    {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        {foot && <tfoot>{foot}</tfoot>}
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ tabs, chips, segmented */
export function Tabs<K extends string>({ tabs, value, onChange }: {
  tabs: { id: K; label: ReactNode; count?: number; hidden?: boolean }[]; value: K; onChange: (k: K) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.filter((t) => !t.hidden).map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.label}{t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Chips<K extends string>({ options, value, onChange }: {
  options: { id: K; label: ReactNode; count?: number }[]; value: K; onChange: (k: K) => void;
}) {
  return (
    <div className="chipset" role="group">
      {options.map((o) => (
        <button key={o.id} className="chip" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}{o.count !== undefined && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Segmented<K extends string>({ options, value, onChange, xl, label }: {
  options: { id: K; label: ReactNode }[]; value: K; onChange: (k: K) => void; xl?: boolean; label?: string;
}) {
  return (
    <div className={cx('seg', xl && 'seg-xl')} role="group" aria-label={label}>
      {options.map((o) => <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

/* ------------------------------------------------------------------ form fields */
export function Field({ label, hint, error, required, children, span }: {
  label: ReactNode; hint?: ReactNode; error?: ReactNode; required?: boolean; children: ReactNode; span?: number;
}) {
  return (
    <div className="field" style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label>{label}{required && <span className="req" aria-hidden>*</span>}</label>
      {children}
      {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
export function Input({ xl, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { xl?: boolean }) {
  return <input className={cx('input', xl && 'input-xl', className)} {...p} />;
}
export function Select({ options, className, xl, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { options?: (string | [string, string])[]; xl?: boolean }) {
  return (
    <select className={cx('select', xl && 'select-xl', className)} {...p}>
      {children ?? (options ?? []).map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}
    </select>
  );
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className="textarea" {...p} />; }
export function Check({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return <label className="check"><input type="checkbox" {...p} />{label}</label>;
}
export function SearchInput({ icon, ...p }: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return <div className="input-icon">{icon}<input className="input" {...p} /></div>;
}

/* ------------------------------------------------------------------ description lists */
export function DL({ items, cols }: { items: [ReactNode, ReactNode][]; cols?: boolean }) {
  if (cols) return <dl className="dl-cols">{items.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v ?? '—'}</dd></div>)}</dl>;
  return <dl className="dl">{items.map(([k, v], i) => <div key={i} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v ?? '—'}</dd></div>)}</dl>;
}

/* ------------------------------------------------------------------ KPI */
export function Kpi({ label, value, unit, delta, children }: { label: string; value: ReactNode; unit?: string; delta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="kpi">
      <span className="label">{label}</span>
      <span className="value">{value}{unit && <small>{unit}</small>}</span>
      {delta && <span className="delta">{delta}</span>}
      {children}
    </div>
  );
}
export function Meter({ pct, label }: { pct: number; label?: string }) {
  const cls = pct >= 90 ? 'meter-stop' : pct >= 75 ? 'meter-warn' : '';
  return (
    <div className={cx('meter', cls)} role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ release conditions */
export interface Cond { code: string; name: string; result: 'PASS' | 'FAIL' | 'OVERRIDDEN' | 'NOT_APPLIC'; detail?: string | null }
export function Conditions({ items }: { items: Cond[] }) {
  return (
    <div className="conds">
      {items.map((c) => {
        const Icon = c.result === 'PASS' ? CheckIcon : c.result === 'FAIL' ? X : c.result === 'OVERRIDDEN' ? AlertTriangle : CircleSlash;
        const cls = { PASS: 'rcond-pass', FAIL: 'rcond-fail', OVERRIDDEN: 'rcond-over', NOT_APPLIC: 'rcond-na' }[c.result];
        return (
          <div key={c.code} className={cx('rcond', cls)}>
            <Icon aria-hidden />
            <div>
              <div className="c-name">{c.name} <span className="sr-only">{c.result}</span></div>
              {c.detail && <div className="c-detail">{c.detail}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ timeline */
export interface TLItem { at: string; title: ReactNode; detail?: ReactNode; by?: string | null; tone?: Tone }
export function Timeline({ items }: { items: TLItem[] }) {
  return (
    <ol className="tl">
      {items.map((e, i) => (
        <li key={i}>
          <span className="when">{fmtDT(e.at)}</span>
          <span className={cx('dot', e.tone)} aria-hidden />
          <div className="what">
            <div className="t">{e.title}</div>
            {e.detail && <div className="d">{e.detail}</div>}
            {e.by && <div className="by">{e.by}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ stepper */
export function Stepper({ steps }: { steps: { label: string; state: 'done' | 'current' | 'todo' | 'fail'; note?: string }[] }) {
  return (
    <ol className="stepper" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {steps.map((s, i) => (
        <li key={i} className={cx('step', s.state !== 'todo' && `step-${s.state}`)} aria-current={s.state === 'current' ? 'step' : undefined}>
          <div className="s-n">{i + 1}</div>
          <div className="s-t">{s.label}</div>
          {s.note && <div className="xs">{s.note}</div>}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ drawer & modal */
export function Drawer({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={cx('drawer', wide && 'drawer-wide')} role="dialog" aria-modal aria-labelledby={id} tabIndex={-1} ref={ref}>
        <div className="drawer-head"><h2 id={id}>{title}</h2><Button variant="ghost" aria-label="Close" icon={<X />} onClick={onClose} /></div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  );
}
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal aria-labelledby={id}>
        <div className="drawer-head"><h2 id={id}>{title}</h2><Button variant="ghost" aria-label="Close" icon={<X />} onClick={onClose} /></div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ toast */
const ToastCtx = createContext<(msg: string) => void>(() => undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => <div key={t.id} className="toast"><CheckCircle2 />{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ------------------------------------------------------------------ formatting */
export function Money({ amount, currency, strong }: { amount: string | number | null | undefined; currency?: string | null; strong?: boolean }) {
  if (amount === null || amount === undefined || amount === '') return <span className="faint">—</span>;
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const s = n.toLocaleString('en-US', { minimumFractionDigits: currency === 'TZS' ? 0 : 2, maximumFractionDigits: currency === 'TZS' ? 0 : 2 });
  return <span className={cx('money', strong && 'strong')}>{currency && <span className="cur">{currency}</span>}{s}</span>;
}
export function fmtDT(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' });
}
export function fmtD(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Dar_es_Salaam' });
}
export function fmtT(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' });
}
export function ago(iso?: string | null) {
  if (!iso) return '—';
  const m = Math.round((NOW.getTime() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
  const d = Math.round(m / 1440);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
/** Demo clock: all sample data is relative to this moment. */
export const NOW = new Date('2026-10-07T10:30:00+03:00');

// Centralized Shared Table & Cells
export {
  CommonTable, ReferenceCell, PartyCell, MoneyCell, StatusCell, DateCell
} from './CommonTable';
export type { CommonTableProps } from './CommonTable';

