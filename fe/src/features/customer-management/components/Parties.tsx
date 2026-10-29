import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText, Link2, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import {
  Banner, Button, Check, Chips, DL, DataTable, Drawer, Empty, Field, Input, Kpi, Meter, Money, Page, PageHeader, Panel, Pill,
  SearchInput, Segmented, StatusPill, Tabs, Tag, Timeline, UnitNo, fmtD, useToast,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { allStays, consignments, parties, party as partyOf } from '@/mock/core';
import { NG_MATCHES, balanceOf, contactsOf, invoicesOf, partySync } from '@/mock/insight';
import '@/features/reports/insight.css';

/* Customers & parties: GET /parties, /parties/{id}. Parties come from NG
   (the ERP) and sync down; a gate officer can create a provisional local
   party when NG is unreachable, which someone must later match to the NG
   record (POST /parties/{id}/match). */
type Party = (typeof parties)[number];
type Role = 'all' | 'CUSTOMER' | 'CLEARING_AGENT' | 'SHIPPING_LINE' | 'TRANSPORTER' | 'provisional' | 'blocked';
const roleText = (r: string) => r.toLowerCase().replace(/_/g, ' ');
const CREDIT: Record<string, ['go' | 'idle' | 'stop', string]> = { CREDIT: ['go', 'Credit'], CASH: ['idle', 'Cash'], BLOCKED: ['stop', 'Credit stopped'] };
const openUnits = (id: number) => allStays.filter((s) => s.physicalStatus !== 'DEPARTED' && consignments.some((c) => c.consignmentId === s.consignmentId && (c.billToPartyId === id || c.consigneePartyId === id || c.agentPartyId === id || c.shippingLinePartyId === id))).length;

export function Parties() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role>('all');
  const { data = [] } = useQ(['parties'], () => delay(parties));
  const counts = useMemo(() => new Map(data.map((p) => [p.partyId!, openUnits(p.partyId!)])), [data]);
  const rows = data.filter((p) => {
    if (q && !(p.partyName + p.partyCode + (p.taxId ?? '')).toLowerCase().includes(q.toLowerCase())) return false;
    if (role === 'provisional') return p.syncStatus !== 'SYNCED';
    if (role === 'blocked') return p.creditStatus === 'BLOCKED';
    return role === 'all' || p.roles.includes(role);
  });

  return (
    <Page>
      <PageHeader title="Customers & parties" ms="M0" sub="Customers, agents, lines and transporters. Most come from NG; local ones need matching."
        actions={<Button variant="primary" icon={<Plus />} perm="masters.local.edit">Add provisional party</Button>} />
      <Panel flush>
        <div className="toolbar">
          <div style={{ width: 280, maxWidth: '100%' }}><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, code or TIN" aria-label="Find a party" /></div>
          <Chips<Role> value={role} onChange={setRole} options={[
            { id: 'all', label: 'All' }, { id: 'CUSTOMER', label: 'Customers' }, { id: 'CLEARING_AGENT', label: 'Clearing agents' }, { id: 'SHIPPING_LINE', label: 'Shipping lines' },
            { id: 'TRANSPORTER', label: 'Transporters' },
            { id: 'provisional', label: 'Provisional', count: data.filter((p) => p.syncStatus !== 'SYNCED').length },
            { id: 'blocked', label: 'Credit stopped', count: data.filter((p) => p.creditStatus === 'BLOCKED').length },
          ]} />
        </div>
        <DataTable rows={rows} rowKey={(p) => p.partyId!} onRow={(p) => nav(`/parties/${p.partyId}`)}
          empty={<Empty title="No parties match">Clear the search, or add a provisional party if it is new.</Empty>}
          cols={[
            { key: 'n', header: 'Name', render: (p) => <span><strong>{p.partyName}</strong><div className="xs faint">{p.partyCode} · {p.city}{p.countryCode !== 'TZ' ? `, ${p.countryCode}` : ''}</div></span> },
            { key: 'r', header: 'Roles', render: (p) => <span className="row-wrap" style={{ gap: 4 }}>{p.roles.map((r) => <Tag key={r}>{roleText(r)}</Tag>)}</span> },
            { key: 'c', header: 'Credit', render: (p) => <span><Pill tone={CREDIT[p.creditStatus ?? 'CASH'][0]}>{CREDIT[p.creditStatus ?? 'CASH'][1]}</Pill>{p.creditLimit && <div className="xs faint">limit {p.creditCurrency} {Number(p.creditLimit).toLocaleString()}</div>}</span> },
            { key: 'b', header: 'Balance (USD)', num: true, perm: 'billing.invoice.view', render: (p) => { const b = balanceOf(p.partyId!); return b ? <Money amount={b} /> : <span className="faint">—</span>; } },
            { key: 'u', header: 'Open units', num: true, render: (p) => counts.get(p.partyId!) || <span className="faint">—</span> },
            { key: 's', header: 'NG record', render: (p) => p.syncStatus === 'SYNCED' ? <span className="small">{p.ngRefId}</span> : <Pill tone="wait">Provisional</Pill> },
          ]} />
      </Panel>
    </Page>
  );
}

