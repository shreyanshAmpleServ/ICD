import { Banner, Button, Field, Input, Segmented } from '@/ds/components';
import { Settings2 } from 'lucide-react';
import { integrations as seedInt } from '@/mock/admin';
import { EditDrawer } from '../../shared/AdminKit';

type Int = (typeof seedInt)[number];
const MODE: Record<string, string> = {
  MANUAL: 'Manual: officer types, reads are shown as hints',
  ASSISTED: 'Assisted: reads fill the form, officer confirms',
  AUTOMATIC: 'Automatic: reads pass the checkpoint unless a check fails',
};

export function IntegrationDrawer({
  cfg,
  onClose,
  onChange,
  onSave,
  onTestRead,
}: {
  cfg: Int;
  onClose: () => void;
  onChange: (i: Int) => void;
  onSave: () => void;
  onTestRead: () => void;
}) {
  return (
    <EditDrawer
      open
      onClose={onClose}
      title={`${cfg.vendor} ${cfg.model} · ${cfg.lane}`}
      saveLabel="Save integration"
      perm="device.configure"
      onSave={onSave}
    >
      <Field label="Lane mode" hint={MODE[cfg.laneMode ?? 'ASSISTED']}>
        <Segmented
          value={cfg.laneMode ?? 'ASSISTED'}
          onChange={(m) => onChange({ ...cfg, laneMode: m })}
          options={[
            { id: 'MANUAL', label: 'Manual' },
            { id: 'ASSISTED', label: 'Assisted' },
            { id: 'AUTOMATIC', label: 'Automatic' },
          ]}
        />
      </Field>
      {cfg.laneMode === 'AUTOMATIC' && cfg.matchPct < 95 && (
        <Banner tone="stop" title={`Match rate is ${cfg.matchPct}%`}>
          Automatic mode would let wrong reads through. Keep it assisted.
        </Banner>
      )}
      <Field label="Connection" hint="Stored in the secret vault; not shown here">
        <Input value="••••••••" disabled readOnly />
      </Field>
      <Button icon={<Settings2 />} perm="device.configure" onClick={onTestRead}>
        Send a test read
      </Button>
    </EditDrawer>
  );
}
