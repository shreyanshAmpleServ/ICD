import { useState, useEffect } from 'react';
import { User, Shield, CheckCircle2, Mail, Globe, Briefcase, Key, RefreshCw } from 'lucide-react';
import { Button, Drawer, Field, Input, Select, Banner, Pill, StatusPill } from '@/ds/components';
import { useSession, Lang } from '@/app/session';
import { api } from '@/api/client';

export interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  const s = useSession();

  const [name, setName] = useState(s.userName || 'Ashok Kumar');
  const [phone, setPhone] = useState(s.userPhone || '+255 754 000 001');
  const [lang, setLang] = useState<Lang>(s.lang || 'en');
  const [title, setTitle] = useState(s.userTitle || 'Senior Operations Lead');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state whenever drawer opens or session updates
  useEffect(() => {
    if (open) {
      setName(s.userName || 'Ashok Kumar');
      setPhone(s.userPhone || '+255 754 000 001');
      setLang(s.lang || 'en');
      setTitle(s.userTitle || 'Senior Operations Lead');
      setSavedSuccess(false);
      setErrorMsg(null);
    }
  }, [open, s.userName, s.userPhone, s.lang, s.userTitle]);

  const handleSave = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const res = await api.patch<any>('/me', {
        name: name.trim(),
        phone: phone.trim(),
        preferredLanguage: lang,
        title: title.trim(),
      });

      if (res?.success || res?.user) {
        if (s.setUserName) s.setUserName(name.trim());
        if (s.setUserPhone) s.setUserPhone(phone.trim());
        if (s.setLang) s.setLang(lang);
        s.refetchSession();
        setSavedSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg('Failed to update profile.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  const initials =
    (name || 'Ashok Kumar')
      .replace(/[^A-Za-z ]/g, '')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const role = s.roles.find((r) => r.code === s.roleCode);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="row" style={{ alignItems: 'center', gap: 10 }}>
          <User size={18} />
          <span>User Profile & Account Settings</span>
        </div>
      }
      wide
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="xs faint">Changes persist directly to SQL Server app_user</div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading || !name.trim()}
              icon={loading ? <RefreshCw className="spin" size={14} /> : <CheckCircle2 size={14} />}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="stack-lg">
        {savedSuccess && (
          <Banner tone="go" title="Profile updated successfully">
            Your profile changes have been saved to the database.
          </Banner>
        )}

        {errorMsg && (
          <Banner tone="stop" title="Update failed">
            {errorMsg}
          </Banner>
        )}

        {/* Profile Card Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px',
            background: 'var(--bg-subtle, rgba(0,0,0,0.03))',
            borderRadius: '8px',
            border: '1px solid var(--steel)',
          }}
        >
          <span
            className="avatar"
            style={{
              width: 54,
              height: 54,
              fontSize: 20,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initials}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row-wrap" style={{ alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{name}</h2>
              <StatusPill value="ACTIVE" track="physical" />
              <Pill tone="idle">DB User ID: 1</Pill>
            </div>
            <div className="xs muted" style={{ marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span className="row" style={{ alignItems: 'center', gap: 4 }}>
                <Mail size={13} /> {s.userEmail || 'ashok.k@mlimani-icd.example'}
              </span>
              <span className="row" style={{ alignItems: 'center', gap: 4 }}>
                <Key size={13} /> Sub: <code>{s.userSub || 'ng|8101'}</code>
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Editable Personal Details */}
        <div className="panel" style={{ padding: 16 }}>
          <h3 className="row" style={{ alignItems: 'center', gap: 8, marginTop: 0, marginBottom: 12 }}>
            <Briefcase size={16} /> Personal Information
          </h3>
          <div className="form-grid">
            <Field label="Full Name" required hint="Display name used across operations and audit logs">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ashok Kumar" />
            </Field>

            <Field label="Job Title" hint="Designation within ICD operations">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Operations Lead" />
            </Field>

            <Field label="Phone Number" hint="Official contact number for SMS and gate notifications">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 754 000 000" />
            </Field>

            <Field label="Preferred Language" hint="Interface and message notification language">
              <Select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                options={[
                  ['en', 'English (en)'],
                  ['sw', 'Kiswahili (sw)'],
                  ['fr', 'Français (fr)'],
                ]}
              />
            </Field>
          </div>
        </div>

        {/* Section 2: Security & Permissions Overview */}
        <div className="panel" style={{ padding: 16 }}>
          <h3 className="row" style={{ alignItems: 'center', gap: 8, marginTop: 0, marginBottom: 12 }}>
            <Shield size={16} /> Security, Role & Access
          </h3>
          <div className="form-grid">
            <Field label="Primary Active Role">
              <Input value={role?.name || s.userRoleName || 'All Permissions'} disabled />
            </Field>

            <Field label="Operating Site Scope">
              <Input value={`${s.site.siteCode} · ${s.site.siteName}`} disabled />
            </Field>

            <Field label="Multi-Factor Auth (MFA)">
              <div className="row" style={{ alignItems: 'center', gap: 8, marginTop: 6 }}>
                <StatusPill value="ENABLED" track="physical" />
                <span className="xs muted">Enforced by corporate identity policy</span>
              </div>
            </Field>

            <Field label="Authentication Provider">
              <div className="row" style={{ alignItems: 'center', gap: 8, marginTop: 6 }}>
                <StatusPill value="OIDC_NG" track="customs" />
                <span className="xs muted">Unified Next-Gen SSO</span>
              </div>
            </Field>
          </div>
        </div>

        {/* Section 3: Assigned Operating Facilities */}
        <div className="panel" style={{ padding: 16 }}>
          <h3 className="row" style={{ alignItems: 'center', gap: 8, marginTop: 0, marginBottom: 12 }}>
            <Globe size={16} /> Authorized Operating Sites
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {s.sites.map((site) => (
              <div
                key={site.siteId}
                style={{
                  padding: 10,
                  border: site.siteId === s.site.siteId ? '2px solid var(--accent, #0284c7)' : '1px solid var(--steel)',
                  borderRadius: 6,
                  background: site.siteId === s.site.siteId ? 'rgba(2, 132, 199, 0.05)' : 'transparent',
                }}
              >
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong className="small">{site.siteCode}</strong>
                  {site.siteId === s.site.siteId && <Pill tone="go">Active</Pill>}
                </div>
                <div className="xs muted" style={{ marginTop: 4 }}>
                  {site.siteName}
                </div>
                <div className="xs faint" style={{ marginTop: 4 }}>
                  {site.facilities?.join(' · ') || 'ICD · CFS'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
