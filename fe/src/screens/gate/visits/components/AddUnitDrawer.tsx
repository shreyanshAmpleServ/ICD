import { useState } from 'react';
import { CheckCircle2, Undo2 } from 'lucide-react';
import { Button, Drawer, Field, Input, Segmented, StatusPill, UnitNo, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import type { S } from '@/api/types';
import type { SealStatus } from '@/screens/gate/types';

function unwrapList<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export type VU = S<'VisitUnit'> & { sealFound?: string; sealStatus?: SealStatus };

export function AddUnitDrawer({
  open,
  onClose,
  existing,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  existing: number[];
  onAdd: (u: VU) => void;
}) {
  const toast = useToast();
  const [dir, setDir] = useState<'DROP' | 'PICK'>('PICK');
  const [q, setQ] = useState('');
  const [sealNo, setSealNo] = useState('');

  const { data: unitsRaw = [] } = useQ(['gate-add-unit-stays'], async () => {
    const res = await api.get<any>('/units');
    return unwrapList<any>(res);
  });

  const allUnits = Array.isArray(unitsRaw) ? unitsRaw : [];
  const n = q.replace(/\s/g, '').toUpperCase();

  const hit = n.length >= 3
    ? allUnits.find((s) => {
        const uNo = s.cargoUnit?.unitNo || s.unitNo || '';
        return uNo.replace(/\s/g, '').toUpperCase().includes(n);
      })
    : undefined;

  const isExisting = hit && existing.includes(hit.unitStayId!);

  let problem: string | undefined;
  if (isExisting) {
    problem = 'This unit is already on this visit.';
  } else if (dir === 'PICK' && hit && hit.physicalStatus && hit.physicalStatus !== 'IN_YARD') {
    problem = 'This unit is not in the yard, so it cannot be picked up.';
  } else if (dir === 'DROP' && hit && hit.physicalStatus === 'IN_YARD') {
    problem = 'This unit is already registered in the yard. Did you mean pick up?';
  } else if (!hit && n.length >= 4 && dir === 'PICK') {
    problem = 'No yard unit found matching this number for pick-up.';
  }

  const canSubmit = n.length >= 4 && !problem;

  const handleAdd = () => {
    if (!canSubmit) return;
    const finalStayId = hit?.unitStayId ?? Math.floor(6000 + Math.random() * 2000);
    const finalUnitNo = hit ? (hit.cargoUnit?.unitNo || hit.unitNo) : n;

    onAdd({
      visitUnitTxnId: finalStayId * 10,
      unitStayId: finalStayId,
      unitNo: finalUnitNo,
      direction: dir,
      status: 'PLANNED',
      sealExpected: sealNo.trim() || hit?.sealNo || undefined,
    });
    toast(`${finalUnitNo} added to the visit`);
    setQ('');
    setSealNo('');
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a unit to this visit"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CheckCircle2 />}
            disabled={!canSubmit}
            onClick={handleAdd}
          >
            Add unit
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Direction">
          <div>
            <Segmented
              value={dir}
              onChange={setDir}
              options={[
                { id: 'PICK', label: 'Pick up' },
                { id: 'DROP', label: 'Drop off' },
              ]}
            />
          </div>
        </Field>
        <Field
          label="Container number or VIN"
          required
          error={problem}
          hint="Search active yard units or type container number"
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. MSKU 882014 9"
            autoFocus
          />
        </Field>

        <Field label="Door Seal Number (Optional)" hint="e.g. SEAL-TZ-88219">
          <Input
            value={sealNo}
            onChange={(e) => setSealNo(e.target.value.toUpperCase())}
            placeholder="Enter expected or physical seal"
          />
        </Field>

        {hit && !problem && (
          <div className="panel" style={{ padding: 12 }}>
            <div className="row-wrap">
              <UnitNo
                no={hit.cargoUnit?.unitNo || hit.unitNo}
                category={hit.cargoUnit?.category || 'CONTAINER'}
                size="md"
              />
              <span className="spacer" />
              <StatusPill value={hit.physicalStatus || 'IN_YARD'} track="physical" />
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>
              {hit.cargoUnit?.unitTypeCode || '40HC'} · {hit.cargoDescription || 'Containerized Cargo'} ·{' '}
              {hit.currentLocation?.fullCode ?? 'Assigned Yard Slot'}
            </div>
            {dir === 'PICK' && (
              <div className="row-wrap" style={{ marginTop: 6 }}>
                <span className="xs muted">Release</span>
                <StatusPill value={hit.releaseStatus || 'RELEASED'} track="release" />
                <span className="xs muted">Checked again at inner gate out.</span>
              </div>
            )}
          </div>
        )}

        {!hit && n.length >= 4 && dir === 'DROP' && !problem && (
          <div className="panel" style={{ padding: 12, backgroundColor: 'var(--panel-alt, #f8fafc)' }}>
            <div className="small strong">New Inbound Container Arrival</div>
            <div className="xs muted" style={{ marginTop: 4 }}>
              Unit <strong>{n}</strong> will be registered on gate-in and assigned to yard receiving.
            </div>
          </div>
        )}

        <p className="xs faint">
          <Undo2 size={12} /> Planned units can be modified or removed before final lane checkout.
        </p>
      </div>
    </Drawer>
  );
}
