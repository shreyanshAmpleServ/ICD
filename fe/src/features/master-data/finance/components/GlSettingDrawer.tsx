import { useState, useEffect } from 'react';
import { Banner, Field, Input } from '@/ds/components';
import { EditDrawer, label } from '../../shared/AdminKit';

interface GlSettingDrawerProps {
  setting: any | null;
  onClose: () => void;
  onSave: (updated: any) => void;
}

export function GlSettingDrawer({ setting, onClose, onSave }: GlSettingDrawerProps) {
  const [glAccount, setGlAccount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (setting) {
      setGlAccount(setting.glAccount || '');
      setDescription(setting.description || '');
    }
  }, [setting]);

  if (!setting) return null;

  const handleSave = () => {
    onSave({
      ...setting,
      glAccount: glAccount.trim(),
      description: description.trim(),
    });
  };

  return (
    <EditDrawer
      open={!!setting}
      onClose={onClose}
      title={`Control account: ${label(setting.settingKey || '')}`}
      saveLabel="Save control account"
      perm="finance.period.close"
      disabled={!glAccount.trim()}
      onSave={handleSave}
    >
      <Banner tone="info" title="General Ledger Control Account">
        Control accounts are automatically posted to by the sub-ledger engine when transactions (invoices, receipts, clearing, FX) are committed.
      </Banner>

      <div className="form-grid" style={{ marginTop: '1rem' }}>
        <Field label="Setting key">
          <Input value={setting.settingKey} readOnly className="adm-code" />
        </Field>
        <Field label="GL account code" required hint="e.g. 1200-00, 2150-00">
          <Input
            value={glAccount}
            onChange={(e) => setGlAccount(e.target.value)}
            placeholder="e.g. 1200-00"
            className="adm-code"
          />
        </Field>
      </div>

      <Field label="Description / Usage notes">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Usage description"
        />
      </Field>
    </EditDrawer>
  );
}

