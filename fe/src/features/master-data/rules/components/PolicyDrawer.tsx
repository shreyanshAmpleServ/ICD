import { Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { approvalPolicies as seedPolicies } from '@/mock/admin';

export type Pol = (typeof seedPolicies)[number] & { description?: string };

interface PolicyDrawerProps {
  pol: Pol | null;
  onClose: () => void;
  onSave: () => void;
  setPol: React.Dispatch<React.SetStateAction<Pol | null>>;
}

export function PolicyDrawer({ pol, onClose, onSave, setPol }: PolicyDrawerProps) {
  if (!pol) return null;

  return (
    <EditDrawer
      open={!!pol}
      onClose={onClose}
      title={`Policy for ${pol.permissionCode}`}
      saveLabel="Save policy"
      perm="admin.config.manage"
      reason="Approval thresholds are a finance control."
      onSave={onSave}
    >
      <div className="form-grid">
        <Field label="Description" hint="Permission / Policy display description from database">
          <Input
            value={(pol as any).description ?? ''}
            onChange={(e) => setPol({ ...pol, description: e.target.value } as any)}
            placeholder="e.g. Credit notes"
          />
        </Field>
        <Field label="From amount (USD)" hint="0 means any amount">
          <Input
            type="number"
            value={pol.amountFrom ?? '0'}
            onChange={(e) => setPol({ ...pol, amountFrom: e.target.value, amountCurrency: Number(e.target.value) > 0 ? 'USD' : null } as any)}
          />
        </Field>
        <Field label="Levels required">
          <Select
            value={String(pol.levelsRequired)}
            onChange={(e) => setPol({ ...pol, levelsRequired: Number(e.target.value) } as any)}
            options={[['1', '1 approver'], ['2', '2 approvers, one after the other']]}
          />
        </Field>
        <Field label="Expires after (hours)" hint="An unanswered request lapses and the requester is told">
          <Input
            type="number"
            value={pol.expiresAfterHours ?? 72}
            onChange={(e) => setPol({ ...pol, expiresAfterHours: Number(e.target.value) } as any)}
          />
        </Field>
      </div>
      <p className="xs faint">Requests already waiting keep the policy they were raised under.</p>
    </EditDrawer>
  );
}
