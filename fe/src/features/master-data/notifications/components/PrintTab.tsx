import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Banner, Panel, Segmented, StatusPill } from '@/ds/components';
import { AuditNote, ListPanel, Split } from '../../shared/AdminKit';
import { GatePass } from './GatePass';

export function PrintTab({ printTemplates }: { printTemplates: any[] }) {
  const [sel, setSel] = useState<number>(1);
  const [reprint, setReprint] = useState(false);
  const p = printTemplates.find((x: any) => x.printTemplateId === sel) ?? printTemplates[0];

  return (
    <Split
      list={
        <ListPanel
          title="Print templates"
          selected={sel}
          onSelect={(id) => setSel(Number(id))}
          items={printTemplates.map((x: any) => ({
            id: x.printTemplateId!,
            lead: <Printer size={16} />,
            title: x.templateName,
            sub: `${x.docKind.replace(/_/g, ' ').toLowerCase()} · v${x.versionNo} · ${x.paperNote ?? x.paperSize}`,
            aside: <StatusPill value={x.status} />,
          }))}
        />
      }
    >
      <Panel
        title={p.templateName}
        sub={`${p.paperNote ?? p.paperSize} · ${p.defaultCopies} cop${p.defaultCopies === 1 ? 'y' : 'ies'} · language ${p.languageCode}`}
        actions={
          <Segmented
            value={reprint ? 'r' : 'o'}
            onChange={(v) => setReprint(v === 'r')}
            options={[
              { id: 'o', label: 'First print' },
              { id: 'r', label: 'Reprint' },
            ]}
          />
        }
      >
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
            {p.docKind === 'GATE_PASS' ? (
              <GatePass watermark={reprint ? p.reprintWatermark ?? 'REPRINT' : null} sw={p.languageCode === 'sw'} />
            ) : (
              <div
                className="photo"
                style={{
                  width: 240,
                  aspectRatio: p.paperSize === 'THERMAL80' ? '80 / 160' : '210 / 297',
                  position: 'relative',
                }}
              >
                {p.templateName} preview
                {reprint && <span className="adm-wm">{p.reprintWatermark}</span>}
              </div>
            )}
          </div>
          <div className="stack">
            <Banner tone="info" title="Reprint rule">
              The first print is the original. Every later print is logged, needs a reason, and carries the watermark{' '}
              <strong>{p.reprintWatermark}</strong>. Only people with <span className="adm-code">gate.pass.print</span> can reprint gate passes and EIRs.
            </Banner>
            {p.paperNote && (
              <Banner tone="wait" title="Paper size">
                The A6 card prints 2 up on A5 because the database paper list (A4, A5, Letter, 80 mm thermal) has no A6 yet.
              </Banner>
            )}
            {p.status === 'DRAFT' && (
              <Banner tone="wait" title="Draft">
                Needs native speaker review and approval before it can be used.
              </Banner>
            )}
            <AuditNote>
              Template changes need a second admin to approve before they go live; every print is in the print log.
            </AuditNote>
          </div>
        </div>
      </Panel>
    </Split>
  );
}
