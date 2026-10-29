import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button, Drawer, Field, Input, Select, UnitNo, useToast } from '@/ds/components';
import { allStays } from '@/mock/core';
import { inspections, type Insp } from '@/mock/ops';

export interface StartInspectionDrawerProps {
  open: boolean;
  onClose: () => void;
  siteId: number;
  onStart: (id: number) => void;
}

export function StartInspectionDrawer({ open, onClose, siteId, onStart }: StartInspectionDrawerProps) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('PERIODIC');
  const n = q.replace(/\s/g, '').toUpperCase();
  const hit =
    n.length >= 4
      ? allStays.find((s) => s.siteId === siteId && s.cargoUnit.category !== 'LOT' && s.cargoUnit.unitNo.includes(n))
      : undefined;
  const err =
    n.length >= 4 && !hit
      ? 'No container or vehicle with that number at this site'
      : hit && hit.physicalStatus !== 'IN_YARD' && hit.physicalStatus !== 'AT_ACTIVITY'
      ? 'This unit is not in the yard'
      : undefined;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Start an inspection"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<ClipboardCheck />}
            perm="inspection.perform"
            disabled={!hit || !!err}
            onClick={() => {
              const id = 1300 + inspections.length;
              const cat = hit!.cargoUnit.category === 'VEHICLE' ? 'VEHICLE' : 'CONTAINER';
              inspections.push({
                inspectionId: id,
                unitStayId: hit!.unitStayId!,
                unitNo: hit!.cargoUnit.unitNo,
                siteId,
                category: cat,
                unitType: hit!.cargoUnit.unitTypeCode,
                templateCode: cat === 'VEHICLE' ? 'VEH-STD-v3' : 'CTR-STD-v4',
                inspectionKind: kind as Insp['inspectionKind'],
                status: 'IN_PROGRESS',
                startedAt: new Date('2026-10-07T10:30:00+03:00').toISOString(),
                inspector: 'You',
                results: [],
                findings: [],
                photoCount: 0,
              });
              toast('Inspection started');
              onClose();
              onStart(id);
            }}
          >
            Start inspection
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Container number or VIN" required error={err} hint="At least 4 characters">
          <Input xl value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. 402117" autoFocus />
        </Field>
        {hit && !err && (
          <div className="row-wrap">
            <UnitNo no={hit.cargoUnit.unitNo} category={hit.cargoUnit.category} size="md" />
            <span className="small muted">
              {hit.cargoUnit.unitTypeCode} · {hit.currentLocation?.fullCode}
            </span>
          </div>
        )}
        <Field label="Kind" required>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            options={[
              ['PERIODIC', 'Periodic (yard check)'],
              ['EXAM', 'Customs exam'],
              ['GATE_OUT', 'Gate-out'],
            ]}
          />
        </Field>
        <p className="xs faint">Gate-in inspections start from the gate lane when the truck is at the inner gate.</p>
      </div>
    </Drawer>
  );
}
