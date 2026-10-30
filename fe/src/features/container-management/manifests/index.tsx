import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check as CheckIcon, FileSpreadsheet, FileUp, Play, RotateCcw, Undo2, UserPlus, Wand2 } from 'lucide-react';
import type { S } from '@/api/types';
import {
  Banner, Button, Check, Chips, CommonTable, DateCell, DataTable, Empty, Field, Input, Kpi, Page, PageHeader, Panel, Pill, ReferenceCell, Segmented, Select, Stepper, Tabs, UnitNo,
  useToast,
} from '@/ds/components';
import type { Tone } from '@/ds/status';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { parties, vesselCalls } from '@/mock/core';
import { iso6346 } from '@/mock/gen';
import { ISO_TYPE, UNIT_TYPES, sampleManifestLines, type MLine, type ManifestRow } from '@/mock/cargo';

export { manifestsApi } from './api';

/* Manifest import: POST /manifests (upload) → GET /lines (validation) →
   PATCH lines (inline fixes) → POST :apply (creates consignments and
   expected units). Nothing is created until apply. */
type Step = 'upload' | 'parsing' | 'review' | 'result';
type View = 'import' | 'past';
const MF_TONE: Record<string, [string, Tone]> = {
  VALIDATING: ['Validating', 'wait'], REVIEW: ['In review', 'wait'], APPLIED: ['Applied', 'go'], PARTIAL: ['Applied with errors', 'wait'], REJECTED: ['Rejected', 'stop'],
};
const LINE_TONE: Record<string, [string, Tone]> = {
  NEW: ['Ready', 'go'], CREATED: ['Created', 'go'], MATCHED: ['Linked to existing', 'go'], DUPLICATE: ['Duplicate', 'stop'], INVALID: ['Needs fixing', 'stop'], IGNORED: ['Skipped', 'idle'],
};
const validCd = (u: string) => /^[A-Z]{4}\d{7}$/.test(u) && iso6346(u.slice(0, 10)) === u[10];