type Tab = 'overview' | 'contacts' | 'cargo' | 'sync';
type Contact = ReturnType<typeof contactsOf>[number];

export function PartyDetail() {
  const { partyId } = useParams();
  const id = Number(partyId);
  const nav = useNavigate();
  const toast = useToast();
  const base = partyOf(id);
  const [matched, setMatched] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [matchOpen, setMatchOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [edit, setEdit] = useState<Contact | null>(null);
  if (!base) return <Page><Empty title="Party not found" action={<Link to="/parties">Back to customers & parties</Link>}>It may have been merged into its NG record. Search by name instead.</Empty></Page>;
  const p: Party = matched ? { ...base, syncStatus: 'SYNCED', source: 'NG', ngRefId: matched } : base;
  const cs = contacts ?? contactsOf(id);
  const invs = invoicesOf(id);
  const bal = balanceOf(id);
  const limit = Number(p.creditLimit ?? 0);
  const cons = consignments.filter((c) => [c.billToPartyId, c.consigneePartyId, c.agentPartyId, c.shippingLinePartyId, c.shipperPartyId].includes(id));
  const units = allStays.filter((s) => s.physicalStatus !== 'DEPARTED' && cons.some((c) => c.consignmentId === s.consignmentId));
  const sync = partySync[id] ?? [{ at: '2026-09-01T06:00:00Z', title: 'Synced from NG', detail: p.ngRefId ?? '', tone: 'go' as const }];

  return (
    <Page>
      <PageHeader crumbs={[['Customers & parties', '/parties'], [p.partyName]]} title={p.partyName} ms="M0"
        sub={<span className="row-wrap" style={{ marginTop: 6 }}>
          <span className="small muted">{p.partyCode}</span>
          {p.roles.map((r) => <Tag key={r}>{roleText(r)}</Tag>)}
          <Pill tone={CREDIT[p.creditStatus ?? 'CASH'][0]}>{CREDIT[p.creditStatus ?? 'CASH'][1]}</Pill>
          {p.syncStatus === 'SYNCED' ? <StatusPill value="SYNCED" /> : <Pill tone="wait">Provisional</Pill>}
        </span>}
        actions={<>
          <Button icon={<RefreshCw />} perm="masters.view" onClick={() => toast('Refreshed from NG')} disabled={p.syncStatus !== 'SYNCED'}>Refresh from NG</Button>
          <Button variant="primary" icon={<FileText />} perm="billing.invoice.view" onClick={() => nav(`/statements/${id}`)}>Open statement</Button>
        </>} />

      <div className="stack-lg">
        {p.syncStatus !== 'SYNCED' && (
          <Banner tone="wait" title="Provisional — match to NG record"
            action={<Button variant="primary" icon={<Link2 />} perm="masters.local.edit" onClick={() => setMatchOpen(true)}>Match to NG record</Button>}>
            Created locally at the gate while NG was unreachable. Invoices to this party stay in draft until it is matched, so they post against the right customer account.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi label="Open balance" value={<Money amount={bal} currency="USD" />} delta={<Link to={`/statements/${id}`}>Open statement</Link>} />
          <Kpi label="Credit used" value={limit ? `${Math.round((bal / limit) * 100)}%` : '—'} delta={limit ? `of USD ${limit.toLocaleString()}` : p.creditStatus === 'BLOCKED' ? 'Credit stopped: cash only' : 'Cash customer'}>{limit ? <Meter pct={(bal / limit) * 100} label="Credit used" /> : null}</Kpi>
          <Kpi label="Open units" value={units.length} delta={`${cons.length} consignment${cons.length === 1 ? '' : 's'}`} />
          <Kpi label="Contacts" value={cs.length} delta={`${cs.filter((c) => c.notifyWhatsapp).length} on WhatsApp`} />
        </div>

        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: 'Overview' }, { id: 'contacts', label: 'Contacts & notifications', count: cs.length },
          { id: 'cargo', label: 'Cargo', count: units.length }, { id: 'sync', label: 'NG sync' },
        ]} />

        {tab === 'overview' && (
          <div className="grid-main-side">
            <Panel title="Details">
              <DL cols items={[
                ['Code', p.partyCode], ['NG record', p.ngRefId ?? 'Not matched'], ['TIN', p.taxId], ['VAT number', p.vatNo],
                ['City', `${p.city ?? '—'}${p.countryCode && p.countryCode !== 'TZ' ? `, ${p.countryCode}` : ''}`], ['Phone', p.phone], ['Email', p.email],
                ['Default currency', p.defaultCurrency], ['Disbursements', p.disbursementService ? 'We pay port and line charges for them' : 'No'],
              ]} />
            </Panel>
            <Panel flush title="Invoices" sub={`${invs.filter((i) => Number(i.balance) > 0).length} open`} actions={<Link to={`/statements/${id}`} className="small">Statement</Link>}>
              <DataTable dense rows={invs.slice(0, 6)} rowKey={(i) => i.invoiceId!} empty={<p className="small muted" style={{ padding: 16, margin: 0 }}>No invoices yet.</p>} cols={[
                { key: 'n', header: 'Invoice', render: (i) => <span className="small">{i.invoiceNo}<div className="xs faint">{fmtD(i.invoiceDate)}</div></span> },
                { key: 's', header: 'Status', render: (i) => <StatusPill value={i.status} /> },
                { key: 'b', header: 'Balance', num: true, render: (i) => Number(i.balance) ? <Money amount={i.balance} /> : <span className="faint">—</span> },
              ]} />
            </Panel>
          </div>
        )}

        {tab === 'contacts' && (
          <Panel flush title="Contacts" sub="Who gets messages about gate-in, holds, release, invoices and free time ending">
            <DataTable rows={cs} rowKey={(c) => c.partyContactId!} empty={<Empty title="No contacts">Add one so the customer hears about holds and free time.</Empty>} cols={[
              { key: 'n', header: 'Name', render: (c) => <span><strong>{c.contactName}</strong>{c.isPrimary && <> <Pill tone="info">Main</Pill></>}<div className="xs faint">{c.jobTitle}</div></span> },
              { key: 'p', header: 'Phone / email', render: (c) => <span className="small">{c.phone ?? '—'}<div className="xs faint">{c.email ?? 'No email'}</div></span> },
              { key: 'ch', header: 'Notify by', render: (c) => <span className="row-wrap" style={{ gap: 4 }}>{c.notifyEmail && <Tag>Email</Tag>}{c.notifySms && <Tag>SMS</Tag>}{c.notifyWhatsapp && <Tag>WhatsApp</Tag>}{!c.notifyEmail && !c.notifySms && !c.notifyWhatsapp && <span className="xs faint">Nothing</span>}</span> },
              { key: 'l', header: 'Language', render: (c) => <span className="small">{c.preferredLanguage === 'sw' ? 'Kiswahili' : 'English'}</span> },
              { key: 'e', header: '', render: (c) => <Button size="sm" variant="ghost" icon={<Pencil />} perm="masters.local.edit" onClick={(e) => { e.stopPropagation(); setEdit(c); }}>Edit</Button> },
            ]} />
          </Panel>
        )}

        {tab === 'cargo' && (
          <div className="grid-main-side">
            <Panel flush title="Open units">
              <DataTable dense rows={units.slice(0, 30)} rowKey={(s) => s.unitStayId!} empty={<Empty title="No open units">Units appear once a manifest names this party.</Empty>} cols={[
                { key: 'u', header: 'Unit', render: (s) => <UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} to={`/units/${s.unitStayId}`} /> },
                { key: 'bl', header: 'BL', render: (s) => <span className="small">{s.unitSummary.consignmentRef}</span> },
                { key: 'w', header: 'Where', render: (s) => <StatusPill value={s.physicalStatus} track="physical" /> },
                { key: 'c', header: 'Customs', render: (s) => <StatusPill value={s.customsStatus} track="customs" /> },
                { key: 'd', header: 'Days', num: true, render: (s) => s.unitSummary.dwellDays ?? '—' },
              ]} />
              {units.length > 30 && <p className="xs muted" style={{ padding: '8px 16px', margin: 0 }}>Showing 30 of {units.length}. <Link to="/units">See all in Units</Link></p>}
            </Panel>
            <Panel flush title="Consignments">
              <ul className="list-plain">
                {cons.map((c) => (
                  <li key={c.consignmentId} style={{ padding: '10px 16px' }}>
                    <Link to={`/consignments/${c.consignmentId}`} className="strong small">{c.refNo}</Link>
                    <div className="xs muted">{c.cargoDescription} · {c.unitsReceived}/{c.unitsExpected} received · {[c.billToPartyId === id && 'bill-to', c.consigneePartyId === id && 'consignee', c.agentPartyId === id && 'agent', c.shippingLinePartyId === id && 'line'].filter(Boolean).join(', ')}</div>
                  </li>
                ))}
                {cons.length === 0 && <li className="small muted" style={{ padding: 16 }}>No consignments name this party.</li>}
              </ul>
            </Panel>
          </div>
        )}

        {tab === 'sync' && (
          <Panel title="Sync with NG" sub={p.syncStatus === 'SYNCED' ? `Linked to ${p.ngRefId}. Name, TIN and credit come from NG and cannot be edited here.` : 'Not linked yet'}>
            <Timeline items={[...(matched ? [{ at: '2026-10-07T07:30:00Z', title: `Matched to ${matched}`, detail: 'Provisional record merged; local invoices re-pointed', tone: 'go' as const }] : []), ...sync]} />
          </Panel>
        )}
      </div>

      <MatchDrawer open={matchOpen} name={p.partyName} onClose={() => setMatchOpen(false)} onMatch={(ref) => { setMatched(ref); setMatchOpen(false); toast(`Matched to NG record ${ref}`); }} />
      <ContactDrawer c={edit} onClose={() => setEdit(null)} onSave={(c) => { setContacts(cs.map((x) => x.partyContactId === c.partyContactId ? c : x)); setEdit(null); toast('Contact saved'); }} />
    </Page>
  );
}

