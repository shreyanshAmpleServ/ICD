import { Check, Field, Input, Select } from '@/ds/components';
import { ROLES } from '@/app/roles';
import { EditDrawer, hrs } from '../../shared/AdminKit';
import type { exceptionTypes as seedExc } from '@/mock/admin';

type Exc = (typeof seedExc)[number];

interface ExceptionDrawerProps {
  exc: Exc | null;
  onClose: () => void;
  onSave: () => void;
  setExc: React.Dispatch<React.SetStateAction<Exc | null>>;
}

export function ExceptionDrawer({ exc, onClose, onSave, setExc }: ExceptionDrawerProps) {
  if (!exc) return null;

  return (
    <EditDrawer
      open={!!exc}
      onClose={onClose}
      title={exc.exceptionName}
      saveLabel="Save exception type"
      perm="admin.config.manage"
      onSave={onSave}
    >
      <div className="form-grid">
        <Field label="Severity">
          <Select
            value={exc.severity}
            onChange={(e) => setExc({ ...exc, severity: e.target.value as Exc['severity'] })}
            options={[['CRITICAL', 'Critical'], ['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']]}
          />
        </Field>
        <Field label="SLA (minutes)" hint={hrs(exc.slaMinutes)}>
          <Input type="number" value={exc.slaMinutes} onChange={(e) => setExc({ ...exc, slaMinutes: Number(e.target.value) })} />
        </Field>
        <Field label="Owner role">
          <Select
            value={exc.defaultRoleCode ?? ''}
            onChange={(e) => setExc({ ...exc, defaultRoleCode: e.target.value })}
            options={ROLES.filter((r) => !r.external).map((r) => [r.code, r.name])}
          />
        </Field>
        <Field label="Escalates to">
          <Select
            value={exc.escalationRoleCode ?? ''}
            onChange={(e) => setExc({ ...exc, escalationRoleCode: e.target.value })}
            options={ROLES.filter((r) => !r.external).map((r) => [r.code, r.name])}
          />
        </Field>
      </div>
      <Check label="Only a supervisor can close it" checked={!!exc.supervisorClose} onChange={(e) => setExc({ ...exc, supervisorClose: e.target.checked })} />
    </EditDrawer>
  );
}
