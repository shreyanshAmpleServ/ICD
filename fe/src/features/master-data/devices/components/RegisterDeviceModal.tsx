import { useState, useEffect } from 'react';
import { Field, Input, Select } from '@/ds/components';
import { SITES } from '@/app/session';
import { EditDrawer, useDynamicSites } from '../../shared/AdminKit';

const KIND: Record<string, string> = {
  TABLET: 'Gate tablet',
  PHONE: 'Handheld',
  GATE_PC: 'Gate agent PC',
  KIOSK: 'Kiosk',
};

export interface RegisterDeviceData {
  deviceName: string;
  deviceKind: string;
  siteId: number;
  assignedTo: string;
  deviceCode?: string;
}

export function RegisterDeviceModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: RegisterDeviceData) => void;
}) {
  const { options: siteOptions } = useDynamicSites();
  const [deviceName, setDeviceName] = useState('');
  const [deviceKind, setDeviceKind] = useState('TABLET');
  const [siteId, setSiteId] = useState<number>(1);
  const [assignedTo, setAssignedTo] = useState('');
  const [deviceCode, setDeviceCode] = useState('');

  // Auto-generate a device code suggestion when kind or site changes if not manually edited
  useEffect(() => {
    if (open) {
      const prefix = deviceKind === 'TABLET' ? 'TAB' : deviceKind === 'PHONE' ? 'HH' : deviceKind === 'KIOSK' ? 'KIOSK' : 'GA';
      const siteCode = siteId === 2 ? 'DAR2' : 'DAR1';
      const randomSuffix = (Math.floor(Math.random() * 80) + 10).toString().padStart(2, '0');
      setDeviceCode(`${prefix}-${siteCode}-${randomSuffix}`);
      if (!deviceName) {
        setDeviceName(`${KIND[deviceKind]} ${randomSuffix}`);
      }
    }
  }, [open, deviceKind, siteId]);

  const handleSave = () => {
    if (!deviceName.trim()) return;
    onSave({
      deviceName: deviceName.trim(),
      deviceKind,
      siteId,
      assignedTo: assignedTo.trim() || deviceName.trim(),
      deviceCode: deviceCode.trim() || undefined,
    });
    setDeviceName('');
    setAssignedTo('');
    onClose();
  };

  if (!open) return null;

  const siteChoices = siteOptions.length > 0 ? siteOptions : SITES.map((s) => [String(s.siteId), s.siteCode] as [string, string]);

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Register a device"
      saveLabel="Create pairing code"
      perm="admin.device.manage"
      onSave={handleSave}
    >
      <div className="form-grid">
        <Field label="Name" required hint="Display name for device list and logs">
          <Input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. Gate tablet, In 3"
            autoFocus
          />
        </Field>
        <Field label="Kind">
          <Select
            value={deviceKind}
            onChange={(e) => setDeviceKind(e.target.value)}
            options={Object.entries(KIND)}
          />
        </Field>
        <Field label="Site">
          <Select
            value={String(siteId)}
            onChange={(e) => setSiteId(Number(e.target.value))}
            options={siteChoices}
          />
        </Field>
        <Field label="Device code" hint="Unique identifier assigned to the hardware">
          <Input
            value={deviceCode}
            onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
            placeholder="e.g. TAB-DAR1-05"
          />
        </Field>
        <Field label="Where / who" hint="Physical location or assigned operator">
          <Input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="e.g. Outer gate In 3"
          />
        </Field>
      </div>
      <p className="small muted">
        Open NG ICD on the device and enter the pairing code. The device creates its own key; the private key never leaves it.
      </p>
    </EditDrawer>
  );
}
