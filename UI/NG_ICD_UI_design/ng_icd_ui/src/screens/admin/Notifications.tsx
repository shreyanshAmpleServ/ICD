import { useState, type ReactNode } from 'react';
import { Bell, Languages, Mail, MessageSquare, Plus, Printer } from 'lucide-react';
import {
  Banner, Button, Chips, DataTable, Field, Input, Panel, Pill, Segmented, Tabs, Textarea, useToast, StatusPill,
} from '@/ds/components';
import { ROLES } from '@/app/roles';
import { SAMPLE_VALUES, SRC, notificationRules, notificationTemplates as seedTpl, printTemplates } from '@/mock/admin';
import { AuditNote, SaveBar, ListPanel, SetupPage, Split, YesNo, useEditable } from './AdminKit';

/* Notifications and printing: /notification-templates, /notification-rules,
   /print-templates, POST /print-templates/{id}/preview. The sender picks the
   contact's language and falls back to English. */
type Tab = 'templates' | 'rules' | 'print';
type Tpl = (typeof seedTpl)[number];
const CH_ICON = { SMS: MessageSquare, EMAIL: Mail, IN_APP: Bell, WHATSAPP: MessageSquare, PUSH: Bell };
const CH: Record<string, string> = { SMS: 'SMS', EMAIL: 'Email', IN_APP: 'In-app', WHATSAPP: 'WhatsApp', PUSH: 'Push' };
const WHO: Record<string, string> = { CONSIGNEE: 'Consignee', AGENT: 'Clearing agent', BILL_TO: 'Bill-to party', TRANSPORTER: 'Transporter', SHIPPING_LINE: 'Shipping line', ROLE: 'Role', ASSIGNEE: 'Case assignee' };
const tplKey = (t: Tpl) => t.notificationTemplateId!;

/** Highlight {{placeholders}}; unknown ones in red. */
function Filled({ text, sample }: { text: string; sample: boolean }) {
  const parts = text.split(/(\{\{[a-z_]+\}\})/g);
  return <>{parts.map((p, i) => {
    const m = /^\{\{([a-z_]+)\}\}$/.exec(p);
    if (!m) return <span key={i}>{p}</span>;
    const v = SAMPLE_VALUES[m[1]];
    if (v === undefined) return <span key={i} className="adm-ph-missing" title="Unknown placeholder">{p}</span>;
    return <span key={i} className="adm-ph" title={p}>{sample ? v : p}</span>;
  })}</>;
}
const render = (t: string) => t.replace(/\{\{([a-z_]+)\}\}/g, (_, k: string) => SAMPLE_VALUES[k] ?? `{{${k}}}`);

export function Notifications() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('templates');
  const [tpls, setTpls] = useEditable<Tpl>('notifTpl', seedTpl);
  const [sel, setSel] = useState<number>(7);
  const [lang, setLang] = useState<'all' | 'en' | 'sw'>('all');
  const tpl = tpls.find((t) => tplKey(t) === sel) ?? tpls[0];
  const shown = tpls.filter((t) => lang === 'all' || t.languageCode === lang);

  return (
    <SetupPage wide title="Notifications & printing" ms="M4" sub="Messages sent when things happen, who gets them, and the documents NG ICD prints"
      sources={[SRC.notify, SRC.rules, { table: 'm_print_template' }]}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'templates', label: 'Message templates', count: tpls.length }, { id: 'rules', label: 'Who gets what', count: notificationRules.length },
        { id: 'print', label: 'Print templates', count: printTemplates.length },
      ]} />

      {tab === 'templates' && tpl && (
        <Split list={
          <ListPanel title="Templates" selected={tplKey(tpl)} onSelect={(id) => setSel(Number(id))} searchable="Event or text"
            filter={<Chips value={lang} onChange={setLang} options={[{ id: 'all', label: 'All' }, { id: 'en', label: 'English' }, { id: 'sw', label: 'Kiswahili', count: tpls.filter((t) => t.languageCode === 'sw').length }]} />}
            items={shown.map((t) => { const I = CH_ICON[t.channel]; return { id: tplKey(t), lead: <I size={16} />, title: `${t.templateCode.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}`, sub: `${t.eventType} · ${CH[t.channel]} · ${t.languageCode}`, aside: t.draft ? <Pill tone="wait">Draft</Pill> : undefined }; })} />
        }>
          <TemplateEditor key={tplKey(tpl)} t={tpl}
            hasSw={tpls.some((x) => x.templateCode === tpl.templateCode && x.channel === tpl.channel && x.languageCode === 'sw')}
            onSave={(n) => { setTpls((all) => all.map((x) => (tplKey(x) === tplKey(n) ? n : x))); toast('Template saved'); }}
            onAddSw={() => {
              const n: Tpl = { ...tpl, notificationTemplateId: 100 + tpls.length, languageCode: 'sw', draft: true, isActive: false, body: tpl.body };
              setTpls((all) => [...all, n]); setSel(tplKey(n)); toast('Swahili draft added');
            }} />
        </Split>
      )}

      {tab === 'rules' && (
        <>
          <Panel flush title="Routing rules" sub="When an event happens, which template goes to whom on which channel"
            actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Rule added')}>Add rule</Button>}>
            <DataTable rows={notificationRules} rowKey={(r) => r.notificationRuleId!} cols={[
              { key: 'e', header: 'When', render: (r) => <span className="adm-code">{r.eventType}</span> },
              { key: 't', header: 'Template', render: (r) => <span className="small">{r.templateCode}</span> },
              { key: 'w', header: 'Send to', render: (r) => <strong className="small">{r.recipientKind === 'ROLE' ? `Role: ${ROLES.find((x) => x.code === r.roleCode)?.name}` : WHO[r.recipientKind]}</strong> },
              { key: 'c', header: 'Channel', render: (r) => CH[r.channel] },
              { key: 'o', header: 'Only if', render: (r) => r.onlyIf ? <span className="small">Status becomes cleared</span> : <span className="faint">Always</span> },
              { key: 'a', header: 'Active', render: (r) => <YesNo v={r.isActive} /> },
            ]} />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>Each party contact chooses email, SMS or WhatsApp and a language on their party record; a rule never sends on a channel the contact has switched off. Customs updates notify only on clearance.</p>
          <AuditNote />
        </>
      )}

      {tab === 'print' && <PrintTab />}
    </SetupPage>
  );
}

