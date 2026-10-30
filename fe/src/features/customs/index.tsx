import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { CalendarPlus, ClipboardCheck, Landmark, Timer } from 'lucide-react';
import type { S } from '@/api/types';
import {
  Banner, Button, Chips, CommonTable, DataTable, DateCell, Drawer, Empty, Field, Input, Kpi,
  MoneyCell, Page, PageHeader, Panel, Pill, ReferenceCell, Select, StatusCell,
  StatusPill, Tabs, Textarea, UnitNo, fmtT, useToast,
} from '@/ds/components';
import { REF_TYPE_NAME } from '@/mock/control';
import { useQ } from '@/api/query';
import { allStays, consignment, unitsOf } from '@/mock/core';
import { at, day } from '@/mock/gen';
import { EXAM_BAYS, hoursUntil, type ExamRow } from '@/mock/cargo';
import { CustomsRefDrawer } from './components/CustomsRefDrawer';

export { customsApi } from './api';

/* Customs desk: references (GET/POST /customs/refs), today's examinations
   (GET/POST /exams, :complete) and transit bonds that are running out. */
type TabId = 'refs' | 'exams' | 'bonds';
const unitNoOf = (id?: number | null) => allStays.find((s) => s.unitStayId === id)?.cargoUnit.unitNo;

