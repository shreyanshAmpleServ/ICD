import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react';
import type { S } from '@/api/types';
import {
  Banner, Button, Chips, CommonTable, DL, DateCell, Drawer, Field, HoldPill, Input,
  Kpi, Page, PageHeader, ReferenceCell, Select, StatusCell, Textarea,
  fmtDT, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ, delay } from '@/api/query';
import { allStays } from '@/mock/core';
import { holdTypeName, holdTypes, holds as seedHolds } from '@/mock/control';
import { at } from '@/mock/gen';
import { ME, raiseApproval } from '@/mock/cargo';
import { Evidence, UnitPicker } from '@/features/container-management/shared';

export { holdsApi } from './api';

/* GET /holds, POST /holds (several units at once), POST /holds/{id}:lift.
   Some hold types need evidence to lift; some need approval, in which case
   lifting raises an approval request and the hold stays until it is decided. */
type HoldRow = S<'Hold'> & { liftRequest?: string };
type St = 'ACTIVE' | 'LIFTED' | 'all';
const AUTH: Record<string, string> = { CUSTOMS: 'Customs (TRA)', SHIPPING_LINE: 'Shipping line', ICD: 'Depot (ICD)', OTHER_GOVT: 'Other government' };
const typeOf = (c: string) => holdTypes.find((h) => h.holdCode === c)!;

export function Holds() {
  const { data: seed = [] } = useQ(['holds'], () => delay(seedHolds));
  const [local, setLocal] = useState<HoldRow[] | null>(null);
  const rows0: HoldRow[] = local ?? seed;
  const [st, setSt] = useState<St>('ACTIVE');
  const [type, setType] = useState('ALL');
  const [auth, setAuth] = useState('ALL');
  const [q, setQ] = useState('');
  const [placeOpen, setPlaceOpen] = useState(false);
  const [lift, setLift] = useState<HoldRow | null>(null);

  const rows = rows0.filter((h) => {
    if (st !== 'all' && h.status !== st) return false;
    if (type !== 'ALL' && h.holdTypeCode !== type) return false;
    if (auth !== 'ALL' && typeOf(h.holdTypeCode).authority !== auth) return false;
    if (q && !(h.unitNo ?? '').includes(q.replace(/\s/g, '').toUpperCase()) && !(h.authorityRef ?? '').toUpperCase().includes(q.toUpperCase())) return false;
    return true;
  });
  const active = rows0.filter((h) => h.status === 'ACTIVE');
  const update = (fn: (x: HoldRow[]) => HoldRow[]) => setLocal(fn(rows0));

  return (
    <Page>
      <PageHeader title="Holds" ms="M2" sub="Everything stopping a unit from moving, being released or leaving the gate"
        actions={<Button variant="primary" icon={<ShieldAlert />} perm="customs.hold.place" level="REQ" onClick={() => setPlaceOpen(true)}>Place hold</Button>} />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Active holds" value={active.length} />
          <Kpi label="Customs" value={active.filter((h) => typeOf(h.holdTypeCode).authority === 'CUSTOMS').length} />
          <Kpi label="Shipping line" value={active.filter((h) => typeOf(h.holdTypeCode).authority === 'SHIPPING_LINE').length} />
          <Kpi label="Depot (ICD)" value={active.filter((h) => typeOf(h.holdTypeCode).authority === 'ICD').length} />
          <Kpi label="Lift waiting for approval" value={rows0.filter((h) => h.liftRequest).length} />
        </div>
        <CommonTable
          rows={rows}
          rowKey={(h) => h.holdId!}
          searchValue={q}
          onSearchChange={setQ}
          searchPlaceholder="Unit or authority ref."
          itemLabel="holds"
          emptyTitle="No holds match"
          emptySubtitle="Change the filters. Place a hold from here or from the unit card."
          toolbarFilters={
            <>
              <Select aria-label="Hold type" value={type} onChange={(e) => setType(e.target.value)} options={[['ALL', 'All hold types'], ...holdTypes.map((h) => [h.holdCode, h.holdName] as [string, string])]} />
              <Select aria-label="Authority" value={auth} onChange={(e) => setAuth(e.target.value)} options={[['ALL', 'All authorities'], ...Object.entries(AUTH)]} />
              <Chips<St> value={st} onChange={setSt} options={[{ id: 'ACTIVE', label: 'Active', count: active.length }, { id: 'LIFTED', label: 'Lifted', count: rows0.length - active.length }, { id: 'all', label: 'All' }]} />
            </>
          }
          cols={[
            {
              key: 'u',
              header: 'Unit',
              render: (h) => (
                <ReferenceCell
                  refNo={h.unitNo ?? ''}
                  category={h.unitNo?.length === 17 ? 'VEHICLE' : 'CONTAINER'}
                  to={`/units/${h.unitStayId}`}
                />
              )
            },
            {
              key: 't',
              header: 'Hold',
              render: (h) => (
                <div className="stack" style={{ gap: 2 }}>
                  <strong className="small">{holdTypeName(h.holdTypeCode)}</strong>
                  <div className="xs faint">{AUTH[typeOf(h.holdTypeCode).authority]}</div>
                </div>
              )
            },
            {
              key: 'b',
              header: 'Stops',
              render: (h) => {
                const t = typeOf(h.holdTypeCode);
                return <span className="xs muted">{[t.blocksGateOut && 'gate out', t.blocksRelease && 'release', t.blocksMove && 'moves', t.blocksStuffing && 'stuffing'].filter(Boolean).join(', ')}</span>;
              }
            },
            {
              key: 'r',
              header: 'Reason',
              render: (h) => (
                <div className="stack" style={{ gap: 2 }}>
                  <span className="small">{h.reason}</span>
                  <div className="xs faint">{h.authorityRef}</div>
                </div>
              )
            },
            {
              key: 'p',
              header: 'Placed',
              render: (h) => (
                <div className="stack" style={{ gap: 2 }}>
                  <DateCell value={h.placedAt} withTime />
                  <div className="xs faint">{h.placedBy}</div>
                </div>
              )
            },
            {
              key: 's',
              header: 'Status',
              render: (h) => h.status === 'ACTIVE' ? (
                <span className="stack" style={{ gap: 4 }}>
                  <HoldPill count={1} />
                  {h.liftRequest && <Link to="/approvals" className="xs">Lift requested · {h.liftRequest}</Link>}
                </span>
              ) : (
                <span className="small">
                  <StatusCell value="LIFTED" />
                  <div className="xs faint">{h.liftReason}</div>
                </span>
              )
            },
            {
              key: 'a',
              header: '',
              render: (h) => h.status === 'ACTIVE' && !h.liftRequest ? (
                <Button size="sm" icon={<ShieldOff />} perm="customs.hold.lift" onClick={() => setLift(h)}>
                  Lift
                </Button>
              ) : null
            },
          ]}
        />
      </div>
      <PlaceHolds open={placeOpen} onClose={() => setPlaceOpen(false)} onDone={(newOnes) => update((x) => [...newOnes, ...x])} />
      {lift && <LiftHold h={lift} onClose={() => setLift(null)} onDone={(p) => update((x) => x.map((h) => (h.holdId === lift.holdId ? { ...h, ...p } : h)))} />}
    </Page>
  );
}