function MatchDrawer({ open, name, onClose, onMatch }: { open: boolean; name: string; onClose: () => void; onMatch: (ref: string) => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const [q, setQ] = useState(name);
  if (!open) return null;
  return (
    <Drawer open onClose={onClose} title="Match to NG record"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Link2 />} disabled={!pick} perm="masters.local.edit" onClick={() => pick && onMatch(pick)}>Match to NG record</Button></>}>
      <div className="stack-lg">
        <Field label="Search NG customers" hint="By name or TIN. Results come straight from NG."><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        <div className="stack" role="radiogroup" aria-label="NG records">
          {NG_MATCHES.map((m) => (
            <label key={m.ngRefId} className="panel" style={{ padding: 12, cursor: 'pointer', borderColor: pick === m.ngRefId ? 'var(--ink)' : undefined }}>
              <div className="row">
                <input type="radio" name="ng" checked={pick === m.ngRefId} onChange={() => setPick(m.ngRefId)} />
                <span className="spacer"><strong>{m.name}</strong><div className="xs muted">{m.ngRefId} · TIN {m.tin} · {m.city}</div></span>
                <span className="small muted">{m.score}% match</span>
              </div>
            </label>
          ))}
        </div>
        <Banner tone="info">Matching replaces this provisional party with the NG record everywhere: units, release orders and draft invoices. It is logged in the audit trail and cannot be undone here.</Banner>
        <p className="xs faint" style={{ margin: 0 }}>Not in NG yet? Ask finance to create the customer in NG first, then match.</p>
      </div>
    </Drawer>
  );
}

