import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, Check, FileText, Plus, UserRoundCheck, X } from 'lucide-react';
import {
  Banner, Button, DL, DataTable, Drawer, Empty, Field, Input, Money, Page, PageHeader, Panel, Pill, Select, StatusPill, Tabs, Textarea, Timeline,
  ago, fmtDT, useToast, type TLItem,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { at, day } from '@/mock/gen';
import { APPROVAL_LIMITS, allApprovals, delegations as seedDelegations, entityLink, hoursUntil, sessionApprovals, type Apr, type DelegationRow } from '@/mock/cargo';
import { Countdown } from '@/features/container-management/shared';

/* GET /approvals (inbox), POST /approvals/{id}:decide, /delegations.
   Maker-checker: whoever asked can never decide, even with the right
   permission. Requests above a limit need more than one level. */
type TabId = 'mine' | 'asked' | 'all' | 'delegations';
const permLabel = (p: string) => APPROVAL_LIMITS[p]?.label ?? p;

export function Approvals() {
  const { data = [] } = useQ(['approvals'], () => delay([...sessionApprovals, ...allApprovals]));
  const [local, setLocal] = useState<Apr[] | null>(null);
  const list = local ?? data;
  const [tab, setTab] = useState<TabId>('mine');
  const [sel, setSel] = useState<number | null>(null);
  const [dels, setDels] = useState<DelegationRow[]>(seedDelegations);
  const [delOpen, setDelOpen] = useState(false);
  const waiting = list.filter((a) => a.status === 'PENDING' && a.canDecide && !a.mine);
  const asked = list.filter((a) => a.mine);
  const rows = tab === 'mine' ? waiting : tab === 'asked' ? asked : list;
  const a = list.find((x) => x.approvalRequestId === sel);
  const activeDel = dels.find((d) => !d.revokedAt && hoursUntil(d.validFrom) <= 0 && hoursUntil(d.validTo) > 0);

  return (
    <Page>
      <PageHeader title="Approvals" ms="M2" sub="Requests that need a second person: waivers, credit notes, overrides, hold lifts"
        actions={<Button icon={<UserRoundCheck />} onClick={() => { setTab('delegations'); setDelOpen(true); }}>Delegate my approvals</Button>} />
      <div className="stack-lg">
        {activeDel && <Banner tone="customs" title={`${activeDel.toName} is covering ${activeDel.permName.toLowerCase()} for ${activeDel.fromName}`}>Until {fmtDT(activeDel.validTo)}. Their decisions show "on behalf of".</Banner>}
        <div>
          <Tabs<TabId> value={tab} onChange={setTab} tabs={[
            { id: 'mine', label: 'Waiting for me', count: waiting.length }, { id: 'asked', label: 'I asked', count: asked.length },
            { id: 'all', label: 'All', count: list.length }, { id: 'delegations', label: 'Delegations', count: dels.filter((d) => !d.revokedAt && hoursUntil(d.validTo) > 0).length },
          ]} />
          {tab !== 'delegations' ? (
            <Panel flush>
              <DataTable rows={rows} rowKey={(x) => x.approvalRequestId!} onRow={(x) => setSel(x.approvalRequestId!)} selected={sel}
                empty={<Empty title={tab === 'mine' ? 'Nothing waiting for you' : 'No requests'}>{tab === 'mine' ? 'New requests you can decide appear here and in your inbox.' : 'Requests you raise from holds, releases or billing show here.'}</Empty>}
                cols={[
                  { key: 'w', header: 'Request', render: (x) => <div style={{ minWidth: 220 }}><strong className="small">{x.summary}</strong><div className="xs faint">{x.requestNo} · {permLabel(x.permissionCode)}</div></div> },
                  { key: 'y', header: 'Why', render: (x) => <span className="xs muted" style={{ display: 'block', maxWidth: 280 }}>{x.reason}</span> },
                  { key: 'a', header: 'Amount', num: true, render: (x) => x.amount ? <AmountVsLimit a={x} /> : <span className="faint">—</span> },
                  { key: 'l', header: 'Level', render: (x) => <span className="small nowrap">{x.status === 'PENDING' ? `Level ${(x.currentLevel ?? 0) + 1} of ${x.levelsRequired}` : `${x.levelsRequired} level${x.levelsRequired === 1 ? '' : 's'}`}</span> },
                  { key: 'b', header: 'Asked by', render: (x) => <span className="small">{x.mine ? 'You' : x.requestedBy?.split(' · ')[1]}<div className="xs faint">{ago(x.requestedAt)}</div></span> },
                  { key: 'e', header: 'Expires', render: (x) => x.status === 'PENDING' ? <Countdown hours={hoursUntil(x.expiresAt)} label="in" /> : <span className="xs faint">{fmtDT(x.decidedAt)}</span> },
                  { key: 's', header: 'Status', render: (x) => <StatusPill value={x.status} /> },
                ]} />
            </Panel>
          ) : <Delegations rows={dels} setRows={setDels} open={delOpen} setOpen={setDelOpen} />}
        </div>
      </div>
      {a && <Detail a={a} onClose={() => setSel(null)} onDelegate={() => { setSel(null); setTab('delegations'); setDelOpen(true); }}
        onDecide={(p) => setLocal(list.map((x) => (x.approvalRequestId === a.approvalRequestId ? { ...x, ...p } : x)))} />}
    </Page>
  );
}

function AmountVsLimit({ a }: { a: Apr }) {
  const lim = APPROVAL_LIMITS[a.permissionCode]?.limit;
  const over = lim !== undefined && Number(a.amount) > lim;
  return (
    <span className="stack" style={{ gap: 2, alignItems: 'flex-end' }}>
      <Money amount={a.amount} currency={a.amountCurrency} strong />
      {lim !== undefined && <span className="xs" style={{ color: over ? 'var(--wait)' : 'var(--ink-3)' }}>{over ? 'Above' : 'Within'} limit {a.amountCurrency} {lim.toLocaleString()}</span>}
    </span>
  );
}

function Detail({ a, onClose, onDecide, onDelegate }: { a: Apr; onClose: () => void; onDecide: (p: Partial<Apr>) => void; onDelegate: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const pending = a.status === 'PENDING';
  const [label, to] = entityLink(a.entityName, a.entityId);
  const lim = APPROVAL_LIMITS[a.permissionCode];
  const lvl = (a.currentLevel ?? 0) + 1;
  const why = a.mine ? 'You asked for this. Someone else must decide (maker-checker).' : !a.canDecide ? `Needs approve rights on ${a.permissionCode} at level ${lvl}. It is with someone else.` : null;
  const steps: TLItem[] = [
    { at: a.requestedAt!, title: `Requested by ${a.mine ? 'you' : a.requestedBy}`, detail: a.reason, tone: 'wait' },
    ...(a.steps ?? []).map((s) => ({ at: s.decidedAt, title: `Level ${s.levelNo}: ${s.decision === 'APPROVE' ? 'approved' : 'rejected'} by ${s.decidedBy}${s.onBehalfOf ? ` for ${s.onBehalfOf}` : ''}`, detail: s.note, tone: s.decision === 'APPROVE' ? 'go' as const : 'stop' as const })),
  ];
  const decide = (d: 'APPROVE' | 'REJECT') => {
    setTried(true);
    if (d === 'REJECT' && !note.trim()) return;
    const step = { levelNo: lvl, decision: d, decidedBy: 'You', note: note || undefined, decidedAt: at(0) };
    const done = d === 'REJECT' || lvl >= (a.levelsRequired ?? 1);
    onDecide({ steps: [...(a.steps ?? []), step], currentLevel: lvl, status: done ? (d === 'APPROVE' ? 'APPROVED' : 'REJECTED') : 'PENDING', canDecide: false, decidedAt: done ? at(0) : undefined });
    toast(d === 'REJECT' ? 'Request rejected' : done ? 'Request approved' : `Level ${lvl} approved: sent to level ${lvl + 1}`);
    onClose();
  };
  return (
    <Drawer open onClose={onClose} wide title={a.summary}
      footer={pending ? (
        <>
          {why && <span className="xs muted spacer" role="note">{why}</span>}
          <Button variant="danger" icon={<X />} perm={a.permissionCode} level="APPR" disabled={!!why} title={why ?? undefined} onClick={() => decide('REJECT')}>Reject</Button>
          <Button variant="primary" icon={<Check />} perm={a.permissionCode} level="APPR" disabled={!!why} title={why ?? undefined} onClick={() => decide('APPROVE')}>{lvl < (a.levelsRequired ?? 1) ? `Approve level ${lvl}` : 'Approve'}</Button>
        </>
      ) : <Button variant="primary" onClick={onClose}>Close</Button>}>
      <div className="stack-lg">
        <div className="row-wrap"><StatusPill value={a.status} /><Pill tone="info">{a.requestNo}</Pill>{pending && <Countdown hours={hoursUntil(a.expiresAt)} label="Expires in" />}</div>
        {a.mine && pending && <Banner tone="wait" title="You asked for this">You can withdraw it, but you cannot approve it yourself, even with the permission.</Banner>}
        <DL cols items={[
          ['What', permLabel(a.permissionCode)], ['On', to ? <Link to={to}>{label}</Link> : label],
          ['Amount', a.amount ? <Money amount={a.amount} currency={a.amountCurrency} /> : '—'],
          ['Limit', lim?.limit !== undefined ? `${a.amountCurrency ?? 'USD'} ${lim.limit.toLocaleString()}` : 'No amount limit'],
          ['Levels', pending ? `Level ${lvl} of ${a.levelsRequired}` : `${a.levelsRequired}`], ['Asked by', a.mine ? 'You' : a.requestedBy],
        ]} />
        {lim && <p className="xs muted">Policy: {lim.levels}</p>}
        <Panel title="Why">
          <p className="small" style={{ margin: 0 }}>{a.reason}</p>
        </Panel>
        <Panel title="Evidence">
          {a.evidence?.length ? (
            <div className="grid-3">{a.evidence.map((e) => <div key={e} className="photo"><span className="row" style={{ gap: 4 }}><FileText size={12} />{e}</span></div>)}</div>
          ) : <p className="small muted" style={{ margin: 0 }}>No files attached. Ask the requester if you need proof.</p>}
        </Panel>
        <Panel title="History"><Timeline items={steps} /></Panel>
        {pending && !why && <Field label="Note" hint="Required when rejecting; the requester sees it" error={tried && !note.trim() && 'Say why you reject, so they can fix it'}><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>}
        {pending && a.mine && <div><Button size="sm" variant="ghost" onClick={() => { onDecide({ status: 'CANCELLED' }); toast('Request withdrawn'); onClose(); }}>Withdraw request</Button></div>}
        <p className="xs faint">Away? <button type="button" className="btn btn-ghost btn-sm" onClick={onDelegate}>Delegate your approvals</button> to a colleague for a fixed period.</p>
      </div>
    </Drawer>
  );
}

function Delegations({ rows, setRows, open, setOpen }: { rows: DelegationRow[]; setRows: (f: (r: DelegationRow[]) => DelegationRow[]) => void; open: boolean; setOpen: (b: boolean) => void }) {
  const toast = useToast();
  const state = (d: DelegationRow): [string, 'go' | 'idle' | 'wait'] => d.revokedAt ? ['Revoked', 'idle'] : hoursUntil(d.validTo) < 0 ? ['Ended', 'idle'] : hoursUntil(d.validFrom) > 0 ? ['Scheduled', 'wait'] : ['Active', 'go'];
  return (
    <div className="stack-lg">
      <Panel flush title="Cover during leave" sub="A delegate decides on your behalf for a fixed period. It ends by itself; you can revoke it any time."
        actions={<Button size="sm" icon={<Plus />} onClick={() => setOpen(true)}>New delegation</Button>}>
        <DataTable rows={rows} rowKey={(d) => d.approvalDelegationId!} empty={<Empty title="No delegations">Set one before going on leave so nothing waits for you.</Empty>} cols={[
          { key: 'f', header: 'From', render: (d) => <span className="small strong">{d.fromName}</span> },
          { key: 't', header: 'To', render: (d) => <span className="small strong">{d.toName}</span> },
          { key: 'p', header: 'Covers', render: (d) => <span className="small">{d.permName}</span> },
          { key: 'v', header: 'Period', render: (d) => <span className="small nowrap">{fmtDT(d.validFrom)} – {fmtDT(d.validTo)}</span> },
          { key: 'r', header: 'Reason', render: (d) => <span className="xs muted">{d.reason}</span> },
          { key: 's', header: 'Status', render: (d) => { const [l, t] = state(d); return <Pill tone={t}>{l}</Pill>; } },
          { key: 'x', header: '', render: (d) => state(d)[0] === 'Active' || state(d)[0] === 'Scheduled' ? <Button size="sm" variant="ghost" onClick={() => { setRows((r) => r.map((x) => (x === d ? { ...x, revokedAt: at(0) } : x))); toast('Delegation revoked'); }}>Revoke</Button> : null },
        ]} />
      </Panel>
      <NewDelegation open={open} onClose={() => setOpen(false)} onSave={(d) => setRows((r) => [d, ...r])} />
    </div>
  );
}

function NewDelegation({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: DelegationRow) => void }) {
  const toast = useToast();
  const [to, setTo] = useState('Rehema K. (Doc & clearance)');
  const [perm, setPerm] = useState('');
  const [from, setFrom] = useState(day(1));
  const [until, setUntil] = useState(day(8));
  const [reason, setReason] = useState('');
  const days = (Date.parse(until) - Date.parse(from)) / 86400000;
  const err = days <= 0 ? 'End must be after start' : days > 30 ? 'At most 30 days; renew if leave is longer' : null;
  return (
    <Drawer open={open} onClose={onClose} title="Delegate my approvals"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<CalendarRange />} disabled={!!err || !reason.trim()} onClick={() => {
        onSave({ approvalDelegationId: 50 + Math.round(days), fromUserId: 1, toUserId: 2, fromName: 'You', toName: to, permissionCode: perm || null, permName: perm ? permLabel(perm) : 'All approvals', siteId: 1, validFrom: `${from}T00:00:00+03:00`, validTo: `${until}T23:59:00+03:00`, reason });
        toast('Delegation saved'); onClose();
      }}>Save delegation</Button></>}>
      <div className="stack-lg">
        <Field label="Delegate to" required hint="Must already hold the permission at approve level"><Select value={to} onChange={(e) => setTo(e.target.value)} options={['Rehema K. (Doc & clearance)', 'Daniel K. (Ops)', 'Joseph N. (Finance)', 'Grace P. (Customer service)']} /></Field>
        <Field label="Which approvals"><Select value={perm} onChange={(e) => setPerm(e.target.value)} options={[['', 'All my approvals'], ...Object.entries(APPROVAL_LIMITS).map(([k, v]) => [k, v.label] as [string, string])]} /></Field>
        <div className="form-grid">
          <Field label="From" required><Input type="date" value={from} min={day(0)} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Until" required error={err}><Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
        </div>
        <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Annual leave, training, sick leave" /></Field>
        <Banner>The delegate cannot approve requests they raised themselves, and every decision records that it was made on your behalf.</Banner>
      </div>
    </Drawer>
  );
}
