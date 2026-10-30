import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, DataTable, Panel, Tabs, useToast } from '@/ds/components';
import { SRC, documentTypes as seedDocs, numberSequences as seedSeq } from '@/mock/admin';
import { AuditNote, SetupPage, YesNo, label, useEditable } from '../shared/AdminKit';
import { documentsApi } from './api';
import { SequenceDrawer } from './components/SequenceDrawer';
import { DocTypeDrawer } from './components/DocTypeDrawer';

export { documentsApi } from './api';

type Tab = 'numbers' | 'docs';
type Seq = (typeof seedSeq)[number];
type Doc = (typeof seedDocs)[number];
const RESET: Record<string, string> = { NEVER: 'Never', YEARLY: 'Every 1 January', MONTHLY: 'Every month' };

export function DocumentsView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('numbers');
  const [seqs, setSeqs] = useEditable<Seq>('seqs', [], () => documentsApi.getNumberSequences());
  const [docs, setDocs] = useEditable<Doc>('docTypes', [], () => documentsApi.getDocumentTypes());
  const [seq, setSeq] = useState<Seq | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);

  return (
    <SetupPage
      title="Numbering & documents"
      ms="M0"
      sub="How document numbers are built, and which documents each flow needs"
      sources={[{ table: 'm_number_sequence' }, SRC.docTypes]}
    >
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'numbers', label: 'Number sequences', count: seqs.length },
          { id: 'docs', label: 'Document types', count: docs.length },
        ]}
      />

      {tab === 'numbers' && (
        <>
          <Panel flush title="Number sequences" sub="One per document kind, company-wide or per site">
            <DataTable
              rows={seqs}
              rowKey={(s) => s.numberSequenceId!}
              onRow={setSeq}
              cols={[
                { key: 'k', header: 'Document', render: (s) => <strong className="small">{label(s.documentKind)}</strong> },
                { key: 's', header: 'Site', render: (s) => s.siteCode ?? 'All sites' },
                {
                  key: 'p',
                  header: 'Pattern',
                  render: (s) => <span className="adm-code-box">{s.pattern.replace('{PREFIX}', s.prefix)}</span>,
                },
                { key: 'n', header: 'Next number', render: (s) => <span className="adm-cond strong">{s.sample}</span> },
                {
                  key: 'r',
                  header: 'Restarts',
                  render: (s) => <span className="small">{RESET[s.resetPolicy ?? 'YEARLY']}</span>,
                },
                { key: 'c', header: 'Current period', render: (s) => s.currentPeriod ?? '—' },
              ]}
            />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>
            Pattern parts: <span className="adm-code">{'{PREFIX} {SITE} {YYYY} {YY} {MM}'}</span> and{' '}
            <span className="adm-code">{'{######}'}</span> for the running number, one # per digit.
          </p>
          <AuditNote />
        </>
      )}

      {tab === 'docs' && (
        <Panel
          flush
          title="Document types"
          sub="What can be attached, how big it may be, how long it is kept, and where it is required"
          actions={
            <Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Document type added')}>
              Add document type
            </Button>
          }
        >
          <DataTable
            rows={docs}
            rowKey={(d) => d.docTypeCode}
            onRow={setDoc}
            cols={[
              {
                key: 'n',
                header: 'Document',
                render: (d) => (
                  <>
                    <strong className="small">{d.docTypeName}</strong>
                    <div className="xs faint">{d.docTypeCode}</div>
                  </>
                ),
              },
              { key: 'a', header: 'Attached to', render: (d) => <span className="small">{label(d.appliesTo)}</span> },
              {
                key: 'r',
                header: 'Required for',
                render: (d) =>
                  d.requiredFor.length ? (
                    <span className="row-wrap">
                      {d.requiredFor.map((x) => (
                        <span key={x} className="tag">
                          {x}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="faint small">Optional</span>
                  ),
              },
              { key: 'm', header: 'Max size', num: true, render: (d) => `${d.maxSizeMb} MB` },
              { key: 'e', header: 'File types', render: (d) => <span className="small muted">{d.allowedExt}</span> },
              { key: 'k', header: 'Keep for', num: true, render: (d) => `${d.retentionYears} years` },
              { key: 'ap', header: 'Needs approval', render: (d) => <YesNo v={d.requiresApproval} /> },
            ]}
          />
        </Panel>
      )}

      {seq && (
        <SequenceDrawer
          key={seq.numberSequenceId}
          seq={seq}
          onClose={() => setSeq(null)}
          onSave={(s) => {
            if (s.numberSequenceId) documentsApi.updateNumberSequence(s.numberSequenceId, s).catch(() => {});
            setSeqs((all) => all.map((x) => (x.numberSequenceId === s.numberSequenceId ? s : x)));
            toast('Sequence saved');
          }}
        />
      )}

      {doc && (
        <DocTypeDrawer
          doc={doc}
          onClose={() => setDoc(null)}
          onChange={setDoc}
          onSave={() => {
            if ((doc as any).documentTypeId) documentsApi.updateDocumentType((doc as any).documentTypeId, doc).catch(() => {});
            setDocs((all) => all.map((d) => (d.docTypeCode === doc.docTypeCode ? doc : d)));
            toast('Document type saved');
          }}
        />
      )}
    </SetupPage>
  );
}

export { DocumentsView as Documents };
export default DocumentsView;