function TemplateEditor({ t, hasSw, onSave, onAddSw }: { t: Tpl; hasSw: boolean; onSave: (t: Tpl) => void; onAddSw: () => void }) {
  const [x, setX] = useState(t);
  const [sample, setSample] = useState(true);
  const dirty = JSON.stringify(x) !== JSON.stringify(t);
  const unknown = [...(x.body + (x.subject ?? '')).matchAll(/\{\{([a-z_]+)\}\}/g)].map((m) => m[1]).filter((k) => SAMPLE_VALUES[k] === undefined);
  const smsLen = render(x.body).length;
  const seg = Math.ceil(smsLen / 160);
  const preview: ReactNode = x.channel === 'SMS' || x.channel === 'WHATSAPP'
    ? <div className="adm-sms"><Filled text={x.body} sample={sample} /></div>
    : <div className="adm-email"><div className="h"><strong><Filled text={x.subject ?? ''} sample={sample} /></strong>{x.channel === 'EMAIL' && <div className="xs faint">From Mlimani ICD &lt;noreply@mlimani-icd.example&gt;</div>}</div><div className="b"><Filled text={x.body} sample={sample} /></div></div>;
  return (
    <>
      {x.languageCode === 'sw' && (
        <Banner tone="wait" title="Draft: needs native speaker review">This Swahili text was drafted as a placeholder. It is not sent until a native speaker has reviewed it and it is switched on; English goes out meanwhile.</Banner>
      )}
      <Panel title={<h2 className="row">{x.templateCode} <Pill tone="info">{CH[x.channel]}</Pill><Pill tone="info">{x.languageCode === 'sw' ? 'Kiswahili' : 'English'}</Pill></h2>} sub={<>Sent on <span className="adm-code">{x.eventType}</span></>}
        actions={x.languageCode === 'en' && !hasSw ? <Button size="sm" icon={<Languages />} perm="admin.config.manage" onClick={onAddSw}>Add Swahili version</Button> : undefined}>
        <div className="grid-2">
          <div className="stack">
            {x.channel !== 'SMS' && <Field label="Subject"><Input value={x.subject ?? ''} onChange={(e) => setX({ ...x, subject: e.target.value })} /></Field>}
            <Field label="Message" hint={x.channel === 'SMS' ? `${smsLen} characters with sample values · ${seg} SMS${seg > 1 ? ' (costs more)' : ''}` : 'Plain text; links are made clickable'}
              error={unknown.length ? `Unknown placeholder: ${unknown.map((u) => `{{${u}}}`).join(', ')}` : undefined}>
              <Textarea rows={6} value={x.body} onChange={(e) => setX({ ...x, body: e.target.value })} />
            </Field>
            <div className="field"><label>Placeholders you can use</label>
              <div className="row-wrap">{Object.keys(SAMPLE_VALUES).slice(0, 18).map((k) => <button key={k} type="button" className="tag" style={{ cursor: 'pointer', background: 'var(--paper)' }} onClick={() => setX({ ...x, body: `${x.body} {{${k}}}` })}>{`{{${k}}}`}</button>)}</div>
            </div>
          </div>
          <div className="stack">
            <div className="row"><strong className="small">Preview</strong><span className="spacer" /><Segmented value={sample ? 's' : 'r'} onChange={(v) => setSample(v === 's')} options={[{ id: 's', label: 'Sample values' }, { id: 'r', label: 'Placeholders' }]} /></div>
            {preview}
            <p className="xs faint" style={{ margin: 0 }}>Sample: unit MSKU 402117 8 for BL BMLU2409881 at Dar es Salaam main yard.</p>
          </div>
        </div>
      </Panel>
      <SaveBar>
        <Button variant="ghost" disabled={!dirty} onClick={() => setX(t)}>Undo changes</Button>
        <Button variant="primary" perm="admin.config.manage" disabled={!dirty || unknown.length > 0} onClick={() => onSave(x)}>Save template</Button>
      </SaveBar>
    </>
  );
}

