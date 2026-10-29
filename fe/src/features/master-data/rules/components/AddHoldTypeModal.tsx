import { Banner, Check, Field, Input, Select } from '@/ds/components';
import { locationTags, type holdTypesSeed } from '@/mock/admin';
import { EditDrawer } from '../../shared/AdminKit';

type HT = (typeof holdTypesSeed)[number];

interface AddHoldTypeModalProps {
  ht: HT | null;
  onClose: () => void;
  onSave: () => void;
  setHt: React.Dispatch<React.SetStateAction<HT | null>>;
}

export function AddHoldTypeModal({ ht, onClose, onSave, setHt }: AddHoldTypeModalProps) {
  if (!ht) return null;

  return (
    <EditDrawer
      open={!!ht}
      onClose={onClose}
      title={ht.holdName}
      saveLabel="Save hold type"
      perm="admin.config.manage"
      reason="Changing what a hold blocks affects every unit under it from now on."
      onSave={onSave}
    >
      <Field label="Name">
        <Input value={ht.holdName} onChange={(e) => setHt({ ...ht, holdName: e.target.value })} />
      </Field>
      <Field label="While active, this hold blocks">
        <div className="stack" style={{ gap: 8 }}>
          <Check label="Gate out" checked={ht.blocksGateOut} onChange={(e) => setHt({ ...ht, blocksGateOut: e.target.checked })} />
          <Check label="Release approval" checked={ht.blocksRelease} onChange={(e) => setHt({ ...ht, blocksRelease: e.target.checked })} />
          <Check label="Yard moves" checked={ht.blocksMove} onChange={(e) => setHt({ ...ht, blocksMove: e.target.checked })} />
          <Check label="Stuffing and de-stuffing" checked={ht.blocksStuffing} onChange={(e) => setHt({ ...ht, blocksStuffing: e.target.checked })} />
        </div>
      </Field>
      <Field label="To lift it">
        <div className="stack" style={{ gap: 8 }}>
          <Check label="Needs approval (customs.hold.lift, approver)" checked={ht.liftNeedsApproval} onChange={(e) => setHt({ ...ht, liftNeedsApproval: e.target.checked })} />
          <Check label="Needs evidence (document or photo)" checked={ht.liftNeedsEvidence} onChange={(e) => setHt({ ...ht, liftNeedsEvidence: e.target.checked })} />
        </div>
      </Field>
      <Field label="Move unit to area" hint="Allocation suggests a slot with this tag">
        <Select
          value={ht.moveToTagCode ?? ''}
          onChange={(e) => setHt({ ...ht, moveToTagCode: e.target.value || undefined })}
          options={[['', 'Leave where it is'], ...locationTags.map((t) => [t.tagCode, t.tagName] as [string, string])]}
        />
      </Field>
      {!ht.blocksGateOut && (
        <Banner tone="stop">A hold that does not block gate-out lets the unit leave while held. Is that intended?</Banner>
      )}
    </EditDrawer>
  );
}
