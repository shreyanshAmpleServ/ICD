import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Banner, Button, Check, DataTable, Field, Input, Panel, Select, Tabs, useToast,
} from '@/ds/components';
import { SRC, documentTypes as seedDocs, numberSequences as seedSeq, renderPattern } from '@/mock/admin';
import { AuditNote, EditDrawer, SetupPage, YesNo, label, useEditable } from './AdminKit';

/* Numbering and documents: /number-sequences, /document-types. The API
   takes the next number inside the business transaction under a lock, so
   numbers never repeat; a gap only appears if a transaction rolls back. */
type Tab = 'numbers' | 'docs';
type Seq = (typeof seedSeq)[number];
type Doc = (typeof seedDocs)[number];
const RESET: Record<string, string> = { NEVER: 'Never', YEARLY: 'Every 1 January', MONTHLY: 'Every month' };

export function Documents() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('numbers');
  const [seqs, setSeqs] = useEditable<Seq>('seqs', seedSeq);
  const [docs, setDocs] = useEditable<Doc>('docTypes', seedDocs);
  const [seq, setSeq] = useState<Seq | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);

  return (
    <SetupPage title="Numbering & documents" ms="M0" sub="How document numbers are built, and which documents each flow needs"
      sources={[{ table: 'm_number_sequence' }, SRC.docTypes]}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'numbers', label: 'Number sequences', count: seqs.length }, { id: 'docs', label: 'Document types', count: docs.length }]} />

      {tab === 'numbers' && (
        <>
          <Panel flush title="Number sequences" sub="One per document kind, company-wide or per site">
            <DataTable rows={seqs} rowKey={(s) => s.numberSequenceId!} onRow={setSeq} cols={[
              { key: 'k', header: 'Document', render: (s) => <strong className="small">{label(s.documentKind)}</strong> },
              { key: 's', header: 'Site', render: (s) => s.siteCode ?? 'All sites' },
              { key: 'p', header: 'Pattern', render: (s) => <span className="adm-code-box">{s.pattern.replace('{PREFIX}', s.prefix)}</span> },
              { key: 'n', header: 'Next number', render: (s) => <span className="adm-cond strong">{s.sample}</span> },
              { key: 'r', header: 'Restarts', render: (s) => <span className="small">{RESET[s.resetPolicy ?? 'YEARLY']}</span> },
              { key: 'c', header: 'Current period', render: (s) => s.currentPeriod ?? '—' },
            ]} />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>Pattern parts: <span className="adm-code">{'{PREFIX} {SITE} {YYYY} {YY} {MM}'}</span> and <span className="adm-code">{'{######}'}</span> for the running number, one # per digit.</p>
          <AuditNote />
        </>
      )}

      {tab === 'docs' && (
        <Panel flush title="Document types" sub="What can be attached, how big it may be, how long it is kept, and where it is required"
          actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Document type added')}>Add document type</Button>}>
          <DataTable rows={docs} rowKey={(d) => d.docTypeCode} onRow={setDoc} cols={[
            { key: 'n', header: 'Document', render: (d) => <><strong className="small">{d.docTypeName}</strong><div className="xs faint">{d.docTypeCode}</div></> },
            { key: 'a', header: 'Attached to', render: (d) => <span className="small">{label(d.appliesTo)}</span> },
            { key: 'r', header: 'Required for', render: (d) => d.requiredFor.length ? <span className="row-wrap">{d.requiredFor.map((x) => <span key={x} className="tag">{x}</span>)}</span> : <span className="faint small">Optional</span> },
            { key: 'm', header: 'Max size', num: true, render: (d) => `${d.maxSizeMb} MB` },
            { key: 'e', header: 'File types', render: (d) => <span className="small muted">{d.allowedExt}</span> },
            { key: 'k', header: 'Keep for', num: true, render: (d) => `${d.retentionYears} years` },
            { key: 'ap', header: 'Needs approval', render: (d) => <YesNo v={d.requiresApproval} /> },
          ]} />
        </Panel>
      )}

      {seq && <SeqDrawer key={seq.numberSequenceId} seq={seq} onClose={() => setSeq(null)} onSave={(s) => { setSeqs((all) => all.map((x) => (x.numberSequenceId === s.numberSequenceId ? s : x))); toast('Sequence saved'); }} />}
      {doc && (
        <EditDrawer open onClose={() => setDoc(null)} title={doc.docTypeName} saveLabel="Save document type" perm="admin.config.manage"
          onSave={() => { setDocs((all) => all.map((d) => (d.docTypeCode === doc.docTypeCode ? doc : d))); toast('Document type saved'); }}>
          <div className="form-grid">
            <Field label="Name"><Input value={doc.docTypeName} onChange={(e) => setDoc({ ...doc, docTypeName: e.target.value })} /></Field>
            <Field label="Max size (MB)"><Input type="number" value={doc.maxSizeMb} onChange={(e) => setDoc({ ...doc, maxSizeMb: Number(e.target.value) })} /></Field>
            <Field label="File types" hint="Comma separated"><Input value={doc.allowedExt} onChange={(e) => setDoc({ ...doc, allowedExt: e.target.value })} /></Field>
            <Field label="Keep for (years)" hint="TRA requires 5 years for tax records; check your own policy"><Input type="number" value={doc.retentionYears} onChange={(e) => setDoc({ ...doc, retentionYears: Number(e.target.value) })} /></Field>
          </div>
          <Check label="A supervisor approves it before it counts (e.g. a scanned release)" checked={!!doc.requiresApproval} onChange={(e) => setDoc({ ...doc, requiresApproval: e.target.checked })} />
          <Field label="Required for"><span className="row-wrap">{doc.requiredFor.length ? doc.requiredFor.map((x) => <span key={x} className="tag">{x}</span>) : <span className="faint small">Not required anywhere</span>}</span></Field>
        </EditDrawer>
      )}
    </SetupPage>
  );
}