export function Customs() {
  const [tab, setTab] = useState<TabId>('refs');
  const { data: refsSeed = [] } = useQ(['customs-refs'], () =>
    api.get<any>('/customs/refs').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const { data: dbExams = [] } = useQ(['customs-exams'], () =>
    api.get<any>('/exams').then(r => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const [added, setAdded] = useState<S<'CustomsRef'>[]>([]);
  const [lastEffect, setLastEffect] = useState<{ ref: string; n: number; cons?: string } | null>(null);
  const [refOpen, setRefOpen] = useState(false);
  const [localExams, setLocalExams] = useState<ExamRow[] | null>(null);
  const [waiting, setWaiting] = useState<ExamRow[]>([]);
  const exams = localExams ?? (Array.isArray(dbExams) ? dbExams : []);
  const setExams = (fn: any) => setLocalExams(typeof fn === 'function' ? fn(exams) : fn);
  const refs = [...added, ...refsSeed];
  const bonds = refs.filter((r) => r.refTypeCode === 'TRANSIT_BOND' || r.refTypeCode === 'TRANSIT_DECL');
  const expiring = bonds.filter((r) => r.status === 'ACTIVE' && r.validTo && hoursUntil(r.validTo + 'T23:59:00+03:00') < 24 * 7);

  return (
    <Page>
      <PageHeader title="Customs & exams" ms="M2" sub="Customs references, today's examinations and transit bonds"
        actions={<Button variant="primary" icon={<Landmark />} perm="customs.ref.edit" onClick={() => setRefOpen(true)}>Add customs ref</Button>} />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Exams today" value={exams.length} delta={`${exams.filter((e: ExamRow) => e.status === 'COMPLETED').length} done · ${exams.filter((e: ExamRow) => e.status === 'IN_PROGRESS').length} in progress`} />
          <Kpi label="Waiting for an exam slot" value={waiting.length} />
          <Kpi label="Units not yet cleared" value={allStays.filter((s) => s.physicalStatus === 'IN_YARD' && ['LODGED', 'UNDER_EXAM', 'NOT_LODGED', 'QUERY'].includes(s.customsStatus ?? '')).length} />
          <Kpi label="Bonds ending within 7 days" value={expiring.length} delta={expiring.length ? 'Agent must extend or exit' : undefined} />
        </div>
        {lastEffect && (
          <Banner tone="go" title={`Customs release ${lastEffect.ref} recorded`} action={lastEffect.cons ? <Link to={`/consignments/${lastEffect.cons}`} className="btn btn-sm">Open consignment</Link> : undefined}>
            {lastEffect.n} unit{lastEffect.n === 1 ? '' : 's'} set to Cleared. Their customs condition now passes for release.
          </Banner>
        )}
        <div>
          <Tabs<TabId> value={tab} onChange={setTab} tabs={[
            { id: 'refs', label: 'Customs references', count: refs.length }, { id: 'exams', label: 'Examinations', count: exams.length + waiting.length },
            { id: 'bonds', label: 'Transit bonds', count: expiring.length },
          ]} />
          {tab === 'refs' && <Refs refs={refs} added={added} onAdd={() => setRefOpen(true)} />}
          {tab === 'exams' && <Exams exams={exams} setExams={setExams} waiting={waiting} setWaiting={setWaiting} />}
          {tab === 'bonds' && <Bonds bonds={bonds} />}
        </div>
      </div>
      <CustomsRefDrawer open={refOpen} onClose={() => setRefOpen(false)} onSaved={(r, affected, sets) => {
        setAdded((x) => [r, ...x]);
        setTab('refs');
        if (sets === 'CLEARED') setLastEffect({ ref: r.refNo, n: affected.length, cons: r.consignmentId ? String(r.consignmentId) : undefined });
      }} />
    </Page>
  );
}

function Refs({ refs, added, onAdd }: { refs: S<'CustomsRef'>[]; added: S<'CustomsRef'>[]; onAdd: () => void }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('ALL');
  const rows = refs.filter((r) => (type === 'ALL' || r.refTypeCode === type) && (!q || r.refNo.includes(q.toUpperCase()) || (consignment(r.consignmentId)?.refNo ?? '').includes(q.toUpperCase())));

  return (
    <CommonTable
      rows={rows}
      rowKey={(r) => r.customsRefId!}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="Reference or BL"
      itemLabel="references"
      emptyTitle="No references match"
      emptySubtitle="Clear the filter, or add the reference from the agent's paperwork."
      emptyAction={<Button onClick={onAdd} perm="customs.ref.edit">Add customs ref</Button>}
      toolbarFilters={
        <Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} options={[['ALL', 'All types'], ...Object.entries(REF_TYPE_NAME)]} />
      }
      cols={[
        { key: 't', header: 'Type', render: (r) => <strong className="small">{REF_TYPE_NAME[r.refTypeCode] ?? r.refTypeCode}</strong> },
        { key: 'n', header: 'Number', render: (r) => <ReferenceCell refNo={r.refNo} /> },
        { key: 'on', header: 'Applies to', render: (r: any) => r.unitStayId ? <UnitNo no={r.unitNo || (unitNoOf(r.unitStayId) ?? '—')} to={`/units/${r.unitStayId}`} /> : <Link className="small" to={`/consignments/${r.consignmentId}`}>{r.consignmentRef || consignment(r.consignmentId)?.refNo || `Consignment #${r.consignmentId}`}</Link> },
        { key: 'd', header: 'Date', render: (r) => <DateCell value={r.refDate} /> },
        { key: 'v', header: 'Valid to', render: (r) => <DateCell value={r.validTo} /> },
        { key: 'a', header: 'Amount', num: true, render: (r) => <MoneyCell amount={r.amount} currency={r.amountCurrency || 'USD'} /> },
        { key: 'src', header: 'Source', render: (r) => <span className="xs muted">{(r.source ?? 'MANUAL').toLowerCase().replace('_', ' ')}</span> },
        { key: 's', header: 'Status', render: (r) => <span className="row"><StatusCell value={r.status} track="customs" />{added.includes(r) && <span className="xs" style={{ color: 'var(--go)' }}>new</span>}</span> },
      ]}
    />
  );
}

function Exams({ exams, setExams, waiting, setWaiting }: { exams: ExamRow[]; setExams: (f: (x: ExamRow[]) => ExamRow[]) => void; waiting: ExamRow[]; setWaiting: (f: (x: ExamRow[]) => ExamRow[]) => void }) {
  const [sched, setSched] = useState<ExamRow | 'new' | null>(null);
  const [rec, setRec] = useState<ExamRow | null>(null);
  return (
    <div className="stack-lg">
      <div className="grid-3">
        {EXAM_BAYS.map((bay) => {
          const list = exams.filter((e) => e.bay === bay).sort((a, b) => Date.parse(a.scheduledAt ?? '') - Date.parse(b.scheduledAt ?? ''));
          return (
            <section key={bay} className="panel">
              <div className="panel-head"><h2 className="spacer">Bay {bay}</h2>{list.some((e) => e.status === 'IN_PROGRESS') ? <Pill tone="wait">In use</Pill> : <Pill tone="go">Free now</Pill>}</div>
              <div className="stack" style={{ padding: 12 }}>
                {list.length === 0 && <div className="small faint">Nothing booked today.</div>}
                {list.map((e) => (
                  <div key={e.examId} style={{ borderLeft: `4px solid ${e.status === 'COMPLETED' ? 'var(--go)' : e.status === 'IN_PROGRESS' ? 'var(--wait)' : 'var(--customs)'}`, paddingLeft: 10 }}>
                    <div className="row"><span className="unitno">{fmtT(e.scheduledAt)}</span><span className="spacer" /><StatusPill value={e.status} /></div>
                    <UnitNo no={e.unitNo} to={`/units/${e.unitStayId}`} />
                    <div className="xs muted">{e.examType === 'SCAN' ? 'Scan' : e.examType === 'DOCUMENT' ? 'Document check' : 'Physical exam'} · {e.authority?.toLowerCase()} · {e.noticeRef ?? 'no notice yet'}</div>
                    {e.result && <div className="xs" style={{ color: 'var(--go)' }}>Result: {e.result.toLowerCase()} · seal {e.sealApplied}</div>}
                    {e.status !== 'COMPLETED' && (
                      <div style={{ marginTop: 6 }}><Button size="sm" icon={<ClipboardCheck />} perm="customs.exam.record" onClick={() => setRec(e)}>Record result</Button></div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <Panel flush title="Waiting for a slot" sub="Exam notices recorded, not yet booked at a bay"
        actions={<Button size="sm" icon={<CalendarPlus />} perm="customs.exam.record" onClick={() => setSched('new')}>Schedule exam</Button>}>
        <DataTable rows={waiting} rowKey={(e) => e.examId!} empty={<Empty title="Nobody waiting">Every exam notice has a slot.</Empty>} cols={[
          { key: 'u', header: 'Unit', render: (e) => <UnitNo no={e.unitNo} to={`/units/${e.unitStayId}`} /> },
          { key: 'n', header: 'Notice', render: (e) => <span className="small">{e.noticeRef}</span> },
          { key: 'l', header: 'Now at', render: (e) => <span className="unitno">{allStays.find((s) => s.unitStayId === e.unitStayId)?.currentLocation?.fullCode ?? '—'}</span> },
          { key: 'a', header: '', render: (e) => <Button size="sm" perm="customs.exam.record" onClick={() => setSched(e)}>Book slot</Button> },
        ]} />
      </Panel>
      {sched && <ScheduleExam ex={sched === 'new' ? null : sched} exams={exams} onClose={() => setSched(null)} onDone={(e) => { setExams((x) => [...x, e]); setWaiting((w) => w.filter((x) => x.examId !== e.examId)); }} />}
      {rec && <RecordResult ex={rec} onClose={() => setRec(null)} onDone={(r) => setExams((x) => x.map((e) => (e.examId === rec.examId ? { ...e, status: 'COMPLETED', result: r, sealApplied: 'TRA-0088' + (e.examId! % 1000), completedAt: at(0) } : e)))} />}
    </div>
  );
}

function ScheduleExam({ ex, exams, onClose, onDone }: { ex: ExamRow | null; exams: ExamRow[]; onClose: () => void; onDone: (e: ExamRow) => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const candidates = allStays.filter((s) => s.physicalStatus === 'IN_YARD' && ['LODGED', 'UNDER_EXAM'].includes(s.customsStatus ?? '')).slice(0, 40);
  const [unit, setUnit] = useState(String(ex?.unitStayId ?? candidates[0]?.unitStayId));
  const [bay, setBay] = useState('X-06');
  const [time, setTime] = useState('16:00');
  const [type, setType] = useState<ExamRow['examType']>('PHYSICAL');
  const clash = exams.some((e) => e.bay === bay && fmtT(e.scheduledAt) === time && e.status !== 'COMPLETED');
  const s = allStays.find((x) => String(x.unitStayId) === unit);
  return (
    <Drawer open onClose={onClose} title="Schedule examination"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<CalendarPlus />} perm="customs.exam.record" disabled={clash} onClick={async () => {
        try {
          await api.post('/exams', { unitStayId: Number(unit), bay, scheduledTime: time, examType: type });
          qc.invalidateQueries({ queryKey: ['customs-exams'] });
        } catch (e) { }
        onDone({ ...(ex ?? {}), examId: ex?.examId ?? 700 + exams.length, unitStayId: Number(unit), unitNo: s?.cargoUnit?.unitNo || (s as any)?.unitNo || 'UNIT', bay, examType: type, authority: 'CUSTOMS', status: 'SCHEDULED', scheduledAt: `${day(0)}T${time}:00+03:00`, noticeRef: ex?.noticeRef });
        toast(`Exam scheduled at ${bay}, ${time}. Move order created.`); onClose();
      }}>Schedule exam</Button></>}>
      <div className="stack-lg">
        <Field label="Unit" required>{ex ? <UnitNo no={ex.unitNo} size="md" /> : <Select value={unit} onChange={(e) => setUnit(e.target.value)} options={candidates.map((c) => [String(c.unitStayId), `${c.cargoUnit.unitNo} · ${c.currentLocation?.fullCode ?? ''}`])} />}</Field>
        <div className="form-grid">
          <Field label="Exam type"><Select value={type} onChange={(e) => setType(e.target.value as ExamRow['examType'])} options={[['PHYSICAL', 'Physical exam'], ['SCAN', 'Scan'], ['DOCUMENT', 'Document check']]} /></Field>
          <Field label="Bay" required><Select value={bay} onChange={(e) => setBay(e.target.value)} options={EXAM_BAYS} /></Field>
          <Field label="Time today" required error={clash && 'This bay is booked at that time'}><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Banner>Scheduling creates a move order to bring the unit from {s?.currentLocation?.fullCode ?? 'its slot'} to {bay} 30 minutes before. The customs exam hold moves the unit to the exam tag.</Banner>
      </div>
    </Drawer>
  );
}

function RecordResult({ ex, onClose, onDone }: { ex: ExamRow; onClose: () => void; onDone: (r: NonNullable<ExamRow['result']>) => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [result, setResult] = useState<NonNullable<ExamRow['result']>>('PASSED');
  const [next, setNext] = useState('RETURN_TO_YARD');
  const bad = result !== 'PASSED';
  return (
    <Drawer open onClose={onClose} title={`Record exam result · ${ex.bay}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<ClipboardCheck />} perm="customs.exam.record" onClick={async () => {
        try {
          await api.post(`/exams/${ex.examId}:complete`, { outcome: result });
          qc.invalidateQueries({ queryKey: ['customs-exams'] });
          qc.invalidateQueries({ queryKey: ['units'] });
        } catch (e) { }
        onDone(result);
        toast('Exam result recorded');
        onClose();
      }}>Record result</Button></>}>
      <div className="stack-lg">
        <div className="row"><UnitNo no={ex.unitNo} size="md" /><span className="spacer" /><span className="small muted">{ex.noticeRef}</span></div>
        <Field label="Result" required><Chips value={result} onChange={setResult} options={(['PASSED', 'SHORTAGE', 'EXCESS', 'MISDECLARED', 'SEIZED', 'OTHER'] as const).map((r) => ({ id: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))} /></Field>
        {bad && <Banner tone="stop" title="Customs query or seizure">The unit stays on hold. A customs query hold is placed automatically and the agent is notified.</Banner>}
        <div className="form-grid">
          <Field label="Officers present" required><Input defaultValue={ex.officer ? `TRA officer ${ex.officer}` : ''} placeholder="Names as signed" /></Field>
          <Field label="Seal removed"><Input placeholder="ML-…" /></Field>
          <Field label="Seal applied" required><Input placeholder="TRA-…" /></Field>
          <Field label="Then"><Select value={next} onChange={(e) => setNext(e.target.value)} options={[['RETURN_TO_YARD', 'Return to yard (move order)'], ['KEEP_AT_EXAM', 'Keep at exam bay']]} /></Field>
        </div>
        <Field label="Remarks"><Textarea placeholder="What was opened, what was found" /></Field>
        <Field label="Photos"><div className="grid-4">{['Doors open', 'Cargo', 'New seal', 'Exam form'].map((p) => <div key={p} className="photo">{p}</div>)}</div></Field>
      </div>
    </Drawer>
  );
}

function Bonds({ bonds }: { bonds: S<'CustomsRef'>[] }) {
  const toast = useToast();
  const rows = [...bonds].sort((a, b) => (a.validTo ?? '').localeCompare(b.validTo ?? ''));
  return (
    <div className="stack-lg">
      <Banner tone="wait" title="Transit cargo must leave before the bond ends">If a bond expires with units still here, customs may treat the cargo as home use and duty becomes payable. Ask the agent to extend the bond or move the units.</Banner>
      <CommonTable
        rows={rows}
        rowKey={(r) => r.customsRefId!}
        emptyTitle="No transit bonds"
        emptySubtitle="Bonds appear here when recorded on a transit consignment."
        itemLabel="transit bonds"
        cols={[
          { key: 't', header: 'Type', render: (r) => <span className="small strong">{REF_TYPE_NAME[r.refTypeCode]}</span> },
          { key: 'n', header: 'Number', render: (r) => <ReferenceCell refNo={r.refNo} /> },
          { key: 'c', header: 'Consignment', render: (r) => <Link className="small" to={`/consignments/${r.consignmentId}`}>{consignment(r.consignmentId)?.refNo}</Link> },
          { key: 'd', header: 'Destination', render: (r) => <span className="small">{consignment(r.consignmentId)?.destinationCountry ?? '—'}</span> },
          { key: 'u', header: 'Units still here', num: true, render: (r) => unitsOf(r.consignmentId ?? 0).filter((s) => s.physicalStatus === 'IN_YARD').length },
          { key: 'a', header: 'Amount', num: true, render: (r) => <MoneyCell amount={r.amount} currency={r.amountCurrency || 'USD'} /> },
          {
            key: 'v', header: 'Valid to', render: (r) => {
              const h = hoursUntil((r.validTo ?? '') + 'T23:59:00+03:00');
              return (
                <span className="small row" style={{ gap: 6 }}>
                  <DateCell value={r.validTo} />
                  {r.status === 'ACTIVE' && (h < 0 ? <Pill tone="stop">Ended</Pill> : h < 24 * 7 ? <Pill tone="wait" icon={<Timer />}>{Math.ceil(h / 24)} days left</Pill> : null)}
                </span>
              );
            }
          },
          { key: 's', header: 'Status', render: (r) => <StatusCell value={r.status} track="customs" /> },
          { key: 'x', header: '', render: (r) => r.status === 'ACTIVE' && hoursUntil((r.validTo ?? '') + 'T23:59:00+03:00') < 24 * 7 ? <Button size="sm" perm="customs.ref.edit" onClick={() => toast('Reminder sent to the agent')}>Remind agent</Button> : null },
        ]}
      />
    </div>
  );
}

export { Customs as CustomsPage, Customs as CustomsView };
export { CustomsRefDrawer } from './components/CustomsRefDrawer';
export default Customs;
