import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Drawer, Field, Input, Select, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { movesApi } from '../api';
import { MACHINES } from './AssignDrawer';
import { OPERATORS, MOVE_KIND } from '@/mock/ops';

export interface CreateMoveDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateMoveDrawer({ open, onClose, onSuccess }: CreateMoveDrawerProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [unitNo, setUnitNo] = useState('');
  const [moveKind, setMoveKind] = useState('RELOCATE');
  const [fromCode, setFromCode] = useState('A-01-01-1');
  const [toCode, setToCode] = useState('B-02-02-2');
  const [equipmentId, setEquipmentId] = useState('1');
  const [operator, setOperator] = useState('ibrahim.n');
  const [priority, setPriority] = useState('NORMAL');

  // Load available units from yard
  const { data: unitsRes = [] } = useQ(['units-for-moves'], async () => {
    try {
      const res = await api.get<any>('/units');
      return res?.items || (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  });

  const units = Array.isArray(unitsRes) ? unitsRes : [];

  const handleSelectUnit = (no: string) => {
    setUnitNo(no);
    const found = units.find((u) => u.cargoUnit?.unitNo === no || u.unitSummary?.unitNo === no);
    if (found?.currentLocation?.fullCode) {
      setFromCode(found.currentLocation.fullCode);
    }
  };

  const handleSubmit = async () => {
    if (!unitNo.trim()) {
      toast('Please select or enter a container unit number');
      return;
    }

    setSubmitting(true);
    try {
      const selectedUnit = units.find((u) => u.cargoUnit?.unitNo === unitNo.trim().toUpperCase());
      const payload = {
        unitNo: unitNo.trim().toUpperCase(),
        unitStayId: selectedUnit?.unitStayId,
        moveKind,
        fromCode,
        sourceLocation: fromCode,
        toCode,
        targetLocation: toCode,
        assignedEquipmentId: Number(equipmentId),
        assignedOperatorSub: operator,
        priority: priority === 'URGENT' ? 5 : (priority === 'HIGH' ? 4 : 3),
      };

      await movesApi.createMoveOrder(payload);
      toast(`Move order created for ${payload.unitNo}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to create move order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create yard move order"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Plus />}
            disabled={submitting || !unitNo.trim()}
            onClick={handleSubmit}
          >
            {submitting ? 'Creating...' : 'Create move order'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Container / Vehicle Unit No" required>
          <div className="stack-sm">
            <Input
              value={unitNo}
              onChange={(e) => setUnitNo(e.target.value.toUpperCase())}
              placeholder="e.g. MSKU 123456 7"
            />
            {units.length > 0 && (
              <Select
                value={unitNo}
                onChange={(e) => handleSelectUnit(e.target.value)}
                options={[
                  ['', '-- Or select from yard units --'] as [string, string],
                  ...units.slice(0, 20).map((u: any): [string, string] => {
                    const no = u.cargoUnit?.unitNo || u.unitSummary?.unitNo || String(u.unitStayId);
                    const loc = u.currentLocation?.fullCode || 'Yard';
                    return [no, `${no} (${loc})`];
                  }),
                ]}
              />
            )}
          </div>
        </Field>

        <Field label="Move Type" required>
          <Select
            value={moveKind}
            onChange={(e) => setMoveKind(e.target.value)}
            options={Object.entries(MOVE_KIND).map(([k, v]) => [k, v])}
          />
        </Field>

        <div className="grid-2">
          <Field label="Source Location" required>
            <Input
              value={fromCode}
              onChange={(e) => setFromCode(e.target.value.toUpperCase())}
              placeholder="e.g. A-01-01-1"
            />
          </Field>
          <Field label="Target Location" required>
            <Input
              value={toCode}
              onChange={(e) => setToCode(e.target.value.toUpperCase())}
              placeholder="e.g. B-02-02-2"
            />
          </Field>
        </div>

        <Field label="Assigned Equipment">
          <Select
            value={equipmentId}
            onChange={(e) => setEquipmentId(e.target.value)}
            options={MACHINES.map((e) => [String(e.equipmentId), `${e.equipmentCode} · ${e.equipmentName}`])}
          />
        </Field>

        <Field label="Operator">
          <Select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            options={Object.entries(OPERATORS).map(([k, v]) => [k, v])}
          />
        </Field>

        <Field label="Priority">
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={[
              ['NORMAL', 'Normal (3)'],
              ['HIGH', 'High (4)'],
              ['URGENT', 'Urgent (5)'],
            ]}
          />
        </Field>
      </div>
    </Drawer>
  );
}
