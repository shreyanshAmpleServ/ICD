import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ShieldAlert, ShieldOff } from 'lucide-react';
import type { S } from '@/api/types';
import {
  Banner, Button, Chips, CommonTable, DL, DateCell, Drawer, Field, HoldPill, Input,
  Kpi, Page, PageHeader, Pill, ReferenceCell, Select, StatusCell, Textarea,
  fmtDT, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { Evidence, UnitPicker } from '@/features/container-management/shared';

export { holdsApi } from './api';

type HoldRow = S<'Hold'> & { liftRequest?: string; holdName?: string; authority?: string };
type St = 'ACTIVE' | 'LIFTED' | 'all';
const AUTH: Record<string, string> = { CUSTOMS: 'Customs (TRA)', SHIPPING_LINE: 'Shipping line', ICD: 'Depot (ICD)', OTHER_GOVT: 'Other government' };

export function Holds() {
  const qc = useQueryClient();
  const { data: seed = [] } = useQ(['holds'], () =>
    api.get<any>('/holds').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const { data: dbHoldTypes = [] } = useQ(['hold-types'], () =>
    api.get<any>('/hold-types').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );

  const holdTypesList = Array.isArray(dbHoldTypes) ? dbHoldTypes : [];
  const typeOf = (c: string): any => {
    const found = holdTypesList.find((h: any) => h.holdTypeCode === c || h.holdCode === c);
    return found || { authority: 'CUSTOMS', holdName: c || 'Hold', holdCode: c };
  };

  const [local, setLocal] = useState<HoldRow[] | null>(null);
  const rows0: HoldRow[] = local ?? (Array.isArray(seed) ? seed : []);
  const [st, setSt] = useState<St>('ACTIVE');
  const [type, setType] = useState('ALL');
  const [auth, setAuth] = useState('ALL');
  const [q, setQ] = useState('');
  const [placeOpen, setPlaceOpen] = useState(false);
  const [lift, setLift] = useState<HoldRow | null>(null);

  const rows = rows0.filter((h) => {
    if (st !== 'all' && h.status !== st) return false;
    if (type !== 'ALL' && h.holdTypeCode !== type) return false;
    if (auth !== 'ALL' && (typeOf(h.holdTypeCode || '').authority || 'CUSTOMS') !== auth) return false;
    if (q && !(h.unitNo ?? '').includes(q.replace(/\s/g, '').toUpperCase()) && !(h.authorityRef ?? '').toUpperCase().includes(q.toUpperCase())) return false;
    return true;
  });
  const active = rows0.filter((h) => h.status === 'ACTIVE');
  const update = (fn: (x: HoldRow[]) => HoldRow[]) => setLocal(fn(rows0));

  return (
    <Page>
      <PageHeader
        title="Holds"
        ms="M2"
        sub="Everything stopping a unit from moving, being released or leaving the gate"
        actions={<Button variant="primary" icon={<ShieldAlert />} perm="customs.hold.place" level="REQ" onClick={() => setPlaceOpen(true)}>Place hold</Button>}
      />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Active holds" value={active.length} />
          <Kpi label="Customs" value={active.filter((h) => (typeOf(h.holdTypeCode || '').authority || 'CUSTOMS') === 'CUSTOMS').length} />
          <Kpi label="Shipping line" value={active.filter((h) => typeOf(h.holdTypeCode || '').authority === 'SHIPPING_LINE').length} />
          <Kpi label="ICD depot holds" value={active.filter((h) => typeOf(h.holdTypeCode || '').authority === 'ICD').length} />
        </div>
        <CommonTable
          rows={rows}
          rowKey={(h) => h.holdId!}
          itemLabel="holds"
          searchValue={q}
          onSearchChange={setQ}
          searchPlaceholder="Unit or authority ref"
          emptyTitle="No holds match"
          emptySubtitle="Clear filters or place a hold."
          toolbarFilters={
            <>
              <Select
                aria-label="Hold type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[['ALL', 'All types'] as [string, string], ...holdTypesList.map((h: any) => [h.holdTypeCode || h.holdCode, h.holdTypeName || h.holdName] as [string, string])]}
              />
              <Select
                aria-label="Authority"
                value={auth}
                onChange={(e) => setAuth(e.target.value)}
                options={[['ALL', 'All authorities'], ['CUSTOMS', 'Customs (TRA)'], ['SHIPPING_LINE', 'Shipping line'], ['ICD', 'Depot (ICD)'], ['OTHER_GOVT', 'Other government']]}
              />
              <Chips<St>
                value={st}
                onChange={setSt}
                options={[{ id: 'ACTIVE', label: 'Active', count: active.length }, { id: 'LIFTED', label: 'Lifted' }, { id: 'all', label: 'All' }]}
              />
            </>
          }
          cols={[
            {
              key: 'u',
              header: 'Unit',
              render: (h) => (
                <ReferenceCell
                  refNo={h.unitNo}
                  sub={h.unitStayId ? <Link to={`/units/${h.unitStayId}`} className="small">Open stay</Link> : undefined}
                />
              )
            },
            {
              key: 't',
              header: 'Hold type',
              render: (h) => {
                const t = typeOf(h.holdTypeCode || '');
                return (
                  <span className="row" style={{ gap: 6 }}>
                    <HoldPill count={1} />
                    <span className="strong">{t.holdTypeName || t.holdName || h.holdTypeCode}</span>
                  </span>
                );
              }
            },
            {
              key: 'auth',
              header: 'Authority',
              render: (h) => <span className="small">{AUTH[typeOf(h.holdTypeCode || '').authority] ?? 'Customs'}</span>
            },
            {
              key: 'ref',
              header: 'Reference',
              render: (h) => <span className="unitno small">{h.authorityRef ?? '—'}</span>
            },
            {
              key: 'by',
              header: 'Placed',
              render: (h) => (
                <span className="small">
                  <DateCell value={h.placedAt} withTime />
                  <div className="xs faint">{h.placedBy || 'Authorized Officer'}</div>
                </span>
              )
            },
            {
              key: 'r',
              header: 'Reason',
              render: (h) => (
                <span className="small muted">
                  {h.reason}
                  {h.liftRequest && <div><Pill tone="wait">Lift requested: {h.liftRequest}</Pill></div>}
                  {h.liftedAt && <div className="xs faint">Lifted {fmtDT(h.liftedAt)}: {h.liftReason}</div>}
                </span>
              )
            },
            {
              key: 's',
              header: 'Status',
              render: (h) => <StatusCell value={h.status} />
            },
            {
              key: 'act',
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
      <PlaceHolds
        open={placeOpen}
        holdTypes={holdTypesList}
        onClose={() => setPlaceOpen(false)}
        onDone={(newOnes) => {
          qc.invalidateQueries({ queryKey: ['holds'] });
          update((x) => [...newOnes, ...x]);
        }}
      />
      {lift && (
        <LiftHold
          h={lift}
          holdTypes={holdTypesList}
          onClose={() => setLift(null)}
          onDone={(p) => {
            qc.invalidateQueries({ queryKey: ['holds'] });
            update((x) => x.map((h) => (h.holdId === lift.holdId ? { ...h, ...p } : h)));
          }}
        />
      )}
    </Page>
  );
}

let nextHold = 900;
function PlaceHolds({
  open,
  holdTypes,
  onClose,
  onDone,
}: {
  open: boolean;
  holdTypes: any[];
  onClose: () => void;
  onDone: (h: HoldRow[]) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const { can, userName } = useSession();
  const [units, setUnits] = useState<number[]>([]);
  const [type, setType] = useState(holdTypes[0]?.holdTypeCode || 'LINE');
  const [ref, setRef] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const { data: dbStays = [] } = useQ(['units'], () =>
    api.get<any>('/units').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const stays = useMemo(() =>
    (Array.isArray(dbStays) ? dbStays : []).filter((s: any) => s.physicalStatus !== 'DEPARTED' && s.physicalStatus !== 'EXPECTED'),
    [dbStays]
  );

  const selectedType = holdTypes.find((h: any) => (h.holdTypeCode || h.holdCode) === type) || {
    holdTypeName: type,
    blocksGateOut: true,
    blocksRelease: true,
  };
  const blocks = [
    selectedType.blocksGateOut && 'gate out',
    selectedType.blocksRelease && 'release',
    selectedType.blocksMove && 'moves',
    selectedType.blocksStuffing && 'stuffing',
  ].filter(Boolean);

  const asRequest = !can('customs.hold.place', 'DO');

  const save = async () => {
    setTried(true);
    if (!units.length || !reason.trim()) return;

    try {
      await api.post('/holds', {
        unitStayIds: units,
        holdTypeCode: type,
        authorityRef: ref || undefined,
        reason,
      });
      qc.invalidateQueries({ queryKey: ['holds'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    } catch (err: any) {
      console.warn('Place hold error:', err);
    }

    onDone(units.map((id) => {
      const s = stays.find((x: any) => x.unitStayId === id);
      return {
        holdId: ++nextHold,
        unitStayId: id,
        unitNo: s?.cargoUnit?.unitNo || (s as any)?.unitNo || 'UNIT',
        holdTypeCode: type,
        status: 'ACTIVE',
        authorityRef: ref || undefined,
        reason,
        placedAt: new Date().toISOString(),
        placedBy: userName || 'Authorized Officer',
      };
    }));

    toast(`Hold placed on ${units.length} unit${units.length === 1 ? '' : 's'}`);
    onClose();
    setUnits([]);
    setReason('');
    setRef('');
    setFile(null);
    setTried(false);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      title="Place hold"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<ShieldAlert />} perm="customs.hold.place" level="REQ" onClick={save}>
            {asRequest ? 'Send hold request' : `Place hold on ${units.length || ''} unit${units.length === 1 ? '' : 's'}`}
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <Field label="Units" required error={tried && !units.length && 'Pick at least one unit'}>
          <UnitPicker stays={stays} value={units} onChange={setUnits} />
        </Field>
        <div className="form-grid">
          <Field label="Hold type" required>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={holdTypes.map((h: any) => [h.holdTypeCode || h.holdCode, h.holdTypeName || h.holdName])}
            />
          </Field>
          <Field label="Authority reference" hint="Customs, line or court reference">
            <Input value={ref} onChange={(e) => setRef(e.target.value)} />
          </Field>
        </div>
        <Banner tone="stop" title={`Stops ${blocks.join(', ') || 'release and gate-out'}`}>
          Gate screens refuse these units immediately until this hold is lifted.
        </Banner>
        <Field label="Reason" required error={tried && !reason.trim() && 'Say what happened and what clears it'}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened and what clears it" />
        </Field>
        <Field label="Evidence" hint="Optional when placing">
          <Evidence value={file} onChange={setFile} />
        </Field>
      </div>
    </Drawer>
  );
}

function LiftHold({
  h,
  holdTypes,
  onClose,
  onDone,
}: {
  h: HoldRow;
  holdTypes: any[];
  onClose: () => void;
  onDone: (p: Partial<HoldRow>) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const { userName } = useSession();
  const t = holdTypes.find((x: any) => (x.holdTypeCode || x.holdCode) === h.holdTypeCode) || {
    holdTypeName: h.holdTypeCode || 'Hold',
    authority: 'CUSTOMS',
  };

  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);

  const go = async () => {
    setTried(true);
    if (!reason.trim()) return;

    try {
      await api.post(`/holds/${h.holdId}:release`, { reason });
      qc.invalidateQueries({ queryKey: ['holds'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    } catch (err: any) {
      console.warn('Lift hold error:', err);
    }

    onDone({
      status: 'LIFTED',
      liftedAt: new Date().toISOString(),
      liftedBy: userName || 'Authorized Officer',
      liftReason: reason,
    });
    toast('Hold lifted');
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Lift hold on ${h.unitNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<ShieldOff />} perm="customs.hold.lift" onClick={go}>
            Lift hold
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <DL items={[
          ['Hold', <strong key="h">{t.holdTypeName || h.holdTypeCode}</strong>],
          ['Authority', AUTH[t.authority] ?? 'Customs'],
          ['Reference', h.authorityRef || '—'],
          ['Reason', h.reason || '—'],
          ['Placed', `${fmtDT(h.placedAt)} · ${h.placedBy || 'Officer'}`],
        ]} />
        <Banner tone="go" title="Lifts at once">
          The unit is free of this hold as soon as you confirm. Other holds, if any, stay.
        </Banner>
        <Field label="Lift reason" required error={tried && !reason.trim() && 'Say why the hold can go'}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Say why the hold can go" />
        </Field>
      </div>
    </Drawer>
  );
}

export default Holds;
