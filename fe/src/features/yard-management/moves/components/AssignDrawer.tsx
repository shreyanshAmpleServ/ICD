import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Button, Drawer, Field, Select } from '@/ds/components';
import { useQ } from '@/api/query';
import { movesApi, type EquipmentItem, type OperatorItem } from '../api';
import { MOVE_KIND, type Move } from '@/mock/ops';

export interface AssignDrawerProps {
  m: Move | null;
  vehicleSite: boolean;
  onClose: () => void;
  onDone: (m: Move, eq: number | undefined, op: string) => void;
}

export function AssignDrawer({ m, vehicleSite, onClose, onDone }: AssignDrawerProps) {
  const [eq, setEq] = useState('');
  const [op, setOp] = useState('');

  const { data: equipmentList = [] } = useQ<EquipmentItem[]>(['yard-equipment', m?.siteId], () =>
    movesApi.getEquipment(m?.siteId)
  );

  const { data: operatorsList = [] } = useQ<OperatorItem[]>(['yard-operators'], () =>
    movesApi.getOperators()
  );

  // Filter equipment suitable for moves
  const moveMachines = equipmentList.filter((e) =>
    ['REACH_STACKER', 'EMPTY_HANDLER', 'TERMINAL_TRACTOR', 'FORKLIFT'].includes(e.equipmentType)
  );
  const activeMachines = moveMachines.length > 0 ? moveMachines : equipmentList;

  useEffect(() => {
    if (m?.assignedEquipmentId) {
      setEq(String(m.assignedEquipmentId));
    } else if (activeMachines.length > 0) {
      setEq((prev) => prev || String(activeMachines[0].equipmentId));
    }

    if (m?.assignedOperatorSub) {
      setOp(m.assignedOperatorSub);
    } else if (operatorsList.length > 0) {
      setOp((prev) => {
        if (prev) return prev;
        const defaultOp =
          operatorsList.find(
            (o) =>
              o.name.toLowerCase().includes('ibrahim') ||
              o.userSub.toLowerCase().includes('ibrahim')
          ) || operatorsList[0];
        return defaultOp.name || defaultOp.userSub;
      });
    }
  }, [m, activeMachines, operatorsList]);

  if (!m) return null;

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
          {MOVE_KIND[m.moveKind] ?? m.moveKind} from {m.fromCode} to {m.toCode ?? m.toLabel}.
        </p>
        {!vehicleSite && (
          <Field label="Equipment" required>
            <Select
              value={eq}
              onChange={(e) => setEq(e.target.value)}
              options={activeMachines.map((e) => [
                String(e.equipmentId),
                `${e.equipmentCode} · ${e.equipmentName}`,
              ])}
            />
          </Field>
        )}
        <Field label={vehicleSite ? 'Driver' : 'Operator'} required>
          <Select
            value={op}
            onChange={(e) => setOp(e.target.value)}
            options={operatorsList.map((o) => [
              o.name || o.userSub,
              `${o.name} (${o.userSub})`,
            ])}
          />
        </Field>
        {vehicleSite && (
          <div className="small muted" style={{ padding: '8px 12px', background: 'var(--sheet)', borderRadius: 6 }}>
            Self-driven move: the driver must sign the key out of the cabinet before starting.
          </div>
        )}
        <p className="xs faint">The operator gets the order on the handheld at once.</p>
      </div>
    </Drawer>
  );
}