let nextHold = 900;
function PlaceHolds({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (h: HoldRow[]) => void }) {
  const toast = useToast();
  const { can } = useSession();
  const [units, setUnits] = useState<number[]>([]);
  const [type, setType] = useState('LINE');
  const [ref, setRef] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const stays = useMemo(() => allStays.filter((s) => s.physicalStatus !== 'DEPARTED' && s.physicalStatus !== 'EXPECTED'), []);
  const t = typeOf(type);
  const blocks = [t.blocksGateOut && 'gate out', t.blocksRelease && 'release', t.blocksMove && 'moves', t.blocksStuffing && 'stuffing'].filter(Boolean);
  const asRequest = !can('customs.hold.place', 'DO');
  const save = () => {
    setTried(true);
    if (!units.length || !reason.trim()) return;
    if (asRequest) {
      const a = raiseApproval({ permissionCode: 'customs.hold.place', entityName: 'unit_stay', entityId: units[0], summary: `Place ${t.holdName.toLowerCase()} on ${units.length} unit${units.length === 1 ? '' : 's'}`, reason });
      toast(`Hold request sent: ${a.requestNo}`);
    } else {
      onDone(units.map((id) => { const s = stays.find((x) => x.unitStayId === id)!; return { holdId: ++nextHold, unitStayId: id, unitNo: s.cargoUnit.unitNo, holdTypeCode: type, status: 'ACTIVE', authorityRef: ref || undefined, reason, placedAt: at(0), placedBy: `Doc & clearance · ${ME}` }; }));
      toast(`Hold placed on ${units.length} unit${units.length === 1 ? '' : 's'}`);
    }
    onClose(); setUnits([]); setReason(''); setRef(''); setFile(null); setTried(false);
  };
  return (
    <Drawer open={open} onClose={onClose} wide title="Place hold"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<ShieldAlert />} perm="customs.hold.place" level="REQ" onClick={save}>{asRequest ? 'Send hold request' : `Place hold on ${units.length || ''} unit${units.length === 1 ? '' : 's'}`}</Button></>}>
      <div className="stack-lg">
        <Field label="Units" required error={tried && !units.length && 'Pick at least one unit'}><UnitPicker stays={stays} value={units} onChange={setUnits} /></Field>
        <div className="form-grid">
          <Field label="Hold type" required><Select value={type} onChange={(e) => setType(e.target.value)} options={holdTypes.map((h) => [h.holdCode, h.holdName])} /></Field>
          <Field label="Authority reference" hint="Customs, line or court reference"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        </div>
        <Banner tone="stop" title={`Stops ${blocks.join(', ')}`}>
          Gate screens refuse these units at once.{t.liftNeedsApproval ? ' Lifting needs approval.' : ''}{t.liftNeedsEvidence ? ' Lifting needs evidence (for example the release letter).' : ''}
        </Banner>
        {asRequest && <Banner tone="wait" title="Your role can only request holds">The request goes to doc & clearance; the hold is placed when they accept it.</Banner>}
        <Field label="Reason" required error={tried && !reason.trim() && 'Say what happened and what clears it'}><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened and what clears it" /></Field>
        <Field label="Evidence" hint="Optional when placing"><Evidence value={file} onChange={setFile} /></Field>
      </div>
    </Drawer>
  );
}

