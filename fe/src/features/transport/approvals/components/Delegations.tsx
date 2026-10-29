import { Plus } from 'lucide-react';
import { Button, DataTable, Empty, Panel, Pill, fmtDT, useToast } from '@/ds/components';
import { at } from '@/mock/gen';
import { hoursUntil, type DelegationRow } from '@/mock/cargo';
import { NewDelegation } from './NewDelegation';

export function Delegations({
  rows,
  setRows,
  open,
  setOpen,
}: {
  rows: DelegationRow[];
  setRows: (f: (r: DelegationRow[]) => DelegationRow[]) => void;
  open: boolean;
  setOpen: (b: boolean) => void;
}) {
  const toast = useToast();
  const state = (d: DelegationRow): [string, 'go' | 'idle' | 'wait'] =>
    d.revokedAt
      ? ['Revoked', 'idle']
      : hoursUntil(d.validTo) < 0
      ? ['Ended', 'idle']
      : hoursUntil(d.validFrom) > 0
      ? ['Scheduled', 'wait']
      : ['Active', 'go'];

  return (
    <div className="stack-lg">
      <Panel
        flush
        title="Cover during leave"
        sub="A delegate decides on your behalf for a fixed period. It ends by itself; you can revoke it any time."
        actions={
          <Button size="sm" icon={<Plus />} onClick={() => setOpen(true)}>
            New delegation
          </Button>
        }
      >
        <DataTable
          rows={rows}
          rowKey={(d) => d.approvalDelegationId!}
          empty={<Empty title="No delegations">Set one before going on leave so nothing waits for you.</Empty>}
          cols={[
            { key: 'f', header: 'From', render: (d) => <span className="small strong">{d.fromName}</span> },
            { key: 't', header: 'To', render: (d) => <span className="small strong">{d.toName}</span> },
            { key: 'p', header: 'Covers', render: (d) => <span className="small">{d.permName}</span> },
            {
              key: 'v',
              header: 'Period',
              render: (d) => (
                <span className="small nowrap">
                  {fmtDT(d.validFrom)} – {fmtDT(d.validTo)}
                </span>
              ),
            },
            { key: 'r', header: 'Reason', render: (d) => <span className="xs muted">{d.reason}</span> },
            {
              key: 's',
              header: 'Status',
              render: (d) => {
                const [l, t] = state(d);
                return <Pill tone={t}>{l}</Pill>;
              },
            },
            {
              key: 'x',
              header: '',
              render: (d) =>
                state(d)[0] === 'Active' || state(d)[0] === 'Scheduled' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRows((r) => r.map((x) => (x === d ? { ...x, revokedAt: at(0) } : x)));
                      toast('Delegation revoked');
                    }}
                  >
                    Revoke
                  </Button>
                ) : null,
            },
          ]}
        />
      </Panel>
      <NewDelegation open={open} onClose={() => setOpen(false)} onSave={(d) => setRows((r) => [d, ...r])} />
    </div>
  );
}
