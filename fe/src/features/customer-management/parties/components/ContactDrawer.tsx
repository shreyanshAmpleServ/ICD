import { useState } from 'react';
import { Button, Check, Drawer, Field, Input, Segmented } from '@/ds/components';
import { type contactsOf } from '@/mock/insight';

type Contact = ReturnType<typeof contactsOf>[number];

export function ContactDrawer({
  c,
  onClose,
  onSave,
}: {
  c: Contact | null;
  onClose: () => void;
  onSave: (c: Contact) => void;
}) {
  const [d, setD] = useState<Contact | null>(null);
  const cur = d && c && d.partyContactId === c.partyContactId ? d : c;
  if (!cur) return null;
  const set = (patch: Partial<Contact>) => setD({ ...cur, ...patch });
  const noEmail = cur.notifyEmail && !cur.email;

  return (
    <Drawer
      open
      onClose={() => {
        setD(null);
        onClose();
      }}
      title={`Edit ${cur.contactName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!!noEmail}
            perm="masters.local.edit"
            onClick={() => {
              onSave(cur);
              setD(null);
            }}
          >
            Save contact
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <div className="form-grid">
          <Field label="Name" required>
            <Input value={cur.contactName} onChange={(e) => set({ contactName: e.target.value })} />
          </Field>
          <Field label="Job title">
            <Input value={cur.jobTitle ?? ''} onChange={(e) => set({ jobTitle: e.target.value })} />
          </Field>
          <Field label="Mobile">
            <Input inputMode="tel" value={cur.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Email" error={noEmail ? 'Add an email or turn off email messages' : undefined}>
            <Input type="email" value={cur.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
          </Field>
        </div>
        <Field label="Send messages by">
          <div className="stack" style={{ gap: 6 }}>
            <Check label="Email" checked={!!cur.notifyEmail} onChange={(e) => set({ notifyEmail: e.target.checked })} />
            <Check label="SMS" checked={!!cur.notifySms} onChange={(e) => set({ notifySms: e.target.checked })} />
            <Check label="WhatsApp" checked={!!cur.notifyWhatsapp} onChange={(e) => set({ notifyWhatsapp: e.target.checked })} />
          </div>
        </Field>
        <Field label="Language for messages">
          <Segmented
            label="Language"
            value={cur.preferredLanguage ?? 'en'}
            onChange={(v) => set({ preferredLanguage: v })}
            options={[
              { id: 'en', label: 'English' },
              { id: 'sw', label: 'Kiswahili' },
            ]}
          />
        </Field>
        <Check
          label="Main contact for this party"
          checked={!!cur.isPrimary}
          onChange={(e) => set({ isPrimary: e.target.checked })}
        />
      </div>
    </Drawer>
  );
}
