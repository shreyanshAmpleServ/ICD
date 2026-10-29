import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Lock, Plus, Search, ShieldCheck, UserMinus, UserPlus, X } from 'lucide-react';
import {
  Banner, Button, Chips, DL, DataTable, Field, Input, Ms, Panel, Pill, SearchInput, Segmented, Select, Tabs,
  Money, ago, fmtD, fmtDT, useToast, NOW,
} from '@/ds/components';
import { ROLES, type Grant } from '@/app/roles';
import { SITES } from '@/app/session';
import { INACTIVE_ROLES, MODULE_NAME, SRC, delegations, permissions, roleLimits, users as seedUsers, type User } from '@/mock/admin';
import { AuditNote, EditDrawer, GrantChip, ListPanel, SetupPage, Split, useEditable } from './AdminKit';

/* Users and roles: /users, /users/{id}/roles, /roles, /permissions,
   /delegations. Identity comes from NG; NG ICD only decides which roles a
   person holds at which site. Grants are DO, REQ (request, creates an
   approval), APPR (approve) and VIEW. */
type Tab = 'users' | 'matrix' | 'limits' | 'delegations';
type RG = NonNullable<User['roleGrants']>[number];
const roleName = (c: string) => ROLES.find((r) => r.code === c)?.name ?? c;
const siteLabel = (id?: number | null) => (id ? SITES.find((s) => s.siteId === id)?.siteCode ?? '?' : 'All sites');

