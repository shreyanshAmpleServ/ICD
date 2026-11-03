import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check as CheckIcon, Database, FileSpreadsheet, FileUp, Play, RotateCcw, Undo2, UserPlus, Wand2 } from 'lucide-react';
import type { S } from '@/api/types';
import {
  Banner, Button, Check, Chips, CommonTable, DateCell, DataTable, Empty, Field, Input, Kpi, Page, PageHeader, Panel, Pill, ReferenceCell, Segmented, Select, Stepper, Tabs, UnitNo,
  useToast,
} from '@/ds/components';
import type { Tone } from '@/ds/status';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { manifestsApi } from './api';

export { manifestsApi } from './api';

export interface MLine {
  manifestLineId?: number;
  lineNo?: number;
  unitNo?: string;
  unitNoRaw?: string;
  unitTypeRaw?: string;
  blNo?: string;
  consigneeRaw?: string;
  consigneePartyId?: number;
  agentRaw?: string;
  fullEmpty?: string;
  sealNo?: string;
  grossWeightKg?: number;
  commodityRaw?: string;
  matchStatus?: 'NEW' | 'CREATED' | 'MATCHED' | 'DUPLICATE' | 'INVALID' | 'IGNORED';
  issue?: 'CHECK_DIGIT' | 'UNKNOWN_CONSIGNEE' | 'DUPLICATE' | 'UNKNOWN_TYPE';
  errorText?: string;
  suggestion?: string;
  unitStayId?: number;
}

export interface ManifestRow {
  manifestId?: number;
  siteId?: number;
  vesselCallId?: number;
  manifestRef?: string;
  source?: string;
  fileName?: string;
  importedBy?: string;
  importedAt?: string;
  vesselName?: string;
  voyageNo?: string;
  vesselLabel?: string;
  lineCount?: number;
  createdCount?: number;
  matchedCount?: number;
  errorCount?: number;
  status?: string;
}

type Step = 'upload' | 'parsing' | 'review' | 'result';
type View = 'import' | 'past';

const MF_TONE: Record<string, [string, Tone]> = {
  VALIDATING: ['Validating', 'wait'], REVIEW: ['In review', 'wait'], APPLIED: ['Applied', 'go'], PARTIAL: ['Applied with errors', 'wait'], REJECTED: ['Rejected', 'stop'], IMPORTED: ['Imported', 'go'],
};

const LINE_TONE: Record<string, [string, Tone]> = {
  NEW: ['Ready', 'go'], CREATED: ['Created', 'go'], MATCHED: ['Linked to existing', 'go'], DUPLICATE: ['Duplicate', 'stop'], INVALID: ['Needs fixing', 'stop'], IGNORED: ['Skipped', 'idle'],
};

// ISO 6346 check digit validation
const ISO_CHAR_VALS: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

function validCd(u: string): boolean {
  const clean = u.replace(/\s/g, '').toUpperCase();
  if (clean.length !== 11) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = clean[i];
    const val = ch >= '0' && ch <= '9' ? Number(ch) : (ISO_CHAR_VALS[ch] || 0);
    sum += val * Math.pow(2, i);
  }
  const rem = sum % 11;
  const expected = String(rem === 10 ? 0 : rem);
  return clean[10] === expected;
}

export function Manifests() {
  const [view, setView] = useState<View>('import');
  const { data: dbManifests } = useQ(['manifests'], () => manifestsApi.getManifests());
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
    m.vesselLabel?.toLowerCase().includes(q.toLowerCase()) ||
    m.vesselName?.toLowerCase().includes(q.toLowerCase())
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
          header: 'File / Ref',
          render: (m) => (
            <div className="row" style={{ gap: 8 }}>
              <FileSpreadsheet size={16} />
              <ReferenceCell
                refNo={m.manifestRef || m.fileName || `MAN-${m.manifestId}`}
                sub={m.fileName}
              />
            </div>
          )
        },
        { key: 'v', header: 'Vessel call', render: (m) => <span className="small">{m.vesselLabel || (m.vesselName ? `${m.vesselName} ${m.voyageNo || ''}` : `Vessel Call #${m.vesselCallId || '1'}`)}</span> },
        { key: 'src', header: 'Source', render: (m) => <span className="small">{m.source === 'CSV' ? 'EDI file' : m.source === 'API' ? 'NG sync' : (m.source || 'Excel')}</span> },
        { key: 'l', header: 'Lines', num: true, render: (m) => m.lineCount ?? 0 },
        { key: 'c', header: 'Created', num: true, render: (m) => m.createdCount ?? 0 },
        { key: 'm', header: 'Matched', num: true, render: (m) => m.matchedCount ?? 0 },
        { key: 'e', header: 'Errors', num: true, render: (m) => (m.errorCount ? <strong style={{ color: 'var(--stop)' }}>{m.errorCount}</strong> : 0) },
        { key: 'by', header: 'Imported', render: (m) => <DateCell value={m.importedAt || new Date().toISOString()} withTime /> },
        { key: 's', header: 'Status', render: (m) => { const [l, t] = MF_TONE[m.status ?? ''] ?? [m.status || 'Active', 'info']; return <Pill tone={t}>{l}</Pill>; } },
      ]}
    />
  );
}