function ContactDrawer({ c, onClose, onSave }: { c: Contact | null; onClose: () => void; onSave: (c: Contact) => void }) {
  const [d, setD] = useState<Contact | null>(null);
  const cur = d && c && d.partyContactId === c.partyContactId ? d : c;
  if (!cur) return null;
  const set = (patch: Partial<Contact>) => setD({ ...cur, ...patch });
  const noEmail = cur.notifyEmail && !cur.email;
  return (
    <Drawer open onClose={() => { setD(null); onClose(); }} title={`Edit ${cur.contactName}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!!noEmail} perm="masters.local.edit" onClick={() => { onSave(cur); setD(null); }}>Save contact</Button></>}>
      <div className="stack-lg">
        <div className="form-grid">
          <Field label="Name" required><Input value={cur.contactName} onChange={(e) => set({ contactName: e.target.value })} /></Field>
          <Field label="Job title"><Input value={cur.jobTitle ?? ''} onChange={(e) => set({ jobTitle: e.target.value })} /></Field>
          <Field label="Mobile"><Input inputMode="tel" value={cur.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="Email" error={noEmail ? 'Add an email or turn off email messages' : undefined}><Input type="email" value={cur.email ?? ''} onChange={(e) => set({ email: e.target.value })} /></Field>
        </div>
        <Field label="Send messages by">
          <div className="stack" style={{ gap: 6 }}>
            <Check label="Email" checked={!!cur.notifyEmail} onChange={(e) => set({ notifyEmail: e.target.checked })} />
            <Check label="SMS" checked={!!cur.notifySms} onChange={(e) => set({ notifySms: e.target.checked })} />
            <Check label="WhatsApp" checked={!!cur.notifyWhatsapp} onChange={(e) => set({ notifyWhatsapp: e.target.checked })} />
          </div>
        </Field>
        <Field label="Language for messages">
          <Segmented label="Language" value={cur.preferredLanguage ?? 'en'} onChange={(v) => set({ preferredLanguage: v })} options={[{ id: 'en', label: 'English' }, { id: 'sw', label: 'Kiswahili' }]} />
        </Field>
        <Check label="Main contact for this party" checked={!!cur.isPrimary} onChange={(e) => set({ isPrimary: e.target.checked })} />
      </div>
    </Drawer>
  );
}
