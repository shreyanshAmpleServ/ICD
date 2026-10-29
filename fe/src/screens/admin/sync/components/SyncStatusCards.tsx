import { Kpi } from '@/ds/components';
import { outbox as seedOutbox, syncStates as seedSync } from '@/mock/admin';

type Sync = (typeof seedSync)[number];
type Ob = (typeof seedOutbox)[number];

export function SyncStatusCards({
  sync,
  ob,
  problems,
}: {
  sync: Sync[];
  ob: Ob[];
  problems: Ob[];
}) {
  return (
    <div className="kpi-strip">
      <Kpi
        label="Masters in step"
        value={`${sync.filter((s) => s.lastStatus === 'OK').length} of ${sync.length}`}
        delta={sync.some((s) => s.lastStatus === 'FAILED') ? 'Vessel sync failing' : 'All good'}
      />
      <Kpi
        label="Provisional records"
        value={sync.reduce((a, s) => a + s.provisional, 0)}
        delta="Created at the gate; match to NG"
      />
      <Kpi
        label="Events waiting"
        value={ob.filter((o) => o.status === 'PENDING').length}
        delta="Sent within a minute normally"
      />
      <Kpi
        label="Events failed"
        value={problems.length}
        delta={problems.length ? 'Needs a look' : 'None'}
      />
    </div>
  );
}
