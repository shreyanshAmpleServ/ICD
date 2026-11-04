import { Fragment, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Lock, Plus, Search, ShieldCheck, Users, Zap } from 'lucide-react';
import { Banner, Button, Field, Input, Ms, Panel, SearchInput, Segmented, Select, useToast } from '@/ds/components';
import { ROLES, type Grant, type Role } from '@/app/roles';
import { INACTIVE_ROLES, MODULE_NAME, permissions as seedPermissions, roleLimits } from '@/mock/admin';
import { AuditNote, EditDrawer, GrantChip } from '../../shared/AdminKit';
import { usersApi } from '../api';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { AddRoleModal } from './AddRoleModal';
import { AddPermissionModal } from './AddPermissionModal';

interface MatrixProps {
  roles?: Role[];
  initialRole?: string | null;
  onSelectRoleFilter?: (roleCode: string) => void;
}

export function Matrix({ roles: propRoles, initialRole, onSelectRoleFilter }: MatrixProps) {
  const toast = useToast();
  const session = useSession();
  const { data: apiRoles, refetch: refetchRoles } = useQ(['roles'], () => usersApi.getRoles());
  const { data: apiPerms, refetch: refetchPerms } = useQ(['permissions'], () => usersApi.getPermissions());

  // Modals
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [addPermOpen, setAddPermOpen] = useState(false);

  // Normalize roles list
  const baseRoles = propRoles || (apiRoles && apiRoles.length ? apiRoles : ROLES);
  const [localRoles, setLocalRoles] = useState<Role[]>(baseRoles);

  useEffect(() => {
    if (baseRoles && baseRoles.length > 0) {
      setLocalRoles(
        baseRoles.map((r: any) => ({
          code: r.code || r.roleCode,
          name: r.name || r.roleName,
          external: !!r.external,
          grants: Array.isArray(r.grants)
            ? Object.fromEntries(r.grants.map((k: string) => [k, 'DO']))
            : r.grants || {},
        }))
      );
    }
  }, [baseRoles]);

  // Normalize permissions list
  const rawPerms = apiPerms && apiPerms.length ? apiPerms : seedPermissions;
  const [localPerms, setLocalPerms] = useState<any[]>(rawPerms);

  useEffect(() => {
    if (rawPerms && rawPerms.length > 0) {
      setLocalPerms(
        rawPerms.map((p: any) => ({
          code: p.code || p.permissionCode,
          permissionCode: p.code || p.permissionCode,
          module: p.module || p.moduleCode || 'admin',
          description: p.description || p.code,
          isApproval: !!p.isApproval,
          supportsLimit: !!p.supportsLimit,
          ms: p.ms || 'M0',
        }))
      );
    }
  }, [rawPerms]);

  // Grants state mapping roleCode -> permCode -> Grant
  const [grants, setGrants] = useState<Record<string, Record<string, Grant | undefined>>>(() =>
    Object.fromEntries(localRoles.map((r) => [r.code, { ...r.grants }]))
  );

  useEffect(() => {
    if (localRoles.length > 0) {
      setGrants((prev) => {
        const next: Record<string, Record<string, Grant | undefined>> = {};
        localRoles.forEach((r) => {
          next[r.code] = { ...(r.grants || {}), ...(prev[r.code] || {}) };
        });
        return next;
      });
    }
  }, [localRoles]);

  const [q, setQ] = useState('');
  const [mod, setMod] = useState('all');
  const [col, setCol] = useState<string | null>(initialRole ?? null);
  const [cell, setCell] = useState<{ role: string; perm: string } | null>(null);

  const mods = useMemo(() => [...new Set(localPerms.map((p: any) => p.module))], [localPerms]);
  const perms = localPerms.filter(
    (p: any) =>
      (mod === 'all' || p.module === mod) &&
      (!q || `${p.code} ${p.description}`.toLowerCase().includes(q.toLowerCase()))
  );
  const grouped = mods
    .map((m: any) => [m, perms.filter((p: any) => p.module === m)] as const)
    .filter(([, ps]) => ps.length);

  const selectedRoleObj = col ? localRoles.find((r) => r.code === col) : null;

  // Bulk actions for a role
  const handleBulkRoleGrants = async (roleCode: string, grantType?: Grant) => {
    const role = localRoles.find((r) => r.code === roleCode);
    if (!role) return;

    const newRoleGrants: Record<string, Grant> = {};
    if (grantType) {
      localPerms.forEach((p) => {
        newRoleGrants[p.code] = grantType;
      });
    }

    setGrants((prev) => ({ ...prev, [roleCode]: newRoleGrants }));

    try {
      await usersApi.updateRolePermissions(roleCode, newRoleGrants);
      session.refetchSession();
      toast(
        grantType
          ? `All permissions granted as ${grantType} for ${role.name}`
          : `All permissions cleared for ${role.name}`
      );
    } catch {
      toast('Failed to update role permissions');
    }
  };

  // Bulk actions for a module
  const handleBulkModuleGrants = async (roleCode: string, moduleName: string, grantType?: Grant) => {
    const role = localRoles.find((r) => r.code === roleCode);
    if (!role) return;

    const currentRoleGrants = { ...(grants[roleCode] || {}) };
    const modulePerms = localPerms.filter((p) => p.module === moduleName);

    modulePerms.forEach((p) => {
      if (grantType) {
        currentRoleGrants[p.code] = grantType;
      } else {
        delete currentRoleGrants[p.code];
      }
    });

    setGrants((prev) => ({ ...prev, [roleCode]: currentRoleGrants }));

    try {
      await usersApi.updateRolePermissions(roleCode, currentRoleGrants);
      session.refetchSession();
      toast(
        grantType
          ? `${MODULE_NAME[moduleName] || moduleName} granted as ${grantType} for ${role.name}`
          : `${MODULE_NAME[moduleName] || moduleName} cleared for ${role.name}`
      );
    } catch {
      toast('Failed to update module permissions');
    }
  };

  return (
    <>
      <Panel flush>
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: 10, padding: '10px 14px', alignItems: 'center' }}>
          <div style={{ width: 240, maxWidth: '100%' }}>
            <SearchInput
              icon={<Search />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a permission..."
              aria-label="Find a permission"
            />
          </div>
          <Select
            aria-label="Module"
            value={mod}
            onChange={(e) => setMod(e.target.value)}
            options={[
              ['all', 'All modules'],
              ...mods.map((m: any) => [String(m), MODULE_NAME[String(m)] ?? String(m)] as [string, string]),
            ]}
          />

          <span className="spacer" />

          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <Button
              size="sm"
              icon={<Plus size={14} />}
              perm="admin.roles.manage"
              onClick={() => setAddPermOpen(true)}
            >
              Add permission
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Plus size={14} />}
              perm="admin.roles.manage"
              onClick={() => setAddRoleOpen(true)}
            >
              Add role
            </Button>
          </div>
        </div>

        <div
          style={{
            padding: '8px 16px',
            background: 'var(--brand-soft, #eff6ff)',
            borderBottom: '1px solid var(--steel, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 12,
          }}
        >
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <ShieldCheck size={16} style={{ color: 'var(--brand, #2563eb)' }} />
            <span style={{ fontWeight: 600, color: 'var(--ink, #172a35)' }}>
              Permissions Matrix · Role-Based Access Control (RBAC)
            </span>
            <span className="muted">Click any cell to edit single or bulk permissions</span>
          </div>

          <div className="row-wrap xs muted" style={{ gap: 10, alignItems: 'center' }} aria-label="Legend">
            <span><GrantChip g="DO" /> Full Access</span>
            <span><GrantChip g="VIEW" /> View Only</span>
            <span><GrantChip g="REQ" /> Needs Approval</span>
            <span><GrantChip g="APPR" /> Can Approve</span>
          </div>
        </div>

        {selectedRoleObj && (
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--paper-2, #f8fafc)',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <Users size={16} style={{ color: 'var(--brand)' }} />
              <span className="small">
                <strong>{selectedRoleObj.name}</strong> ({selectedRoleObj.code}) ·{' '}
                <strong style={{ color: 'var(--brand)' }}>
                  {Object.keys(grants[selectedRoleObj.code] || {}).length}
                </strong>{' '}
                active permissions
              </span>
            </div>

            <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="xs muted" style={{ marginRight: 4 }}>Bulk Role Actions:</span>
              <Button
                size="sm"
                variant="primary"
                icon={<Zap size={13} />}
                onClick={() => handleBulkRoleGrants(selectedRoleObj.code, 'DO')}
              >
                Grant ALL (DO)
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkRoleGrants(selectedRoleObj.code, 'VIEW')}
              >
                Grant ALL (VIEW)
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleBulkRoleGrants(selectedRoleObj.code, undefined)}
              >
                Revoke ALL
              </Button>
              {onSelectRoleFilter && (
                <Button
                  size="sm"
                  icon={<ExternalLink size={13} />}
                  onClick={() => onSelectRoleFilter(selectedRoleObj.code)}
                >
                  View users
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="adm-scroll">
          <table className="adm-matrix" aria-label="Permissions by role">
            <thead>
              <tr>
                <th className="rh" style={{ verticalAlign: 'bottom', paddingBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Permission ({perms.length})</span>
                </th>
                {localRoles.map((r) => {
                  const off = INACTIVE_ROLES.includes(r.code);
                  const isCurrentCol = col === r.code;
                  return (
                    <th key={r.code} className={isCurrentCol ? 'colsel' : undefined}>
                      <button
                        className="adm-g-btn"
                        onClick={() => setCol(isCurrentCol ? null : r.code)}
                        title={off ? `${r.name}: switched off for this depot` : `Click to select ${r.name}`}
                        aria-pressed={isCurrentCol}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 2px',
                        }}
                      >
                        <span
                          className="vert"
                          style={{
                            display: 'inline-block',
                            opacity: off ? 0.55 : 1,
                            fontWeight: isCurrentCol ? 700 : 600,
                            color: isCurrentCol ? 'var(--brand)' : 'inherit',
                          }}
                        >
                          {off && '🔒︎ '}
                          {r.name}
                        </span>
                        <span className="xs muted" style={{ fontSize: 10, marginTop: 2, whiteSpace: 'nowrap' }}>
                          {off ? 'Switched off' : `${Object.keys(grants[r.code] || {}).length} active`}
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
                    <th
                      className="rh"
                      colSpan={1}
                      style={{
                        background: 'var(--concrete, #f1f5f9)',
                        padding: '8px 12px',
                        fontWeight: 700,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{MODULE_NAME[String(m)] ?? String(m)} ({ps.length})</span>
                        {selectedRoleObj && (
                          <div className="row" style={{ gap: 4 }}>
                            <Button
                              size="sm"
                              variant="ghost"
                              style={{ height: 22, fontSize: 10, padding: '0 6px' }}
                              onClick={() => handleBulkModuleGrants(selectedRoleObj.code, String(m), 'DO')}
                            >
                              All DO
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              style={{ height: 22, fontSize: 10, padding: '0 6px' }}
                              onClick={() => handleBulkModuleGrants(selectedRoleObj.code, String(m), undefined)}
                            >
                              Clear
                            </Button>
                          </div>
                        )}
                      </div>
                    </th>
                    <td colSpan={localRoles.length} style={{ background: 'var(--concrete, #f1f5f9)' }} />
                  </tr>
                  {ps.map((p: any) => {
                    const permCode = p.code || p.permissionCode;
                    return (
                      <tr key={permCode}>
                        <th className="rh" scope="row" style={{ fontWeight: 400, padding: '6px 12px' }}>
                          <span className="small" style={{ fontWeight: 500, color: 'var(--ink)' }}>
                            {p.description}
                          </span>{' '}
                          {p.ms !== 'M0' && <Ms m={p.ms} />}
                          <div className="adm-code xs" style={{ marginTop: 2, color: 'var(--ink-3)' }}>
                            {permCode}
                            {p.isApproval && ' · approval'}
                          </div>
                        </th>
                        {localRoles.map((r) => {
                          const g = grants[r.code]?.[permCode];
                          const lim = roleLimits[r.code]?.[permCode];
                          const isSelCol = col === r.code;
                          return (
                            <td
                              key={r.code}
                              className={isSelCol ? 'colsel' : undefined}
                              style={{
                                opacity: INACTIVE_ROLES.includes(r.code) ? 0.55 : 1,
                                padding: '4px 6px',
                                textAlign: 'center',
                              }}
                            >
                              <button
                                className="adm-g-btn"
                                onClick={() => setCell({ role: r.code, perm: permCode })}
                                aria-label={`${r.name}, ${permCode}: ${g ?? 'none'}. Click to change`}
                                title={`${r.name} · ${permCode}: ${g ?? 'none'}. Click to configure (single or all)`}
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  transition: 'transform 0.1s ease',
                                }}
                              >
                                <GrantChip g={g as Grant} />
                              </button>
                              {lim !== undefined && <div className="xs faint">≤ {lim.toLocaleString()}</div>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
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

      {/* Cell Drawer for 1-click single permission or bulk "ALL" options */}
      {cell && (
        <CellDrawer
          key={cell.role + cell.perm}
          role={cell.role}
          perm={cell.perm}
          current={grants[cell.role]?.[cell.perm]}
          permissions={localPerms}
          roles={localRoles}
          onClose={() => setCell(null)}
          onSave={(g, scope) => {
            const roleCode = cell.role;
            const permCode = cell.perm;
            const nextGrants = { ...(grants[roleCode] || {}) };
            const targetPerm = localPerms.find((p) => p.code === permCode);
            const targetModule = targetPerm?.module || 'admin';

            if (scope === 'ALL_ROLE') {
              localPerms.forEach((p) => {
                if (g) nextGrants[p.code] = g;
                else delete nextGrants[p.code];
              });
            } else if (scope === 'ALL_MODULE') {
              localPerms.filter((p) => p.module === targetModule).forEach((p) => {
                if (g) nextGrants[p.code] = g;
                else delete nextGrants[p.code];
              });
            } else {
              // SINGLE 1 PERMISSION
              if (g) nextGrants[permCode] = g;
              else delete nextGrants[permCode];
            }

            setGrants((prev) => ({ ...prev, [roleCode]: nextGrants }));
            usersApi.updateRolePermissions(roleCode, nextGrants).catch(() => {});
            session.refetchSession();

            toast(
              scope === 'ALL_ROLE'
                ? `All permissions updated for ${cell.role}`
                : scope === 'ALL_MODULE'
                  ? `All ${MODULE_NAME[targetModule] || targetModule} permissions updated for ${cell.role}`
                  : `Permission ${permCode} set to ${g || 'NONE'} for ${cell.role}`
            );
          }}
        />
      )}

      {/* Add Role Drawer */}
      <AddRoleModal
        open={addRoleOpen}
        onClose={() => setAddRoleOpen(false)}
        existingRoles={localRoles}
        onRoleCreated={(newRole) => {
          setLocalRoles((prev) => [...prev, newRole]);
          setGrants((prev) => ({ ...prev, [newRole.code]: { ...newRole.grants } }));
          setCol(newRole.code);
          refetchRoles();
          session.refetchSession();
        }}
      />

      {/* Add Permission Drawer */}
      <AddPermissionModal
        open={addPermOpen}
        onClose={() => setAddPermOpen(false)}
        modules={mods}
        onPermissionCreated={(newPerm) => {
          setLocalPerms((prev) => [...prev, newPerm]);
          refetchPerms();
        }}
      />
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
  onSave: (g: Grant | undefined, scope: 'SINGLE' | 'ALL_MODULE' | 'ALL_ROLE') => void;
}) {
  const [g, setG] = useState<Grant | 'NONE'>(current ?? 'NONE');
  const [scope, setScope] = useState<'SINGLE' | 'ALL_MODULE' | 'ALL_ROLE'>('SINGLE');

  const p = permissions.find((x) => x.code === perm) || {
    code: perm,
    description: perm,
    module: 'admin',
    isApproval: false,
    supportsLimit: false,
  };
  const rName = roles.find((r) => r.code === role)?.name ?? role;
  const moduleName = MODULE_NAME[p.module] || p.module;

  const opts: { id: Grant | 'NONE'; label: string }[] = [
    { id: 'NONE', label: 'None' },
    { id: 'VIEW', label: 'View' },
    { id: 'DO', label: 'Do' },
    ...(p.isApproval
      ? [
          { id: 'REQ' as const, label: 'Request' },
          { id: 'APPR' as const, label: 'Approve' },
        ]
      : []),
  ];

  return (
    <EditDrawer
      open
      onClose={onClose}
      title={`${rName} · ${perm}`}
      saveLabel={
        scope === 'ALL_ROLE'
          ? `Apply to ALL permissions for ${rName}`
          : scope === 'ALL_MODULE'
            ? `Apply to ALL in ${moduleName}`
            : 'Change this permission'
      }
      perm="admin.roles.manage"
      reason="Roles apply to everyone who holds them."
      disabled={g === (current ?? 'NONE') && scope === 'SINGLE'}
      onSave={() => onSave(g === 'NONE' ? undefined : g, scope)}
    >
      <p className="small" style={{ fontWeight: 500, color: 'var(--ink)' }}>
        {p.description}
      </p>

      {/* Grant Level Choice */}
      <Field label="Grant level">
        <Segmented value={g} onChange={setG} options={opts} />
      </Field>

      {/* Scope Choice: Particular 1 permission vs All in Module vs All for Role */}
      <Field label="Apply to scope" hint="Choose whether to change only this 1 permission or apply in bulk">
        <Segmented<'SINGLE' | 'ALL_MODULE' | 'ALL_ROLE'>
          value={scope}
          onChange={setScope}
          options={[
            { id: 'SINGLE', label: `Only this 1 (${p.code})` },
            { id: 'ALL_MODULE', label: `All in ${moduleName}` },
            { id: 'ALL_ROLE', label: `ALL for ${rName}` },
          ]}
        />
      </Field>

      {scope === 'ALL_ROLE' && (
        <Banner tone="info" title="Bulk Update across entire role">
          This will assign <strong>{g}</strong> to <strong>ALL {permissions.length} permissions</strong> for the <strong>{rName}</strong> role.
        </Banner>
      )}

      {scope === 'ALL_MODULE' && (
        <Banner tone="info" title={`Bulk Update across ${moduleName}`}>
          This will assign <strong>{g}</strong> to all permissions in the <strong>{moduleName}</strong> module for <strong>{rName}</strong>.
        </Banner>
      )}

      {p.supportsLimit && (g === 'APPR' || g === 'DO') && scope === 'SINGLE' && (
        <Field label="Approval limit (USD)" hint="Above this amount the request goes to the next level">
          <Input type="number" defaultValue={roleLimits[role]?.[perm] ?? ''} />
        </Field>
      )}

      {g === 'REQ' && (
        <Banner tone="info">Holders can start the action; it becomes an approval request.</Banner>
      )}

      <p className="xs faint" style={{ marginTop: 8 }}>
        Role changes apply to all users assigned to {rName}.
      </p>
    </EditDrawer>
  );
}