function SeqDrawer({ seq, onClose, onSave }: { seq: Seq; onClose: () => void; onSave: (s: Seq) => void }) {
  const [s, setS] = useState(seq);
  const lower = (s.nextValue ?? 0) < (seq.nextValue ?? 0);
  const okPattern = /\{#+\}|\{SEQ:\d\}/.test(s.pattern);
  const sample = renderPattern(s.pattern, s.prefix, s.siteCode, s.nextValue ?? 1);
  const nextYear = renderPattern(s.pattern, s.prefix, s.siteCode, s.resetPolicy === 'NEVER' ? (s.nextValue ?? 1) + 1 : 1, new Date('2027-01-01'));
  return (
    <EditDrawer open onClose={onClose} title={`${label(seq.documentKind)} numbers${seq.siteCode ? ` · ${seq.siteCode}` : ''}`} saveLabel="Save sequence" perm="admin.config.manage"
      disabled={lower || !okPattern} reason="Number formats appear on tax documents." onSave={() => onSave({ ...s, sample })}>
      <div className="form-grid">
        <Field label="Prefix"><Input value={s.prefix} onChange={(e) => setS({ ...s, prefix: e.target.value.toUpperCase() })} /></Field>
        <Field label="Pattern" error={!okPattern ? 'Needs a running number, e.g. {######}' : undefined}><Input className="adm-code" value={s.pattern} onChange={(e) => setS({ ...s, pattern: e.target.value })} /></Field>
        <Field label="Next number" error={lower ? `Cannot go below ${seq.nextValue}: numbers would repeat` : undefined}><Input type="number" value={s.nextValue} onChange={(e) => setS({ ...s, nextValue: Number(e.target.value) })} /></Field>
        <Field label="Restarts"><Select value={s.resetPolicy} onChange={(e) => setS({ ...s, resetPolicy: e.target.value as Seq['resetPolicy'] })} options={Object.entries(RESET)} /></Field>
      </div>
      <Banner tone={okPattern && !lower ? 'go' : 'idle'} title={`Next: ${sample}`}>First number next year: {nextYear}</Banner>
    </EditDrawer>
  );
}
