import { useState } from 'react';
import { Chips, DataTable, Panel, Pill, Tabs, useToast } from '@/ds/components';
import { CUSTOMS_REF_NAME, SRC, cargoRegimes as seedRegimes, identityRules as seedRules, plateFormats, unitTypes as seedTypes } from '@/mock/admin';
import { AuditNote, SetupPage, VerifyPill, YesNo, useEditable } from '../shared/AdminKit';
import { useQ } from '@/api/query';
import { unitTypesApi } from './api';
import { NumberTester } from './components/NumberTester';
import { UnitTypeDrawer } from './components/UnitTypeDrawer';

export { unitTypesApi } from './api';

type Tab = 'types' | 'rules' | 'regimes';
type Cat = 'CONTAINER' | 'VEHICLE' | 'LOT';
type UT = (typeof seedTypes)[number];

export function UnitTypesView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('types');
  const [cat, setCat] = useState<Cat>('CONTAINER');
  const [types, setTypes] = useEditable<UT>('unitTypes', [], () => unitTypesApi.getUnitTypes());
  const { data: identityRulesData } = useQ<any>(['admin', 'identityRules'], () => unitTypesApi.getIdentityRules());
  const { data: cargoRegimesData } = useQ<any>(['admin', 'cargoRegimes'], () => unitTypesApi.getCargoRegimes());
  const identityRules = (Array.isArray(identityRulesData) && identityRulesData.length > 0) ? identityRulesData : seedRules;
  const cargoRegimes = (Array.isArray(cargoRegimesData) && cargoRegimesData.length > 0) ? cargoRegimesData : seedRegimes;
  const [edit, setEdit] = useState<UT | null>(null);

  return (
    <SetupPage
      title="Unit types & checks"
      ms="M0"
      sub="What can sit in the yard, how its number is checked, and the cargo regimes"
      sources={[SRC.unitTypes, SRC.identity, SRC.regimes]}
    >
      <NumberTester />

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'types', label: 'Unit types', count: types.length },
          { id: 'rules', label: 'Identity rules', count: identityRules.length + plateFormats.length },
          { id: 'regimes', label: 'Cargo regimes', count: cargoRegimes.length },
        ]}
      />

      {tab === 'types' && (
        <Panel flush>
          <div className="toolbar">
            <Chips<Cat>
              value={cat}
              onChange={setCat}
              options={(['CONTAINER', 'VEHICLE', 'LOT'] as Cat[]).map((c) => ({
                id: c,
                label: { CONTAINER: 'Containers', VEHICLE: 'Vehicles', LOT: 'Cargo lots' }[c],
                count: types.filter((t) => t.category === c).length,
              }))}
            />
          </div>
          <DataTable
            rows={types.filter((t) => t.category === cat)}
            rowKey={(t) => t.typeCode}
            onRow={setEdit}
            cols={
              cat === 'CONTAINER'
                ? [
                    { key: 'c', header: 'ISO code', render: (t) => <span className="adm-cond strong">{t.typeCode}</span> },
                    { key: 'a', header: 'Also called', render: (t) => <span className="small muted">{t.alias}</span> },
                    { key: 'n', header: 'Name', render: (t) => t.typeName },
                    { key: 'l', header: 'Length', num: true, render: (t) => `${t.lengthFt} ft` },
                    { key: 'h', header: 'Height', render: (t) => t.heightCode === 'HC' ? 'High cube' : 'Standard' },
                    { key: 'teu', header: 'TEU', num: true, render: (t) => t.teu },
                    { key: 'f', header: 'Kind', render: (t) => <span className="row-wrap">{t.isReefer && <Pill tone="info">Reefer</Pill>}{t.isTank && <Pill tone="info">Tank</Pill>}{t.isOpenTop && <Pill tone="info">Open top</Pill>}{t.isFlatRack && <Pill tone="info">Flat rack</Pill>}</span> },
                    { key: 't', header: 'Default tare', num: true, render: (t) => `${t.defaultTareKg?.toLocaleString()} kg` },
                    { key: 'act', header: 'Active', render: (t) => <YesNo v={t.isActive} /> },
                  ]
                : [
                    { key: 'c', header: 'Code', render: (t) => <span className="adm-cond strong">{t.typeCode}</span> },
                    { key: 'n', header: 'Name', render: (t) => t.typeName },
                    ...(cat === 'VEHICLE' ? [{ key: 'b', header: 'Needs bay size', render: (t: UT) => t.baySizeRequired?.toLowerCase() }] : []),
                    { key: 'r', header: 'Identity rules (in order)', render: (t) => <span className="row-wrap">{(t.identityRules ?? []).map((r) => <span key={r} className="tag">{r}</span>)}</span> },
                    { key: 'act', header: 'Active', render: (t) => <YesNo v={t.isActive} /> },
                  ]
            }
          />
        </Panel>
      )}

      {tab === 'rules' && (
        <>
          <Panel flush title="Unit number rules" sub="A unit type can accept several rules; they are tried in order">
            <DataTable
              rows={identityRules}
              rowKey={(r) => r.ruleCode}
              cols={[
                { key: 'c', header: 'Rule', render: (r) => <><strong>{r.ruleName}</strong><div className="xs faint">{r.ruleCode}</div></> },
                { key: 'p', header: 'Pattern', render: (r) => <span className="adm-code-box">{r.regexPattern}</span> },
                { key: 'd', header: 'Check digit', render: (r) => r.checkDigitAlgo === 'NONE' ? <span className="faint">None</span> : <Pill tone="info">{r.checkDigitAlgo}</Pill> },
                { key: 'x', header: 'Example', render: (r) => <span className="adm-cond">{r.example}</span> },
                { key: 'n', header: 'Notes', render: (r) => <span className="small muted">{r.description}</span> },
              ]}
            />
          </Panel>
          <Panel flush title="Truck plate formats" sub="Plates are stored without spaces and shown with them">
            <DataTable
              rows={plateFormats}
              rowKey={(r) => r.code}
              cols={[
                { key: 'c', header: 'Country', render: (r) => <strong>{r.country}</strong> },
                { key: 'p', header: 'Pattern', render: (r) => <span className="adm-code-box">{r.pattern}</span> },
                { key: 'x', header: 'Example', render: (r) => <span className="unitno unitno-sm">{r.example}</span> },
                { key: 'n', header: 'Notes', render: (r) => <span className="row-wrap small muted">{r.note}{r.code === 'KE' && <VerifyPill>Verify</VerifyPill>}</span> },
              ]}
            />
          </Panel>
        </>
      )}

      {tab === 'regimes' && (
        <Panel flush title="Cargo regimes (Tanzania pack)" sub="Which customs references must be recorded before a unit under each regime can be released">
          <DataTable
            rows={cargoRegimes}
            rowKey={(r) => r.regimeCode}
            cols={[
              { key: 'c', header: 'Regime', render: (r) => <><strong>{r.regimeName}</strong><div className="xs faint">{r.regimeCode}</div></> },
              { key: 'cu', header: 'Needs customs', render: (r) => <YesNo v={r.requiresCustoms} /> },
              { key: 'r', header: 'References required for release', render: (r) => r.refs.length ? <span className="row-wrap">{r.refs.map((x: any) => <span key={x} className="tag">{CUSTOMS_REF_NAME[x]}</span>)}</span> : <span className="faint">None</span> },
            ]}
          />
        </Panel>
      )}
      <AuditNote />

      <UnitTypeDrawer
        edit={edit}
        onClose={() => setEdit(null)}
        setEdit={setEdit}
        onSave={() => {
          if (!edit) return;
          unitTypesApi.updateUnitType(edit.typeCode, edit).catch(() => {});
          setTypes((all) => all.map((t) => (t.typeCode === edit.typeCode ? edit : t)));
          toast('Unit type saved');
        }}
      />
    </SetupPage>
  );
}

export { UnitTypesView as UnitTypes };
export default UnitTypesView;
