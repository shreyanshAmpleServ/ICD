import { Field, Input, Select } from '@/ds/components';
import { SITES } from '@/app/session';
import { EditDrawer } from '../../shared/AdminKit';

const KIND: Record<string, string> = {
  TABLET: 'Gate tablet',
  PHONE: 'Handheld',
  GATE_PC: 'Gate agent PC',
  KIOSK: 'Kiosk',
};

export function RegisterDeviceModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Register a device"
      saveLabel="Create pairing code"
      perm="admin.device.manage"
      onSave={onSave}
    >
      <div className="form-grid">
        <Field label="Name" required>
          <Input placeholder="e.g. Gate tablet, In 3" />
        </Field>
        <Field label="Kind">
          <Select options={Object.entries(KIND)} />
        </Field>
        <Field label="Site">
          <Select options={SITES.map((s) => [String(s.siteId), s.siteCode])} />
        </Field>
        <Field label="Where / who">
          <Input placeholder="e.g. Outer gate In 3" />
        </Field>
      </div>
      <p className="small muted">
        Open NG ICD on the device and enter the pairing code. The device creates its own key; the private key never leaves it.
      </p>
    </EditDrawer>
  );
}
