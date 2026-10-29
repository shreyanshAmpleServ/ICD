import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShieldAlert } from 'lucide-react';
import {
  Banner, Button, Check, DataTable, Field, Input, Panel, Pill, Select, StatusPill, Tabs, Money, useToast,
} from '@/ds/components';
import { ROLES } from '@/app/roles';
import {
  SRC, approvalPolicies as seedPolicies, cargoRegimes, exceptionTypes as seedExc, holdTypesSeed, locationTags, permissions,
  releaseConditions, releaseRules as seedRules,
} from '@/mock/admin';
import { AuditNote, EditDrawer, SeedBanner, SetupPage, YesNo, hrs, useEditable } from './AdminKit';

/* Control rules: /hold-types, /release-conditions, /release-rules,
   /approval-policies, /exception-types. All seeded by M2 and editable per
   depot; changes apply to new holds, releases and requests only. */
type Tab = 'holds' | 'release' | 'approvals' | 'exceptions';
type HT = (typeof holdTypesSeed)[number];
type Rule = (typeof seedRules)[number];
type Pol = (typeof seedPolicies)[number];
type Exc = (typeof seedExc)[number];
const roleName = (c?: string | null) => ROLES.find((r) => r.code === c)?.name ?? c ?? '—';
const AUTH: Record<string, string> = { CUSTOMS: 'Customs (TRA)', PORT: 'Port authority', REGULATOR: 'Regulator', COURT: 'Court', LINE: 'Shipping line', ICD: 'Depot', SECURITY: 'Depot security' };

