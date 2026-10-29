import { useState } from 'react';
import { Car, Container, Plus } from 'lucide-react';
import { Button, Chips, DataTable, Panel, Pill, Tabs, useToast } from '@/ds/components';
import { SRC, damageCodes as seedDamageCodes, inspectionTemplates as seedTpl } from '@/mock/admin';
import { ListPanel, SetupPage, Split, useEditable } from '../shared/AdminKit';
import { useQ, delay } from '@/api/query';
import { inspectionApi } from './api';
import { ChecklistEditor } from './components/ChecklistEditor';

export { inspectionApi } from './api';

type Tab = 'templates' | 'damage';
type Tpl = (typeof seedTpl)[number];

export function InspectionView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('templates');
  const [tpls, setTpls] = useEditable<Tpl>('inspTpl', seedTpl);
  const { data: damageData } = useQ<any[]>(['admin', 'damageCodes'], () => delay(seedDamageCodes));
  const damageCodes = (Array.isArray(damageData) && damageData.length > 0) ? damageData : seedDamageCodes;
  const [sel, setSel] = useState(3);
  const [dcat, setDcat] = useState<'ALL' | 'CONTAINER' | 'VEHICLE'>('ALL');
  const tpl = tpls.find((t) => t.inspectionTemplateId === sel) ?? tpls[0];

  return (
    <SetupPage
      title="Inspection checklists"
      ms="M1"
      sub="What the inspector checks at gate-in and gate-out, in order, and the damage codes they pick from"
      sources={[SRC.inspection, SRC.damage]}
    >
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'templates', label: 'Checklists', count: tpls.length },
          { id: 'damage', label: 'Damage codes', count: damageCodes.length },
        ]}
      />

      {tab === 'templates' && tpl && (
        <Split
          narrow
          list={
            <ListPanel
              title="Checklists"
              selected={tpl.inspectionTemplateId}
              onSelect={(id) => setSel(Number(id))}
              actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Checklist added')}>Add</Button>}
              items={tpls.map((t) => ({
                id: t.inspectionTemplateId,
                lead: t.category === 'VEHICLE' ? <Car size={18} /> : <Container size={18} />,
                title: t.templateName,
                sub: `Version ${t.versionNo} · ${t.items.length} items`,
              }))}
            />
          }
        >
          <ChecklistEditor
            key={tpl.inspectionTemplateId + '-' + tpl.versionNo}
            tpl={tpl}
            onSave={(t) => {
              inspectionApi.saveChecklist(t).catch(() => {});
              setTpls((all) => all.map((x) => (x.inspectionTemplateId === t.inspectionTemplateId ? t : x)));
              toast(`Version ${t.versionNo} saved`);
            }}
          />
        </Split>
      )}

      {tab === 'damage' && (
        <Panel
          flush
          title="Damage codes"
          sub="Picked per finding; M&R estimates and claims group by them"
          actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Damage code added')}>Add damage code</Button>}
        >
          <div className="toolbar">
            <Chips
              value={dcat}
              onChange={setDcat}
              options={[{ id: 'ALL', label: 'All' }, { id: 'CONTAINER', label: 'Containers' }, { id: 'VEHICLE', label: 'Vehicles' }]}
            />
          </div>
          <DataTable
            rows={damageCodes.filter((d) => dcat === 'ALL' || d.appliesTo === dcat || d.appliesTo === 'ANY')}
            rowKey={(d) => d.damageCode}
            cols={[
              { key: 'c', header: 'Code', render: (d) => <span className="adm-cond strong">{d.damageCode}</span> },
              { key: 'n', header: 'Name', render: (d) => d.damageName },
              { key: 'a', header: 'Applies to', render: (d) => d.appliesTo === 'ANY' ? <span className="muted small">Containers and vehicles</span> : <Pill tone="info">{d.appliesTo === 'VEHICLE' ? 'Vehicles' : 'Containers'}</Pill> },
            ]}
          />
        </Panel>
      )}
    </SetupPage>
  );
}

export { InspectionView as Inspection };
export default InspectionView;
