import { useEffect, useState } from 'react';
import {
  ExternalLink,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import {
  Banner,
  Button,
  Chips,
  DL,
  DataTable,
  Field,
  Input,
  Panel,
  Pill,
  SearchInput,
  Select,
  Tabs,
  ago,
  fmtD,
  fmtDT,
  useToast,
  NOW,
} from '@/ds/components';
import { ROLES } from '@/app/roles';
import { SITES } from '@/app/session';
import { SRC, type User, delegations as seedDelegations, permissions } from '@/mock/admin';
import { AuditNote, EditDrawer, ListPanel, SetupPage, Split } from '../shared/AdminKit';
import { usersApi, type CreateUserData } from './api';
import { AddUserModal } from './components/AddUserModal';
import { GrantDrawer } from './components/GrantDrawer';
import { DeactivateModal } from './components/DeactivateModal';
import { Matrix } from './components/Matrix';
import { Limits } from './components/Limits';

export { usersApi } from './api';
import { useQ } from '@/api/query';

type Tab = 'users' | 'matrix' | 'limits' | 'delegations';

const siteLabel = (id?: number | null) =>
  id ? SITES.find((s) => s.siteId === id)?.siteCode ?? `Site ${id}` : 'All sites';

export function UsersView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('users');

  // Filter States - directly calling backend API
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [roleFilter, setRoleFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [matrixHighlightRole, setMatrixHighlightRole] = useState<string | null>(null);

  // Debounce search query so API is called smoothly
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load live data from API with reactive query keys
  const {
    data: usersData,
    refetch: refetchUsers,
    isLoading: usersLoading,
  } = useQ(
    ['users', { q: debouncedQ, role: roleFilter, siteId: siteFilter, active: statusFilter }],
    () => usersApi.getUsers({ q: debouncedQ, role: roleFilter, siteId: siteFilter, active: statusFilter })
  );

  const { data: rolesData } = useQ(['roles'], () => usersApi.getRoles());
  const { data: delegationsData, refetch: refetchDelegations } = useQ(['delegations'], () =>
    usersApi.getDelegations()
  );

  const roles = rolesData && rolesData.length ? rolesData : ROLES;
  const users = usersData ?? [];
  const delegations: any[] = delegationsData ?? seedDelegations;

  const roleName = (c: string) => roles.find((r) => r.code === c)?.name ?? c;
  const hasApproval = (code: string) =>
    Object.values(roles.find((r) => r.code === code)?.grants ?? {}).includes('APPR');

  // Selection
  const [sel, setSel] = useState<number | null>(null);

  // Sync selection when users query resolves
  useEffect(() => {
    if (users.length > 0) {
      if (sel === null || !users.some((u) => u.userId === sel)) {
        setSel(users[0].userId!);
      }
    } else {
      setSel(null);
    }
  }, [users, sel]);

  const selectedUser = users.find((u) => u.userId === sel);

  // Modal / Drawer States
  const [grantOpen, setGrantOpen] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [deactOpen, setDeactOpen] = useState(false);
  const [addDelegationOpen, setAddDelegationOpen] = useState(false);

  // Cross-linking: Switch to Matrix and highlight role
  const handleLinkToRoleInMatrix = (code: string) => {
    setMatrixHighlightRole(code);
    setTab('matrix');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' || roleFilter !== 'all' || siteFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setDebouncedQ('');
    setRoleFilter('all');
    setSiteFilter('all');
    setStatusFilter('all');
  };

  // Toggle MFA requirement directly via API
  const handleToggleMfa = async (userId: number, currentMfa: boolean) => {
    try {
      await usersApi.updateUser(userId, { mfaRequired: !currentMfa });
      await refetchUsers();
      toast(currentMfa ? 'Two-step sign-in set to optional' : 'Two-step sign-in now required for user');
    } catch {
      toast('Failed to update MFA settings');
    }
  };

  // Activate user
  const handleActivateUser = async (userId: number) => {
    try {
      await usersApi.activateUser(userId);
      await refetchUsers();
      toast('User reactivated successfully');
    } catch {
      toast('Failed to reactivate user');
    }
  };

  return (
    <SetupPage
      wide
      title="Users & roles"
      ms="M0"
      sub="Who can do what, at which site. Sign-in and passwords are managed in NG."
      sources={[{ table: 'app_user, user_site_role' }, SRC.perms]}
      actions={
        <Button
          variant="primary"
          icon={<UserPlus />}
          perm="admin.users.manage"
          onClick={() => setNewUserOpen(true)}
        >
          Add user
        </Button>
      }
    >
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'users', label: 'Users', count: users.length },
          { id: 'matrix', label: 'Roles and permissions', count: roles.length },
          { id: 'limits', label: 'Approval limits' },
          {
            id: 'delegations',
            label: 'Delegations',
            count: delegations.filter((d: any) => Date.parse(d.validTo) > NOW.getTime()).length,
          },
        ]}
      />

      {tab === 'users' && (
        <Split
          list={
            <ListPanel
              title={
                <div className="row" style={{ justifyContent: 'space-between', width: '100%', gap: 8 }}>
                  <span>People ({users.length})</span>
                  {hasActiveFilters && (
                    <Button size="sm" variant="ghost" icon={<RotateCcw size={12} />} onClick={resetFilters}>
                      Reset
                    </Button>
                  )}
                </div>
              }
              selected={sel}
              onSelect={(id) => setSel(Number(id))}
              filter={
                <div className="stack" style={{ gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                  <SearchInput
                    icon={usersLoading ? <RefreshCw className="spin" size={14} /> : undefined}
                    placeholder="Search name, email, role (API)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Filter users from API"
                  />
                  <div className="row" style={{ justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                    <Chips
                      value={statusFilter}
                      onChange={(v) => setStatusFilter(v as any)}
                      options={[
                        { id: 'active', label: 'Active' },
                        { id: 'inactive', label: 'Inactive' },
                        { id: 'all', label: 'All' },
                      ]}
                    />
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <Select
                        aria-label="Filter by role"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        options={[
                          ['all', 'All Roles'],
                          ...roles.filter((r) => !r.external).map((r) => [r.code, r.name] as [string, string]),
                        ]}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <Select
                        aria-label="Filter by site"
                        value={siteFilter}
                        onChange={(e) => setSiteFilter(e.target.value)}
                        options={[
                          ['all', 'All Sites'],
                          ...SITES.map((s) => [String(s.siteId), s.siteCode] as [string, string]),
                        ]}
                      />
                    </div>
                  </div>
                </div>
              }
              empty={
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <p className="small muted">No users match the current API filters.</p>
                  <Button size="sm" variant="secondary" onClick={resetFilters} style={{ marginTop: 8 }}>
                    Clear all filters
                  </Button>
                </div>
              }
              items={users.map((u) => ({
                id: u.userId!,
                title: u.userName,
                sub: `${u.title} · ${(u.siteCodes || ['All sites']).join(', ')}`,
                lead: !u.isActive ? (
                  <span style={{ opacity: 0.6 }}>
                    <Pill tone="wait">Inactive</Pill>
                  </span>
                ) : undefined,
                aside:
                  !u.mfaRequired && u.roleGrants?.some((g) => hasApproval(g.roleCode)) ? (
                    <KeyRound size={14} style={{ color: 'var(--tone-wait-fg, #d97706)' }} aria-label="MFA off" />
                  ) : undefined,
              }))}
            />
          }
        >
          {selectedUser ? (
            <>
              {!selectedUser.isActive && (
                <Banner tone="info" title="Inactive User">
                  This person cannot sign in to NG ICD. Their past transactions stay preserved in the audit trail.
                </Banner>
              )}
              {selectedUser.isActive &&
                !selectedUser.mfaRequired &&
                selectedUser.roleGrants?.some((g) => hasApproval(g.roleCode)) && (
                  <Banner
                    tone="wait"
                    title="Approver without two-step sign-in"
                    action={
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleToggleMfa(selectedUser.userId!, false)}
                      >
                        Require MFA now
                      </Button>
                    }
                  >
                    This person can approve money or overrides. Company policy strongly recommends two-step sign-in for approvers.
                  </Banner>
                )}

              <Panel
                title={selectedUser.userName}
                sub={`${selectedUser.title} · ${selectedUser.email}`}
                actions={
                  selectedUser.isActive ? (
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<UserMinus />}
                      perm="admin.users.manage"
                      onClick={() => setDeactOpen(true)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<UserCheck />}
                      perm="admin.users.manage"
                      onClick={() => handleActivateUser(selectedUser.userId!)}
                    >
                      Reactivate user
                    </Button>
                  )
                }
              >
                <DL
                  cols
                  items={[
                    [
                      'Identity',
                      selectedUser.isNgUser ? (
                        <Pill key="i" tone="info" icon={<ShieldCheck />}>
                          NG identity linked
                        </Pill>
                      ) : (
                        <Pill key="i">Local account</Pill>
                      ),
                    ],
                    [
                      'Two-step sign-in (MFA)',
                      <span key="m" className="row" style={{ gap: 8, alignItems: 'center' }}>
                        {selectedUser.mfaRequired ? (
                          <Pill tone="go">Required</Pill>
                        ) : (
                          <span className="muted">Not required</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleMfa(selectedUser.userId!, !!selectedUser.mfaRequired)}
                        >
                          {selectedUser.mfaRequired ? 'Set optional' : 'Set required'}
                        </Button>
                      </span>,
                    ],
                    [
                      'Last sign-in',
                      selectedUser.lastLoginAt ? (
                        <span key="l" title={fmtDT(selectedUser.lastLoginAt)}>
                          {ago(selectedUser.lastLoginAt)}
                        </span>
                      ) : (
                        'Never'
                      ),
                    ],
                    ['Language', selectedUser.preferredLanguage === 'sw' ? 'Kiswahili' : 'English'],
                    [
                      'NG subject',
                      <span key="s" className="adm-code">
                        {selectedUser.userSub}
                      </span>,
                    ],
                    ['Sites', (selectedUser.siteCodes || ['All sites']).join(', ')],
                    ['Phone / Mobile', selectedUser.phone || <span key="p" className="muted">Not set</span>],
                  ]}
                />
              </Panel>

              <Panel
                flush
                title="Roles & Authorizations"
                sub="A role can be granted at one site or at all sites, for a limited time if needed"
                actions={
                  <Button
                    size="sm"
                    icon={<Plus />}
                    perm="admin.users.manage"
                    disabled={!selectedUser.isActive}
                    onClick={() => setGrantOpen(true)}
                  >
                    Grant a role
                  </Button>
                }
              >
                <DataTable
                  rows={selectedUser.roleGrants ?? []}
                  rowKey={(g: any) => `${g.roleCode}-${g.siteId ?? 'all'}-${g.validFrom ?? ''}`}
                  empty={
                    <p className="small muted" style={{ padding: 16 }}>
                      No roles granted yet. Click &quot;Grant a role&quot; so this person can work in NG ICD.
                    </p>
                  }
                  cols={[
                    {
                      key: 'r',
                      header: 'Role',
                      render: (g: any) => (
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: 'var(--primary, #0284c7)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          onClick={() => handleLinkToRoleInMatrix(g.roleCode)}
                          title={`View ${roleName(g.roleCode)} in Role Matrix`}
                        >
                          <strong>{roleName(g.roleCode)}</strong>
                          <ExternalLink size={12} style={{ opacity: 0.6 }} />
                        </button>
                      ),
                    },
                    { key: 's', header: 'Site', render: (g: any) => siteLabel(g.siteId) },
                    {
                      key: 'v',
                      header: 'Validity',
                      render: (g: any) => {
                        const ended = g.validTo && Date.parse(g.validTo) < NOW.getTime();
                        return (
                          <span className="small">
                            {fmtD(g.validFrom)} → {g.validTo ? fmtD(g.validTo) : 'Indefinite'}{' '}
                            {ended && <Pill>Ended</Pill>}
                            {g.validTo && !ended && <Pill tone="wait">Temporary</Pill>}
                          </span>
                        );
                      },
                    },
                    {
                      key: 'b',
                      header: 'Granted by',
                      render: (g: any) => <span className="small muted">{g.grantedBy || 'Admin'}</span>,
                    },
                    {
                      key: 'x',
                      header: '',
                      render: (g: any) => (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<X />}
                          perm="admin.users.manage"
                          aria-label={`Remove ${roleName(g.roleCode)}`}
                          onClick={async () => {
                            try {
                              const grantId = g.userRoleId || g.roleCode;
                              await usersApi.revokeRole(selectedUser.userId!, grantId);
                              await refetchUsers();
                              toast('Role grant revoked');
                            } catch {
                              toast('Failed to revoke role grant');
                            }
                          }}
                        >
                          Remove
                        </Button>
                      ),
                    },
                  ]}
                />
              </Panel>
              <AuditNote />
            </>
          ) : (
            <Panel>
              <p className="muted" style={{ padding: 24, textAlign: 'center' }}>
                Select a user on the left to view details and manage permissions.
              </p>
            </Panel>
          )}
        </Split>
      )}

      {tab === 'matrix' && (
        <Matrix
          roles={roles}
          initialRole={matrixHighlightRole}
          onSelectRoleFilter={(code) => {
            setRoleFilter(code);
            setTab('users');
          }}
        />
      )}

      {tab === 'limits' && (
        <Limits
          roles={roles}
          onSelectRoleFilter={(code) => {
            setRoleFilter(code);
            setTab('users');
          }}
        />
      )}

      {tab === 'delegations' && (
        <Panel
          flush
          title="Delegations of Authority"
          sub="An approver can hand an approval permission to someone else for a fixed time, e.g. during leave"
          actions={
            <Button
              size="sm"
              icon={<Plus />}
              perm="admin.users.manage"
              onClick={() => setAddDelegationOpen(true)}
            >
              Add delegation
            </Button>
          }
        >
          <DataTable
            rows={delegations}
            rowKey={(d: any) => d.approvalDelegationId!}
            empty={<p className="small muted" style={{ padding: 16 }}>No delegations currently recorded.</p>}
            cols={[
              { key: 'f', header: 'From', render: (d: any) => <strong>{d.fromName}</strong> },
              { key: 't', header: 'To', render: (d: any) => <strong>{d.toName}</strong> },
              {
                key: 'p',
                header: 'Permission',
                render: (d: any) => <span className="adm-code">{d.permissionCode ?? 'All approvals'}</span>,
              },
              { key: 's', header: 'Site', render: (d: any) => siteLabel(d.siteId) },
              {
                key: 'w',
                header: 'When',
                render: (d: any) => (
                  <span className="small">
                    {fmtDT(d.validFrom)} → {fmtDT(d.validTo)}
                  </span>
                ),
              },
              {
                key: 'st',
                header: 'Status',
                render: (d: any) =>
                  Date.parse(d.validTo) < NOW.getTime() ? (
                    <Pill>Ended</Pill>
                  ) : Date.parse(d.validFrom) > NOW.getTime() ? (
                    <Pill tone="wait">Starts {ago(d.validFrom).replace('-', '')}</Pill>
                  ) : (
                    <Pill tone="go">In effect</Pill>
                  ),
              },
              { key: 'r', header: 'Reason', render: (d: any) => <span className="small muted">{d.reason}</span> },
            ]}
          />
        </Panel>
      )}

      {/* Grant Role Drawer */}
      {selectedUser && (
        <GrantDrawer
          key={selectedUser.userId! + String(grantOpen)}
          open={grantOpen}
          onClose={() => setGrantOpen(false)}
          user={selectedUser}
          roles={roles}
          onGrant={async (g) => {
            try {
              await usersApi.grantRole(selectedUser.userId!, g);
              await refetchUsers();
              toast('Role granted successfully');
              setGrantOpen(false);
            } catch {
              toast('Failed to grant role');
            }
          }}
        />
      )}

      {/* Add User Modal */}
      <AddUserModal
        open={newUserOpen}
        onClose={() => setNewUserOpen(false)}
        onSave={async (userData: CreateUserData) => {
          try {
            const created = await usersApi.createUser(userData);
            await refetchUsers();
            if (created?.userId) {
              setSel(created.userId);
            }
            toast(`User ${userData.fullName} added; invitation sent via NG`);
          } catch {
            toast('Failed to add user');
          }
        }}
      />

      {/* Deactivate User Modal */}
      {selectedUser && (
        <DeactivateModal
          open={deactOpen}
          onClose={() => setDeactOpen(false)}
          user={selectedUser}
          onDeactivate={async (why) => {
            try {
              await usersApi.deactivateUser(selectedUser.userId!, why);
              await refetchUsers();
              toast(`User ${selectedUser.userName} deactivated`);
              setDeactOpen(false);
            } catch {
              toast('Failed to deactivate user');
            }
          }}
        />
      )}

      {/* Add Delegation Drawer */}
      <AddDelegationDrawer
        open={addDelegationOpen}
        onClose={() => setAddDelegationOpen(false)}
        users={users}
        onSave={async (d) => {
          try {
            await usersApi.createDelegation(d);
            await refetchDelegations();
            toast('Delegation created successfully');
            setAddDelegationOpen(false);
          } catch {
            toast('Failed to create delegation');
          }
        }}
      />
    </SetupPage>
  );
}

