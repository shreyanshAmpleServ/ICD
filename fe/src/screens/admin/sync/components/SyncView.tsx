import { useState } from 'react';
import { Ms, Tabs, useToast } from '@/ds/components';
import { useSession } from '@/app/session';
import { SRC, integrationMessages, outbox as seedOutbox, syncStates as seedSync } from '@/mock/admin';
import { SetupPage, label, useEditable } from '../../shared/AdminKit';
import { syncApi } from '../api';
import { SyncStatusCards } from './SyncStatusCards';
import { SyncMasterTable } from './SyncMasterTable';
import { SyncOutboxTable } from './SyncOutboxTable';
import { SyncEdiTable } from './SyncEdiTable';

type Tab = 'sync' | 'outbox' | 'edi';
type Sync = (typeof seedSync)[number];
type Ob = (typeof seedOutbox)[number];

export function SyncView() {
  const { phase } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('sync');
  const [sync, setSync] = useEditable<Sync>('sync', seedSync);
  const [ob, setOb] = useEditable<Ob>('outbox', seedOutbox);
  const [running, setRunning] = useState<string | null>(null);
  const [f, setF] = useState<'all' | 'problem' | 'PENDING' | 'SENT'>('problem');
  const t = phase === 2 ? tab : tab === 'edi' ? 'sync' : tab;
  const problems = ob.filter((o) => o.status === 'FAILED' || o.status === 'DEAD');

  const run = (e: string) => {
    setRunning(e);
    syncApi.runSync(e).catch(() => {});
    setTimeout(() => {
      setSync((all) =>
        all.map((s) =>
          s.entityName === e
            ? {
                ...s,
                lastRunAt: new Date().toISOString(),
                lastStatus: 'OK',
                lastError: undefined,
                rowsLastRun: e === 'vessel' ? 2 : s.rowsLastRun,
              }
            : s
        )
      );
      setRunning(null);
      toast(`${label(e)} sync finished`);
    }, 900);
  };

  return (
    <SetupPage
      wide
      title="NG sync & messages"
      ms="M0"
      sub="Master data coming in from NG, events going out to NG, and (Phase 2) messages with lines, banks and customs"
      sources={[SRC.sync, { table: 'outbox_event, outbox_delivery' }, { table: 'integration_message (M5)' }]}
    >
      <SyncStatusCards sync={sync} ob={ob} problems={problems} />

      <Tabs<Tab>
        value={t}
        onChange={setTab}
        tabs={[
          { id: 'sync', label: 'Master sync from NG', count: sync.length },
          { id: 'outbox', label: 'Events to NG and ERP', count: problems.length || undefined },
          {
            id: 'edi',
            label: (
              <span className="row" style={{ gap: 6 }}>
                Messages and EDI <Ms m="M5" />
              </span>
            ),
            count: integrationMessages.length,
            hidden: phase !== 2,
          },
        ]}
      />

      {t === 'sync' && <SyncMasterTable sync={sync} running={running} onRun={run} />}

      {t === 'outbox' && (
        <SyncOutboxTable
          ob={ob}
          filter={f}
          problems={problems}
          onFilterChange={setF}
          onRetry={(o) => {
            if (o.id) syncApi.retryOutbox(o.id).catch(() => {});
            setOb((all) =>
              all.map((x) =>
                x === o ? { ...x, status: 'PENDING', attempts: x.attempts + 1, lastError: undefined } : x
              )
            );
            toast('Retry queued');
          }}
        />
      )}

      {t === 'edi' && <SyncEdiTable />}
    </SetupPage>
  );
}
