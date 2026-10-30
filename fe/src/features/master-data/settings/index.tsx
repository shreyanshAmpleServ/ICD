import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Banner, Button, Panel, Tabs, useToast } from '@/ds/components';
import { SRC, holidays as seedHol, type FieldRule } from '@/mock/admin';
import { AuditNote, SetupPage, useEditable } from '../shared/AdminKit';
import { settingsApi } from './api';
import { FieldRulesMatrix } from './components/FieldRulesMatrix';
import { CalendarTab } from './components/CalendarTab';
import { RuleDrawer } from './components/RuleDrawer';
import { HolDrawer } from './components/HolDrawer';

export { settingsApi } from './api';

type Tab = 'fields' | 'calendar';
type Hol = (typeof seedHol)[number];

export function SettingsView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('fields');
  const [rules, setRules] = useEditable<FieldRule>('fieldRules', [], () => settingsApi.getFieldRules());
  const [hols, setHols] = useEditable<Hol>('holidays', [], () => settingsApi.getHolidays());
  const [add, setAdd] = useState(false);
  const [addHol, setAddHol] = useState(false);
  const usedRoles = [...new Set(rules.map((r) => r.roleCode))];

  return (
    <SetupPage
      wide
      title="Field rules & calendars"
      ms="M0"
      sub="Which fields each role sees, and the holidays that count as free days"
      sources={[SRC.fieldRules, { table: 'm_calendar, m_calendar_holiday' }]}
    >
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'fields', label: 'Field rules', count: rules.length },
          { id: 'calendar', label: 'Calendars and holidays', count: hols.length },
        ]}
      />

      {tab === 'fields' && (
        <>
          <Panel
            flush
            title="Field rules by role"
            sub="Rows are fields on screens; a blank cell means the role sees and edits the field normally"
            actions={
              <Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => setAdd(true)}>
                Add field rule
              </Button>
            }
          >
            <FieldRulesMatrix
              rules={rules}
              usedRoles={usedRoles}
              onRemoveRule={(r) => {
                setRules((all) => all.filter((x) => x !== r));
                toast('Field rule removed');
              }}
            />
          </Panel>
          <Banner tone="info" title="Seeded rule">
            Unit rates on invoice lines are hidden from gate, yard, equipment, inspection and weighbridge staff, so gate
            passes and EIRs never show tariffs.
          </Banner>
          <p className="small muted" style={{ margin: 0 }}>
            Hidden and read-only are stored in <span className="adm-code">m_field_rule</span>. Mandatory is checked by the
            screen and the API; the database rule table does not hold it yet.
          </p>
          <AuditNote />
        </>
      )}

      {tab === 'calendar' && (
        <CalendarTab
          hols={hols}
          onAddHoliday={() => setAddHol(true)}
          onRemoveHoliday={(h) => {
            if ((h as any).calendarHolidayId) settingsApi.deleteHoliday(1, (h as any).calendarHolidayId).catch(() => {});
            setHols((all) => all.filter((x) => x !== h));
            toast('Holiday removed');
          }}
        />
      )}

      {add && (
        <RuleDrawer
          onClose={() => setAdd(false)}
          onSave={(r) => {
            settingsApi.createFieldRule(r).catch(() => {});
            setRules((all) => [
              ...all.filter(
                (x) => !(x.roleCode === r.roleCode && x.entityName === r.entityName && x.fieldName === r.fieldName)
              ),
              r,
            ]);
            toast('Field rule added');
          }}
        />
      )}

      {addHol && (
        <HolDrawer
          onClose={() => setAddHol(false)}
          taken={hols.map((h) => h.holidayDate)}
          onSave={(h) => {
            settingsApi.addHoliday(1, h).catch(() => {});
            setHols((all) => [...all, h]);
            toast('Holiday added');
          }}
        />
      )}
    </SetupPage>
  );
}

export { SettingsView as Settings, SettingsView as SettingsScreen, SettingsView as SettingsPage };
export default SettingsView;