function PrintTab() {
  const [sel, setSel] = useState<number>(1);
  const [reprint, setReprint] = useState(false);
  const p = printTemplates.find((x) => x.printTemplateId === sel)!;
  return (
    <Split list={
      <ListPanel title="Print templates" selected={sel} onSelect={(id) => setSel(Number(id))}
        items={printTemplates.map((x) => ({ id: x.printTemplateId!, lead: <Printer size={16} />, title: x.templateName, sub: `${x.docKind.replace(/_/g, ' ').toLowerCase()} · v${x.versionNo} · ${x.paperNote ?? x.paperSize}`, aside: <StatusPill value={x.status} /> }))} />
    }>
      <Panel title={p.templateName} sub={`${p.paperNote ?? p.paperSize} · ${p.defaultCopies} cop${p.defaultCopies === 1 ? 'y' : 'ies'} · language ${p.languageCode}`}
        actions={<Segmented value={reprint ? 'r' : 'o'} onChange={(v) => setReprint(v === 'r')} options={[{ id: 'o', label: 'First print' }, { id: 'r', label: 'Reprint' }]} />}>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
            {p.docKind === 'GATE_PASS' ? <GatePass watermark={reprint ? p.reprintWatermark ?? 'REPRINT' : null} sw={p.languageCode === 'sw'} /> : (
              <div className="photo" style={{ width: 240, aspectRatio: p.paperSize === 'THERMAL80' ? '80 / 160' : '210 / 297', position: 'relative' }}>
                {p.templateName} preview
                {reprint && <span className="adm-wm">{p.reprintWatermark}</span>}
              </div>
            )}
          </div>
          <div className="stack">
            <Banner tone="info" title="Reprint rule">The first print is the original. Every later print is logged, needs a reason, and carries the watermark <strong>{p.reprintWatermark}</strong>. Only people with <span className="adm-code">gate.pass.print</span> can reprint gate passes and EIRs.</Banner>
            {p.paperNote && <Banner tone="wait" title="Paper size">The A6 card prints 2 up on A5 because the database paper list (A4, A5, Letter, 80 mm thermal) has no A6 yet.</Banner>}
            {p.status === 'DRAFT' && <Banner tone="wait" title="Draft">Needs native speaker review and approval before it can be used.</Banner>}
            <AuditNote>Template changes need a second admin to approve before they go live; every print is in the print log.</AuditNote>
          </div>
        </div>
      </Panel>
    </Split>
  );
}

function GatePass({ watermark, sw }: { watermark: string | null; sw?: boolean }) {
  return (
    <div className="adm-pass" role="img" aria-label="Gate pass preview">
      <div className="hd"><b>{sw ? 'KIBALI CHA GETI' : 'GATE PASS'}</b><span>GP-26-08812</span></div>
      <div className="row2"><div><div className="lbl">Mlimani ICD · DAR1</div><div>07 Oct 2026 10:05</div></div><div style={{ textAlign: 'right' }}><div className="lbl">{sw ? 'Gari' : 'Truck'}</div><div className="big" style={{ fontSize: 14 }}>T 412 DKL</div></div></div>
      <div><div className="lbl">{sw ? 'Kontena' : 'Unit'}</div><div className="big">MSKU 402117 8</div><div>45G1 · seal ML-7781203</div></div>
      <div className="row2"><div><div className="lbl">{sw ? 'Dereva' : 'Driver'}</div><div>Baraka Mwita</div></div><div><div className="lbl">Release</div><div>RO-DAR1-26-01942</div></div></div>
      <div className="qr" aria-hidden />
      <div style={{ textAlign: 'center' }} className="lbl">{sw ? 'Onyesha getini. Halali leo tu.' : 'Show at the outer gate. Valid today only.'}</div>
      {watermark && <div className="wm">{watermark}</div>}
    </div>
  );
}