export function Users() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useEditable<User>('users', seedUsers);
  const [sel, setSel] = useState<number>(2);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [grantOpen, setGrantOpen] = useState(false);
  const [newUser, setNewUser] = useState(false);
  const [deact, setDeact] = useState(false);
  const user = users.find((u) => u.userId === sel);
  const shown = users.filter((u) => (status === 'active' ? u.isActive : !u.isActive));

  const updateGrants = (fn: (g: RG[]) => RG[]) => setUsers((all) => all.map((u) => (u.userId === sel ? { ...u, roleGrants: fn([...(u.roleGrants ?? [])]) } : u)));

  return (
    <SetupPage wide title="Users & roles" ms="M0" sub="Who can do what, at which site. Sign-in and passwords are managed in NG."
      sources={[{ table: 'app_user, user_site_role' }, SRC.perms]}
      actions={<Button variant="primary" icon={<UserPlus />} perm="admin.users.manage" onClick={() => setNewUser(true)}>Add user</Button>}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'users', label: 'Users', count: users.filter((u) => u.isActive).length }, { id: 'matrix', label: 'Roles and permissions', count: ROLES.length },
        { id: 'limits', label: 'Approval limits' }, { id: 'delegations', label: 'Delegations', count: delegations.filter((d) => Date.parse(d.validTo) > NOW.getTime()).length },
      ]} />

      {tab === 'users' && (
        <Split list={
          <ListPanel title="People" searchable="Name or email" selected={sel} onSelect={(id) => setSel(Number(id))}
            filter={<Chips value={status} onChange={setStatus} options={[{ id: 'active', label: 'Active' }, { id: 'inactive', label: 'Inactive', count: users.filter((u) => !u.isActive).length }]} />}
            items={shown.map((u) => ({ id: u.userId!, title: u.userName, sub: `${u.title} · ${u.siteCodes.join(', ')}`, aside: !u.mfaRequired && u.roleGrants?.some((g) => hasApproval(g.roleCode)) ? <KeyRound size={14} aria-label="MFA off" /> : undefined }))} />
        }>
          {user && (
            <>
              {!user.isActive && <Banner tone="info" title="Inactive">This person cannot sign in to NG ICD. Their past actions stay in the audit trail.</Banner>}
              {user.isActive && !user.mfaRequired && user.roleGrants?.some((g) => hasApproval(g.roleCode)) && (
                <Banner tone="wait" title="Approver without two-step sign-in">This person can approve money or overrides. Require MFA in NG before granting more.</Banner>
              )}
              <Panel title={user.userName} sub={`${user.title} · ${user.email}`}
                actions={user.isActive ? <Button size="sm" variant="danger" icon={<UserMinus />} perm="admin.users.manage" onClick={() => setDeact(true)}>Deactivate</Button> : undefined}>
                <DL cols items={[
                  ['Identity', user.isNgUser ? <Pill key="i" tone="info" icon={<ShieldCheck />}>NG identity linked</Pill> : <Pill key="i">Local account</Pill>],
                  ['Two-step sign-in (MFA)', user.mfaRequired ? 'Required' : <span key="m" className="muted">Not required</span>],
                  ['Last sign-in', user.lastLoginAt ? <span key="l" title={fmtDT(user.lastLoginAt)}>{ago(user.lastLoginAt)}</span> : 'Never'],
                  ['Language', user.preferredLanguage === 'sw' ? 'Kiswahili' : 'English'],
                  ['NG subject', <span key="s" className="adm-code">{user.userSub}</span>],
                  ['Sites', user.siteCodes.join(', ')],
                ]} />
              </Panel>
              <Panel flush title="Roles" sub="A role can be granted at one site or at all sites, for a limited time if needed"
                actions={<Button size="sm" icon={<Plus />} perm="admin.users.manage" disabled={!user.isActive} onClick={() => setGrantOpen(true)}>Grant a role</Button>}>
                <DataTable rows={user.roleGrants ?? []} rowKey={(g) => `${g.roleCode}-${g.siteId}`} empty={<p className="small muted" style={{ padding: 16 }}>No roles. Grant one so this person can work in NG ICD.</p>} cols={[
                  { key: 'r', header: 'Role', render: (g) => <strong>{roleName(g.roleCode)}</strong> },
                  { key: 's', header: 'Site', render: (g) => siteLabel(g.siteId) },
                  { key: 'v', header: 'Valid', render: (g) => {
                    const ended = g.validTo && Date.parse(g.validTo) < NOW.getTime();
                    return <span className="small">{fmtD(g.validFrom)} → {g.validTo ? fmtD(g.validTo) : 'no end'} {ended && <Pill>Ended</Pill>}{g.validTo && !ended && <Pill tone="wait">Temporary</Pill>}</span>;
                  } },
                  { key: 'b', header: 'Granted by', render: (g) => <span className="small muted">{g.grantedBy}</span> },
                  { key: 'x', header: '', render: (g) => <Button size="sm" variant="ghost" icon={<X />} perm="admin.users.manage" aria-label={`Remove ${roleName(g.roleCode)}`}
                    onClick={() => { updateGrants((gs) => gs.filter((x) => x !== g)); toast('Role removed'); }}>Remove</Button> },
                ]} />
              </Panel>
              <AuditNote />
            </>
          )}
        </Split>
      )}

      {tab === 'matrix' && <Matrix />}
      {tab === 'limits' && <Limits />}
      {tab === 'delegations' && (
        <Panel flush title="Delegations" sub="An approver can hand an approval permission to someone else for a fixed time, e.g. during leave"
          actions={<Button size="sm" icon={<Plus />} perm="admin.users.manage" onClick={() => toast('Delegation added')}>Add delegation</Button>}>
          <DataTable rows={delegations} rowKey={(d) => d.approvalDelegationId!} cols={[
            { key: 'f', header: 'From', render: (d) => <strong>{d.fromName}</strong> },
            { key: 't', header: 'To', render: (d) => <strong>{d.toName}</strong> },
            { key: 'p', header: 'Permission', render: (d) => <span className="adm-code">{d.permissionCode ?? 'All approvals'}</span> },
            { key: 's', header: 'Site', render: (d) => siteLabel(d.siteId) },
            { key: 'w', header: 'When', render: (d) => <span className="small">{fmtDT(d.validFrom)} → {fmtDT(d.validTo)}</span> },
            { key: 'st', header: 'Status', render: (d) => Date.parse(d.validTo) < NOW.getTime() ? <Pill>Ended</Pill> : Date.parse(d.validFrom) > NOW.getTime() ? <Pill tone="wait">Starts {ago(d.validFrom).replace('-', '')}</Pill> : <Pill tone="go">In effect</Pill> },
            { key: 'r', header: 'Reason', render: (d) => <span className="small muted">{d.reason}</span> },
          ]} />
        </Panel>
      )}

      {user && <GrantDrawer key={sel + String(grantOpen)} open={grantOpen} onClose={() => setGrantOpen(false)} user={user}
        onGrant={(g) => { updateGrants((gs) => [...gs, g]); toast('Role granted'); }} />}

      <EditDrawer open={newUser} onClose={() => setNewUser(false)} title="Add user" saveLabel="Add user" perm="admin.users.manage"
        onSave={() => { toast('User added; invitation sent from NG'); }}>
        <Banner tone="info">People sign in with their NG identity. Find them in NG by email; if they are not there yet, NG sends an invitation.</Banner>
        <div className="form-grid">
          <Field label="Email" required><Input type="email" placeholder="name@mlimani-icd.example" /></Field>
          <Field label="Full name" required><Input /></Field>
          <Field label="Mobile"><Input placeholder="+255 7…" /></Field>
          <Field label="Language"><Select options={[['en', 'English'], ['sw', 'Kiswahili']]} /></Field>
        </div>
        <Field label="Two-step sign-in"><Segmented value="REQ" onChange={() => undefined} options={[{ id: 'REQ', label: 'Required' }, { id: 'OPT', label: 'Not required' }]} /></Field>
        <p className="xs faint">Grant roles after the user is added.</p>
      </EditDrawer>

      {user && (
        <EditDrawer open={deact} onClose={() => setDeact(false)} title={`Deactivate ${user.userName}`} saveLabel="Deactivate user" danger perm="admin.users.manage"
          reason="e.g. Left the company on 30 Sep" onSave={() => { setUsers((all) => all.map((u) => (u.userId === user.userId ? { ...u, isActive: false } : u))); toast('User deactivated'); }}>
          <p className="small muted">They are signed out everywhere within a minute. Open approvals they requested stay open; approvals waiting on them go to the next approver.</p>
        </EditDrawer>
      )}
    </SetupPage>
  );
}

