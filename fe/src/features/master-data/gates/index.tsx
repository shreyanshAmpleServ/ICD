import { useState } from 'react';
import { ArrowDown, ArrowUp, DoorOpen, Pencil, Plus } from 'lucide-react';
import { Button, DataTable, Panel, Pill, Tabs, useToast } from '@/ds/components';
import { useSession } from '@/app/session';
import { SRC, type Gate } from '@/mock/admin';
import { AuditNote, ListPanel, SetupPage, Split, YesNo, useEditable } from '../shared/AdminKit';
import { gatesApi } from './api';
import { GateDrawer } from './components/GateDrawer';
import { LaneDrawer } from './components/LaneDrawer';
import { CheckpointDrawer } from './components/CheckpointDrawer';
import { VisitTypeEditor } from './components/VisitTypeEditor';
import { VisitTypeDrawer } from './components/VisitTypeDrawer';

export { gatesApi } from './api';

type Tab = 'gates' | 'checkpoints' | 'visits';
type Lane = NonNullable<Gate['lanes']>[number];
const DIR: Record<string, string> = { IN: 'In', OUT: 'Out', BOTH: 'In and out' };
const KIND: Record<string, string> = { OUTER: 'Outer gate', INNER: 'Inner gate', WEIGHBRIDGE: 'Weighbridge', OTHER: 'Other' };

