import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Banner, Button, Check, Drawer, Field, Input, useToast } from '@/ds/components';
import { partiesApi } from '../api';

const AVAILABLE_ROLES: { id: string; label: string }[] = [
  { id: 'CUSTOMER', label: 'Customer' },
  { id: 'CONSIGNEE', label: 'Consignee' },
  { id: 'CLEARING_AGENT', label: 'Clearing agent' },
  { id: 'TRANSPORTER', label: 'Transporter' },
  { id: 'SHIPPING_LINE', label: 'Shipping line' },
];

export function AddProvisionalPartyDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (party: any) => void;
}) {
  const toast = useToast();
  const [partyName, setPartyName] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [roles, setRoles] = useState<string[]>(['CUSTOMER']);
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Dar es Salaam');
  const [countryCode, setCountryCode] = useState('TZ');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const toggleRole = (r: string) => {
    if (roles.includes(r)) {
      if (roles.length > 1) {
        setRoles(roles.filter((x) => x !== r));
      }
    } else {
      setRoles([...roles, r]);
    }
  };

  const handleCreate = async () => {
    if (!partyName.trim()) {
      setError('Party name is required.');
      return;
    }
    if (roles.length === 0) {
      setError('At least one role must be selected.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await partiesApi.createProvisional({
        partyName: partyName.trim(),
        partyCode: partyCode.trim() || undefined,
        roles,
        taxId: taxId.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || 'Dar es Salaam',
        countryCode: countryCode.trim().toUpperCase() || 'TZ',
      });

      toast('Provisional party created successfully');
      onCreated(res);
      onClose();
    } catch (err: any) {
      console.error('[AddProvisionalPartyDrawer] Create failed:', err);
      setError(err?.message || 'Failed to create provisional party. Please check details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Add provisional party"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Plus />}
            disabled={!partyName.trim() || roles.length === 0 || submitting}
            loading={submitting}
            perm="masters.local.edit"
            onClick={handleCreate}
          >
            Create provisional party
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        {error && <Banner tone="stop">{error}</Banner>}

        <Banner tone="info">
          Provisional parties are created locally when operational records arrive before the official master record is synced from the core ERP. They can later be matched to an NG record.
        </Banner>

        <Field label="Party name" hint="Official or trading name" required>
          <Input
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="e.g. Acme Logistics Ltd"
            autoFocus
          />
        </Field>

        <Field label="Party code" hint="Leave blank to auto-generate a PROV-... code">
          <Input
            value={partyCode}
            onChange={(e) => setPartyCode(e.target.value)}
            placeholder="e.g. PROV-00123"
          />
        </Field>

        <Field label="Roles" hint="Select all operational roles that apply" required>
          <div className="row-wrap" style={{ gap: 12, marginTop: 4 }}>
            {AVAILABLE_ROLES.map((r) => (
              <Check
                key={r.id}
                label={r.label}
                checked={roles.includes(r.id)}
                onChange={() => toggleRole(r.id)}
              />
            ))}
          </div>
        </Field>

        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="TIN / Tax ID" hint="Optional tax registration number">
              <Input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. 100-200-300"
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="City">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dar es Salaam"
              />
            </Field>
          </div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="Phone number">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255 ..."
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Email address">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operations@party.com"
              />
            </Field>
          </div>
        </div>

        <Field label="Country code">
          <Input
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            placeholder="TZ"
            maxLength={2}
            style={{ width: 120 }}
          />
        </Field>
      </div>
    </Drawer>
  );
}
