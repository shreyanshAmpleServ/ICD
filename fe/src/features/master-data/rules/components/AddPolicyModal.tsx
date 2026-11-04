import { useState } from 'react';
import { Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import { permissions } from '@/mock/admin';

interface AddPolicyModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (policy: any) => void;
}

const defaultApprovalPerms = permissions
  .filter((p) => p.isApproval)
  .map((p) => [p.code, `${p.description} (${p.code})`] as [string, string]);

export function AddPolicyModal({ open, onClose, onSave }: AddPolicyModalProps) {
  const [permissionCode, setPermissionCode] = useState(defaultApprovalPerms[0]?.[0] || 'billing.creditnote');
  const [description, setDescription] = useState(permissions.find((p) => p.code === permissionCode)?.description || '');
  const [amountFrom, setAmountFrom] = useState('0');
  const [levelsRequired, setLevelsRequired] = useState(1);
  const [expiresAfterHours, setExpiresAfterHours] = useState(72);

  const handlePermChange = (code: string) => {
    setPermissionCode(code);
    const found = permissions.find((p) => p.code === code);
    if (found) setDescription(found.description);
  };

  const handleSave = () => {
    onSave({
      permissionCode,
      description: description || permissionCode,
      amountFrom: Number(amountFrom) || 0,
      amountCurrency: Number(amountFrom) > 0 ? 'USD' : null,
      levelsRequired: Number(levelsRequired) || 1,
      expiresAfterHours: Number(expiresAfterHours) || 72,
      isActive: true,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Add approval policy"
      saveLabel="Create policy"
      perm="admin.config.manage"
      reason="Create a threshold rule governing when transactions require higher authorization."
      onSave={handleSave}
    >
      <div className="form-grid">
        <Field label="Permission code" hint="The permission this policy controls">
          <Select
            value={permissionCode}
            onChange={(e) => handlePermChange(e.target.value)}
            options={[
              ...defaultApprovalPerms,
              ['custom.approval', 'Custom permission (enter description below)'],
            ]}
          />
        </Field>
        <Field label="Description" hint="Permission / Policy display name">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Credit notes"
          />
        </Field>
        <Field label="From amount (USD)" hint="0 means applies to any amount">
          <Input
            type="number"
            value={amountFrom}
            onChange={(e) => setAmountFrom(e.target.value)}
          />
        </Field>
        <Field label="Levels required">
          <Select
            value={String(levelsRequired)}
            onChange={(e) => setLevelsRequired(Number(e.target.value))}
            options={[
              ['1', '1 approver'],
              ['2', '2 approvers, one after the other'],
            ]}
          />
        </Field>
        <Field label="Expires after (hours)" hint="Unanswered request lapses after this duration">
          <Input
            type="number"
            value={expiresAfterHours}
            onChange={(e) => setExpiresAfterHours(Number(e.target.value))}
          />
        </Field>
      </div>
      <p className="xs faint">Threshold rules are logged in the audit trail.</p>
    </EditDrawer>
  );
}

