import { useState } from 'react';
import { Banner, Field, Input, Segmented, Select } from '@/ds/components';
import { EditDrawer, useDynamicRoles, useDynamicSites } from '../../shared/AdminKit';
import { ROLES } from '@/app/roles';
import { SITES } from '@/app/session';
import type { CreateUserData } from '../api';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateUserData) => void;
}

export function AddUserModal({ open, onClose, onSave }: AddUserModalProps) {
  const { options: roleOptions } = useDynamicRoles();
  const { options: siteOptions } = useDynamicSites();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [mobile, setMobile] = useState('');
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [twoStep, setTwoStep] = useState<'REQ' | 'OPT'>('REQ');
  const [roleCode, setRoleCode] = useState('NONE');
  const [siteId, setSiteId] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setTitle('');
    setMobile('');
    setLanguage('en');
    setTwoStep('REQ');
    setRoleCode('NONE');
    setSiteId('ALL');
    setError(null);
  };

  const handleSave = () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid work email is required');
      return;
    }

    onSave({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      title: title.trim() || 'Operations Staff',
      mobile: mobile.trim() || undefined,
      preferredLanguage: language,
      mfaRequired: twoStep === 'REQ',
      roleCode: roleCode !== 'NONE' ? roleCode : undefined,
      siteId: roleCode !== 'NONE' && siteId !== 'ALL' ? Number(siteId) : null,
    });

    resetForm();
    onClose();
  };

  return (
    <EditDrawer
      open={open}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Add user"
      saveLabel="Add user"
      perm="admin.users.manage"
      disabled={!fullName.trim() || !email.trim()}
      onSave={handleSave}
    >
      <Banner tone="info">
        People sign in with their NG identity. Find them in NG by email; if they are not there yet, NG sends an invitation.
      </Banner>

      {error && <Banner tone="stop">{error}</Banner>}

      <div className="form-grid">
        <Field label="Full name" required>
          <Input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Rose Mboya"
            autoFocus
          />
        </Field>
        <Field label="Work Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="name@mlimani-icd.example"
          />
        </Field>
        <Field label="Designation / Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Gate Officer, Yard Planner"
          />
        </Field>
        <Field label="Mobile phone">
          <Input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="+255 7…"
          />
        </Field>
        <Field label="Interface Language">
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'sw')}
            options={[
              ['en', 'English'],
              ['sw', 'Kiswahili'],
            ]}
          />
        </Field>
        <Field label="Initial Role">
          <Select
            value={roleCode}
            onChange={(e) => setRoleCode(e.target.value)}
            options={[
              ['NONE', 'None (grant after user is added)'],
              ...(roleOptions.length > 0 ? roleOptions : ROLES.filter((r) => !r.external).map((r) => [r.code, r.name] as [string, string])),
            ]}
          />
        </Field>
        {roleCode !== 'NONE' && (
          <Field label="Assign to Site">
            <Select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              options={[
                ['ALL', 'All sites'],
                ...(siteOptions.length > 0 ? siteOptions : SITES.map((s) => [String(s.siteId), `${s.siteCode} · ${s.siteName}`] as [string, string])),
              ]}
            />
          </Field>
        )}
      </div>

      <Field label="Two-step sign-in (MFA)">
        <Segmented
          value={twoStep}
          onChange={(v) => setTwoStep(v as 'REQ' | 'OPT')}
          options={[
            { id: 'REQ', label: 'Required (Recommended)' },
            { id: 'OPT', label: 'Not required' },
          ]}
        />
      </Field>
      <p className="xs faint">
        Users requiring two-step sign-in must confirm their active facility & role upon sign-in. Additional roles can be granted or revoked at any time.
      </p>
    </EditDrawer>
  );
}
