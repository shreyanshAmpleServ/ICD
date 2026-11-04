import { useState } from 'react';
import { Car, Container, Plus } from 'lucide-react';
import { Button, Chips, DataTable, Panel, Pill, Tabs, useToast } from '@/ds/components';
import { SRC, damageCodes as seedDamageCodes, inspectionTemplates as seedTpl } from '@/mock/admin';
import { ListPanel, SetupPage, Split, useEditable } from '../shared/AdminKit';
import { useQ } from '@/api/query';
import { inspectionApi } from './api';
import { ChecklistEditor } from './components/ChecklistEditor';
import { AddChecklistModal } from './components/AddChecklistModal';
import { AddDamageCodeModal } from './components/AddDamageCodeModal';

export { inspectionApi } from './api';

type Tab = 'templates' | 'damage';
type Tpl = (typeof seedTpl)[number];

export function InspectionView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('templates');
  const [tpls, setTpls] = useEditable<Tpl>('inspTpl', seedTpl, () => inspectionApi.getInspectionTemplates());
  const { data: damageData, refetch: refetchDamageCodes } = useQ<any[]>(['admin', 'damageCodes'], () => inspectionApi.getDamageCodes());
  
  // Local list to support optimistic append alongside query data
  const [localAddedDamages, setLocalAddedDamages] = useState<any[]>([]);
  const damageCodes = [
    ...localAddedDamages,
    ...((Array.isArray(damageData) && damageData.length > 0) ? damageData : seedDamageCodes),
  ].filter((d, i, arr) => arr.findIndex((x) => x.damageCode === d.damageCode) === i);

  const [sel, setSel] = useState<number>(3);
  const [dcat, setDcat] = useState<'ALL' | 'CONTAINER' | 'VEHICLE'>('ALL');

  // Modal open states
  const [addChecklistOpen, setAddChecklistOpen] = useState(false);
  const [addDamageOpen, setAddDamageOpen] = useState(false);

  const tpl = tpls.find((t) => t.inspectionTemplateId === sel) ?? tpls[0];

  return (
    <SetupPage
      title="Inspection checklists"
      ms="M1"
      sub="What the inspector checks at gate-in and gate-out, in order, and the damage codes they pick from"
      sources={[SRC.inspection, SRC.damage]}
      actions={
        tab === 'templates' ? (
          <Button
            variant="primary"
            icon={<Plus />}
            perm="admin.config.manage"
            onClick={() => setAddChecklistOpen(true)}
          >
            Add checklist
          </Button>
        ) : (
          <Button
            variant="primary"
            icon={<Plus />}
            perm="admin.config.manage"
            onClick={() => setAddDamageOpen(true)}
          >
            Add damage code
          </Button>
        )
      }
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
              actions={
                <Button
                  size="sm"
                  icon={<Plus />}
                  perm="admin.config.manage"
                  onClick={() => setAddChecklistOpen(true)}
                >
                  Add
                </Button>
              }
              items={tpls.map((t) => ({
                id: t.inspectionTemplateId,
                lead: (t.category || (t as any).unitCategory) === 'VEHICLE' ? <Car size={18} /> : <Container size={18} />,
                title: t.templateName,
                sub: `Version ${t.versionNo ?? 1} · ${(t.items ?? []).length} items`,
              }))}
            />
          }
        >
          <ChecklistEditor
            key={tpl.inspectionTemplateId + '-' + (tpl.versionNo ?? 1)}
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
          actions={
            <Button
              size="sm"
              icon={<Plus />}
              perm="admin.config.manage"
              onClick={() => setAddDamageOpen(true)}
            >
              Add damage code
            </Button>
          }
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
            rowKey={(d) => d.damageCode || d.code}
            cols={[
              {
                key: 'c',
                header: 'Code',
                render: (d) => <span className="adm-cond strong">{d.damageCode || d.code}</span>,
              },
              {
                key: 'n',
                header: 'Name',
                render: (d) => d.damageName || d.name,
              },
              {
                key: 'a',
                header: 'Applies to',
                render: (d) =>
                  d.appliesTo === 'ANY' || d.appliesTo === 'ALL' ? (
                    <span className="muted small">Containers and vehicles</span>
                  ) : (
                    <Pill tone="info">{d.appliesTo === 'VEHICLE' ? 'Vehicles' : 'Containers'}</Pill>
                  ),
              },
            ]}
          />
        </Panel>
      )}

      {/* Add Checklist Modal */}
      <AddChecklistModal
        open={addChecklistOpen}
        onClose={() => setAddChecklistOpen(false)}
        onCreated={(newTpl) => {
          setTpls((prev) => [newTpl, ...prev]);
          if (newTpl.inspectionTemplateId) {
            setSel(newTpl.inspectionTemplateId);
          }
        }}
      />

      {/* Add Damage Code Modal */}
      <AddDamageCodeModal
        open={addDamageOpen}
        onClose={() => setAddDamageOpen(false)}
        onCreated={(newDmg) => {
          setLocalAddedDamages((prev) => [newDmg, ...prev]);
          refetchDamageCodes();
        }}
      />
    </SetupPage>
  );
}

export { InspectionView as Inspection };
