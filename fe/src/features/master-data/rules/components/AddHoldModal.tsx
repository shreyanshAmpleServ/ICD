import { useState } from 'react';
import { Banner, Check, Field, Input, Select } from '@/ds/components';
import { locationTags } from '@/mock/admin';
import { EditDrawer } from '../../shared/AdminKit';

interface AddHoldModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (hold: any) => void;
}

const AUTHORITIES: [string, string][] = [
  ['CUSTOMS', 'Customs (TRA)'],
  ['PORT', 'Port authority'],
  ['REGULATOR', 'Regulator'],
  ['COURT', 'Court'],
  ['LINE', 'Shipping line'],
  ['ICD', 'Depot'],
  ['SECURITY', 'Depot security'],
];

export function AddHoldModal({ open, onClose, onSave }: AddHoldModalProps) {
  const [holdCode, setHoldCode] = useState('');
  const [holdName, setHoldName] = useState('');
  const [authority, setAuthority] = useState('CUSTOMS');
  const [blocksGateOut, setBlocksGateOut] = useState(true);
  const [blocksRelease, setBlocksRelease] = useState(true);
  const [blocksMove, setBlocksMove] = useState(false);
  const [blocksStuffing, setBlocksStuffing] = useState(false);
  const [liftNeedsApproval, setLiftNeedsApproval] = useState(true);
  const [liftNeedsEvidence, setLiftNeedsEvidence] = useState(false);
  const [moveToTagCode, setMoveToTagCode] = useState<string | undefined>(undefined);
  const [packTz, setPackTz] = useState(false);

  const handleSave = () => {
    if (!holdCode.trim() || !holdName.trim()) return;
    onSave({
      holdCode: holdCode.toUpperCase().trim(),
      holdName: holdName.trim(),
      authority,
      blocksGateOut,
      blocksRelease,
      blocksMove,
      blocksStuffing,
      liftNeedsApproval,
      liftNeedsEvidence,
      moveToTagCode: moveToTagCode || undefined,
      packTz,
      isActive: true,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Add hold type"
      saveLabel="Create hold type"
      perm="admin.config.manage"
      reason="Configures what stops a unit and what authority is required to lift it."
      onSave={handleSave}
    >
      <Field label="Hold code" hint="Unique alphanumeric code (e.g. INSP_SCAN)">
        <Input
          value={holdCode}
          onChange={(e) => setHoldCode(e.target.value)}
          placeholder="e.g. INSP_SCAN"
          autoFocus
        />
      </Field>
      <Field label="Hold name">
        <Input
          value={holdName}
          onChange={(e) => setHoldName(e.target.value)}
          placeholder="e.g. Customs Scan Examination"
        />
      </Field>
      <Field label="Authority" hint="The agency or entity ordering this hold">
        <Select
          value={authority}
          onChange={(e) => setAuthority(e.target.value)}
          options={AUTHORITIES}
        />
      </Field>
      <Field label="While active, this hold blocks">
        <div className="stack" style={{ gap: 8 }}>
          <Check label="Gate out" checked={blocksGateOut} onChange={(e) => setBlocksGateOut(e.target.checked)} />
          <Check label="Release approval" checked={blocksRelease} onChange={(e) => setBlocksRelease(e.target.checked)} />
          <Check label="Yard moves" checked={blocksMove} onChange={(e) => setBlocksMove(e.target.checked)} />
          <Check label="Stuffing and de-stuffing" checked={blocksStuffing} onChange={(e) => setBlocksStuffing(e.target.checked)} />
        </div>
      </Field>
      <Field label="To lift it">
        <div className="stack" style={{ gap: 8 }}>
          <Check label="Needs approval (approver role authorization)" checked={liftNeedsApproval} onChange={(e) => setLiftNeedsApproval(e.target.checked)} />
          <Check label="Needs evidence (document or photo uploaded)" checked={liftNeedsEvidence} onChange={(e) => setLiftNeedsEvidence(e.target.checked)} />
          <Check label="Tanzania country pack default" checked={packTz} onChange={(e) => setPackTz(e.target.checked)} />
        </div>
      </Field>
      <Field label="Move unit to area" hint="Allocation suggests a slot with this location tag">
        <Select
          value={moveToTagCode ?? ''}
          onChange={(e) => setMoveToTagCode(e.target.value || undefined)}
          options={[['', 'Leave where it is'], ...locationTags.map((t) => [t.tagCode, t.tagName] as [string, string])]}
        />
      </Field>
      {!blocksGateOut && (
        <Banner tone="stop">A hold that does not block gate-out lets the unit leave while held. Is that intended?</Banner>
      )}
    </EditDrawer>
  );
}

