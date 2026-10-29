import { useState } from 'react';
import { Lock, LockOpen, Plus } from 'lucide-react';
import {
  Banner, Button, DataTable, Field, Input, Panel, Pill, Select, Tabs, fmtD, fmtDT, useToast,
} from '@/ds/components';
import {
  SRC, chargeCodes as seedCharges, glSettings, paymentChannels, periods as seedPeriods, taxCodes,
} from '@/mock/admin';
import { AuditNote, EditDrawer, SeedBanner, SetupPage, VerifyPill, YesNo, label, useEditable } from './AdminKit';

/* Finance setup: /accounting-periods, /gl-settings, /tax-codes,
   /charge-codes, /payment-channels. Seeded tax and charge codes; accounts,
   channels and periods are the customer's own. */
type Tab = 'periods' | 'gl' | 'tax' | 'charges' | 'channels';
type Period = (typeof seedPeriods)[number];
type Charge = (typeof seedCharges)[number];
type Channel = (typeof paymentChannels)[number];

export function Finance() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('periods');
  const [periods, setPeriods] = useEditable<Period>('periods', seedPeriods);
  const [charges, setCharges] = useEditable<Charge>('charges', seedCharges);
  const [per, setPer] = useState<Period | null>(null);
  const [map, setMap] = useState<Charge | null>(null);
  const [ch, setCh] = useState<Channel | null>(null);
  const gl = (k: string) => glSettings.find((g) => g.settingKey === k)?.glAccount;
  const unmapped = charges.filter((c) => !c.revenueGlAccount);
  const oldestOpen = [...periods].filter((p) => p.status === 'OPEN').sort((a, b) => a.periodKey.localeCompare(b.periodKey))[0];

  return (
    <SetupPage title="Finance setup" ms="M3" sub="Accounting periods, how charges post to the ledger, VAT, and how customers pay"
      sources={[{ table: 'accounting_period, m_gl_setting, m_payment_channel' }, SRC.tax, SRC.charges]}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'periods', label: 'Accounting periods' }, { id: 'gl', label: 'GL mapping', count: unmapped.length || undefined },
        { id: 'tax', label: 'Tax codes', count: taxCodes.length }, { id: 'charges', label: 'Charge codes', count: charges.length },
        { id: 'channels', label: 'Payment channels', count: paymentChannels.length },
      ]} />

      {tab === 'periods' && (
        <>
          <Panel flush title="Accounting periods" sub="Postings go to the period of the document date. A closed period refuses new postings; corrections go to the next open period.">
            <DataTable rows={periods} rowKey={(p) => p.periodKey} cols={[
              { key: 'k', header: 'Period', render: (p) => <span className="adm-cond strong">{p.periodKey}</span> },
              { key: 'd', header: 'Dates', render: (p) => <span className="small">{fmtD(p.periodStart)} – {fmtD(p.periodEnd)}</span> },
              { key: 's', header: 'Status', render: (p) => p.status === 'CLOSED' ? <Pill icon={<Lock />}>Closed</Pill> : <Pill tone="go">Open</Pill> },
              { key: 'c', header: 'Closed', render: (p) => p.closedAt ? <span className="small muted">{fmtDT(p.closedAt)} · {p.closedBy}</span> : '—' },
              { key: 'a', header: '', render: (p) => p.status === 'OPEN'
                ? (p === oldestOpen ? <Button size="sm" icon={<Lock />} perm="finance.period.close" onClick={() => setPer(p)}>Close period</Button> : <span className="xs faint">Close {oldestOpen?.periodKey} first</span>)
                : <Button size="sm" variant="ghost" icon={<LockOpen />} perm="finance.period.close" onClick={() => setPer(p)}>Reopen</Button> },
            ]} />
          </Panel>
          <AuditNote />
        </>
      )}

      {tab === 'gl' && (
        <>
          {unmapped.length > 0 && <Banner tone="stop" title={`${unmapped.length} charge codes have no revenue account`}>Invoices with {unmapped.map((c) => c.chargeCode).join(', ')} cannot post to the ledger. Map them before using them.</Banner>}
          <Panel flush title="Charge code → accounts" sub="Revenue account per charge; VAT output comes from the tax code; receivables and disbursement clearing from the control accounts below">
            <DataTable rows={charges} rowKey={(c) => c.chargeCode} onRow={setMap} cols={[
              { key: 'c', header: 'Charge', render: (c) => <><strong className="small">{c.chargeName}</strong><div className="xs faint">{c.chargeCode}</div></> },
              { key: 'r', header: 'Revenue (credit)', render: (c) => c.isDisbursement ? <span className="small muted">— (pass-through)</span> : c.revenueGlAccount ? <span className="adm-code">{c.revenueGlAccount}</span> : <Pill tone="stop">Not mapped</Pill> },
              { key: 'v', header: 'VAT output', render: (c) => { const t = taxCodes.find((x) => x.taxCode === c.defaultTaxCode); return t?.outputGlAccount ? <span className="adm-code">{t.outputGlAccount}</span> : <span className="faint small">No VAT</span>; } },
              { key: 'ar', header: 'Receivables (debit)', render: () => <span className="adm-code">{gl('AR_CONTROL')}</span> },
              { key: 'dc', header: 'Disbursement clearing', render: (c) => c.isDisbursement ? <span className="adm-code">{gl('DISBURSEMENT_CLEARING')}</span> : <span className="faint">—</span> },
            ]} />
          </Panel>
          <Panel flush title="Control accounts">
            <DataTable rows={glSettings} rowKey={(g) => g.settingKey} cols={[
              { key: 'k', header: 'Setting', render: (g) => <span className="small strong">{label(g.settingKey)}</span> },
              { key: 'a', header: 'Account', render: (g) => <span className="adm-code">{g.glAccount}</span> },
              { key: 'd', header: 'Used for', render: (g) => <span className="small muted">{g.description}</span> },
            ]} />
          </Panel>
          <AuditNote>Mapping changes apply to the next posting; posted entries are not rewritten.</AuditNote>
        </>
      )}

      {tab === 'tax' && (
        <>
          <SeedBanner>Verify with a tax adviser: the 18% standard rate, which services to transit cargo are zero-rated, the treatment of disbursements re-billed at cost, and the class codes your VFD provider expects. Kenya and Uganda codes are starter values and stay off.</SeedBanner>
          <Panel flush title="Tax codes">
            <DataTable rows={taxCodes} rowKey={(t) => t.taxCode} cols={[
              { key: 'c', header: 'Code', render: (t) => <><strong className="small">{t.taxName}</strong><div className="xs faint">{t.taxCode}</div></> },
              { key: 'k', header: 'Country', render: (t) => t.countryCode },
              { key: 'r', header: 'Rate', num: true, render: (t) => `${Number(t.ratePct)}%` },
              { key: 't', header: 'Treatment', render: (t) => <span className="small">{label(t.taxTreatment)}</span> },
              { key: 'f', header: 'VFD class', render: (t) => t.fiscalTaxClass ?? <span className="faint small">Not set</span> },
              { key: 'g', header: 'Output account', render: (t) => t.outputGlAccount ? <span className="adm-code">{t.outputGlAccount}</span> : '—' },
              { key: 'from', header: 'From', render: (t) => <span className="small">{fmtD(t.effectiveFrom)}</span> },
              { key: 'a', header: 'Status', render: (t) => <span className="row-wrap">{t.isActive ? <Pill tone="go">Active</Pill> : <Pill>Off</Pill>}{t.verify && <span title={t.verify}><VerifyPill>Verify with tax adviser</VerifyPill></span>}</span> },
            ]} />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>A rate change is a new row with a start date, so old invoices keep their rate.</p>
        </>
      )}

      {tab === 'charges' && (
        <Panel flush title="Charge codes" sub="What can appear on an invoice, in print order. Rates live in tariffs."
          actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Charge code added')}>Add charge code</Button>}>
          <DataTable rows={charges} rowKey={(c) => c.chargeCode} cols={[
            { key: 'o', header: 'Order', num: true, render: (c) => c.printOrder },
            { key: 'c', header: 'Code', render: (c) => <span className="adm-code">{c.chargeCode}</span> },
            { key: 'n', header: 'Name on invoice', render: (c) => c.chargeName },
            { key: 'g', header: 'Group', render: (c) => <span className="small">{label(c.chargeGroup)}</span> },
            { key: 't', header: 'Default tax', render: (c) => <span className="small">{c.defaultTaxCode}</span> },
            { key: 'd', header: 'Disbursement', render: (c) => <YesNo v={c.isDisbursement} /> },
          ]} />
        </Panel>
      )}

      {tab === 'channels' && (
        <>
          <Panel flush title="Payment channels" sub="Each channel has its own bank or till account and a rule for the reference the cashier types"
            actions={<Button size="sm" icon={<Plus />} perm="finance.period.close" onClick={() => toast('Payment channel added')}>Add channel</Button>}>
            <DataTable rows={paymentChannels} rowKey={(c) => c.channelCode} onRow={setCh} cols={[
              { key: 'n', header: 'Channel', render: (c) => <><strong>{c.channelName}</strong><div className="xs faint">{c.channelCode}</div></> },
              { key: 'm', header: 'Method', render: (c) => <span className="small">{label(c.method)}</span> },
              { key: 'cur', header: 'Currency', render: (c) => c.currency },
              { key: 'g', header: 'Account', render: (c) => <span className="adm-code">{c.glAccount}</span> },
              { key: 'r', header: 'Reference rule', render: (c) => c.referencePattern ? <span className="adm-code-box">{c.referencePattern}</span> : <span className="faint small">None</span> },
              { key: 'x', header: 'Example', render: (c) => <span className="adm-cond">{c.example}</span> },
            ]} />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>The same reference cannot be used twice on one channel, so a payment is never recorded twice.</p>
        </>
      )}

      {per && (
        <EditDrawer open onClose={() => setPer(null)} title={per.status === 'OPEN' ? `Close ${per.periodKey}` : `Reopen ${per.periodKey}`}
          saveLabel={per.status === 'OPEN' ? 'Close period' : 'Reopen period'} perm="finance.period.close" danger={per.status === 'CLOSED'}
          reason={per.status === 'CLOSED' ? 'Reopening is reported to the auditor. Say what must be corrected.' : undefined}
          onSave={() => {
            setPeriods((all) => all.map((p) => (p.periodKey === per.periodKey ? { ...p, status: p.status === 'OPEN' ? 'CLOSED' : 'OPEN', closedAt: p.status === 'OPEN' ? '2026-10-08T07:30:00Z' : undefined, closedBy: p.status === 'OPEN' ? 'Ashok K.' : undefined } : p)));
            toast(per.status === 'OPEN' ? 'Period closed' : 'Period reopened');
          }}>
          {per.status === 'OPEN' ? (
            <>
              <p className="small">Checks before closing:</p>
              <Banner tone="go" title="All invoices in the period are posted">0 drafts or proformas dated in {per.periodKey}.</Banner>
              <Banner tone="wait" title="3 receipts are not allocated">USD 1,840 sits in unallocated receipts. You can close; they stay open into the next period.</Banner>
              <Banner tone="go" title="Fiscal receipts issued">Every posted invoice has a VFD receipt.</Banner>
            </>
          ) : <Banner tone="wait">While reopened, back-dated postings land in {per.periodKey}. Close it again when done.</Banner>}
        </EditDrawer>
      )}
      {map && (
        <EditDrawer open onClose={() => setMap(null)} title={`Accounts for ${map.chargeName}`} saveLabel="Save mapping" perm="finance.period.close" disabled={map.isDisbursement}
          onSave={() => { setCharges((all) => all.map((c) => (c.chargeCode === map.chargeCode ? map : c))); toast('Mapping saved'); }}>
          {map.isDisbursement ? <Banner tone="info">Disbursements are passed through at cost: they debit receivables and credit disbursement clearing ({gl('DISBURSEMENT_CLEARING')}). No revenue account.</Banner> : (
            <>
              <Field label="Revenue account" required hint="Account code as it is in the ERP chart of accounts"><Input value={map.revenueGlAccount ?? ''} onChange={(e) => setMap({ ...map, revenueGlAccount: e.target.value })} placeholder="e.g. 4700-72" /></Field>
              <Field label="Default tax code"><Select value={map.defaultTaxCode ?? ''} onChange={(e) => setMap({ ...map, defaultTaxCode: e.target.value })} options={taxCodes.filter((t) => t.isActive).map((t) => [t.taxCode, `${t.taxName} (${Number(t.ratePct)}%)`])} /></Field>
            </>
          )}
        </EditDrawer>
      )}
      {ch && <ChannelDrawer ch={ch} onClose={() => setCh(null)} />}
    </SetupPage>
  );
}