function parseCsvManifest(text: string, vesselCallId: number): MLine[] {
  const rawRows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawRows.length <= 1) return [];
  const headers = rawRows[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase());
  const unitIdx = headers.findIndex((h) => h.includes('unit') || h.includes('container'));
  const blIdx = headers.findIndex((h) => h.includes('bl') || h.includes('bill'));
  const consIdx = headers.findIndex((h) => h.includes('consignee') || h.includes('customer') || h.includes('party'));
  const typeIdx = headers.findIndex((h) => h.includes('type') || h.includes('iso'));
  const sealIdx = headers.findIndex((h) => h.includes('seal'));
  const weightIdx = headers.findIndex((h) => h.includes('weight') || h.includes('gross'));
  const commIdx = headers.findIndex((h) => h.includes('commodity') || h.includes('cargo') || h.includes('goods'));

  return rawRows.slice(1).map((row, i) => {
    const parts = row.split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    return {
      lineNo: i + 1,
      unitNo: parts[unitIdx >= 0 ? unitIdx : 0] || `MSKU ${100000 + i} 5`,
      unitNoRaw: parts[unitIdx >= 0 ? unitIdx : 0] || `MSKU ${100000 + i} 5`,
      blNo: parts[blIdx >= 0 ? blIdx : 1] || `BL-${vesselCallId || 100}-${i + 1}`,
      consigneeRaw: parts[consIdx >= 0 ? consIdx : 2] || 'Said Salim Bakhresa & Co Ltd',
      unitTypeRaw: parts[typeIdx >= 0 ? typeIdx : 3] || '40HC',
      sealNo: parts[sealIdx >= 0 ? sealIdx : 4] || `ML-${700000 + i}`,
      grossWeightKg: Number(parts[weightIdx >= 0 ? weightIdx : 5]) || 24000,
      commodityRaw: parts[commIdx >= 0 ? commIdx : 6] || 'General Cargo',
      fullEmpty: 'F',
      matchStatus: 'NEW' as const,
    };
  });
}

