import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ShieldAlert } from 'lucide-react';
import {
  Banner, Button, Chips, DataTable, Drawer, Empty, Field, Input, Kpi, Page, PageHeader, Panel, Pill, Select, StatusPill, UnitNo, ago, useToast,
} from '@/ds/components';
import type { Tone } from '@/ds/status';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { allStays } from '@/mock/core';
import { inspections, type Insp } from '@/mock/ops';

/* Inspections: GET /inspections for the site. Gate-in and gate-out ones are
   started from the gate lane; periodic and exam ones from here. */
export const INSP_KIND: Record<string, string> = { GATE_IN: 'Gate-in', GATE_OUT: 'Gate-out', PERIODIC: 'Periodic', EXAM: 'Customs exam', DESTUFF: 'De-stuffing', STUFF: 'Stuffing' };
export const CONDITION: Record<string, [string, Tone]> = { SOUND: ['Sound', 'go'], MINOR_DAMAGE: ['Minor damage', 'wait'], MAJOR_DAMAGE: ['Major damage', 'stop'], REJECTED: ['Rejected', 'stop'] };
export const needsApproval = (i: Insp) => i.status === 'COMPLETED' && !!i.approvalNeeded;
type K = 'all' | 'GATE_IN' | 'GATE_OUT' | 'PERIODIC' | 'EXAM';

