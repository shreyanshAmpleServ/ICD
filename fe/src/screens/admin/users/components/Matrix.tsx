import { Fragment, useMemo, useState } from 'react';
import { ExternalLink, Lock, Search, Users } from 'lucide-react';
import { Banner, Button, Field, Input, Ms, Panel, SearchInput, Segmented, Select, useToast } from '@/ds/components';
import { ROLES, type Grant, type Role } from '@/app/roles';
import { INACTIVE_ROLES, MODULE_NAME, permissions as seedPermissions, roleLimits } from '@/mock/admin';
import { AuditNote, EditDrawer, GrantChip } from '../../shared/AdminKit';
import { usersApi } from '../api';
import { useQ } from '@/api/query';

interface MatrixProps {
  roles?: Role[];
  initialRole?: string | null;
  onSelectRoleFilter?: (roleCode: string) => void;
}

export function Matrix({ roles: propRoles, initialRole, onSelectRoleFilter }: MatrixProps) {
  const toast = useToast();
  const { data: apiRoles } = useQ(['roles'], () => usersApi.getRoles());
  const { data: apiPerms } = useQ(['permissions'], () => usersApi.getPermissions());

  const roles = propRoles || (apiRoles && apiRoles.length ? apiRoles : ROLES);
  const permissions: any[] = (apiPerms && apiPerms.length ? apiPerms : seedPermissions);

  const [grants, setGrants] = useState<Record<string, Record<string, Grant | undefined>>>(() =>
    Object.fromEntries(roles.map((r) => [r.code, { ...r.grants }]))
  );

  const [q, setQ] = useState('');
  const [mod, setMod] = useState('all');
  const [col, setCol] = useState<string | null>(initialRole ?? null);
  const [cell, setCell] = useState<{ role: string; perm: string } | null>(null);

  const mods = useMemo(() => [...new Set(permissions.map((p: any) => p.module))], [permissions]);
  const perms = permissions.filter(
    (p: any) =>
      (mod === 'all' || p.module === mod) &&
      (!q || `${p.code} ${p.description}`.toLowerCase().includes(q.toLowerCase()))
  );
  const grouped = mods.map((m: any) => [m, perms.filter((p: any) => p.module === m)] as const).filter(([, ps]) => ps.length);

  const selectedRoleObj = col ? roles.find((r) => r.code === col) : null;

  return (
    <>
      <Panel flush>
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div style={{ width: 260, maxWidth: '100%' }}>
            <SearchInput
              icon={<Search />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a permission"
              aria-label="Find a permission"
            />
          </div>
          <Select
            aria-label="Module"
            value={mod}
            onChange={(e) => setMod(e.target.value)}
            options={[['all', 'All modules'], ...mods.map((m: any) => [String(m), MODULE_NAME[String(m)] ?? String(m)] as [string, string])]}
          />
          <span className="spacer" />
          <span className="row-wrap xs muted" aria-label="Legend">
            <GrantChip g="DO" /> do it <GrantChip g="REQ" /> request (approval) <GrantChip g="APPR" /> approve <GrantChip g="VIEW" /> view
          </span>
        </div>

        {selectedRoleObj && (
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--panel-alt-bg, #f8fafc)',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div className="row" style={{ gap: 8 }}>
              <Users size={16} />
              <span className="small">
                <strong>{selectedRoleObj.name}</strong> ({selectedRoleObj.code}) ·{' '}
                {Object.keys(grants[selectedRoleObj.code] || {}).length} permissions mapped
              </span>
            </div>
            {onSelectRoleFilter && (
              <Button
                size="sm"
                variant="primary"
                icon={<ExternalLink size={14} />}
                onClick={() => onSelectRoleFilter(selectedRoleObj.code)}
              >
                View users with this role
              </Button>
            )}
          </div>
        )}

        <div className="adm-scroll">
          <table className="adm-matrix" aria-label="Permissions by role">
            <thead>
              <tr>
                <th className="rh">Permission</th>
                {roles.map((r) => {
                  const off = INACTIVE_ROLES.includes(r.code);
                  return (
                    <th key={r.code} className={col === r.code ? 'colsel' : undefined}>
                      <button
                        className="adm-g-btn"
                        onClick={() => setCol(col === r.code ? null : r.code)}
                        title={off ? `${r.name}: switched off for this depot` : r.name}
                        aria-pressed={col === r.code}
                      >
                        <span className="vert" style={{ display: 'inline-block', opacity: off ? 0.55 : 1 }}>
                          {off && '🔒︎ '}
                          {r.name}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([m, ps]) => (
                <Fragment key={String(m)}>
                  <tr className="grp">
                    <th className="rh" colSpan={1}>
                      {MODULE_NAME[String(m)] ?? String(m)}
                    </th>
                    <td colSpan={roles.length} />
                  </tr>
                  {ps.map((p: any) => (
                    <tr key={p.code}>
                      <th className="rh" scope="row" style={{ fontWeight: 400 }}>
                        <span className="small">{p.description}</span> {p.ms !== 'M0' && <Ms m={p.ms} />}
                        <div className="adm-code xs">
                          {p.code}
                          {p.isApproval && ' · approval'}
                        </div>
                      </th>
                      {roles.map((r) => {
                        const g = grants[r.code]?.[p.code];
                        const lim = roleLimits[r.code]?.[p.code];
                        return (
                          <td
                            key={r.code}
                            className={col === r.code ? 'colsel' : undefined}
                            style={{ opacity: INACTIVE_ROLES.includes(r.code) ? 0.55 : 1 }}
                          >
                            <button
                              className="adm-g-btn"
                              onClick={() => setCell({ role: r.code, perm: p.code })}
                              aria-label={`${r.name}, ${p.code}: ${g ?? 'none'}. Change`}
                            >
                              <GrantChip g={g as Grant} />
                            </button>
                            {lim !== undefined && <div className="xs faint">≤ {lim.toLocaleString()}</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="row-wrap small muted" style={{ marginTop: 8 }}>
        <Lock size={14} />
        Customs officer (restricted) and portal roles are seeded switched off; switch them on per depot. Numbers under a cell are approval limits in USD.
      </div>
      <AuditNote>Role changes take effect at each user's next request and are logged in the audit trail.</AuditNote>
      {cell && (
        <CellDrawer
          key={cell.role + cell.perm}
          role={cell.role}
          perm={cell.perm}
          current={grants[cell.role]?.[cell.perm]}
          permissions={permissions}
          roles={roles}
          onClose={() => setCell(null)}
          onSave={(g) => {
            const nextRoleGrants = { ...grants[cell.role], [cell.perm]: g };
            setGrants((x) => ({ ...x, [cell.role]: nextRoleGrants }));
            usersApi.updateRolePermissions(cell.role, nextRoleGrants).catch(() => {});
            toast('Role permission changed and saved');
          }}
        />
      )}
    </>
  );
}

function CellDrawer({
  role,
  perm,
  current,
  permissions,
  roles,
  onClose,
  onSave,
}: {
  role: string;
  perm: string;
  current?: Grant;
  permissions: any[];
  roles: Role[];
  onClose: () => void;
  onSave: (g: Grant | undefined) => void;
}) {
  const [g, setG] = useState<Grant | 'NONE'>(current ?? 'NONE');
  const p = permissions.find((x) => x.code === perm) || { code: perm, description: perm, isApproval: false, supportsLimit: false };
  const rName = roles.find((r) => r.code === role)?.name ?? role;
  const opts: { id: Grant | 'NONE'; label: string }[] = [
    { id: 'NONE', label: 'None' },
    { id: 'VIEW', label: 'View' },
    { id: 'DO', label: 'Do' },
    ...(p.isApproval ? [{ id: 'REQ' as const, label: 'Request' }, { id: 'APPR' as const, label: 'Approve' }] : []),
  ];

  return (
    <EditDrawer
      open
      onClose={onClose}
      title={`${rName} · ${perm}`}
      saveLabel="Change permission"
      perm="admin.roles.manage"
      reason="Roles apply to everyone who holds them."
      disabled={g === (current ?? 'NONE')}
      onSave={() => onSave(g === 'NONE' ? undefined : g)}
    >
      <p className="small">{p.description}</p>
      <Field label="Grant">
        <Segmented value={g} onChange={setG} options={opts} />
      </Field>
      {p.supportsLimit && (g === 'APPR' || g === 'DO') && (
        <Field label="Approval limit (USD)" hint="Above this amount the request goes to the next level">
          <Input type="number" defaultValue={roleLimits[role]?.[perm] ?? ''} />
        </Field>
      )}
      {g === 'REQ' && <Banner tone="info">Holders can start the action; it becomes an approval request.</Banner>}
      <p className="xs faint">
        {rName} is applied across all active users assigned to this role.
      </p>
    </EditDrawer>
  );
}
