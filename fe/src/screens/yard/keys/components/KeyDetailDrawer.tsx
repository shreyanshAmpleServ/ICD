import { CheckCircle2, KeyRound, Undo2 } from 'lucide-react';
import { Button, DL, Drawer, Pill, Timeline, UnitNo } from '@/ds/components';
import type { Key } from '@/mock/ops';
import { STATUS } from './KeyCabinetGrid';

const ACTION: Record<string, string> = {
  RECEIVE: 'Received from driver',
  STORE: 'Put on hook',
  ISSUE: 'Issued',
  RETURN: 'Returned',
  HAND_OVER: 'Handed over with the vehicle',
  LOST: 'Reported lost',
  FOUND: 'Found',
};

export type Flow = 'ISSUE' | 'RETURN' | 'LOST' | 'FOUND';

export interface KeyDetailDrawerProps {
  open: Key | null;
  flow: Flow | null;
  onClose: () => void;
  onOpenFlow: (flow: Flow) => void;
}

export function KeyDetailDrawer({ open, flow, onClose, onOpenFlow }: KeyDetailDrawerProps) {
  return (
    <Drawer
      open={!!open && !flow}
      onClose={onClose}
      title={open ? `Key ${open.keyTagNo}` : ''}
      footer={
        open && (
          <>
            {open.status === 'IN_CABINET' && (
              <Button
                variant="primary"
                size="xl"
                icon={<KeyRound />}
                perm="yard.key.custody"
                onClick={() => onOpenFlow('ISSUE')}
              >
                Issue key
              </Button>
            )}
            {open.status === 'ISSUED' && (
              <>
                <Button size="xl" variant="danger" perm="yard.key.custody" onClick={() => onOpenFlow('LOST')}>
                  Report lost
                </Button>
                <Button
                  size="xl"
                  variant="primary"
                  icon={<Undo2 />}
                  perm="yard.key.custody"
                  onClick={() => onOpenFlow('RETURN')}
                >
                  Return key
                </Button>
              </>
            )}
            {open.status === 'LOST' && (
              <Button
                size="xl"
                variant="primary"
                icon={<CheckCircle2 />}
                perm="yard.key.custody"
                onClick={() => onOpenFlow('FOUND')}
              >
                Key found
              </Button>
            )}
          </>
        )
      }
    >
      {open && (
        <div className="stack">
          <UnitNo no={open.vin} category="VEHICLE" size="md" to={`/units/${open.unitStayId}`} />
          <DL
            items={[
              ['Vehicle', `${open.make} ${open.model}${open.colour ? ` · ${open.colour}` : ''}`],
              ['Parked at', open.unitLocation ?? '—'],
              ['Status', <Pill key="s" tone={STATUS[open.status!][1]}>{STATUS[open.status!][0]}</Pill>],
              ['Hook', open.hook ? `KC1 hook ${open.hook}` : '—'],
              ['Holder', open.holderName ?? '—'],
              ['Keys on the ring', `${open.keyCount}${open.hasRemote ? ' + remote' : ''}`],
            ]}
          />
          <h3 style={{ marginTop: 8 }}>Movements</h3>
          <Timeline
            items={open.movements.map((m) => ({
              at: m.occurredAt,
              title: ACTION[m.action] + (m.toHolderName ? ` · ${m.toHolderName}` : ''),
              detail: m.reason,
              by: m.by,
              tone:
                m.action === 'LOST'
                  ? 'stop'
                  : m.action === 'ISSUE'
                  ? 'wait'
                  : m.action === 'RETURN' || m.action === 'FOUND' || m.action === 'STORE'
                  ? 'go'
                  : undefined,
            }))}
          />
        </div>
      )}
    </Drawer>
  );
}
