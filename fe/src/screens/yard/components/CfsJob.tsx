import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, FileSignature, Play, Plus, ShieldCheck } from 'lucide-react';
import {
  Banner, Button, DL, Drawer, Empty, Field, Input, Page, PageHeader, Panel, Pill, Select, StatusPill, UnitNo, fmtDT, useToast,
} from '@/ds/components';
import type { S } from '@/api/types';
import { useQ, delay } from '@/api/query';
import { equipment } from '@/mock/core';
import { contractors, jobs, type Job } from '@/mock/ops';
import { JOB_KIND } from './Cfs';

/* CFS job: PUT /handling-jobs/{id}/lines saves the tally, :complete signs it,
   :approve (cfs.job.approve) clears shortages, excess or damage. */
type Line = S<'HandlingJobLine'>;
const recalc = (l: Line): Line => ({ ...l, shortQty: Math.max(0, (l.packagesDeclared ?? 0) - l.packagesCounted), excessQty: Math.max(0, l.packagesCounted - (l.packagesDeclared ?? 0)) });

export function CfsJob() {
  const { handlingJobId } = useParams();
  const id = Number(handlingJobId);
  const { data: job, isLoading } = useQ(['handling-job', id], () => delay(jobs.find((j) => j.handlingJobId === id)));
  const toast = useToast();
  const [status, setStatus] = useState<Job['status']>();
  const [lines, setLines] = useState<Line[]>([]);
  const [contractor, setContractor] = useState('');
  const [labour, setLabour] = useState('');
  const [completeOpen, setCompleteOpen] = useState(false);
  useEffect(() => {
    if (!job) return;
    setStatus(job.status); setLines(job.lines); setContractor(String(job.labourContractorId ?? '')); setLabour(String(job.labourCount ?? ''));
  }, [job]);

  if (isLoading) return <Page><Empty title="Loading job" /></Page>;
  if (!job) return <Page><Empty title="No CFS job with this number" action={<Link to="/cfs">Back to CFS jobs</Link>} /></Page>;

  const editable = status === 'IN_PROGRESS';
  const d = lines.reduce((a, l) => ({ short: a.short + (l.shortQty ?? 0), excess: a.excess + (l.excessQty ?? 0), damaged: a.damaged + (l.damagedQty ?? 0) }), { short: 0, excess: 0, damaged: 0 });
  const disc = d.short + d.excess + d.damaged > 0;
  const upd = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? recalc({ ...l, ...p }) : l)));
  const num = (v: string) => Number(v.replace(/\D/g, '') || 0);
  const totalExp = lines.reduce((a, l) => a + (l.packagesDeclared ?? 0), 0), totalCnt = lines.reduce((a, l) => a + l.packagesCounted, 0);

  return (
    <Page wide>
      <PageHeader crumbs={[['CFS jobs', '/cfs'], [job.jobNo ?? '']]} title={`${JOB_KIND[job.jobKind]} ${job.jobNo}`} ms="M5"
        sub={<span className="row-wrap" style={{ marginTop: 8 }}>
          {status === 'COMPLETED' && disc ? <Pill tone="wait">Needs approval</Pill> : <StatusPill value={status} />}
          <UnitNo no={job.containerNo} to={`/units/${job.containerStayId}`} />
          <span className="small muted">{job.containerType} · {job.consignmentRef} · {job.customer}</span>
        </span>}
        actions={<>
          {status === 'PLANNED' && <Button variant="primary" icon={<Play />} perm="cfs.job.manage" onClick={() => { setStatus('IN_PROGRESS'); toast('Job started'); }}>Start job</Button>}
          {status === 'IN_PROGRESS' && <Button variant="primary" icon={<CheckCircle2 />} perm="cfs.job.manage" onClick={() => setCompleteOpen(true)}>Complete job</Button>}
        </>} />

      <div className="stack-lg">
        {status === 'COMPLETED' && disc && (
          <Banner tone="stop" title="Tally does not match: needs approval">
            {d.short} short, {d.excess} excess, {d.damaged} damaged. The lots stay blocked for delivery and the shipping line gets the shortage report once approved.
            <div className="row-wrap" style={{ marginTop: 8 }}><Button size="sm" variant="primary" icon={<ShieldCheck />} perm="cfs.job.approve" level="APPR" onClick={() => { setStatus('APPROVED'); toast('Tally approved. Lots released for delivery.'); }}>Approve tally</Button></div>
          </Banner>
        )}
        {status === 'APPROVED' && <Banner tone="go" title="Tally approved">Lots are available for delivery against release orders.</Banner>}
        {status === 'PLANNED' && <Banner tone="wait" title={`Planned for ${fmtDT(job.plannedAt)}`}>{job.remarks ?? 'Start the job when the labour gang and the customs officer are at the container.'}</Banner>}

        <div className="grid-main-side ops-gms">
          <style>{'.ops-gms > * { min-width: 0; }'}</style>
          <Panel title="Tally" sub={`${totalCnt} of ${totalExp} packages counted`} flush
            actions={editable && <Button size="sm" icon={<Plus />} perm="cfs.job.manage" onClick={() => setLines((ls) => [...ls, { handlingJobLineId: 70000 + ls.length, lineNo: ls.length + 1, marksNumbers: 'NO MARKS', description: '', packageType: 'CARTON', packagesDeclared: 0, packagesCounted: 0, shortQty: 0, excessQty: 0, damagedQty: 0 }])}>Add line (not on manifest)</Button>}>
            <div className="table-wrap">
              <table className="dt">
                <thead><tr><th>#</th><th>Marks and description</th><th className="num">Expected</th><th className="num">Counted</th><th className="num">Short</th><th className="num">Excess</th><th className="num">Damaged</th><th>Lot</th></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.handlingJobLineId}>
                      <td className="small">{l.lineNo}</td>
                      <td style={{ minWidth: 200 }}>
                        <div className="strong small">{l.marksNumbers}</div>
                        {editable && !l.description ? <Input value={l.description ?? ''} onChange={(e) => upd(i, { description: e.target.value })} placeholder="What is it?" /> : <div className="small">{l.description}</div>}
                        <div className="xs faint">{l.packageType?.toLowerCase()}{l.weightKg ? ` · ${Number(l.weightKg).toLocaleString()} kg` : ''}</div>
                        {l.damageNote && <div className="xs" style={{ color: 'var(--stop)' }}>{l.damageNote}</div>}
                      </td>
                      <td className="num">{l.packagesDeclared ?? 0}</td>
                      <td className="num">{editable ? <Input xl value={String(l.packagesCounted)} inputMode="numeric" style={{ width: 96, textAlign: 'right' }} aria-label={`Counted, line ${l.lineNo}`} onChange={(e) => upd(i, { packagesCounted: num(e.target.value) })} /> : <strong>{l.packagesCounted}</strong>}</td>
                      <td className="num" style={{ color: l.shortQty ? 'var(--stop)' : undefined, fontWeight: l.shortQty ? 700 : undefined }}>{l.shortQty || '—'}</td>
                      <td className="num" style={{ color: l.excessQty ? 'var(--wait)' : undefined, fontWeight: l.excessQty ? 700 : undefined }}>{l.excessQty || '—'}</td>
                      <td className="num">{editable ? <Input value={String(l.damagedQty ?? 0)} inputMode="numeric" style={{ width: 70, textAlign: 'right' }} aria-label={`Damaged, line ${l.lineNo}`} onChange={(e) => upd(i, { damagedQty: num(e.target.value) })} /> : <span style={{ color: l.damagedQty ? 'var(--stop)' : undefined }}>{l.damagedQty || '—'}</span>}</td>
                      <td>{l.lotUnitNo ? <span className="unitno unitno-sm">{l.lotUnitNo}</span> : <span className="xs faint">{job.jobKind === 'STUFF' ? 'Into container' : 'Created on completion'}</span>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td /><td className="strong">Total</td><td className="num strong">{totalExp}</td><td className="num strong">{totalCnt}</td><td className="num strong">{d.short || '—'}</td><td className="num strong">{d.excess || '—'}</td><td className="num strong">{d.damaged || '—'}</td><td /></tr></tfoot>
              </table>
            </div>
          </Panel>

          <div className="stack-lg">
            <Panel title="Job">
              <div className="stack">
                <Field label="Labour contractor"><Select value={contractor} disabled={status !== 'PLANNED'} onChange={(e) => setContractor(e.target.value)} options={contractors.map((c) => [String(c.labourContractorId), `${c.contractorName} · ${c.rateBasis?.toLowerCase().replace('_', ' ')}`])} /></Field>
                <Field label="Gang size"><Input value={labour} disabled={status !== 'PLANNED' && status !== 'IN_PROGRESS'} inputMode="numeric" onChange={(e) => setLabour(e.target.value.replace(/\D/g, ''))} /></Field>
                <DL items={[
                  ['Equipment', equipment.find((e) => e.equipmentId === job.equipmentId)?.equipmentName ?? '—'], ['Supervisor', job.supervisorSub],
                  ['Customs officer', job.customsOfficerName ?? '—'], ['Seal removed', job.sealRemoved ?? '—'], ['Seal applied', job.sealApplied ?? '—'],
                  ['Started', fmtDT(job.startedAt)], ['Completed', fmtDT(job.completedAt)],
                ]} />
              </div>
            </Panel>
            <Panel title="Photos">
              <div className="grid-2">{['Seal before', 'Doors open', 'Tally sheet', 'Damaged pallet'].map((p) => <div key={p} className="photo">{p}</div>)}</div>
            </Panel>
            {job.remarks && <Panel title="Remarks"><p className="small">{job.remarks}</p></Panel>}
          </div>
        </div>
      </div>

      <CompleteJob open={completeOpen} job={job} disc={disc} d={d} onClose={() => setCompleteOpen(false)} onDone={() => {
        setStatus(disc ? 'COMPLETED' : 'APPROVED');
        toast(disc ? 'Job completed. Shortages sent for approval.' : 'Job completed. Tally matches, lots released.');
      }} />
    </Page>
  );
}