const hasApproval = (roleCode: string) => Object.values(ROLES.find((r) => r.code === roleCode)?.grants ?? {}).includes('APPR');

function GrantDrawer({ open, onClose, user, onGrant }: { open: boolean; onClose: () => void; user: User; onGrant: (g: RG) => void }) {
  const held = (user.roleGrants ?? []).map((g) => g.roleCode);
  const [role, setRole] = useState(() => ROLES.find((x) => !x.external && !INACTIVE_ROLES.includes(x.code) && !held.includes(x.code))?.code ?? 'GATE_OFFICER');
  const [site, setSite] = useState('1');
  const [to, setTo] = useState('');
  const restricted = role === 'CUSTOMS_OFFICER';
  const inactive = INACTIVE_ROLES.includes(role);
  const sod = (held.includes('BILLING_OFFICER') && role === 'CASHIER') || (held.includes('CASHIER') && role === 'BILLING_OFFICER');
  const dup = (user.roleGrants ?? []).some((g) => g.roleCode === role && String(g.siteId ?? '') === (site === 'ALL' ? '' : site));
  const r = ROLES.find((x) => x.code === role)!;
  return (
    <EditDrawer open={open} onClose={onClose} title={`Grant a role to ${user.userName}`} saveLabel="Grant role" perm="admin.users.manage"
      disabled={dup || (inactive && !restricted)} reason={restricted ? 'Name the customs station and the letter that asked for this access.' : undefined}
      onSave={() => onGrant({ roleCode: role, siteId: site === 'ALL' ? null : Number(site), validFrom: '2026-10-07', validTo: to || undefined, grantedBy: 'Ashok K. (admin)' })}>
      <div className="form-grid">
        <Field label="Role" required>
          <Select value={role} onChange={(e) => setRole(e.target.value)} options={ROLES.filter((x) => !x.external).map((x) => [x.code, `${x.name}${INACTIVE_ROLES.includes(x.code) ? ' (off)' : ''}`])} />
        </Field>
        <Field label="Site" required><Select value={site} onChange={(e) => setSite(e.target.value)} options={[['ALL', 'All sites'], ...SITES.map((s) => [String(s.siteId), `${s.siteCode} · ${s.siteName}`] as [string, string])]} /></Field>
        <Field label="Valid until" hint="Leave empty for no end date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {dup && <Banner tone="stop">{user.userName} already holds this role at this site.</Banner>}
      {restricted && (
        <Banner tone="wait" title="Restricted role, off by default">
          The customs officer role lets an outside officer place and lift customs holds directly. It is switched off for this depot. Granting it switches it on for this person only and is reviewed monthly.
        </Banner>
      )}
      {inactive && !restricted && <Banner tone="stop">This is a portal role. Invite portal users from the customer portal instead.</Banner>}
      {sod && <Banner tone="wait" title="Segregation of duties">The same person will both raise invoices and record payments. NG ICD still blocks them from recording payment on an invoice they created.</Banner>}
      <Panel title={`What ${r.name.toLowerCase()} can do`}>
        <div className="row-wrap">{Object.entries(r.grants).map(([p, g]) => <span key={p} className="row" style={{ gap: 4 }}><GrantChip g={g} /><span className="xs">{p}</span></span>)}</div>
      </Panel>
    </EditDrawer>
  );
}

