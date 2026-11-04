import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button, Drawer, Field, Input, Select, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { movesApi, type EquipmentItem, type YardLocationItem, type OperatorItem } from '../api';
import { MOVE_KIND } from '@/mock/ops';

export interface CreateMoveDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  siteId?: number;
}

export function CreateMoveDrawer({ open, onClose, onSuccess, siteId }: CreateMoveDrawerProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [unitNo, setUnitNo] = useState('');
  const [moveKind, setMoveKind] = useState('RELOCATE');
  const [fromCode, setFromCode] = useState('A-01-01');
  const [toCode, setToCode] = useState('B-02-01');
  const [equipmentId, setEquipmentId] = useState('');
  const [operator, setOperator] = useState('');
  const [priority, setPriority] = useState('NORMAL');

  // Load available units from yard
  const { data: unitsRes = [] } = useQ(['units-for-moves', siteId], async () => {
    try {
      const res = await api.get<any>(`/units${siteId ? `?siteId=${siteId}` : ''}`);
      return res?.items || (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  });

  const { data: equipmentList = [] } = useQ<EquipmentItem[]>(['yard-equipment', siteId], () =>
    movesApi.getEquipment(siteId)
  );

  const { data: locationsList = [] } = useQ<YardLocationItem[]>(['yard-locations', siteId], () =>
    movesApi.getLocations(siteId)
  );

  const { data: operatorsList = [] } = useQ<OperatorItem[]>(['yard-operators'], () =>
    movesApi.getOperators()
  );

  const units = Array.isArray(unitsRes) ? unitsRes : [];
  const moveMachines = equipmentList.filter((e) =>
    ['REACH_STACKER', 'EMPTY_HANDLER', 'TERMINAL_TRACTOR', 'FORKLIFT'].includes(e.equipmentType)
  );
  const activeMachines = moveMachines.length > 0 ? moveMachines : equipmentList;

  useEffect(() => {
    if (activeMachines.length > 0 && !equipmentId) {
      setEquipmentId(String(activeMachines[0].equipmentId));
    }
  }, [activeMachines, equipmentId]);

  useEffect(() => {
    if (operatorsList.length > 0 && !operator) {
      const defaultOp =
        operatorsList.find(
          (o) =>
            o.name.toLowerCase().includes('ibrahim') ||
            o.userSub.toLowerCase().includes('ibrahim')
        ) || operatorsList[0];
      setOperator(defaultOp.name || defaultOp.userSub);
    }
  }, [operatorsList, operator]);

  const handleSelectUnit = (no: string) => {
    setUnitNo(no);
    const found = units.find(
      (u: any) => (u.cargoUnit?.unitNo || u.unitSummary?.unitNo || u.unitNo) === no
    );
    if (found?.currentLocation?.fullCode) {
      setFromCode(found.currentLocation.fullCode);
    } else if (found?.locationCode) {
      setFromCode(found.locationCode);
    }
  };

  const handleSubmit = async () => {
    if (!unitNo.trim()) {
      toast('Please select or enter a container unit number');
      return;
    }

    setSubmitting(true);
    try {
      const selectedUnit = units.find(
        (u: any) => (u.cargoUnit?.unitNo || u.unitSummary?.unitNo || u.unitNo) === unitNo.trim().toUpperCase()
      );

      const payload = {
        unitNo: unitNo.trim().toUpperCase(),
        unitStayId: selectedUnit?.unitStayId,
        moveKind,
        fromCode,
        sourceLocation: fromCode,
        toCode,
        targetLocation: toCode,
        assignedEquipmentId: equipmentId ? Number(equipmentId) : undefined,
        assignedOperatorSub: operator,
        priority: priority === 'URGENT' ? 5 : priority === 'HIGH' ? 4 : 3,
        siteId,
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
                  ['', '-- Or select from active yard units --'] as [string, string],
                  ...units.slice(0, 30).map((u: any): [string, string] => {
                    const no = u.cargoUnit?.unitNo || u.unitSummary?.unitNo || u.unitNo || String(u.unitStayId);
                    const loc = u.currentLocation?.fullCode || u.locationCode || 'Yard';
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
            <div className="stack-sm">
              <Input
                value={fromCode}
                onChange={(e) => setFromCode(e.target.value.toUpperCase())}
                placeholder="e.g. A-01-01"
              />
              {locationsList.length > 0 && (
                <Select
                  value={fromCode}
                  onChange={(e) => setFromCode(e.target.value)}
                  options={locationsList.map((l) => [l.fullCode, l.fullCode])}
                />
              )}
            </div>
          </Field>
          <Field label="Target Location" required>
            <div className="stack-sm">
              <Input
                value={toCode}
                onChange={(e) => setToCode(e.target.value.toUpperCase())}
                placeholder="e.g. B-02-01"
              />
              {locationsList.length > 0 && (
                <Select
                  value={toCode}
                  onChange={(e) => setToCode(e.target.value)}
                  options={locationsList.map((l) => [l.fullCode, l.fullCode])}
                />
              )}
            </div>
          </Field>
        </div>

        <Field label="Assigned Equipment">
          <Select
            value={equipmentId}
            onChange={(e) => setEquipmentId(e.target.value)}
            options={activeMachines.map((e) => [
              String(e.equipmentId),
              `${e.equipmentCode} · ${e.equipmentName}`,
            ])}
          />
        </Field>

        <Field label="Operator">
          <Select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            options={operatorsList.map((o) => [
              o.name || o.userSub,
              `${o.name} (${o.userSub})`,
            ])}
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