function CompleteJob({ open, job, disc, d, onClose, onDone }: { open: boolean; job: Job; disc: boolean; d: { short: number; excess: number; damaged: number }; onClose: () => void; onDone: () => void }) {
  const [sup, setSup] = useState(false);
  const [cust, setCust] = useState(false);
  const [seal, setSeal] = useState('');
  const stuff = job.jobKind === 'STUFF';
  const ok = sup && (!job.customsOfficerName || cust) && (!stuff || seal.length >= 5);
  const sig = (signed: boolean, set: (b: boolean) => void, who: string) => (
    <button type="button" className="sig" onClick={() => set(true)} style={{ width: '100%', cursor: 'pointer', color: signed ? 'var(--go)' : undefined, borderColor: signed ? 'var(--go)' : undefined }}>
      {signed ? <><CheckCircle2 size={18} />&nbsp;Signed by {who}</> : <><FileSignature size={18} />&nbsp;{who} signs here</>}
    </button>
  );
  return (
    <Drawer open={open} onClose={onClose} title={`Complete ${job.jobNo}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button size="xl" variant="primary" icon={<CheckCircle2 />} perm="cfs.job.manage" disabled={!ok} onClick={() => { onDone(); onClose(); }}>Complete job</Button></>}>
      <div className="stack">
        {disc ? <Banner tone="stop" title="The tally does not match">{d.short} short, {d.excess} excess, {d.damaged} damaged. Completing sends it to the CFS manager for approval (cfs.job.approve).</Banner>
          : <Banner tone="go">Every line matches the manifest. The job is approved on completion.</Banner>}
        {stuff && <Field label="New seal applied" required><Input xl value={seal} onChange={(e) => setSeal(e.target.value.toUpperCase())} placeholder="SCL-0000000" /></Field>}
        <Field label="Tally clerk / supervisor" required>{sig(sup, setSup, job.supervisorSub ?? 'Supervisor')}</Field>
        {job.customsOfficerName && <Field label="Customs officer" required>{sig(cust, setCust, job.customsOfficerName)}</Field>}
      </div>
    </Drawer>
  );
}