function ChannelDrawer({ ch, onClose }: { ch: Channel; onClose: () => void }) {
  const toast = useToast();
  const [ref, setRef] = useState(ch.example === '—' ? '' : ch.example);
  const ok = !ch.referencePattern || new RegExp(ch.referencePattern).test(ref.trim().toUpperCase());
  return (
    <EditDrawer open onClose={onClose} title={ch.channelName} saveLabel="Save channel" perm="finance.period.close" onSave={() => toast('Channel saved')}>
      <div className="form-grid">
        <Field label="Name"><Input defaultValue={ch.channelName} /></Field>
        <Field label="Provider"><Input defaultValue={ch.provider ?? ''} /></Field>
        <Field label="Account"><Input defaultValue={ch.glAccount ?? ''} /></Field>
        <Field label="Currency"><Select defaultValue={ch.currency} options={['USD', 'TZS']} /></Field>
      </div>
      <Field label="Reference rule" hint={ch.refHint}><Input defaultValue={ch.referencePattern ?? ''} className="adm-code" /></Field>
      <Field label="Test a reference" error={ref && !ok ? 'The cashier would be asked to correct this' : undefined} hint={ref && ok ? 'Accepted' : undefined}>
        <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={ch.example} />
      </Field>
    </EditDrawer>
  );
}
