import { useState, useEffect } from 'react';
import { Check, Field, Input } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

interface VisitTypeDrawerProps {
  visitType: any | null;
  isNew?: boolean;
  onClose: () => void;
  onSave: (vt: any) => void;
}

export function VisitTypeDrawer({ visitType, isNew, onClose, onSave }: VisitTypeDrawerProps) {
  const [form, setForm] = useState<any>({
    visitTypeCode: '',
    visitTypeName: '',
    requiresNomination: true,
    requiresAppointment: false,
    isActive: true,
  });

  useEffect(() => {
    if (visitType) {
      setForm({
        ...visitType,
        visitTypeCode: visitType.visitTypeCode || visitType.visitCode || '',
        visitTypeName: visitType.visitTypeName || visitType.visitName || '',
        requiresNomination: visitType.requiresNomination ?? true,
        requiresAppointment: visitType.requiresAppointment ?? false,
        isActive: visitType.isActive ?? true,
      });
    }
  }, [visitType]);

  if (!visitType) return null;

  const title = isNew ? 'Add visit type' : `Edit visit type ${form.visitTypeName || form.visitTypeCode || ''}`;
  const saveLabel = isNew ? 'Add visit type' : 'Save changes';
  const disabled = !form.visitTypeCode?.trim() || !form.visitTypeName?.trim();

  return (
    <EditDrawer
      open
      onClose={onClose}
      title={title}
      saveLabel={saveLabel}
      perm="admin.gate.configure"
      disabled={disabled}
      onSave={() => onSave(form)}
    >
      <Field label="Visit type code" required hint="e.g. IMPORT_PICKUP, EXPORT_DROP">
        <Input
          value={form.visitTypeCode || ''}
          placeholder="e.g. DIRECT_DELIVERY"
          disabled={!isNew}
          onChange={(e) => setForm({ ...form, visitTypeCode: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
        />
      </Field>

      <Field label="Visit type name" required hint="Readable title displayed across system">
        <Input
          value={form.visitTypeName || ''}
          placeholder="e.g. Direct delivery to CFS"
          onChange={(e) => setForm({ ...form, visitTypeName: e.target.value })}
        />
      </Field>

      <div className="stack" style={{ gap: 12, marginTop: 8 }}>
        <Check
          label="Needs a nomination (release order, booking or drop-off authorisation)"
          checked={!!form.requiresNomination}
          onChange={(e) => setForm({ ...form, requiresNomination: e.target.checked })}
        />
        <Check
          label="Needs an appointment (Phase 2)"
          checked={!!form.requiresAppointment}
          onChange={(e) => setForm({ ...form, requiresAppointment: e.target.checked })}
        />
        <Check
          label="Active"
          checked={!!form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
      </div>
    </EditDrawer>
  );
}

