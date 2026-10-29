import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Banner, Button, DataTable, Field, Input, Panel, Pill, Segmented, Select, Tabs, fmtD, useToast,
} from '@/ds/components';
import { ROLES } from '@/app/roles';
import { FIELD_CATALOGUE, SRC, calendars, fieldRules as seedRules, holidays as seedHol, type FieldRule } from '@/mock/admin';
import { AuditNote, EditDrawer, SetupPage, VerifyPill, useEditable } from './AdminKit';
import { adminApi } from '../api';

/* Field rules and calendars: /field-rules, /calendars/{id}/holidays.
   Field rules are enforced by the API (hidden fields are never sent), not
   just hidden in the screen. */
type Tab = 'fields' | 'calendar';
type Hol = (typeof seedHol)[number];
type Access = 'HIDDEN' | 'READONLY' | 'MANDATORY';
const ACC: Record<Access, string> = { HIDDEN: 'Hidden', READONLY: 'Read-only', MANDATORY: 'Mandatory' };
const roleName = (c: string) => ROLES.find((r) => r.code === c)?.name ?? c;
const accessOf = (r: FieldRule): Access => (r.mandatory ? 'MANDATORY' : r.accessLevel);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Settings() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('fields');
  const [rules, setRules] = useEditable<FieldRule>('fieldRules', seedRules);
  const [hols, setHols] = useEditable<Hol>('holidays', seedHol);
  const [add, setAdd] = useState(false);
  const [addHol, setAddHol] = useState(false);
  const usedRoles = [...new Set(rules.map((r) => r.roleCode))];

  return (
    <SetupPage wide title="Field rules & calendars" ms="M0" sub="Which fields each role sees, and the holidays that count as free days"
      sources={[SRC.fieldRules, { table: 'm_calendar, m_calendar_holiday' }]}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'fields', label: 'Field rules', count: rules.length }, { id: 'calendar', label: 'Calendars and holidays', count: hols.length }]} />

      {tab === 'fields' && (
        <>
          <Panel flush title="Field rules by role" sub="Rows are fields on screens; a blank cell means the role sees and edits the field normally"
            actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => setAdd(true)}>Add field rule</Button>}>
            <div className="adm-scroll">
              <table className="adm-matrix" aria-label="Field rules">
                <thead><tr><th className="rh">Field</th>{usedRoles.map((r) => <th key={r} style={{ whiteSpace: 'normal', minWidth: 110, maxWidth: 140 }} className="xs">{roleName(r)}</th>)}</tr></thead>
                <tbody>
                  {FIELD_CATALOGUE.filter((f) => rules.some((r) => r.entityName === f.entity && r.fieldName === f.field)).map((f) => (
                    <tr key={f.entity + f.field}>
                      <th className="rh" scope="row" style={{ fontWeight: 400 }}><strong className="small">{f.label}</strong><div className="adm-code xs">{f.entity}.{f.field}</div><div className="xs faint">{f.screen}</div></th>
                      {usedRoles.map((role) => {
                        const r = rules.find((x) => x.roleCode === role && x.entityName === f.entity && x.fieldName === f.field);
                        return <td key={role}>{r ? <span className="row" style={{ justifyContent: 'center', gap: 4 }}>
                          <Pill tone={accessOf(r) === 'HIDDEN' ? 'idle' : 'info'}>{ACC[accessOf(r)]}</Pill>
                          <Button size="sm" variant="ghost" icon={<Trash2 />} perm="admin.config.manage" aria-label={`Remove rule for ${roleName(role)} on ${f.label}`} onClick={() => { setRules((all) => all.filter((x) => x !== r)); toast('Field rule removed'); }} />
                        </span> : <span className="faint">·</span>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Banner tone="info" title="Seeded rule">Unit rates on invoice lines are hidden from gate, yard, equipment, inspection and weighbridge staff, so gate passes and EIRs never show tariffs.</Banner>
          <p className="small muted" style={{ margin: 0 }}>Hidden and read-only are stored in <span className="adm-code">m_field_rule</span>. Mandatory is checked by the screen and the API; the database rule table does not hold it yet.</p>
          <AuditNote />
        </>
      )}

      {tab === 'calendar' && (
        <>
          <Banner tone="wait" title="Verify the 2026 holiday list" action={<VerifyPill>Verify</VerifyPill>}>
            Islamic holidays (Eid al-Fitr, Eid al-Adha, Maulid) move with the moon and are confirmed by government notice a few days before. Check every date against the official gazette and update when announced.
          </Banner>
          <div className="grid-main-side">
            <Panel flush title={calendars[0].calendarName} sub="Used by DAR1, DAR2 and KBH1"
              actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => setAddHol(true)}>Add holiday</Button>}>
              <DataTable rows={[...hols].sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))} rowKey={(h) => h.holidayDate} cols={[
                { key: 'd', header: 'Date', render: (h) => <span className="adm-cond strong">{fmtD(h.holidayDate)}</span> },
                { key: 'w', header: 'Day', render: (h) => <span className="small">{new Date(h.holidayDate + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })}</span> },
                { key: 'n', header: 'Holiday', render: (h) => <strong className="small">{h.holidayName}</strong> },
                { key: 'v', header: '', render: (h) => h.moves ? <VerifyPill>Date moves: verify</VerifyPill> : null },
                { key: 'x', header: '', render: (h) => <Button size="sm" variant="ghost" icon={<Trash2 />} perm="admin.config.manage" aria-label={`Remove ${h.holidayName}`} onClick={() => {
                  if ((h as any).calendarHolidayId) adminApi.deleteHoliday(1, (h as any).calendarHolidayId).catch(() => {});
                  setHols((all) => all.filter((x) => x !== h));
                  toast('Holiday removed');
                }} /> },
              ]} />
            </Panel>
            <div className="stack-lg">
              <Panel title="Free-day policy">
                <div className="stack small">
                  <p style={{ margin: 0 }}><strong>Sundays and public holidays count as free days.</strong> Free time is counted in calendar days from discharge at the port; a holiday inside the free period does not extend it.</p>
                  <p style={{ margin: 0 }} className="muted">Holidays matter for working-day rules: release validity, SLA clocks on exceptions and approval expiry skip them.</p>
                  <p style={{ margin: 0 }} className="muted">Free days per regime and customer are set in tariffs.</p>
                </div>
              </Panel>
              <Panel title="2026 at a glance">
                <div className="grid-2" style={{ gap: 12 }}>
                  {[9, 10, 11].map((m) => <MiniMonth key={m} month={m} hols={hols} />)}
                </div>
              </Panel>
            </div>
          </div>
          <AuditNote />
        </>
      )}

      {add && <RuleDrawer onClose={() => setAdd(false)} onSave={(r) => {
        adminApi.createFieldRule(r).catch(() => {});
        setRules((all) => [...all.filter((x) => !(x.roleCode === r.roleCode && x.entityName === r.entityName && x.fieldName === r.fieldName)), r]);
        toast('Field rule added');
      }} />}
      {addHol && <HolDrawer onClose={() => setAddHol(false)} taken={hols.map((h) => h.holidayDate)} onSave={(h) => {
        adminApi.addHoliday(1, h).catch(() => {});
        setHols((all) => [...all, h]);
        toast('Holiday added');
      }} />}
    </SetupPage>
  );
}