function AddDelegationDrawer({
  open,
  onClose,
  users,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  users: User[];
  onSave: (data: any) => Promise<void>;
}) {
  const [fromId, setFromId] = useState(users[0]?.userId ? String(users[0].userId) : '1');
  const [toId, setToId] = useState(users[1]?.userId ? String(users[1].userId) : '2');
  const [permCode, setPermCode] = useState('billing.creditnote');
  const [siteId, setSiteId] = useState('ALL');
  const [days, setDays] = useState('7');
  const [reason, setReason] = useState('');

  const fromUser = users.find((u) => String(u.userId) === fromId);
  const toUser = users.find((u) => String(u.userId) === toId);

  const approvalPerms = permissions.filter((p) => p.isApproval);

  const handleSave = async () => {
    const validFrom = new Date().toISOString();
    const validTo = new Date(Date.now() + Number(days) * 86400000).toISOString();

    await onSave({
      fromUserId: Number(fromId),
      toUserId: Number(toId),
      fromName: fromUser?.userName || 'Approver',
      toName: toUser?.userName || 'Delegate',
      permissionCode: permCode === 'ALL' ? null : permCode,
      siteId: siteId === 'ALL' ? null : Number(siteId),
      validFrom,
      validTo,
      reason: reason || 'Temporary leave delegation',
    });
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Add Delegation of Authority"
      saveLabel="Create delegation"
      perm="admin.users.manage"
      disabled={fromId === toId || !reason.trim()}
      onSave={handleSave}
    >
      <div className="form-grid">
        <Field label="From Approver" required>
          <Select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            options={users.filter((u) => u.isActive).map((u) => [String(u.userId), `${u.userName} (${u.title})`])}
          />
        </Field>
        <Field label="Delegate To" required>
          <Select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            options={users
              .filter((u) => u.isActive && String(u.userId) !== fromId)
              .map((u) => [String(u.userId), `${u.userName} (${u.title})`])}
          />
        </Field>
        <Field label="Permission Scope">
          <Select
            value={permCode}
            onChange={(e) => setPermCode(e.target.value)}
            options={[
              ['ALL', 'All approvals'],
              ...approvalPerms.map((p) => [p.code, `${p.code} · ${p.description}`] as [string, string]),
            ]}
          />
        </Field>
        <Field label="Site Scope">
          <Select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            options={[
              ['ALL', 'All sites'],
              ...SITES.map((s) => [String(s.siteId), `${s.siteCode} · ${s.siteName}`] as [string, string]),
            ]}
          />
        </Field>
        <Field label="Duration">
          <Select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            options={[
              ['3', '3 days'],
              ['7', '1 week'],
              ['14', '2 weeks'],
              ['30', '1 month'],
            ]}
          />
        </Field>
        <Field label="Reason" required hint="e.g. Annual leave or sickness cover">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Annual leave cover"
          />
        </Field>
      </div>
    </EditDrawer>
  );
}

export { UsersView as Users };
export default UsersView;