function LiftHold({ h, onClose, onDone }: { h: HoldRow; onClose: () => void; onDone: (p: Partial<HoldRow>) => void }) {
  const toast = useToast();
  const t = typeOf(h.holdTypeCode);
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const errs = { reason: !reason.trim() && 'Say why the hold can go', file: t.liftNeedsEvidence && !file && `${t.holdName} needs evidence to lift` };
  const go = () => {
    setTried(true);
    if (errs.reason || errs.file) return;
    if (t.liftNeedsApproval) {
      const a = raiseApproval({ permissionCode: 'customs.hold.lift', entityName: 'hold', entityId: h.holdId!, summary: `Lift ${t.holdName.toLowerCase()} on ${h.unitNo}`, reason, evidence: file ? [file] : [] });
      onDone({ liftRequest: a.requestNo });
      toast(`Lift requested: ${a.requestNo}`);
    } else {
      onDone({ status: 'LIFTED', liftedAt: at(0), liftedBy: `Doc & clearance · ${ME}`, liftReason: reason });
      toast('Hold lifted');
    }
    onClose();
  };
  return (
    <Drawer open onClose={onClose} title={`Lift hold on ${h.unitNo}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={t.liftNeedsApproval ? <ShieldCheck /> : <ShieldOff />} perm="customs.hold.lift" onClick={go}>{t.liftNeedsApproval ? 'Request lift approval' : 'Lift hold'}</Button></>}>
      <div className="stack-lg">
        <DL items={[['Hold', <strong key="h">{t.holdName}</strong>], ['Authority', AUTH[t.authority]], ['Reference', h.authorityRef], ['Reason', h.reason], ['Placed', `${fmtDT(h.placedAt)} · ${h.placedBy}`]]} />
        {t.liftNeedsApproval
          ? <Banner tone="wait" title="Needs approval">Lifting a {t.holdName.toLowerCase()} is checked by a second person. Your request goes to the approvals inbox; the hold stays active until it is approved. You cannot approve your own request.</Banner>
          : <Banner tone="go" title="Lifts at once">The unit is free of this hold as soon as you confirm. Other holds, if any, stay.</Banner>}
        <Field label="Why can it be lifted?" required error={tried && errs.reason}><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.authority === 'CUSTOMS' ? 'Customs release REL-… received' : t.authority === 'SHIPPING_LINE' ? 'Line release BML/REL-… received' : 'What changed'} /></Field>
        <Field label="Evidence" required={t.liftNeedsEvidence} error={tried && errs.file}><Evidence value={file} onChange={setFile} required={t.liftNeedsEvidence} fileName={t.authority === 'CUSTOMS' ? 'Customs release letter.pdf' : t.authority === 'SHIPPING_LINE' ? 'Line release.pdf' : 'Survey report.pdf'} /></Field>
        <Link className="small" to={`/units/${h.unitStayId}`}>Open the unit card</Link>
      </div>
    </Drawer>
  );
}

export default Holds;