/* ------------------------------------------------------------------ permission matrix */
function Matrix() {
  const toast = useToast();
  const [grants, setGrants] = useState<Record<string, Record<string, Grant | undefined>>>(() => Object.fromEntries(ROLES.map((r) => [r.code, { ...r.grants }])));
  const [q, setQ] = useState('');
  const [mod, setMod] = useState('all');
  const [col, setCol] = useState<string | null>(null);
  const [cell, setCell] = useState<{ role: string; perm: string } | null>(null);
  const roles = ROLES;
  const mods = useMemo(() => [...new Set(permissions.map((p) => p.module))], []);
  const perms = permissions.filter((p) => (mod === 'all' || p.module === mod) && (!q || `${p.code} ${p.description}`.toLowerCase().includes(q.toLowerCase())));
  const grouped = mods.map((m) => [m, perms.filter((p) => p.module === m)] as const).filter(([, ps]) => ps.length);

  return (
    <>
      <Panel flush>
        <div className="toolbar">
          <div style={{ width: 260, maxWidth: '100%' }}><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a permission" aria-label="Find a permission" /></div>
          <Select aria-label="Module" value={mod} onChange={(e) => setMod(e.target.value)} options={[['all', 'All modules'], ...mods.map((m) => [m, MODULE_NAME[m] ?? m] as [string, string])]} />
          <span className="spacer" />
          <span className="row-wrap xs muted" aria-label="Legend">
            <GrantChip g="DO" /> do it <GrantChip g="REQ" /> request (approval) <GrantChip g="APPR" /> approve <GrantChip g="VIEW" /> view
          </span>
        </div>
        <div className="adm-scroll">
          <table className="adm-matrix" aria-label="Permissions by role">
            <thead>
              <tr>
                <th className="rh">Permission</th>
                {roles.map((r) => {
                  const off = INACTIVE_ROLES.includes(r.code);
                  return (
                    <th key={r.code} className={col === r.code ? 'colsel' : undefined}>
                      <button className="adm-g-btn" onClick={() => setCol(col === r.code ? null : r.code)} title={off ? `${r.name}: switched off for this depot` : r.name} aria-pressed={col === r.code}>
                        <span className="vert" style={{ display: 'inline-block', opacity: off ? 0.55 : 1 }}>{off && '🔒︎ '}{r.name}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([m, ps]) => (
                <Fragment key={m}>
                  <tr className="grp"><th className="rh" colSpan={1}>{MODULE_NAME[m] ?? m}</th><td colSpan={roles.length} /></tr>
                  {ps.map((p) => (
                    <tr key={p.code}>
                      <th className="rh" scope="row" style={{ fontWeight: 400 }}>
                        <span className="small">{p.description}</span> {p.ms !== 'M0' && <Ms m={p.ms} />}
                        <div className="adm-code xs">{p.code}{p.isApproval && ' · approval'}</div>
                      </th>
                      {roles.map((r) => {
                        const g = grants[r.code][p.code];
                        const lim = roleLimits[r.code]?.[p.code];
                        return (
                          <td key={r.code} className={col === r.code ? 'colsel' : undefined} style={{ opacity: INACTIVE_ROLES.includes(r.code) ? 0.55 : 1 }}>
                            <button className="adm-g-btn" onClick={() => setCell({ role: r.code, perm: p.code })} aria-label={`${r.name}, ${p.code}: ${g ?? 'none'}. Change`}>
                              <GrantChip g={g} />
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
      <div className="row-wrap small muted"><Lock size={14} />Customs officer (restricted) and the two portal roles are seeded switched off; switch them on per depot. Numbers under a cell are approval limits in USD.</div>
      <AuditNote>Role changes take effect at each user's next request and are logged in the audit trail.</AuditNote>
      {cell && (
        <CellDrawer key={cell.role + cell.perm} role={cell.role} perm={cell.perm} current={grants[cell.role][cell.perm]} onClose={() => setCell(null)}
          onSave={(g) => { setGrants((x) => ({ ...x, [cell.role]: { ...x[cell.role], [cell.perm]: g } })); toast('Role permission changed'); }} />
      )}
    </>
  );
}

function CellDrawer({ role, perm, current, onClose, onSave }: { role: string; perm: string; current?: Grant; onClose: () => void; onSave: (g: Grant | undefined) => void }) {
  const [g, setG] = useState<Grant | 'NONE'>(current ?? 'NONE');
  const p = permissions.find((x) => x.code === perm)!;
  const opts: { id: Grant | 'NONE'; label: string }[] = [{ id: 'NONE', label: 'None' }, { id: 'VIEW', label: 'View' }, { id: 'DO', label: 'Do' }, ...(p.isApproval ? [{ id: 'REQ' as const, label: 'Request' }, { id: 'APPR' as const, label: 'Approve' }] : [])];
  return (
    <EditDrawer open onClose={onClose} title={`${roleName(role)} · ${perm}`} saveLabel="Change permission" perm="admin.roles.manage"
      reason="Roles apply to everyone who holds them." disabled={g === (current ?? 'NONE')} onSave={() => onSave(g === 'NONE' ? undefined : g)}>
      <p className="small">{p.description}</p>
      <Field label="Grant"><Segmented value={g} onChange={setG} options={opts} /></Field>
      {p.supportsLimit && (g === 'APPR' || g === 'DO') && <Field label="Approval limit (USD)" hint="Above this amount the request goes to the next level"><Input type="number" defaultValue={roleLimits[role]?.[perm] ?? ''} /></Field>}
      {g === 'REQ' && <Banner tone="info">Holders can start the action; it becomes an approval request.</Banner>}
      <p className="xs faint">{ROLES.find((r) => r.code === role)?.name} is held by {seedUsers.filter((u) => u.roleGrants?.some((x) => x.roleCode === role)).length} people.</p>
    </EditDrawer>
  );
}

/* ------------------------------------------------------------------ approval limits */
function Limits() {
  const toast = useToast();
  const rows = ROLES.flatMap((r) => Object.entries(r.grants)
    .filter(([p, g]) => permissions.find((x) => x.code === p)?.supportsLimit && (g === 'APPR' || g === 'REQ'))
    .map(([p, g]) => ({ key: `${r.code}-${p}`, role: r.name, code: r.code, perm: p, grant: g, limit: roleLimits[r.code]?.[p] })));
  return (
    <>
      <Panel flush title="Approval limits per role" sub="Only permissions that carry an amount: credit notes, waivers, refunds, cash-up differences">
        <DataTable rows={rows} rowKey={(r) => r.key} cols={[
          { key: 'r', header: 'Role', render: (r) => <strong>{r.role}</strong> },
          { key: 'p', header: 'Permission', render: (r) => <span className="adm-code">{r.perm}</span> },
          { key: 'g', header: 'Grant', render: (r) => <GrantChip g={r.grant} /> },
          { key: 'l', header: 'Limit', num: true, render: (r) => r.grant === 'REQ' ? <span className="faint">Requests only</span> : r.limit !== undefined ? <Money amount={r.limit} currency="USD" /> : <span className="faint">No limit</span> },
          { key: 'e', header: '', render: (r) => r.grant === 'APPR' ? <Button size="sm" variant="ghost" perm="admin.roles.manage" onClick={() => toast('Limit saved')}>Change limit</Button> : null },
        ]} />
      </Panel>
      <Banner tone="info" title="Limits and levels work together">
        A request needs one approver whose limit covers the amount. Above the policy threshold it needs two levels; see <Link to="/admin/rules">Holds, release & approvals</Link>.
      </Banner>
      <AuditNote />
    </>
  );
}
