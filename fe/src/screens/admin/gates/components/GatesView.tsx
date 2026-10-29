import { useState } from 'react';
import { ArrowDown, ArrowUp, DoorOpen, Pencil, Plus } from 'lucide-react';
import { Button, DataTable, Panel, Pill, Tabs, useToast } from '@/ds/components';
import { useSession } from '@/app/session';
import { SRC, checkpoints as seedCps, gates as seedGates, visitTypes as seedVts, type Gate } from '@/mock/admin';
import { AuditNote, ListPanel, SetupPage, Split, YesNo, useEditable } from '../../shared/AdminKit';
import { gatesApi } from '../api';
import { LaneDrawer } from './LaneDrawer';
import { CheckpointDrawer } from './CheckpointDrawer';
import { VisitTypeEditor } from './VisitTypeEditor';

type Tab = 'gates' | 'checkpoints' | 'visits';
type VT = (typeof seedVts)[number];
type Lane = NonNullable<Gate['lanes']>[number];
const DIR: Record<string, string> = { IN: 'In', OUT: 'Out', BOTH: 'In and out' };
const KIND: Record<string, string> = { OUTER: 'Outer gate', INNER: 'Inner gate', WEIGHBRIDGE: 'Weighbridge', OTHER: 'Other' };

export function GatesView() {
  const { site } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('visits');
  const [gates, setGates] = useEditable<Gate>('gates', seedGates);
  const [cps, setCps] = useEditable('checkpoints', seedCps);
  const [vts, setVts] = useEditable<VT>('visitTypes', seedVts);
  const siteGates = gates.filter((g) => g.siteId === site.siteId);
  const [gateId, setGateId] = useState<number | null>(null);
  const [vtId, setVtId] = useState<number>(2);
  const [lane, setLane] = useState<{ gate: Gate; lane?: Lane } | null>(null);
  const [cpEdit, setCpEdit] = useState<(typeof seedCps)[number] | null>(null);
  const gate = siteGates.find((g) => g.gateId === gateId) ?? siteGates[0];
  const vt = vts.find((v) => v.visitTypeId === vtId) ?? vts[0];

  return (
    <SetupPage
      title="Gates & visit types"
      ms="M0"
      sub={`Gates, lanes, checkpoints and the route each kind of truck visit takes at ${site.siteName}`}
      sources={[SRC.gates, SRC.visitTypes]}
    >
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'visits', label: 'Visit types', count: vts.length },
          { id: 'gates', label: 'Gates and lanes', count: siteGates.length },
          { id: 'checkpoints', label: 'Checkpoints', count: cps.length },
        ]}
      />

      {tab === 'gates' && (
        <Split
          narrow
          list={
            <ListPanel
              title="Gates"
              selected={gate?.gateId}
              onSelect={(id) => setGateId(Number(id))}
              actions={
                <Button
                  size="sm"
                  icon={<Plus />}
                  perm="admin.gate.configure"
                  onClick={() => {
                    const newGate: any = {
                      siteId: site.siteId,
                      gateCode: `GATE-${siteGates.length + 1}`,
                      gateName: `Gate ${siteGates.length + 1}`,
                      gateKind: 'INNER',
                      lanes: [{ gateLaneId: Date.now() % 10000, laneCode: 'L1', direction: 'IN', isActive: true }],
                    };
                    gatesApi.createGate(newGate).then((g) => {
                      if (g?.gateId) setGates((all) => [...all, g]);
                    }).catch(() => {});
                    toast('Gate added');
                  }}
                >
                  Add gate
                </Button>
              }
              items={siteGates.map((g) => ({
                id: g.gateId!,
                lead: <DoorOpen size={18} />,
                title: `${g.gateCode} · ${g.gateName}`,
                sub: `${KIND[g.gateKind]} · ${g.lanes?.length ?? 0} lanes`,
              }))}
            />
          }
        >
          {gate && (
            <Panel
              flush
              title={`${gate.gateCode} · ${gate.gateName}`}
              sub={KIND[gate.gateKind]}
              actions={<Button size="sm" icon={<Plus />} perm="admin.gate.configure" onClick={() => setLane({ gate })}>Add lane</Button>}
            >
              <DataTable
                rows={gate.lanes ?? []}
                rowKey={(l) => l.gateLaneId!}
                cols={[
                  { key: 'c', header: 'Lane', render: (l) => <strong>{l.laneCode}</strong> },
                  { key: 'd', header: 'Direction', render: (l) => <span className="row">{l.direction === 'OUT' ? <ArrowUp size={14} /> : l.direction === 'IN' ? <ArrowDown size={14} /> : <><ArrowDown size={14} /><ArrowUp size={14} /></>}{DIR[l.direction]}</span> },
                  { key: 'a', header: 'Status', render: (l) => l.isActive ? <Pill tone="go">Open</Pill> : <Pill>Closed</Pill> },
                  { key: 'e', header: '', render: (l) => <Button size="sm" variant="ghost" icon={<Pencil />} perm="admin.gate.configure" onClick={() => setLane({ gate, lane: l })}>Edit</Button> },
                ]}
              />
            </Panel>
          )}
          <AuditNote />
        </Split>
      )}

      {tab === 'checkpoints' && (
        <Panel flush title="Checkpoints" sub="Places where a truck is checked. A checkpoint belongs to a gate; the tablet at that gate shows trucks waiting for it.">
          <DataTable
            rows={cps}
            rowKey={(c) => c.checkpointId!}
            onRow={setCpEdit}
            cols={[
              { key: 'c', header: 'Code', render: (c) => <span className="adm-code">{c.checkpointCode}</span> },
              { key: 'n', header: 'Name', render: (c) => <strong>{c.checkpointName}</strong> },
              { key: 'k', header: 'Kind', render: (c) => <span className="small">{c.checkpointKind.replace('_', ' ').toLowerCase()}</span> },
              { key: 'g', header: 'At gate', render: (c) => gates.find((g) => g.gateId === c.gateId)?.gateName ?? '—' },
              { key: 'u', header: 'Used by', render: (c) => <span className="small">{vts.filter((v) => v.checkpoints.some((x) => x.checkpointCode === c.checkpointCode)).length} visit types</span> },
              { key: 'a', header: 'Active', render: (c) => <YesNo v={c.isActive} /> },
            ]}
          />
        </Panel>
      )}

      {tab === 'visits' && vt && (
        <Split
          list={
            <ListPanel
              title="Visit types"
              selected={vt.visitTypeId}
              onSelect={(id) => setVtId(Number(id))}
              actions={<Button size="sm" icon={<Plus />} perm="admin.gate.configure" onClick={() => toast('Visit type added')}>Add</Button>}
              items={vts.map((v) => ({ id: v.visitTypeId!, title: v.visitTypeName, sub: `${v.checkpoints.length} checkpoints${v.requiresAppointment ? ' · appointment' : ''}` }))}
            />
          }
        >
          <VisitTypeEditor
            key={vt.visitTypeId}
            vt={vt}
            cps={cps}
            onSave={(nv) => {
              if (nv.visitTypeId) gatesApi.updateVisitType(Number(nv.visitTypeId), nv).catch(() => {});
              setVts((all) => all.map((x) => (x.visitTypeId === nv.visitTypeId ? nv : x)));
              toast('Visit type saved');
            }}
          />
        </Split>
      )}

      {lane && (
        <LaneDrawer
          key={lane.lane?.gateLaneId ?? 'new'}
          gate={lane.gate}
          lane={lane.lane}
          onClose={() => setLane(null)}
          onSave={(l) => {
            const updatedLanes = lane.lane ? lane.gate.lanes!.map((x) => (x.gateLaneId === l.gateLaneId ? l : x)) : [...(lane.gate.lanes ?? []), l];
            if (lane.gate.gateId) gatesApi.updateGate(Number(lane.gate.gateId), { lanes: updatedLanes }).catch(() => {});
            setGates((all) => all.map((g) => (g.gateId !== lane.gate.gateId ? g : { ...g, lanes: updatedLanes })));
            toast(lane.lane ? 'Lane saved' : 'Lane added');
          }}
        />
      )}

      <CheckpointDrawer
        cpEdit={cpEdit}
        siteGates={siteGates}
        onClose={() => setCpEdit(null)}
        setCpEdit={setCpEdit}
        onSave={(c) => {
          if (c.checkpointId) gatesApi.updateCheckpoint(Number(c.checkpointId), c).catch(() => {});
          setCps((all) => all.map((x) => (x.checkpointId === c.checkpointId ? c : x)));
          toast('Checkpoint saved');
        }}
      />
    </SetupPage>
  );
}
