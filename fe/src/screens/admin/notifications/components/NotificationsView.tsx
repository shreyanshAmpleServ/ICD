import { useState } from 'react';
import { Bell, Mail, MessageSquare, Plus } from 'lucide-react';
import { Button, Chips, DataTable, Panel, Pill, Tabs, useToast } from '@/ds/components';
import { ROLES } from '@/app/roles';
import { SRC, notificationRules as seedRules, notificationTemplates as seedTpl, printTemplates as seedPrint } from '@/mock/admin';
import { AuditNote, ListPanel, SetupPage, Split, YesNo, useEditable } from '../../shared/AdminKit';
import { useQ, delay } from '@/api/query';
import { notificationsApi } from '../api';
import { TemplateEditor } from './TemplateEditor';
import { PrintTab } from './PrintTab';

type Tab = 'templates' | 'rules' | 'print';
type Tpl = (typeof seedTpl)[number];
const CH_ICON = { SMS: MessageSquare, EMAIL: Mail, IN_APP: Bell, WHATSAPP: MessageSquare, PUSH: Bell };
const CH: Record<string, string> = { SMS: 'SMS', EMAIL: 'Email', IN_APP: 'In-app', WHATSAPP: 'WhatsApp', PUSH: 'Push' };
const WHO: Record<string, string> = {
  CONSIGNEE: 'Consignee',
  AGENT: 'Clearing agent',
  BILL_TO: 'Bill-to party',
  TRANSPORTER: 'Transporter',
  SHIPPING_LINE: 'Shipping line',
  ROLE: 'Role',
  ASSIGNEE: 'Case assignee',
};
const tplKey = (t: Tpl) => t.notificationTemplateId!;

export function NotificationsView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('templates');
  const [tpls, setTpls] = useEditable<Tpl>('notifTpl', seedTpl);
  const { data: rulesData } = useQ<any[]>(['admin', 'notificationRules'], () => delay(seedRules));
  const { data: printData } = useQ<any[]>(['admin', 'printTemplates'], () => delay(seedPrint));
  const notificationRules = Array.isArray(rulesData) && rulesData.length > 0 ? rulesData : seedRules;
  const printTemplates = Array.isArray(printData) && printData.length > 0 ? printData : seedPrint;

  const [sel, setSel] = useState<number>(7);
  const [lang, setLang] = useState<'all' | 'en' | 'sw'>('all');
  const tpl = tpls.find((t) => tplKey(t) === sel) ?? tpls[0];
  const shown = tpls.filter((t) => lang === 'all' || t.languageCode === lang);

  return (
    <SetupPage
      wide
      title="Notifications & printing"
      ms="M4"
      sub="Messages sent when things happen, who gets them, and the documents NG ICD prints"
      sources={[SRC.notify, SRC.rules, { table: 'm_print_template' }]}
    >
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'templates', label: 'Message templates', count: tpls.length },
          { id: 'rules', label: 'Who gets what', count: notificationRules.length },
          { id: 'print', label: 'Print templates', count: printTemplates.length },
        ]}
      />

      {tab === 'templates' && tpl && (
        <Split
          list={
            <ListPanel
              title="Templates"
              selected={tplKey(tpl)}
              onSelect={(id) => setSel(Number(id))}
              searchable="Event or text"
              filter={
                <Chips
                  value={lang}
                  onChange={setLang}
                  options={[
                    { id: 'all', label: 'All' },
                    { id: 'en', label: 'English' },
                    { id: 'sw', label: 'Kiswahili', count: tpls.filter((t) => t.languageCode === 'sw').length },
                  ]}
                />
              }
              items={shown.map((t) => {
                const I = CH_ICON[t.channel];
                return {
                  id: tplKey(t),
                  lead: <I size={16} />,
                  title: `${t.templateCode.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}`,
                  sub: `${t.eventType} · ${CH[t.channel]} · ${t.languageCode}`,
                  aside: t.draft ? <Pill tone="wait">Draft</Pill> : undefined,
                };
              })}
            />
          }
        >
          <TemplateEditor
            key={tplKey(tpl)}
            t={tpl}
            hasSw={tpls.some(
              (x) => x.templateCode === tpl.templateCode && x.channel === tpl.channel && x.languageCode === 'sw'
            )}
            onSave={(n) => {
              notificationsApi.updateNotificationTemplate(tplKey(n), n).catch(() => {});
              setTpls((all) => all.map((x) => (tplKey(x) === tplKey(n) ? n : x)));
              toast('Template saved');
            }}
            onAddSw={() => {
              const n: Tpl = {
                ...tpl,
                notificationTemplateId: 100 + tpls.length,
                languageCode: 'sw',
                draft: true,
                isActive: false,
                body: tpl.body,
              };
              setTpls((all) => [...all, n]);
              setSel(tplKey(n));
              toast('Swahili draft added');
            }}
          />
        </Split>
      )}

      {tab === 'rules' && (
        <>
          <Panel
            flush
            title="Routing rules"
            sub="When an event happens, which template goes to whom on which channel"
            actions={
              <Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Rule added')}>
                Add rule
              </Button>
            }
          >
            <DataTable
              rows={notificationRules}
              rowKey={(r) => r.notificationRuleId!}
              cols={[
                { key: 'e', header: 'When', render: (r) => <span className="adm-code">{r.eventType}</span> },
                { key: 't', header: 'Template', render: (r) => <span className="small">{r.templateCode}</span> },
                {
                  key: 'w',
                  header: 'Send to',
                  render: (r) => (
                    <strong className="small">
                      {r.recipientKind === 'ROLE'
                        ? `Role: ${ROLES.find((x) => x.code === r.roleCode)?.name}`
                        : WHO[r.recipientKind]}
                    </strong>
                  ),
                },
                { key: 'c', header: 'Channel', render: (r) => CH[r.channel] },
                {
                  key: 'o',
                  header: 'Only if',
                  render: (r) =>
                    r.onlyIf ? <span className="small">Status becomes cleared</span> : <span className="faint">Always</span>,
                },
                { key: 'a', header: 'Active', render: (r) => <YesNo v={r.isActive} /> },
              ]}
            />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>
            Each party contact chooses email, SMS or WhatsApp and a language on their party record; a rule never sends on a
            channel the contact has switched off. Customs updates notify only on clearance.
          </p>
          <AuditNote />
        </>
      )}

      {tab === 'print' && <PrintTab printTemplates={printTemplates} />}
    </SetupPage>
  );
}
