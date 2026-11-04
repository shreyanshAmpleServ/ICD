import { useState } from 'react';
import { Check, Field, Input, Select } from '@/ds/components';
import { ROLES } from '@/app/roles';
import { EditDrawer, hrs, useDynamicRoles } from '../../shared/AdminKit';

interface AddExceptionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (exc: any) => void;
  holds?: { holdCode: string; holdName: string }[];
}

export function AddExceptionModal({ open, onClose, onSave, holds = [] }: AddExceptionModalProps) {
  const { options: roleOptions } = useDynamicRoles();
  const roleChoices = roleOptions.length > 0 ? roleOptions : ROLES.filter((r) => !r.external).map((r) => [r.code, r.name] as [string, string]);

  const [exceptionCode, setExceptionCode] = useState('');
  const [exceptionName, setExceptionName] = useState('');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [slaMinutes, setSlaMinutes] = useState(120);
  const [defaultRoleCode, setDefaultRoleCode] = useState(roleChoices[0]?.[0] || 'customer.service');
  const [escalationRoleCode, setEscalationRoleCode] = useState(roleChoices[1]?.[0] || 'icd.admin');
  const [placesHoldTypeCode, setPlacesHoldTypeCode] = useState<string | undefined>(undefined);
  const [supervisorClose, setSupervisorClose] = useState(false);

  const handleSave = () => {
    if (!exceptionCode.trim() || !exceptionName.trim()) return;
    onSave({
      exceptionCode: exceptionCode.toUpperCase().trim(),
      exceptionName: exceptionName.trim(),
      severity,
      slaMinutes: Number(slaMinutes) || 120,
      defaultRoleCode,
      escalationRoleCode,
      placesHoldTypeCode: placesHoldTypeCode || undefined,
      supervisorClose,
      isActive: true,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Add exception type"
      saveLabel="Create exception type"
      perm="admin.config.manage"
      reason="Configure ownership, SLA, and escalation path for terminal incidents."
      onSave={handleSave}
    >
      <div className="form-grid">
        <Field label="Exception code" hint="Unique identifier (e.g. DOC_MISSING)">
          <Input
            value={exceptionCode}
            onChange={(e) => setExceptionCode(e.target.value)}
            placeholder="e.g. DOC_MISSING"
            autoFocus
          />
        </Field>
        <Field label="Exception name">
          <Input
            value={exceptionName}
            onChange={(e) => setExceptionName(e.target.value)}
            placeholder="e.g. Missing Customs Release Document"
          />
        </Field>
        <Field label="Severity">
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            options={[
              ['CRITICAL', 'Critical'],
              ['HIGH', 'High'],
              ['MEDIUM', 'Medium'],
              ['LOW', 'Low'],
            ]}
          />
        </Field>
        <Field label="SLA (minutes)" hint={hrs(slaMinutes)}>
          <Input
            type="number"
            value={slaMinutes}
            onChange={(e) => setSlaMinutes(Number(e.target.value))}
          />
        </Field>
        <Field label="Owner role">
          <Select
            value={defaultRoleCode}
            onChange={(e) => setDefaultRoleCode(e.target.value)}
            options={roleChoices}
          />
        </Field>
        <Field label="Escalates to">
          <Select
            value={escalationRoleCode}
            onChange={(e) => setEscalationRoleCode(e.target.value)}
            options={roleChoices}
          />
        </Field>
        <Field label="Places hold" hint="Automatically place a hold when this exception is logged">
          <Select
            value={placesHoldTypeCode ?? ''}
            onChange={(e) => setPlacesHoldTypeCode(e.target.value || undefined)}
            options={[
              ['', 'None'],
              ...holds.map((h) => [h.holdCode, `${h.holdName} (${h.holdCode})`] as [string, string]),
            ]}
          />
        </Field>
      </div>
      <Check
        label="Only a supervisor can close it"
        checked={supervisorClose}
        onChange={(e) => setSupervisorClose(e.target.checked)}
      />
    </EditDrawer>
  );
}