export function Inspections() {
  const nav = useNavigate();
  const { site } = useSession();
  const { data = [] } = useQ(['inspections', site.siteId], () => delay(inspections.filter((i) => i.siteId === site.siteId)));
  const [k, setK] = useState<K>('all');
  const [startOpen, setStartOpen] = useState(false);
  const rows = data.filter((i) => k === 'all' || i.inspectionKind === k).sort((a, b) => order(a) - order(b) || b.startedAt.localeCompare(a.startedAt));
  const waiting = data.filter(needsApproval);
  const count = (x: K) => data.filter((i) => i.inspectionKind === x).length;

  return (
    <Page wide>
      <PageHeader title="Inspections" ms="M1" sub={`${site.siteName} · condition checks at the gate, in the yard and at customs exams`}
        actions={<Button variant="primary" icon={<ClipboardCheck />} perm="inspection.perform" onClick={() => setStartOpen(true)}>Start inspection</Button>} />
      <div className="stack-lg">
        {waiting.length > 0 && (
          <Banner tone="wait" title={`${waiting.length} inspection${waiting.length > 1 ? 's' : ''} with major damage waiting for approval`}
            action={<Button size="sm" onClick={() => nav(`/inspections/${waiting[0].inspectionId}`)}>Review</Button>}>
            The unit stays on a damage hold until the operations manager approves the findings.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi label="To do" value={data.filter((i) => i.status === 'PENDING').length} />
          <Kpi label="In progress" value={data.filter((i) => i.status === 'IN_PROGRESS').length} />
          <Kpi label="Waiting for approval" value={waiting.length} />
          <Kpi label="Re-inspect" value={data.filter((i) => i.status === 'REINSPECT').length} />
          <Kpi label="Damage rate (30 days)" value={7.4} unit="%" delta="Gate-in, containers" />
        </div>
        <Panel flush>
          <div className="toolbar">
            <Chips<K> value={k} onChange={setK} options={[
              { id: 'all', label: 'All', count: data.length }, { id: 'GATE_IN', label: 'Gate-in', count: count('GATE_IN') }, { id: 'GATE_OUT', label: 'Gate-out', count: count('GATE_OUT') },
              { id: 'PERIODIC', label: 'Periodic', count: count('PERIODIC') }, { id: 'EXAM', label: 'Exam', count: count('EXAM') },
            ]} />
          </div>
          <DataTable rows={rows} rowKey={(i) => i.inspectionId!} onRow={(i) => nav(`/inspections/${i.inspectionId}`)}
            empty={<Empty title="No inspections here">Switch the filter, or start one for a unit in the yard.</Empty>}
            cols={[
              { key: 'unit', header: 'Unit', render: (i) => <><UnitNo no={i.unitNo} category={i.category} /><div className="xs faint">{i.unitType}</div></> },
              { key: 'kind', header: 'Kind', render: (i) => <span className="small">{INSP_KIND[i.inspectionKind]}</span> },
              { key: 'st', header: 'Status', render: (i) => needsApproval(i) ? <Pill tone="wait" icon={<ShieldAlert />}>Needs approval</Pill> : <StatusPill value={i.status} /> },
              { key: 'cond', header: 'Condition', render: (i) => i.overallCondition ? <Pill tone={CONDITION[i.overallCondition][1]}>{CONDITION[i.overallCondition][0]}</Pill> : <span className="xs faint">Not recorded</span> },
              { key: 'f', header: 'Findings', num: true, render: (i) => i.findings?.length || '—' },
              { key: 'ph', header: 'Photos', num: true, render: (i) => i.photoCount || '—' },
              { key: 'truck', header: 'Truck', render: (i) => (i.plateNo ? <span className="unitno unitno-sm">{i.plateNo}</span> : '—') },
              { key: 'who', header: 'Inspector', render: (i) => <span className="small">{i.inspector}</span> },
              { key: 'when', header: 'When', render: (i) => <span className="small">{rel(i.completedAt ?? i.startedAt)}</span> },
            ]} />
        </Panel>
      </div>
      <StartInspection open={startOpen} onClose={() => setStartOpen(false)} siteId={site.siteId} onStart={(id) => nav(`/inspections/${id}`)} />
    </Page>
  );
}
/** "12 min ago" for the past, "due in 3 h" for planned work. */
export function rel(iso: string) {
  const m = Math.round((Date.parse(iso) - Date.parse('2026-10-07T10:30:00+03:00')) / 60000);
  if (m <= 0) return ago(iso);
  return m < 60 ? `Due in ${m} min` : `Due in ${Math.round(m / 60)} h`;
}
const order = (i: Insp) => (needsApproval(i) ? 0 : i.status === 'IN_PROGRESS' ? 1 : i.status === 'PENDING' ? 2 : i.status === 'REINSPECT' ? 3 : 4);

function StartInspection({ open, onClose, siteId, onStart }: { open: boolean; onClose: () => void; siteId: number; onStart: (id: number) => void }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('PERIODIC');
  const n = q.replace(/\s/g, '').toUpperCase();
  const hit = n.length >= 4 ? allStays.find((s) => s.siteId === siteId && s.cargoUnit.category !== 'LOT' && s.cargoUnit.unitNo.includes(n)) : undefined;
  const err = n.length >= 4 && !hit ? 'No container or vehicle with that number at this site' : hit && hit.physicalStatus !== 'IN_YARD' && hit.physicalStatus !== 'AT_ACTIVITY' ? 'This unit is not in the yard' : undefined;
  return (
    <Drawer open={open} onClose={onClose} title="Start an inspection"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<ClipboardCheck />} perm="inspection.perform" disabled={!hit || !!err} onClick={() => {
        const id = 1300 + inspections.length;
        const cat = hit!.cargoUnit.category === 'VEHICLE' ? 'VEHICLE' : 'CONTAINER';
        inspections.push({ inspectionId: id, unitStayId: hit!.unitStayId!, unitNo: hit!.cargoUnit.unitNo, siteId, category: cat, unitType: hit!.cargoUnit.unitTypeCode, templateCode: cat === 'VEHICLE' ? 'VEH-STD-v3' : 'CTR-STD-v4', inspectionKind: kind as Insp['inspectionKind'], status: 'IN_PROGRESS', startedAt: new Date('2026-10-07T10:30:00+03:00').toISOString(), inspector: 'You', results: [], findings: [], photoCount: 0 });
        toast('Inspection started'); onClose(); onStart(id);
      }}>Start inspection</Button></>}>
      <div className="stack">
        <Field label="Container number or VIN" required error={err} hint="At least 4 characters"><Input xl value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. 402117" autoFocus /></Field>
        {hit && !err && <div className="row-wrap"><UnitNo no={hit.cargoUnit.unitNo} category={hit.cargoUnit.category} size="md" /><span className="small muted">{hit.cargoUnit.unitTypeCode} · {hit.currentLocation?.fullCode}</span></div>}
        <Field label="Kind" required><Select value={kind} onChange={(e) => setKind(e.target.value)} options={[['PERIODIC', 'Periodic (yard check)'], ['EXAM', 'Customs exam'], ['GATE_OUT', 'Gate-out']]} /></Field>
        <p className="xs faint">Gate-in inspections start from the gate lane when the truck is at the inner gate.</p>
      </div>
    </Drawer>
  );
}