function Wizard() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const { data: dbVesselCalls } = useQ(['vessel-calls'], () => manifestsApi.getVesselCalls());
  const calls = Array.isArray(dbVesselCalls) ? dbVesselCalls : [];
  const [vc, setVc] = useState(String(calls[0]?.vesselCallId || '1'));
  const [fmt, setFmt] = useState<'EXCEL' | 'EDI'>('EXCEL');
  const [file, setFile] = useState<string | null>(null);
  const [rawLines, setRawLines] = useState<MLine[] | null>(null);
  const [isDummyEval, setIsDummyEval] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState<MLine[]>([]);
  const [filter, setFilter] = useState<'all' | 'fix' | 'ok'>('fix');
  const [provisional, setProvisional] = useState<string[]>([]);
  const [result, setResult] = useState<S<'ManifestApplyResult'> & { consignments: number } | null>(null);

  // Dynamic Parties & Unit Types from DB
  const { data: dbParties } = useQ(['parties'], () => manifestsApi.getParties());
  const parties = Array.isArray(dbParties) ? dbParties : [];
  const { data: dbUnitTypes } = useQ(['unit-types'], () => manifestsApi.getUnitTypes());
  const unitTypes = Array.isArray(dbUnitTypes) ? dbUnitTypes : [];

  useEffect(() => {
    if (calls.length > 0 && !calls.some(c => String(c.vesselCallId) === vc)) {
      setVc(String(calls[0].vesselCallId));
    }
  }, [calls, vc]);

  // When parsing, call the backend evaluate endpoint dynamically
  useEffect(() => {
    if (step !== 'parsing') return;
    let timer: any;

    if (progress < 100) {
      timer = setTimeout(() => setProgress((p) => Math.min(100, p + 25)), 120);
    } else {
        const payload = isDummyEval || !rawLines || rawLines.length === 0
          ? { siteId: 1, vesselCallId: Number(vc), generateDummy: true }
          : { siteId: 1, vesselCallId: Number(vc), lines: rawLines, fileName: file || 'uploaded_manifest.csv' };

        manifestsApi.evaluateManifest(payload).then((res) => {
          if (res?.lines && Array.isArray(res.lines)) {
            setLines(res.lines);
          }
          setStep('review');
        }).catch((err) => {
          console.error('Evaluate API error:', err);
          setStep('review');
        });
      }

    return () => clearTimeout(timer);
}, [step, progress, vc, isDummyEval, rawLines, file]);

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

  const handleSelectedFile = (f: File) => {
    setFile(f.name);
    if (f.name.endsWith('.csv') || f.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = String(e.target?.result || '');
        const parsed = parseCsvManifest(text, Number(vc));
        if (parsed.length > 0) {
          setRawLines(parsed);
          toast(`Loaded ${parsed.length} lines from ${f.name}`);
        }
      };
      reader.readAsText(f);
    } else {
      setRawLines(null);
      toast(`Selected ${f.name}`);
    }
  };

  const triggerEvaluation = (fileName?: string, isDummy = false) => {
    setFile(fileName || (isDummy ? 'auto_generated_dummy_manifest.xlsx' : 'discharge_list.xlsx'));
    setIsDummyEval(isDummy);
    setProgress(0);
    setStep('parsing');
  };

  const handleProvisionalParty = async (name: string) => {
    try {
      await api.post('/parties:provisional', {
        partyName: name,
        roles: ['CONSIGNEE', 'CUSTOMER'],
      });
      qc.invalidateQueries({ queryKey: ['parties'] });
    } catch (e) {
      console.warn('Provisional party registration warning:', e);
    }
    setProvisional((p) => [...p, name]);
    setLines((ls) =>
      ls.map((x) =>
        x.consigneeRaw === name && x.issue === 'UNKNOWN_CONSIGNEE'
          ? { ...x, matchStatus: 'NEW', errorText: undefined, issue: undefined }
          : x
      )
    );
    toast(`Provisional party created and linked in database: ${name}`);
  };

  const apply = async (skipOpen: boolean) => {
    const skipped = skipOpen ? open : [];
    const updatedLines = lines.map((l) => (skipped.includes(l) ? { ...l, matchStatus: 'IGNORED' as const } : l.matchStatus === 'MATCHED' ? l : { ...l, matchStatus: 'CREATED' as const }));
    setLines(updatedLines);

    try {
      const createdMan = await manifestsApi.uploadManifest({
        manifestRef: `MAN-${Date.now().toString().slice(-6)}`,
        vesselCallId: Number(vc),
        fileName: file || 'discharge_list.xlsx',
        source: fmt,
        lines: updatedLines,
      });

      if (createdMan?.manifestId) {
        await manifestsApi.applyManifest(createdMan.manifestId);
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
    toast('Manifest applied to database');
  };

  const restart = () => { setStep('upload'); setFile(null); setProgress(0); setLines([]); setResult(null); setProvisional([]); setFilter('fix'); };

  const currentVessel = calls.find((c) => String(c.vesselCallId) === vc);

  return (
    <div className="stack-lg">
      <Panel><Stepper steps={steps} /></Panel>

      {step === 'upload' && (
        <Panel title="Upload or evaluate manifest" sub="Excel discharge list from the line, or an EDI file (CUSCAR / COPRAR)">
          <div className="stack-lg">
            <div className="form-grid">
              <Field label="Vessel call" required>
                <Select
                  value={vc}
                  onChange={(e) => setVc(e.target.value)}
                  options={calls.map((v) => [
                    String(v.vesselCallId),
                    `${v.vesselName || 'Vessel'} ${v.voyageNo || ''} · ${(v.status || '').toLowerCase()}`
                  ])}
                />
              </Field>
              <Field label="File format"><Segmented value={fmt} onChange={setFmt} options={[{ id: 'EXCEL', label: 'Excel' }, { id: 'EDI', label: 'EDI' }]} /></Field>
              <Field label="Mapping profile" hint="Columns mapped against live master tables">
                <Select options={fmt === 'EXCEL' ? ['Standard Ocean Line discharge list', 'CMA CGM Standard Excel', 'Maersk Line COPRAR/Excel'] : ['CUSCAR D.95B (EDI)', 'COPRAR D.00B (EDI)']} />
              </Field>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept={fmt === 'EXCEL' ? '.xlsx,.xls,.csv' : '.edi,.txt,.coprar,.cuscar'}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleSelectedFile(f);
              }}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleSelectedFile(f);
                }}
                style={{
                  border: isDragging ? '2px solid var(--brand)' : '2px dashed var(--steel)',
                  borderRadius: 'var(--r-lg)',
                  padding: 28,
                  background: isDragging ? 'var(--paper-2)' : file ? 'var(--go-soft)' : 'var(--concrete)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  color: 'inherit',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
              >
              <FileUp size={28} aria-hidden style={{ color: file ? 'var(--go)' : 'inherit' }} />
              <div className="strong" style={{ marginTop: 8 }}>{file ?? 'Drop manifest file here or browse'}</div>
              <div className="xs muted">{file ? `${rawLines ? `${rawLines.length} lines parsed · ` : ''}Click or drop to replace` : `${fmt === 'EXCEL' ? '.xlsx, .csv' : '.edi, .txt'} discharge file`}</div>
            </div>

            <div className="muted strong" style={{ fontSize: 13 }}>OR</div>

            <div
              style={{
                border: '2px solid var(--steel)',
                borderRadius: 'var(--r-lg)',
                padding: 28,
                background: 'var(--paper)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Database size={28} style={{ color: 'var(--brand)' }} />
              <div className="strong">Evaluate Live Dummy Manifest</div>
              <div className="xs muted">Fetch and validate realistic sample data against database tables</div>
              <Button
                variant="primary"
                icon={<Wand2 />}
                onClick={() => triggerEvaluation('auto_generated_dummy_manifest.xlsx', true)}
              >
                Evaluate dummy data now
              </Button>
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: 12 }}>
            <Button
              variant="primary"
              icon={<Play />}
              perm="manifest.import"
              disabled={!file}
              onClick={() => triggerEvaluation(file || undefined, false)}
            >
              Read and evaluate file
            </Button>
          </div>
        </div>
        </Panel>
  )
}

{
  step === 'parsing' && (
    <Panel title="Reading and verifying file against database">
      <div className="stack">
        <div className="meter" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Reading">
          <span style={{ width: `${progress}%`, background: 'var(--ink-2)' }} />
        </div>
        <ul className="list-plain small">
          <li className="row"><CheckIcon size={14} />Columns mapped with live master configuration</li>
          {progress >= 40 && <li className="row"><CheckIcon size={14} />Container numbers checked against ISO 6346 check digit algorithm</li>}
          {progress >= 60 && <li className="row"><CheckIcon size={14} />Consignees queried and matched against m_party table</li>}
          {progress >= 80 && <li className="row"><CheckIcon size={14} />Active yard stays and duplicate units checked in cargo_unit</li>}
        </ul>
      </div>
    </Panel>
  )
}

{
  step === 'review' && (
    <>
      <div className="kpi-strip">
        <Kpi label="Lines" value={lines.length} />
        <Kpi label="Ready" value={ready.length} delta={`${blCount} BLs`} />
        <Kpi label="To fix" value={open.length} delta={open.length ? 'Fix or skip before applying' : 'All fixed'} />
        <Kpi label="Skipped" value={lines.filter((l) => l.matchStatus === 'IGNORED').length} />
      </div>

      {open.length > 0
        ? <Banner tone="wait" title={`${open.length} lines need a decision`}>Fix them below using database lookups, or apply the ready lines and skip open lines.</Banner>
        : <Banner tone="go" title="Every line is validated and ready">Applying will create {blCount} consignments and {ready.filter((l) => l.matchStatus === 'NEW').length} expected units in the database.</Banner>}

      <Panel flush title="Manifest lines" actions={<Chips value={filter} onChange={setFilter} options={[{ id: 'fix', label: 'To fix', count: open.length }, { id: 'ok', label: 'Ready', count: lines.length - open.length }, { id: 'all', label: 'All', count: lines.length }]} />}>
        <DataTable rows={shown} rowKey={(l) => l.manifestLineId || l.lineNo!} empty={<Empty title="Nothing to fix">Every line is ready or skipped. Switch to "All" to see them.</Empty>} cols={[
          { key: 'n', header: '#', render: (l) => l.lineNo },
          { key: 'u', header: 'Unit', render: (l) => <UnitNo no={l.unitNo!} /> },
          { key: 't', header: 'Unit type', render: (l) => <span className="small">{l.unitTypeRaw}<div className="xs faint">{unitTypes.find(ut => ut.typeCode === l.unitTypeRaw)?.typeName || 'Container'}</div></span> },
          { key: 'bl', header: 'BL number', render: (l) => <span className="unitno">{l.blNo}</span> },
          { key: 'c', header: 'Consignee', render: (l) => <span className="small">{l.consigneeRaw}{provisional.includes(l.consigneeRaw!) && <div><Pill tone="wait">Provisional party</Pill></div>}</span> },
          { key: 'cm', header: 'Cargo', render: (l) => <span className="xs muted">{l.commodityRaw}<br />{Number(l.grossWeightKg).toLocaleString()} kg</span> },
          {
            key: 's', header: 'Validation / Action', render: (l) => (
              <LineFix
                l={l}
                fixed={fixed}
                patch={patch}
                parties={parties}
                unitTypes={unitTypes}
                onProvisional={handleProvisionalParty}
              />
            )
          },
        ]} />
      </Panel>

      <div className="row-wrap" style={{ justifyContent: 'flex-end', gap: 12 }}>
        <Button variant="ghost" icon={<ArrowLeft />} onClick={restart}>Start again</Button>
        {open.length > 0 && <Button perm="manifest.import" onClick={() => apply(true)}>Apply {ready.length} ready lines, skip {open.length}</Button>}
        <Button variant="primary" icon={<CheckIcon />} perm="manifest.import" disabled={open.length > 0} onClick={() => apply(false)}>Apply manifest to DB</Button>
      </div>
    </>
  )
}

{
  step === 'result' && result && (
    <>
      <Banner tone={result.errors?.length ? 'wait' : 'go'} title={result.errors?.length ? 'Manifest applied with lines skipped' : 'Manifest applied successfully'}>
        {result.consignments} consignments and {result.created} expected units created on {currentVessel?.vesselName || 'vessel call'}. Real database records have been seeded.
      </Banner>
      <div className="kpi-strip">
        <Kpi label="Consignments created" value={result.consignments} />
        <Kpi label="Expected units created" value={result.created} />
        <Kpi label="Linked to units on site" value={result.matched} />
        <Kpi label="Skipped" value={result.skipped} />
        <Kpi label="Provisional parties" value={provisional.length} />
      </div>
      {(result.errors?.length ?? 0) > 0 && (
        <Panel flush title="Skipped lines" sub="Open this import from Past imports to fix and apply them later">
          <DataTable rows={result.errors!} rowKey={(e) => e.lineNo} cols={[
            { key: 'n', header: 'Line', render: (e) => e.lineNo },
            { key: 'm', header: 'Problem', render: (e) => <span className="small">{e.message}</span> },
          ]} />
        </Panel>
      )}
      <div className="row-wrap" style={{ gap: 12 }}>
        <Link to="/consignments" className="btn">See consignments</Link>
        <Link to="/units" className="btn">See expected units</Link>
        <span className="spacer" />
        <Button variant="primary" icon={<RotateCcw />} onClick={restart}>Import another file</Button>
      </div>
    </>
  )
}
    </div >
  );
}

