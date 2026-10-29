import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Banner, DataTable, Empty, Kpi, Page, PageHeader, Panel, Pill, SearchInput, UnitNo, ago, useToast,
} from '@/ds/components';
import type { S } from '@/api/types';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { KEY_HOOKS, type Key } from '@/mock/ops';
import { keysApi } from './api';
import { KeyCabinetGrid, STATUS } from './components/KeyCabinetGrid';
import { KeyDetailDrawer, type Flow } from './components/KeyDetailDrawer';
import { MovementDrawer } from './components/MovementDrawer';

export { keysApi } from './api';

const NOW_ISO = new Date('2026-10-07T10:30:00+03:00').toISOString();

export function KeysView() {
  const { site } = useSession();
  const toast = useToast();
  const { data = [] } = useQ(['keys'], () => keysApi.getKeys());
  const [patch, setPatch] = useState<Record<number, Partial<Key>>>({});
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [flow, setFlow] = useState<Flow | null>(null);
  const all = useMemo(() => data.map((k) => ({ ...k, ...patch[k.keyCustodyId!] }) as Key), [data, patch]);
  const open = all.find((k) => k.keyCustodyId === openId) ?? null;

  if (!site.facilities.includes('ICDV')) {
    return (
      <Page>
        <PageHeader title="Vehicle keys" ms="M1" />
        <Empty title="No key cabinet at this site">
          Vehicle keys are kept at the vehicle yard. Switch the site to DAR2 · Dar es Salaam vehicle yard from the top
          bar.
        </Empty>
      </Page>
    );
  }

  const n = q.replace(/\s/g, '').toUpperCase();
  const match = (k: Key) =>
    !n ||
    k.vin.includes(n) ||
    k.keyTagNo.includes(n) ||
    k.make.includes(n) ||
    k.model.toUpperCase().includes(n);
  const byHook = new Map(all.filter((k) => k.hook).map((k) => [k.hook!, k]));
  const out = all.filter((k) => k.status === 'ISSUED' || k.status === 'LOST');

  const record = (
    k: Key,
    action: S<'KeyMovement'>['action'],
    p: Partial<Key>,
    extra: Partial<S<'KeyMovement'>>,
    msg: string
  ) => {
    const mvmt: S<'KeyMovement'> = {
      keyMovementId: (Date.parse(NOW_ISO) % 100000) + k.movements.length,
      action,
      occurredAt: NOW_ISO,
      by: 'Yard · you',
      ...extra,
    };
    setPatch((x) => ({
      ...x,
      [k.keyCustodyId!]: { ...x[k.keyCustodyId!], ...p, movements: [mvmt, ...k.movements] },
    }));
    toast(msg);
  };

  return (
    <Page wide>
      <PageHeader
        title="Vehicle keys"
        ms="M1"
        sub={`${site.siteName} · cabinet KC1 in the yard office, ${KEY_HOOKS} hooks`}
        actions={
          <SearchInput
            icon={<Search />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="VIN, tag or make"
            aria-label="Find a key"
          />
        }
      />
      <div className="stack-lg">
        {all.some((k) => k.status === 'LOST') && (
          <Banner tone="stop" title="1 key reported lost">
            The vehicle cannot be delivered with that key. Tell the consignee and record the replacement or the found
            key here.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi label="In the cabinet" value={all.filter((k) => k.status === 'IN_CABINET').length} />
          <Kpi
            label="Issued now"
            value={all.filter((k) => k.status === 'ISSUED').length}
            delta="Must come back by end of shift"
          />
          <Kpi
            label="Handed over"
            value={all.filter((k) => k.status === 'HANDED_OVER').length}
            delta="With delivered vehicles"
          />
          <Kpi label="Lost" value={all.filter((k) => k.status === 'LOST').length} />
          <Kpi label="Free hooks" value={KEY_HOOKS - byHook.size} />
        </div>

        <KeyCabinetGrid byHook={byHook} match={match} onSelectKey={setOpenId} />

        <Panel title="Keys out of the cabinet" flush>
          <DataTable
            rows={out}
            rowKey={(k) => k.keyCustodyId!}
            onRow={(k) => setOpenId(k.keyCustodyId!)}
            empty={<Empty title="All keys are in the cabinet" />}
            cols={[
              { key: 'tag', header: 'Tag', render: (k) => <strong>{k.keyTagNo}</strong> },
              {
                key: 'vin',
                header: 'Vehicle',
                render: (k) => (
                  <>
                    <UnitNo no={k.vin} category="VEHICLE" />
                    <div className="xs faint">
                      {k.make} {k.model}
                    </div>
                  </>
                ),
              },
              {
                key: 'st',
                header: 'Status',
                render: (k) => <Pill tone={STATUS[k.status!][1]}>{STATUS[k.status!][0]}</Pill>,
              },
              { key: 'h', header: 'Holder', render: (k) => k.holderName ?? <span className="faint">Unknown</span> },
              { key: 'since', header: 'Since', render: (k) => ago(k.movements[0]?.occurredAt) },
              { key: 'why', header: 'Reason', render: (k) => <span className="small">{k.movements[0]?.reason}</span> },
            ]}
          />
        </Panel>
      </div>

      <KeyDetailDrawer open={open} flow={flow} onClose={() => setOpenId(null)} onOpenFlow={setFlow} />

      {open && flow && (
        <MovementDrawer
          k={open}
          flow={flow}
          onClose={() => setFlow(null)}
          onDone={(holder, reason) => {
            if (flow === 'ISSUE') {
              record(
                open,
                'ISSUE',
                { status: 'ISSUED', holderName: holder },
                { toHolderName: holder, reason },
                `Key ${open.keyTagNo} issued to ${holder}`
              );
            }
            if (flow === 'RETURN') {
              record(
                open,
                'RETURN',
                { status: 'IN_CABINET', holderName: undefined },
                { reason: `Back on hook ${open.hook}. ${reason}`.trim() },
                `Key ${open.keyTagNo} returned to hook ${open.hook}`
              );
            }
            if (flow === 'LOST') {
              record(
                open,
                'LOST',
                { status: 'LOST', holderName: undefined },
                { reason },
                `Key ${open.keyTagNo} reported lost`
              );
            }
            if (flow === 'FOUND') {
              record(
                open,
                'FOUND',
                { status: 'IN_CABINET', holderName: undefined },
                { reason },
                `Key ${open.keyTagNo} found and back on hook ${open.hook}`
              );
            }
            setFlow(null);
          }}
        />
      )}

      <style>{`
        .key-grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 8px; }
        @media (max-width: 1100px) { .key-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 480px) { .key-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .key-hook { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 92px; padding: 8px 10px; border-radius: var(--r-md); border: 1px solid var(--steel); background: var(--paper); color: var(--ink); text-align: left; cursor: pointer; font: inherit; }
        .key-hook:focus-visible { outline: 3px solid var(--hivis); outline-offset: 2px; }
        .key-go { background: var(--go-soft); border-color: var(--go); }
        .key-wait { background: var(--wait-soft); border-color: var(--wait); }
        .key-stop { background: var(--stop-soft); border-color: var(--stop); }
        .key-empty { border-style: dashed; border-color: var(--ink-3); cursor: default; justify-content: space-between; }
        .key-dim { opacity: .3; }
      `}</style>
    </Page>
  );
}

export { KeysView as Keys };
export default KeysView;
