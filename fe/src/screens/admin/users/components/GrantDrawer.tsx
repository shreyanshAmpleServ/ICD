import { useState } from 'react';
import { Banner, Field, Input, Panel, Select } from '@/ds/components';
import { ROLES, type Role } from '@/app/roles';
import { SITES } from '@/app/session';
import { INACTIVE_ROLES, type User } from '@/mock/admin';
import { EditDrawer, GrantChip } from '../../shared/AdminKit';

type RG = NonNullable<User['roleGrants']>[number];

interface GrantDrawerProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onGrant: (g: RG) => void;
  roles?: Role[];
}

export function GrantDrawer({ open, onClose, user, onGrant, roles = ROLES }: GrantDrawerProps) {
  const held = (user.roleGrants ?? []).map((g) => g.roleCode);
  const availableRoles = roles.filter((x) => !x.external);
  const [role, setRole] = useState(
    () => availableRoles.find((x) => !INACTIVE_ROLES.includes(x.code) && !held.includes(x.code))?.code ?? 'GATE_OFFICER'
  );
  const [site, setSite] = useState('1');
  const [to, setTo] = useState('');
  const restricted = role === 'CUSTOMS_OFFICER';
  const inactive = INACTIVE_ROLES.includes(role);
  const sod = (held.includes('BILLING_OFFICER') && role === 'CASHIER') || (held.includes('CASHIER') && role === 'BILLING_OFFICER');
  const dup = (user.roleGrants ?? []).some((g) => g.roleCode === role && String(g.siteId ?? '') === (site === 'ALL' ? '' : site));
  const r = roles.find((x) => x.code === role) || roles[0];

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title={`Grant a role to ${user.userName}`}
      saveLabel="Grant role"
      perm="admin.users.manage"
      disabled={dup || (inactive && !restricted)}
      reason={restricted ? 'Name the customs station and the letter that asked for this access.' : undefined}
      onSave={() =>
        onGrant({
          roleCode: role,
          siteId: site === 'ALL' ? null : Number(site),
          validFrom: todayStr,
          validTo: to || undefined,
          grantedBy: 'Ashok K. (admin)',
        })
      }
    >
      <div className="form-grid">
        <Field label="Role" required>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={availableRoles.map((x) => [x.code, `${x.name}${INACTIVE_ROLES.includes(x.code) ? ' (off)' : ''}`])}
          />
        </Field>
        <Field label="Site" required>
          <Select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            options={[
              ['ALL', 'All sites'],
              ...SITES.map((s) => [String(s.siteId), `${s.siteCode} · ${s.siteName}`] as [string, string]),
            ]}
          />
        </Field>
        <Field label="Valid until" hint="Leave empty for indefinite access">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {dup && <Banner tone="stop">{user.userName} already holds this role at this site.</Banner>}
      {restricted && (
        <Banner tone="wait" title="Restricted role, off by default">
          The customs officer role lets an outside officer place and lift customs holds directly. It is switched off for this depot. Granting it switches it on for this person only and is reviewed monthly.
        </Banner>
      )}
      {inactive && !restricted && <Banner tone="stop">This is a portal role. Invite portal users from the customer portal instead.</Banner>}
      {sod && (
        <Banner tone="wait" title="Segregation of duties">
          The same person will both raise invoices and record payments. NG ICD still blocks them from recording payment on an invoice they created.
        </Banner>
      )}

      {r && r.grants && (
        <Panel title={`What ${r.name.toLowerCase()} can do`}>
          <div className="row-wrap">
            {Object.entries(r.grants).map(([p, g]) => (
              <span key={p} className="row" style={{ gap: 4 }}>
                <GrantChip g={g as any} />
                <span className="xs">{p}</span>
              </span>
            ))}
          </div>
        </Panel>
      )}
    </EditDrawer>
  );
}