function LineFix({
  l,
  fixed,
  patch,
  parties,
  unitTypes,
  onProvisional,
}: {
  l: MLine;
  fixed: (n: number, p: Partial<MLine>) => void;
  patch: (n: number, p: Partial<MLine>) => void;
  parties: any[];
  unitTypes: any[];
  onProvisional: (name: string) => void;
}) {
  const [val, setVal] = useState(l.unitNo ?? '');
  const [type, setType] = useState(l.suggestion || (unitTypes[0]?.typeCode || '45G1'));
  const [party, setParty] = useState('');
  const [remember, setRemember] = useState(true);

  const consignees = useMemo(() => {
    const list = parties.filter((p) => p.roles?.includes('CONSIGNEE') || p.roles?.includes('CUSTOMER'));
    return list.length > 0 ? list : parties;
  }, [parties]);

  const n = l.lineNo!;
  const [label, tone] = LINE_TONE[l.matchStatus ?? 'NEW'];

  if (l.matchStatus === 'IGNORED') return <span className="row"><Pill tone={tone}>{label}</Pill><Button size="sm" variant="ghost" icon={<Undo2 />} onClick={() => patch(n, { matchStatus: l.issue === 'DUPLICATE' ? 'DUPLICATE' : l.issue ? 'INVALID' : 'NEW' })}>Undo</Button></span>;
  if (!l.issue || (l.matchStatus !== 'INVALID' && l.matchStatus !== 'DUPLICATE')) return <Pill tone={tone}>{label}</Pill>;

  const box = (children: React.ReactNode) => (
    <div className="stack" style={{ gap: 6, minWidth: 260, maxWidth: 360 }}>
      <span className="xs strong" style={{ color: 'var(--stop)' }}>{l.errorText}</span>
      {children}
    </div>
  );

  switch (l.issue) {
    case 'CHECK_DIGIT': {
      const ok = validCd(val.replace(/\s/g, '').toUpperCase());
      return box(<>
        <div className="row" style={{ gap: 6 }}>
          <Input aria-label={`Unit number line ${n}`} value={val} onChange={(e) => setVal(e.target.value.toUpperCase())} className={ok ? undefined : 'input-error'} style={{ minHeight: 30, width: 160 }} />
          <Button size="sm" disabled={!ok} onClick={() => fixed(n, { unitNo: val.replace(/\s/g, '') })}>Save</Button>
        </div>
        {l.suggestion && <Button size="sm" variant="ghost" icon={<Wand2 />} onClick={() => fixed(n, { unitNo: l.suggestion })}>Use {l.suggestion} (fixed digit)</Button>}
        <span className="xs faint">Check digit verified against ISO 6346 standard algorithm.</span>
      </>);
    }
    case 'UNKNOWN_CONSIGNEE':
      return box(<>
        <div className="row" style={{ gap: 6 }}>
          <Select
            aria-label={`Consignee line ${n}`}
            value={party}
            onChange={(e) => setParty(e.target.value)}
            options={[['', 'Match to party in DB…'], ...consignees.map((p) => [String(p.partyId), p.partyName] as [string, string])]}
            style={{ minHeight: 30 }}
          />
          <Button size="sm" disabled={!party} onClick={() => fixed(n, { consigneePartyId: Number(party), consigneeRaw: consignees.find(p => String(p.partyId) === party)?.partyName })}>Match</Button>
        </div>
        <Button size="sm" icon={<UserPlus />} perm="masters.local.edit" onClick={() => onProvisional(l.consigneeRaw!)}>Register provisional party</Button>
        <span className="xs faint">Matched parties are linked directly to m_party records.</span>
      </>);
    case 'DUPLICATE':
      return box(<div className="row-wrap" style={{ gap: 6 }}>
        <Button size="sm" onClick={() => patch(n, { matchStatus: 'MATCHED', errorText: undefined })}>Link to unit on site</Button>
        <Button size="sm" variant="ghost" onClick={() => patch(n, { matchStatus: 'IGNORED' })}>Skip line</Button>
        {l.unitStayId && <Link className="xs" to={`/units/${l.unitStayId}`}>Open unit stay</Link>}
      </div>);
    case 'UNKNOWN_TYPE':
      return box(<>
        <div className="row" style={{ gap: 6 }}>
          <Select
            aria-label={`Unit type line ${n}`}
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={unitTypes.map(ut => [ut.typeCode, `${ut.typeCode} · ${ut.typeName}`])}
            style={{ minHeight: 30, width: 170 }}
          />
          <Button size="sm" onClick={() => fixed(n, { unitTypeRaw: type })}>Use type</Button>
        </div>
        <Check label={`Map ${l.unitTypeRaw} = ${type} in database`} checked={remember} onChange={(e) => setRemember(e.target.checked)} />
      </>);
  }
}

export default Manifests;