function MiniMonth({ month, hols }: { month: number; hols: Hol[] }) {
  const first = new Date(Date.UTC(2026, month, 1));
  const days = new Date(Date.UTC(2026, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  return (
    <div>
      <div className="xs strong" style={{ marginBottom: 4 }}>{MONTHS[month]} 2026</div>
      <div className="adm-cal">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="dow">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={'l' + i} />)}
        {Array.from({ length: days }, (_, i) => {
          const ds = `2026-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          const h = hols.find((x) => x.holidayDate === ds);
          const sun = new Date(ds + 'T00:00:00Z').getUTCDay() === 0;
          return <span key={i} title={h?.holidayName ?? (sun ? 'Sunday' : undefined)} className={[h ? 'hol' : sun ? 'sun' : '', ds === '2026-10-08' ? 'today' : ''].join(' ')}>{i + 1}</span>;
        })}
      </div>
    </div>
  );
}

function RuleDrawer({ onClose, onSave }: { onClose: () => void; onSave: (r: FieldRule) => void }) {
  const [role, setRole] = useState('GATE_OFFICER');
  const [field, setField] = useState(`${FIELD_CATALOGUE[0].entity}.${FIELD_CATALOGUE[0].field}`);
  const [acc, setAcc] = useState<Access>('HIDDEN');
  const [entity, fname] = field.split('.');
  return (
    <EditDrawer open onClose={onClose} title="Add field rule" saveLabel="Add field rule" perm="admin.config.manage"
      onSave={() => onSave({ fieldRuleId: 900, roleCode: role, entityName: entity, fieldName: fname, accessLevel: acc === 'MANDATORY' ? 'READONLY' : acc, mandatory: acc === 'MANDATORY', uiOnly: acc === 'MANDATORY' })}>
      <Field label="Role"><Select value={role} onChange={(e) => setRole(e.target.value)} options={ROLES.map((r) => [r.code, r.name])} /></Field>
      <Field label="Field"><Select value={field} onChange={(e) => setField(e.target.value)} options={FIELD_CATALOGUE.map((f) => [`${f.entity}.${f.field}`, `${f.label} · ${f.screen}`])} /></Field>
      <Field label="Rule"><Segmented value={acc} onChange={setAcc} options={[{ id: 'HIDDEN', label: 'Hidden' }, { id: 'READONLY', label: 'Read-only' }, { id: 'MANDATORY', label: 'Mandatory' }]} /></Field>
      {acc === 'HIDDEN' && <p className="small muted">The API leaves the field out of every response for this role, including exports and Aiva answers.</p>}
    </EditDrawer>
  );
}

function HolDrawer({ onClose, onSave, taken }: { onClose: () => void; onSave: (h: Hol) => void; taken: string[] }) {
  const [d, setD] = useState('2026-12-31');
  const [n, setN] = useState('');
  const dup = taken.includes(d);
  return (
    <EditDrawer open onClose={onClose} title="Add holiday" saveLabel="Add holiday" perm="admin.config.manage" disabled={!n || dup}
      onSave={() => onSave({ calendarHolidayId: 100 + taken.length, holidayDate: d, holidayName: n })}>
      <Field label="Date" error={dup ? 'There is already a holiday on this date' : undefined}><Input type="date" value={d} onChange={(e) => setD(e.target.value)} /></Field>
      <Field label="Name"><Input value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. Special public holiday (gazette notice)" /></Field>
      <p className="small muted">Storage already charged for that day is not recalculated; unbilled storage picks it up.</p>
    </EditDrawer>
  );
}