export function Rules() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('holds');
  const [holds, setHolds] = useEditable<HT>('holdTypes', holdTypesSeed);
  const [rules, setRules] = useEditable<Rule>('releaseRules', seedRules);
  const [pols, setPols] = useEditable<Pol>('policies', seedPolicies);
  const [excs, setExcs] = useEditable<Exc>('excTypes', seedExc);
  const [ht, setHt] = useState<HT | null>(null);
  const [pol, setPol] = useState<Pol | null>(null);
  const [exc, setExc] = useState<Exc | null>(null);
  const [stage, setStage] = useState<'gate' | 'approval' | 'override'>('gate');

  const rule = (regime: string, cond: string) => rules.find((r) => r.regimeCode === regime && r.conditionCode === cond);
  const flip = (regime: string, cond: string) => {
    const r = rule(regime, cond);
    if (!r) return;
    const key = stage === 'gate' ? 'atGateOut' : stage === 'approval' ? 'atApproval' : 'canOverride';
    if (key === 'canOverride' && ['IDENTITY', 'RELEASE_VALID', 'NO_HOLD', 'CUSTOMS', 'KEYS'].includes(cond)) { toast('This condition can never be overridden'); return; }
    setRules((all) => all.map((x) => (x === r ? { ...x, [key]: !x[key] } : x)));
    toast('Release rule changed');
  };

  return (
    <SetupPage wide title="Holds, release & approvals" ms="M2" sub="What stops a unit, what must pass before it leaves, who approves exceptions, and how fast cases must be handled"
      sources={[SRC.holds, SRC.release, SRC.approvals, SRC.exceptions]}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'holds', label: 'Hold types', count: holds.length }, { id: 'release', label: 'Release rules' },
        { id: 'approvals', label: 'Approval policies', count: pols.length }, { id: 'exceptions', label: 'Exception types', count: excs.length },
      ]} />

      {tab === 'holds' && (
        <Panel flush title="Hold types" sub="What each hold blocks, and what it takes to lift it" actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Hold type added')}>Add hold type</Button>}>
          <DataTable rows={holds} rowKey={(h) => h.holdCode} onRow={setHt} cols={[
            { key: 'n', header: 'Hold', render: (h) => <><span className="row"><ShieldAlert size={14} color="var(--stop)" /><strong>{h.holdName}</strong></span><div className="xs faint">{h.holdCode}{h.packTz && ' · Tanzania pack'}</div></> },
            { key: 'a', header: 'Authority', render: (h) => <span className="small">{AUTH[h.authority] ?? h.authority}</span> },
            { key: 'g', header: 'Gate out', render: (h) => <YesNo v={h.blocksGateOut} label="Blocks gate out" /> },
            { key: 'r', header: 'Release', render: (h) => <YesNo v={h.blocksRelease} label="Blocks release" /> },
            { key: 'm', header: 'Moves', render: (h) => <YesNo v={h.blocksMove} label="Blocks moves" /> },
            { key: 's', header: 'Stuffing', render: (h) => <YesNo v={h.blocksStuffing} label="Blocks stuffing" /> },
            { key: 'la', header: 'Lift needs approval', render: (h) => <YesNo v={h.liftNeedsApproval} /> },
            { key: 'le', header: 'Lift needs evidence', render: (h) => <YesNo v={h.liftNeedsEvidence} /> },
            { key: 't', header: 'Moves unit to', render: (h) => h.moveToTagCode ? <span className="tag">{locationTags.find((t) => t.tagCode === h.moveToTagCode)?.tagName}</span> : <span className="faint">—</span> },
          ]} />
        </Panel>
      )}

      {tab === 'release' && (
        <>
          <Panel flush title="Release conditions by regime" sub="The eight checks run in this order. Select a cell to switch it."
            actions={<Select aria-label="Which setting" style={{ width: 'auto' }} value={stage} onChange={(e) => setStage(e.target.value as typeof stage)} options={[['gate', 'Checked at gate-out'], ['approval', 'Checked when approving the release'], ['override', 'Can be overridden with approval']]} />}>
            <div className="adm-scroll">
              <table className="adm-matrix" aria-label="Release rules">
                <thead><tr><th className="rh">Condition</th>{cargoRegimes.map((r) => <th key={r.regimeCode}>{r.regimeName}</th>)}</tr></thead>
                <tbody>
                  {releaseConditions.map((c) => (
                    <tr key={c.conditionCode}>
                      <th className="rh" scope="row" style={{ fontWeight: 400 }}><strong>{c.evalOrder}. {c.conditionName}</strong><div className="xs faint">{c.description}</div></th>
                      {cargoRegimes.map((reg) => {
                        const r = rule(reg.regimeCode, c.conditionCode);
                        if (!r) return <td key={reg.regimeCode}><span className="xs faint">Not applicable</span></td>;
                        const v = stage === 'gate' ? r.atGateOut : stage === 'approval' ? r.atApproval : r.canOverride;
                        return (
                          <td key={reg.regimeCode}>
                            <button className="adm-g-btn" onClick={() => flip(reg.regimeCode, c.conditionCode)} aria-label={`${c.conditionName} for ${reg.regimeName}: ${v ? 'yes' : 'no'}. Switch`}>
                              <YesNo v={v} />
                            </button>
                            {r.unitCategory && <div className="xs faint">vehicles only</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Banner tone="info" title="Never overridable">Identity, release valid, no blocking hold, customs and keys can never be overridden. Payment, collector and physical can, with approval (<span className="adm-code">release.exception.approve</span>).</Banner>
          <AuditNote>Rule changes apply to the next check; releases already approved are re-checked at the gate under the new rule.</AuditNote>
        </>
      )}

      {tab === 'approvals' && (
        <>
          <SeedBanner>Two levels from USD 1,000 for waivers and credit notes, and from USD 500 for refunds. Confirm these thresholds with the finance manager.</SeedBanner>
          <Panel flush title="Approval policies" sub="How many approvers a request needs, by amount, and when an unanswered request expires">
            <DataTable rows={[...pols].sort((a, b) => a.permissionCode.localeCompare(b.permissionCode) || Number(a.amountFrom) - Number(b.amountFrom))} rowKey={(p) => p.approvalPolicyId!} onRow={setPol} cols={[
              { key: 'p', header: 'Permission', render: (p) => <><strong className="small">{permissions.find((x) => x.code === p.permissionCode)?.description}</strong><div className="adm-code xs">{p.permissionCode}</div></> },
              { key: 'a', header: 'Amount from', num: true, render: (p) => Number(p.amountFrom) > 0 ? <Money amount={p.amountFrom} currency={p.amountCurrency} /> : <span className="faint">Any amount</span> },
              { key: 'l', header: 'Levels', num: true, render: (p) => p.levelsRequired === 2 ? <Pill tone="wait">2 levels</Pill> : '1 level' },
              { key: 'e', header: 'Expires after', num: true, render: (p) => `${p.expiresAfterHours} h` },
              { key: 's', header: 'Site', render: (p) => p.siteId ? `Site ${p.siteId}` : 'All sites' },
              { key: 'x', header: 'Active', render: (p) => <YesNo v={p.isActive} /> },
            ]} />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>Nobody approves their own request. Who may approve, and up to what amount, is set per role in <Link to="/admin/users">Users & roles</Link>.</p>
          <AuditNote />
        </>
      )}

      {tab === 'exceptions' && (
        <Panel flush title="Exception types" sub="Who owns each kind of case, how fast it must be handled, and who it escalates to">
          <DataTable rows={excs} rowKey={(e) => e.exceptionCode} onRow={setExc} cols={[
            { key: 'n', header: 'Exception', render: (e) => <><strong>{e.exceptionName}</strong><div className="xs faint">{e.exceptionCode}</div></> },
            { key: 's', header: 'Severity', render: (e) => <StatusPill value={e.severity} /> },
            { key: 'o', header: 'Owner', render: (e) => <span className="small">{roleName(e.defaultRoleCode)}</span> },
            { key: 'sla', header: 'SLA', num: true, render: (e) => hrs(e.slaMinutes) },
            { key: 'esc', header: 'Escalates to', render: (e) => <span className="small">{roleName(e.escalationRoleCode)}</span> },
            { key: 'h', header: 'Places hold', render: (e) => e.placesHoldTypeCode ? <Pill tone="hold">{holds.find((h) => h.holdCode === e.placesHoldTypeCode)?.holdName}</Pill> : <span className="faint">—</span> },
            { key: 'sc', header: 'Supervisor closes', render: (e) => <YesNo v={e.supervisorClose} /> },
          ]} />
        </Panel>
      )}

      {ht && (
        <EditDrawer open onClose={() => setHt(null)} title={ht.holdName} saveLabel="Save hold type" perm="admin.config.manage" reason="Changing what a hold blocks affects every unit under it from now on."
          onSave={() => { setHolds((all) => all.map((h) => (h.holdCode === ht.holdCode ? ht : h))); toast('Hold type saved'); }}>
          <Field label="Name"><Input value={ht.holdName} onChange={(e) => setHt({ ...ht, holdName: e.target.value })} /></Field>
          <Field label="While active, this hold blocks">
            <div className="stack" style={{ gap: 8 }}>
              <Check label="Gate out" checked={ht.blocksGateOut} onChange={(e) => setHt({ ...ht, blocksGateOut: e.target.checked })} />
              <Check label="Release approval" checked={ht.blocksRelease} onChange={(e) => setHt({ ...ht, blocksRelease: e.target.checked })} />
              <Check label="Yard moves" checked={ht.blocksMove} onChange={(e) => setHt({ ...ht, blocksMove: e.target.checked })} />
              <Check label="Stuffing and de-stuffing" checked={ht.blocksStuffing} onChange={(e) => setHt({ ...ht, blocksStuffing: e.target.checked })} />
            </div>
          </Field>
          <Field label="To lift it">
            <div className="stack" style={{ gap: 8 }}>
              <Check label="Needs approval (customs.hold.lift, approver)" checked={ht.liftNeedsApproval} onChange={(e) => setHt({ ...ht, liftNeedsApproval: e.target.checked })} />
              <Check label="Needs evidence (document or photo)" checked={ht.liftNeedsEvidence} onChange={(e) => setHt({ ...ht, liftNeedsEvidence: e.target.checked })} />
            </div>
          </Field>
          <Field label="Move unit to area" hint="Allocation suggests a slot with this tag"><Select value={ht.moveToTagCode ?? ''} onChange={(e) => setHt({ ...ht, moveToTagCode: e.target.value || undefined })} options={[['', 'Leave where it is'], ...locationTags.map((t) => [t.tagCode, t.tagName] as [string, string])]} /></Field>
          {!ht.blocksGateOut && <Banner tone="stop">A hold that does not block gate-out lets the unit leave while held. Is that intended?</Banner>}
        </EditDrawer>
      )}
      {pol && (
        <EditDrawer open onClose={() => setPol(null)} title={`Policy for ${pol.permissionCode}`} saveLabel="Save policy" perm="admin.config.manage" reason="Approval thresholds are a finance control."
          onSave={() => { setPols((all) => all.map((p) => (p.approvalPolicyId === pol.approvalPolicyId ? pol : p))); toast('Policy saved'); }}>
          <div className="form-grid">
            <Field label="From amount (USD)" hint="0 means any amount"><Input type="number" value={pol.amountFrom ?? '0'} onChange={(e) => setPol({ ...pol, amountFrom: e.target.value, amountCurrency: Number(e.target.value) > 0 ? 'USD' : null })} /></Field>
            <Field label="Levels required"><Select value={String(pol.levelsRequired)} onChange={(e) => setPol({ ...pol, levelsRequired: Number(e.target.value) })} options={[['1', '1 approver'], ['2', '2 approvers, one after the other']]} /></Field>
            <Field label="Expires after (hours)" hint="An unanswered request lapses and the requester is told"><Input type="number" value={pol.expiresAfterHours ?? 72} onChange={(e) => setPol({ ...pol, expiresAfterHours: Number(e.target.value) })} /></Field>
          </div>
          <p className="xs faint">Requests already waiting keep the policy they were raised under.</p>
        </EditDrawer>
      )}
      {exc && (
        <EditDrawer open onClose={() => setExc(null)} title={exc.exceptionName} saveLabel="Save exception type" perm="admin.config.manage"
          onSave={() => { setExcs((all) => all.map((e) => (e.exceptionCode === exc.exceptionCode ? exc : e))); toast('Exception type saved'); }}>
          <div className="form-grid">
            <Field label="Severity"><Select value={exc.severity} onChange={(e) => setExc({ ...exc, severity: e.target.value as Exc['severity'] })} options={[['CRITICAL', 'Critical'], ['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']]} /></Field>
            <Field label="SLA (minutes)" hint={hrs(exc.slaMinutes)}><Input type="number" value={exc.slaMinutes} onChange={(e) => setExc({ ...exc, slaMinutes: Number(e.target.value) })} /></Field>
            <Field label="Owner role"><Select value={exc.defaultRoleCode ?? ''} onChange={(e) => setExc({ ...exc, defaultRoleCode: e.target.value })} options={ROLES.filter((r) => !r.external).map((r) => [r.code, r.name])} /></Field>
            <Field label="Escalates to"><Select value={exc.escalationRoleCode ?? ''} onChange={(e) => setExc({ ...exc, escalationRoleCode: e.target.value })} options={ROLES.filter((r) => !r.external).map((r) => [r.code, r.name])} /></Field>
          </div>
          <Check label="Only a supervisor can close it" checked={!!exc.supervisorClose} onChange={(e) => setExc({ ...exc, supervisorClose: e.target.checked })} />
        </EditDrawer>
      )}
    </SetupPage>
  );
}