export function GatesView() {
  const { site } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('visits');
  const [gates, setGates, gatesLoading] = useEditable<Gate>('gates', [], () => gatesApi.getGates());
  const [cps, setCps, cpsLoading] = useEditable<any>('checkpoints', [], () => gatesApi.getCheckpoints());
  const [vts, setVts, vtsLoading] = useEditable<any>('visitTypes', [], () => gatesApi.getVisitTypes());
  const siteGates = gates.filter((g) => g.siteId === site.siteId);
  const [gateId, setGateId] = useState<number | null>(null);
  const [vtId, setVtId] = useState<number | null>(null);

  // Drawers state
  const [gateDrawer, setGateDrawer] = useState<{ open: boolean; gate: Partial<Gate> | null; isNew: boolean } | null>(null);
  const [vtDrawer, setVtDrawer] = useState<{ open: boolean; vt: any | null; isNew: boolean } | null>(null);
  const [lane, setLane] = useState<{ gate: Gate; lane?: Lane } | null>(null);
  const [cpEdit, setCpEdit] = useState<any | null>(null);

  const gate = siteGates.find((g) => g.gateId === gateId) ?? siteGates[0];
  const activeVtId = vtId ?? vts[0]?.visitTypeId ?? 1;
  const vt = vts.find((v: any) => v.visitTypeId === activeVtId) ?? vts[0];

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
              loading={gatesLoading}
              selected={gate?.gateId}
              onSelect={(id) => setGateId(Number(id))}
              actions={
                <Button
                  size="sm"
                  icon={<Plus />}
                  perm="admin.gate.configure"
                  onClick={() =>
                    setGateDrawer({
                      open: true,
                      gate: {
                        siteId: site.siteId,
                        gateCode: '',
                        gateName: '',
                        gateKind: 'OUTER',
                        isActive: true,
                      },
                      isNew: true,
                    })
                  }
                >
                  Add gate
                </Button>
              }
              items={siteGates.map((g) => ({
                id: g.gateId!,
                lead: <DoorOpen size={18} />,
                title: `${g.gateCode} · ${g.gateName}`,
                sub: `${KIND[g.gateKind] || g.gateKind} · ${g.lanes?.length ?? 0} lanes`,
              }))}
            />
          }
        >
          {gate && (
            <Panel
              flush
              title={`${gate.gateCode} · ${gate.gateName}`}
              sub={KIND[gate.gateKind] || gate.gateKind}
              actions={
                <div className="row" style={{ gap: 8 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Pencil size={14} />}
                    perm="admin.gate.configure"
                    onClick={() => setGateDrawer({ open: true, gate, isNew: false })}
                  >
                    Edit gate
                  </Button>
                  <Button
                    size="sm"
                    icon={<Plus />}
                    perm="admin.gate.configure"
                    onClick={() => setLane({ gate })}
                  >
                    Add lane
                  </Button>
                </div>
              }
            >
              <DataTable
                rows={gate.lanes ?? []}
                rowKey={(l) => l.gateLaneId!}
                cols={[
                  { key: 'c', header: 'Lane', render: (l) => <strong>{l.laneCode}</strong> },
                  { key: 'd', header: 'Direction', render: (l) => <span className="row">{l.direction === 'OUT' ? <ArrowUp size={14} /> : l.direction === 'IN' ? <ArrowDown size={14} /> : <><ArrowDown size={14} /><ArrowUp size={14} /></>}{DIR[l.direction] || l.direction}</span> },
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
        <Panel
          flush
          title="Checkpoints"
          sub="Places where a truck is checked. A checkpoint belongs to a gate; the tablet at that gate shows trucks waiting for it."
          actions={
            <Button
              size="sm"
              icon={<Plus />}
              perm="admin.gate.configure"
              onClick={() =>
                setCpEdit({
                  isNew: true,
                  checkpointCode: '',
                  checkpointName: '',
                  checkpointKind: 'OUTER_IN',
                  gateId: siteGates[0]?.gateId ?? null,
                  isActive: true,
                })
              }
            >
              Add checkpoint
            </Button>
          }
        >
          <DataTable
            loading={cpsLoading}
            rows={cps}
            rowKey={(c) => c.checkpointId!}
            onRow={(c) => setCpEdit({ ...c, isNew: false })}
            cols={[
              { key: 'c', header: 'Code', render: (c) => <span className="adm-code">{c.checkpointCode}</span> },
              { key: 'n', header: 'Name', render: (c) => <strong>{c.checkpointName}</strong> },
              { key: 'k', header: 'Kind', render: (c) => <span className="small">{(c.checkpointKind || '').replace(/_/g, ' ').toLowerCase()}</span> },
              { key: 'g', header: 'At gate', render: (c) => gates.find((g) => g.gateId === c.gateId)?.gateName ?? '—' },
              { key: 'u', header: 'Used by', render: (c) => <span className="small">{vts.filter((v: any) => (v.checkpoints ?? []).some((x: any) => x.checkpointCode === c.checkpointCode)).length} visit types</span> },
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
              loading={vtsLoading}
              selected={vt.visitTypeId}
              onSelect={(id) => setVtId(Number(id))}
              actions={
                <Button
                  size="sm"
                  icon={<Plus />}
                  perm="admin.gate.configure"
                  onClick={() =>
                    setVtDrawer({
                      open: true,
                      vt: {
                        siteId: site.siteId,
                        visitTypeCode: '',
                        visitTypeName: '',
                        requiresNomination: true,
                        requiresAppointment: false,
                        isActive: true,
                      },
                      isNew: true,
                    })
                  }
                >
                  Add
                </Button>
              }
              items={vts.map((v: any) => ({
                id: v.visitTypeId!,
                title: v.visitTypeName,
                sub: `${(v.checkpoints ?? []).length} checkpoints${v.requiresAppointment ? ' · appointment' : ''}`,
              }))}
            />
          }
        >
          <VisitTypeEditor
            key={vt.visitTypeId}
            vt={vt}
            cps={cps}
            onEditDetails={() => setVtDrawer({ open: true, vt, isNew: false })}
            onSave={(nv) => {
              if (nv.visitTypeId) {
                gatesApi
                  .updateVisitType(Number(nv.visitTypeId), nv)
                  .then((updated) => {
                    setVts((all: any[]) => all.map((x) => (x.visitTypeId === updated.visitTypeId ? updated : x)));
                    toast('Visit type saved');
                  })
                  .catch((err) => {
                    console.error('Error saving visit type:', err);
                    toast('Error saving visit type');
                  });
              }
            }}
          />
        </Split>
      )}

      {gateDrawer?.open && (
        <GateDrawer
          gate={gateDrawer.gate}
          isNew={gateDrawer.isNew}
          onClose={() => setGateDrawer(null)}
          onSave={(form) => {
            if (gateDrawer.isNew) {
              gatesApi
                .createGate(form)
                .then((g) => {
                  if (g?.gateId) {
                    setGates((all) => [...all, g]);
                    setGateId(g.gateId);
                  }
                  setGateDrawer(null);
                  toast('Gate added');
                })
                .catch(() => toast('Error adding gate'));
            } else {
              gatesApi
                .updateGate(Number(form.gateId), form)
                .then((g) => {
                  setGates((all) => all.map((x) => (x.gateId === g.gateId ? g : x)));
                  setGateDrawer(null);
                  toast('Gate saved');
                })
                .catch(() => toast('Error saving gate'));
            }
          }}
        />
      )}

      {vtDrawer?.open && (
        <VisitTypeDrawer
          visitType={vtDrawer.vt}
          isNew={vtDrawer.isNew}
          onClose={() => setVtDrawer(null)}
          onSave={(form) => {
            if (vtDrawer.isNew) {
              gatesApi
                .createVisitType(form)
                .then((newVt) => {
                  setVts((all: any[]) => [...all, newVt]);
                  setVtId(newVt.visitTypeId);
                  setVtDrawer(null);
                  toast('Visit type added');
                })
                .catch(() => toast('Error adding visit type'));
            } else {
              gatesApi
                .updateVisitType(Number(form.visitTypeId), form)
                .then((upVt) => {
                  setVts((all: any[]) => all.map((x) => (x.visitTypeId === upVt.visitTypeId ? upVt : x)));
                  setVtDrawer(null);
                  toast('Visit type saved');
                })
                .catch(() => toast('Error saving visit type'));
            }
          }}
        />
      )}

      {lane && (
        <LaneDrawer
          key={lane.lane?.gateLaneId ?? 'new'}
          gate={lane.gate}
          lane={lane.lane}
          onClose={() => setLane(null)}
          onSave={(l) => {
            const updatedLanes = lane.lane
              ? lane.gate.lanes!.map((x) => (x.gateLaneId === l.gateLaneId ? l : x))
              : [...(lane.gate.lanes ?? []), l];
            if (lane.gate.gateId) {
              gatesApi
                .updateGate(Number(lane.gate.gateId), { lanes: updatedLanes })
                .then((fresh) => {
                  setGates((all) => all.map((g) => (g.gateId !== fresh.gateId ? g : fresh)));
                  setLane(null);
                  toast(lane.lane ? 'Lane saved' : 'Lane added');
                })
                .catch(() => toast('Error saving lane'));
            }
          }}
        />
      )}

      {cpEdit && (
        <CheckpointDrawer
          cpEdit={cpEdit}
          siteGates={siteGates}
          onClose={() => setCpEdit(null)}
          setCpEdit={setCpEdit}
          onSave={(c) => {
            if (c.isNew) {
              gatesApi
                .createCheckpoint(c)
                .then((newCp) => {
                  setCps((all: any[]) => [...all, newCp]);
                  setCpEdit(null);
                  toast('Checkpoint added');
                })
                .catch(() => toast('Error adding checkpoint'));
            } else {
              gatesApi
                .updateCheckpoint(Number(c.checkpointId), c)
                .then((upCp) => {
                  setCps((all: any[]) => all.map((x: any) => (x.checkpointId === upCp.checkpointId ? upCp : x)));
                  setCpEdit(null);
                  toast('Checkpoint saved');
                })
                .catch(() => toast('Error saving checkpoint'));
            }
          }}
        />
      )}
    </SetupPage>
  );
}

export { GatesView as Gates };
export default GatesView;