export function Manifests() {
  const [view, setView] = useState<View>('import');
  const { data: dbManifests } = useQ(['manifests'], () =>
    api.get<any>('/manifests').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const past = Array.isArray(dbManifests) ? dbManifests : [];
  return (
    <Page>
      <PageHeader title="Manifest import" ms="M1" sub="Load the line's discharge list or CUSCAR/COPRAR file to create consignments and expected units" />
      <Tabs<View> value={view} onChange={setView} tabs={[{ id: 'import', label: 'New import' }, { id: 'past', label: 'Past imports', count: past.length }]} />
      {view === 'import' ? <Wizard /> : <Past rows={past} />}
    </Page>
  );
}

function Past({ rows }: { rows: ManifestRow[] }) {
  const [q, setQ] = useState('');
  const filtered = rows.filter(m =>
    !q || m.fileName?.toLowerCase().includes(q.toLowerCase()) ||
    m.manifestRef?.toLowerCase().includes(q.toLowerCase()) ||
    m.vesselLabel?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <CommonTable
      rows={filtered}
      rowKey={(m) => m.manifestId!}
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="Filter manifest file or vessel call..."
      itemLabel="manifests"
      emptyTitle="No imports yet"
      emptySubtitle="Start one from New import tab."
      cols={[
        {
          key: 'f',
          header: 'File',
          render: (m) => (
            <div className="row" style={{ gap: 8 }}>
              <FileSpreadsheet size={16} />
              <ReferenceCell
                refNo={m.fileName}
                sub={m.manifestRef}
              />
            </div>
          )
        },
        { key: 'v', header: 'Vessel call', render: (m) => <span className="small">{m.vesselLabel}</span> },
        { key: 'src', header: 'Source', render: (m) => <span className="small">{m.source === 'CSV' ? 'EDI file' : m.source === 'API' ? 'NG sync' : 'Excel'}</span> },
        { key: 'l', header: 'Lines', num: true, render: (m) => m.lineCount },
        { key: 'c', header: 'Created', num: true, render: (m) => m.createdCount },
        { key: 'm', header: 'Matched', num: true, render: (m) => m.matchedCount },
        { key: 'e', header: 'Errors', num: true, render: (m) => (m.errorCount ? <strong style={{ color: 'var(--stop)' }}>{m.errorCount}</strong> : 0) },
        { key: 'by', header: 'Imported', render: (m) => <DateCell value={m.importedAt} withTime /> },
        { key: 's', header: 'Status', render: (m) => { const [l, t] = MF_TONE[m.status ?? ''] ?? [m.status, 'info']; return <Pill tone={t}>{l}</Pill>; } },
      ]}
    />
  );
}

function Wizard() {
  const qc = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState<Step>('upload');
  const { data: dbVesselCalls } = useQ(['vessel-calls'], () =>
    api.get<any>('/vessel-calls').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const calls = Array.isArray(dbVesselCalls) ? dbVesselCalls : [];
  const [vc, setVc] = useState(String(calls[0]?.vesselCallId || '1'));
  const [fmt, setFmt] = useState<'EXCEL' | 'EDI'>('EXCEL');
  const [file, setFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState<MLine[]>([]);
  const [filter, setFilter] = useState<'all' | 'fix' | 'ok'>('fix');
  const [provisional, setProvisional] = useState<string[]>([]);
  const [result, setResult] = useState<S<'ManifestApplyResult'> & { consignments: number } | null>(null);

  useEffect(() => {
    if (calls.length > 0 && !calls.some(c => String(c.vesselCallId) === vc)) {
      setVc(String(calls[0].vesselCallId));
    }
  }, [calls, vc]);

  useEffect(() => {
    if (step !== 'parsing') return;
    if (progress >= 100) { setLines(sampleManifestLines.map((l) => ({ ...l }))); setStep('review'); return; }
    const t = setTimeout(() => setProgress((p) => Math.min(100, p + 20)), 180);
    return () => clearTimeout(t);
  }, [step, progress]);

  const open = lines.filter((l) => l.matchStatus === 'INVALID' || l.matchStatus === 'DUPLICATE');
  const ready = lines.filter((l) => l.matchStatus === 'NEW' || l.matchStatus === 'MATCHED');
  const shown = lines.filter((l) => filter === 'all' || (filter === 'fix' ? open.includes(l) : !open.includes(l)));
  const patch = (n: number, p: Partial<MLine>) => setLines((ls) => ls.map((l) => (l.lineNo === n ? { ...l, ...p } : l)));
  const fixed = (n: number, p: Partial<MLine>) => patch(n, { ...p, matchStatus: 'NEW', errorText: undefined, issue: undefined });
  const blCount = new Set(ready.map((l) => l.blNo)).size;

  const steps: { label: string; state: 'done' | 'current' | 'todo' | 'fail'; note?: string }[] = [
    { label: 'Upload file', state: step === 'upload' ? 'current' : 'done' },
    { label: 'Read and check', state: step === 'parsing' ? 'current' : step === 'upload' ? 'todo' : 'done' },
    { label: 'Review and fix', state: step === 'review' ? 'current' : step === 'result' ? 'done' : 'todo', note: step === 'review' ? `${open.length} to fix` : undefined },
    { label: 'Apply', state: step === 'result' ? 'done' : 'todo' },
    { label: 'Result', state: step === 'result' ? 'current' : 'todo' },
  ];

  const apply = async (skipOpen: boolean) => {
    const skipped = skipOpen ? open : [];
    const updatedLines = lines.map((l) => (skipped.includes(l) ? { ...l, matchStatus: 'IGNORED' as const } : l.matchStatus === 'MATCHED' ? l : { ...l, matchStatus: 'CREATED' as const }));
    setLines(updatedLines);

    try {
      const createdMan = await api.post<any>('/manifests', {
        manifestNo: `MAN-${Date.now().toString().slice(-6)}`,
        vesselCallId: Number(vc),
        fileName: file || 'discharge_list.xlsx',
        format: fmt,
        items: updatedLines,
      });

      if (createdMan?.manifestId) {
        await api.post(`/manifests/${createdMan.manifestId}:apply`, {});
      }
      qc.invalidateQueries({ queryKey: ['manifests'] });
      qc.invalidateQueries({ queryKey: ['consignments'] });
      qc.invalidateQueries({ queryKey: ['units'] });
    } catch (err: any) {
      console.warn('Manifest apply API warning:', err);
    }

    setResult({
      created: ready.filter((l) => l.matchStatus === 'NEW').length,
      matched: ready.filter((l) => l.matchStatus === 'MATCHED').length,
      skipped: skipped.length + lines.filter((l) => l.matchStatus === 'IGNORED').length,
      consignments: blCount,
      errors: skipped.map((l) => ({ lineNo: l.lineNo!, message: l.errorText ?? 'Not fixed' })),
    });
    setStep('result');
    toast('Manifest applied');
  };
  const restart = () => { setStep('upload'); setFile(null); setProgress(0); setLines([]); setResult(null); setProvisional([]); setFilter('fix'); };

  return (
    <div className="stack-lg">
      <Panel><Stepper steps={steps} /></Panel>

      {step === 'upload' && (
        <Panel title="Upload the manifest" sub="Excel discharge list from the line, or an EDI file (CUSCAR / COPRAR)">
          <div className="stack-lg">
            <div className="form-grid">
              <Field label="Vessel call" required>
                <Select value={vc} onChange={(e) => setVc(e.target.value)} options={calls.map((v) => [String(v.vesselCallId), `${v.vesselName} ${v.voyageNo} · ${(v.status || '').toLowerCase()}`])} />
              </Field>
              <Field label="File format"><Segmented value={fmt} onChange={setFmt} options={[{ id: 'EXCEL', label: 'Excel' }, { id: 'EDI', label: 'EDI' }]} /></Field>
              <Field label="Mapping profile" hint="Which columns mean what, saved per line"><Select options={fmt === 'EXCEL' ? ['Southern Cross Lines discharge list v3', 'Blue Meridian Line (standard)', 'Generic Excel'] : ['CUSCAR D.95B', 'COPRAR D.00B']} /></Field>
            </div>
            <button type="button" onClick={() => setFile(fmt === 'EXCEL' ? 'SCL318N_discharge_list.xlsx' : 'SCL318N_CUSCAR.edi')}
              style={{ border: '2px dashed var(--steel)', borderRadius: 'var(--r-lg)', padding: 32, background: file ? 'var(--go-soft)' : 'var(--concrete)', cursor: 'pointer', textAlign: 'center', color: 'inherit' }}>
              <FileUp size={28} aria-hidden />
              <div className="strong" style={{ marginTop: 8 }}>{file ?? 'Drop the file here or click to choose'}</div>
              <div className="xs muted">{file ? '12 lines · 46 KB · click to choose another' : `${fmt === 'EXCEL' ? '.xlsx or .csv' : '.edi or .txt'} up to 10 MB`}</div>
            </button>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="primary" icon={<Play />} perm="manifest.import" disabled={!file} onClick={() => { setStep('parsing'); setProgress(0); }}>Read file</Button>
            </div>
          </div>
        </Panel>
      )}

      {step === 'parsing' && (
        <Panel title="Reading and checking the file">
          <div className="stack">
            <div className="meter" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Reading"><span style={{ width: `${progress}%`, background: 'var(--ink-2)' }} /></div>
            <ul className="list-plain small">
              <li className="row"><CheckIcon size={14} />Columns mapped with the saved profile</li>
              {progress >= 40 && <li className="row"><CheckIcon size={14} />Container numbers checked against ISO 6346 check digits</li>}
              {progress >= 60 && <li className="row"><CheckIcon size={14} />Consignees matched to customers and parties</li>}
              {progress >= 80 && <li className="row"><CheckIcon size={14} />Units already on site looked up</li>}
            </ul>
          </div>
        </Panel>
      )}

      {step === 'review' && (
        <>
          <div className="kpi-strip">
            <Kpi label="Lines" value={lines.length} />
            <Kpi label="Ready" value={ready.length} delta={`${blCount} BLs`} />
            <Kpi label="To fix" value={open.length} delta={open.length ? 'Fix or skip before applying' : 'All fixed'} />
            <Kpi label="Skipped" value={lines.filter((l) => l.matchStatus === 'IGNORED').length} />
          </div>
          {open.length > 0
            ? <Banner tone="wait" title={`${open.length} lines need a decision`}>Fix them here, or apply the ready lines only and fix the rest later from the past import.</Banner>
            : <Banner tone="go" title="Every line is ready">Applying creates {blCount} consignments and {ready.filter((l) => l.matchStatus === 'NEW').length} expected units.</Banner>}
          <Panel flush title="Lines" actions={<Chips value={filter} onChange={setFilter} options={[{ id: 'fix', label: 'To fix', count: open.length }, { id: 'ok', label: 'Ready', count: lines.length - open.length }, { id: 'all', label: 'All', count: lines.length }]} />}>
            <DataTable rows={shown} rowKey={(l) => l.manifestLineId!} empty={<Empty title="Nothing to fix">Every line is ready or skipped. Switch to "All" to see them.</Empty>} cols={[
              { key: 'n', header: '#', render: (l) => l.lineNo },
              { key: 'u', header: 'Unit', render: (l) => <UnitNo no={l.unitNo!} /> },
              { key: 't', header: 'Type', render: (l) => <span className="small">{ISO_TYPE[l.unitTypeRaw!] ?? l.unitTypeRaw}<div className="xs faint">{l.unitTypeRaw}</div></span> },
              { key: 'bl', header: 'BL', render: (l) => <span className="unitno">{l.blNo}</span> },
              { key: 'c', header: 'Consignee', render: (l) => <span className="small">{l.consigneeRaw}{provisional.includes(l.consigneeRaw!) && <div><Pill tone="wait">Provisional party</Pill></div>}</span> },
              { key: 'cm', header: 'Cargo', render: (l) => <span className="xs muted">{l.commodityRaw}<br />{Number(l.grossWeightKg).toLocaleString()} kg</span> },
              {
                key: 's', header: 'Check', render: (l) => <LineFix l={l} fixed={fixed} patch={patch} onProvisional={(name) => {
                  setProvisional((p) => [...p, name]);
                  setLines((ls) => ls.map((x) => (x.consigneeRaw === name && x.issue === 'UNKNOWN_CONSIGNEE' ? { ...x, matchStatus: 'NEW', errorText: undefined, issue: undefined } : x)));
                  toast(`Provisional party created: ${name}`);
                }} />
              },
            ]} />
          </Panel>
          <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" icon={<ArrowLeft />} onClick={restart}>Start again</Button>
            {open.length > 0 && <Button perm="manifest.import" onClick={() => apply(true)}>Apply {ready.length} ready lines, skip {open.length}</Button>}
            <Button variant="primary" icon={<CheckIcon />} perm="manifest.import" disabled={open.length > 0} onClick={() => apply(false)}>Apply manifest</Button>
          </div>
        </>
      )}

      {step === 'result' && result && (
        <>
          <Banner tone={result.errors?.length ? 'wait' : 'go'} title={result.errors?.length ? 'Manifest applied with lines skipped' : 'Manifest applied'}>
            {result.consignments} consignments and {result.created} expected units created on {vesselCalls.find((v) => String(v.vesselCallId) === vc)?.vesselName}. The gate now recognises these units on arrival.
          </Banner>
          <div className="kpi-strip">
            <Kpi label="Consignments created" value={result.consignments} />
            <Kpi label="Expected units created" value={result.created} />
            <Kpi label="Linked to units on site" value={result.matched} />
            <Kpi label="Skipped" value={result.skipped} />
            <Kpi label="Provisional parties" value={provisional.length} delta={provisional.length ? 'Sync to NG to confirm' : undefined} />
          </div>
          {(result.errors?.length ?? 0) > 0 && (
            <Panel flush title="Skipped lines" sub="Open this import from Past imports to fix and apply them later">
              <DataTable rows={result.errors!} rowKey={(e) => e.lineNo} cols={[
                { key: 'n', header: 'Line', render: (e) => e.lineNo },
                { key: 'm', header: 'Problem', render: (e) => <span className="small">{e.message}</span> },
              ]} />
            </Panel>
          )}
          <div className="row-wrap">
            <Link to="/consignments" className="btn">See consignments</Link>
            <Link to="/units" className="btn">See expected units</Link>
            <span className="spacer" />
            <Button variant="primary" icon={<RotateCcw />} onClick={restart}>Import another file</Button>
          </div>
        </>
      )}
    </div>
  );
}

function LineFix({ l, fixed, patch, onProvisional }: { l: MLine; fixed: (n: number, p: Partial<MLine>) => void; patch: (n: number, p: Partial<MLine>) => void; onProvisional: (name: string) => void }) {
  const [val, setVal] = useState(l.unitNo ?? '');
  const [type, setType] = useState(l.suggestion ?? UNIT_TYPES[0]);
  const [party, setParty] = useState('');
  const [remember, setRemember] = useState(true);
  const consignees = useMemo(() => parties.filter((p) => p.roles.includes('CONSIGNEE')), []);
  const n = l.lineNo!;
  const [label, tone] = LINE_TONE[l.matchStatus ?? 'NEW'];

  if (l.matchStatus === 'IGNORED') return <span className="row"><Pill tone={tone}>{label}</Pill><Button size="sm" variant="ghost" icon={<Undo2 />} onClick={() => patch(n, { matchStatus: l.issue === 'DUPLICATE' ? 'DUPLICATE' : l.issue ? 'INVALID' : 'NEW' })}>Undo</Button></span>;
  if (!l.issue || (l.matchStatus !== 'INVALID' && l.matchStatus !== 'DUPLICATE')) return <Pill tone={tone}>{label}</Pill>;

  const box = (children: React.ReactNode) => (
    <div className="stack" style={{ gap: 6, minWidth: 260, maxWidth: 340 }}>
      <span className="xs strong" style={{ color: 'var(--stop)' }}>{l.errorText}</span>
      {children}
    </div>
  );
  switch (l.issue) {
    case 'CHECK_DIGIT': {
      const ok = validCd(val.replace(/\s/g, '').toUpperCase());
      return box(<>
        <div className="row">
          <Input aria-label={`Unit number line ${n}`} value={val} onChange={(e) => setVal(e.target.value.toUpperCase())} className={ok ? undefined : 'input-error'} style={{ minHeight: 30, width: 150 }} />
          <Button size="sm" disabled={!ok} onClick={() => fixed(n, { unitNo: val.replace(/\s/g, '') })}>Save</Button>
        </div>
        {l.suggestion && <Button size="sm" variant="ghost" icon={<Wand2 />} onClick={() => fixed(n, { unitNo: l.suggestion })}>Use {l.suggestion} (fixed digit)</Button>}
        <span className="xs faint">Check the number on the paper EIR or photo before saving.</span>
      </>);
    }
    case 'UNKNOWN_CONSIGNEE':
      return box(<>
        <div className="row">
          <Select aria-label={`Consignee line ${n}`} value={party} onChange={(e) => setParty(e.target.value)} options={[['', 'Match to existing…'], ...consignees.map((p) => [String(p.partyId), p.partyName] as [string, string])]} style={{ minHeight: 30 }} />
          <Button size="sm" disabled={!party} onClick={() => fixed(n, { consigneePartyId: Number(party) })}>Match</Button>
        </div>
        <Button size="sm" icon={<UserPlus />} perm="masters.local.edit" onClick={() => onProvisional(l.consigneeRaw!)}>Create provisional party</Button>
        <span className="xs faint">A provisional party works at once and is confirmed when NG syncs it.</span>
      </>);
    case 'DUPLICATE':
      return box(<div className="row-wrap">
        <Button size="sm" onClick={() => patch(n, { matchStatus: 'MATCHED', errorText: undefined })}>Link to unit on site</Button>
        <Button size="sm" variant="ghost" onClick={() => patch(n, { matchStatus: 'IGNORED' })}>Skip line</Button>
        {l.unitStayId && <Link className="xs" to={`/units/${l.unitStayId}`}>Open unit</Link>}
      </div>);
    case 'UNKNOWN_TYPE':
      return box(<>
        <div className="row">
          <Select aria-label={`Unit type line ${n}`} value={type} onChange={(e) => setType(e.target.value)} options={UNIT_TYPES} style={{ minHeight: 30, width: 110 }} />
          <Button size="sm" onClick={() => fixed(n, { unitTypeRaw: type })}>Use type</Button>
        </div>
        <Check label={`Remember ${l.unitTypeRaw} = ${type} for this mapping profile`} checked={remember} onChange={(e) => setRemember(e.target.checked)} />
      </>);
  }
}

export default Manifests;
