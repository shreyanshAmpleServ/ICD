import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Banner, Button, Drawer, Field, Select } from '@/ds/components';
import { equipment } from '@/mock/core';
import { MOVE_KIND, OPERATORS, moveOrders, type Move } from '@/mock/ops';

export const MACHINES = equipment.filter((e) =>
  ['REACH_STACKER', 'EMPTY_HANDLER', 'TERMINAL_TRACTOR'].includes(e.equipmentType)
);

export interface AssignDrawerProps {
  m: Move | null;
  vehicleSite: boolean;
  onClose: () => void;
  onDone: (m: Move, eq: number | undefined, op: string) => void;
}

export function AssignDrawer({ m, vehicleSite, onClose, onDone }: AssignDrawerProps) {
  const [eq, setEq] = useState('1');
  const [op, setOp] = useState('ibrahim.n');
  if (!m) return null;
  const busy = MACHINES.find(
    (e) =>
      String(e.equipmentId) === eq &&
      moveOrders.some((o) => o.assignedEquipmentId === e.equipmentId && o.status === 'IN_PROGRESS')
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Assign move for ${m.unitNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<UserPlus />}
            perm="yard.allocate"
            onClick={() => {
              onDone(m, vehicleSite ? undefined : Number(eq), op);
              onClose();
            }}
          >
            Assign move
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="small muted">
          {MOVE_KIND[m.moveKind]} from {m.fromCode} to {m.toCode ?? m.toLabel}.
        </p>
        {!vehicleSite && (
          <Field
            label="Equipment"
            required
            hint={busy ? `${busy.equipmentCode} is on another move; this one waits in its queue` : undefined}
          >
            <Select
              value={eq}
              onChange={(e) => setEq(e.target.value)}
              options={MACHINES.map((e) => [String(e.equipmentId), `${e.equipmentCode} · ${e.equipmentName}`])}
            />
          </Field>
        )}
        <Field label={vehicleSite ? 'Driver' : 'Operator'} required>
          <Select
            value={op}
            onChange={(e) => setOp(e.target.value)}
            options={Object.entries(OPERATORS).map(([k, v]) => [k, v])}
          />
        </Field>
        {vehicleSite && (
          <Banner tone="wait">
            Self-driven move: the driver must sign the key out of the cabinet before starting.
          </Banner>
        )}
        <p className="xs faint">The operator gets the order on the handheld at once.</p>
      </div>
    </Drawer>
  );
}
