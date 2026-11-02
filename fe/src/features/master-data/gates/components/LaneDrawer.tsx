import { useState } from 'react';
import { Check, Field, Input, Segmented } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { Gate } from '@/mock/admin';

type Lane = NonNullable<Gate['lanes']>[number];

interface LaneDrawerProps {
  gate: Gate;
  lane?: Lane;
  onClose: () => void;
  onSave: (l: Lane) => void;
}

export function LaneDrawer({ gate, lane, onClose, onSave }: LaneDrawerProps) {
  const [l, setL] = useState<Lane>(
    lane ?? ({
      laneCode: '',
      direction: 'IN',
      isActive: true,
    } as Lane)
  );

  return (
    <EditDrawer
      open
      onClose={onClose}
      title={lane ? `Edit lane ${lane.laneCode}` : `Add lane to ${gate.gateName}`}
      saveLabel={lane ? 'Save lane' : 'Add lane'}
      perm="admin.gate.configure"
      disabled={!l.laneCode?.trim()}
      onSave={() => onSave(l)}
    >
        <Field label="Lane code" required hint="As painted on the lane (e.g. L1, In 1, Out 2)">
          <Input
            value={l.laneCode || ''}
            placeholder="e.g. Lane 1"
            onChange={(e) => setL({ ...l, laneCode: e.target.value })}
          />
        </Field>
        <Field label="Direction">
          <Segmented
            value={l.direction || 'IN'}
            onChange={(d) => setL({ ...l, direction: d as any })}
            options={[
              { id: 'IN', label: 'In' },
              { id: 'OUT', label: 'Out' },
              { id: 'BOTH', label: 'Both' },
            ]}
          />
        </Field>
        <Check
          label="Open for traffic"
          checked={!!l.isActive}
          onChange={(e) => setL({ ...l, isActive: e.target.checked })}
        />
    </EditDrawer>
  );
}
