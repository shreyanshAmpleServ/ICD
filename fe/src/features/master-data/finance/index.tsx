import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CreditCard, DollarSign, FileText, Lock, LockOpen, Plus, Sliders } from 'lucide-react';
import { Banner, Button, DataTable, Panel, Pill, Tabs, fmtD, fmtDT, useToast } from '@/ds/components';
import {
  SRC, chargeCodes as seedCharges, glSettings as seedGlSettings, paymentChannels as seedChannels, periods as seedPeriods, taxCodes as seedTaxCodes,
} from '@/mock/admin';
import { AuditNote, SeedBanner, SetupPage, VerifyPill, YesNo, label, useEditable } from '../shared/AdminKit';
import { useQ } from '@/api/query';
import { financeApi } from './api';
import { PeriodDrawer } from './components/PeriodDrawer';
import { ChargeMapDrawer } from './components/ChargeMapDrawer';
import { ChannelDrawer } from './components/ChannelDrawer';
import { AddPeriodModal } from './components/AddPeriodModal';
import { AddChargeCodeModal } from './components/AddChargeCodeModal';
import { AddTaxCodeModal } from './components/AddTaxCodeModal';
import { AddChannelModal } from './components/AddChannelModal';
import { GlSettingDrawer } from './components/GlSettingDrawer';
import { TaxCodeDrawer } from './components/TaxCodeDrawer';

export { financeApi } from './api';

type Tab = 'periods' | 'gl' | 'tax' | 'charges' | 'channels';
type Period = (typeof seedPeriods)[number];
type Charge = (typeof seedCharges)[number];
type Channel = (typeof seedChannels)[number];
type GlSetting = (typeof seedGlSettings)[number];
type TaxCode = (typeof seedTaxCodes)[number];

export function FinanceView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('periods');
  const [periods, setPeriods] = useEditable<Period>('periods', seedPeriods, () => financeApi.getAccountingPeriods());
  const [charges, setCharges] = useEditable<Charge>('charges', seedCharges, () => financeApi.getChargeCodes());
  const [glList, setGlList] = useEditable<GlSetting>('glSettings', seedGlSettings, () => financeApi.getGlSettings());

  const { data: taxData } = useQ<any[]>(['admin', 'taxCodes'], () => financeApi.getTaxCodes());
  const { data: channelData } = useQ<Channel[]>(['admin', 'paymentChannels'], () => financeApi.getPaymentChannels());

  const [localTaxCodes, setLocalTaxCodes] = useState<TaxCode[] | null>(null);
  const [localChannels, setLocalChannels] = useState<Channel[] | null>(null);

  const taxCodes: TaxCode[] = localTaxCodes ?? ((Array.isArray(taxData) && taxData.length > 0) ? (taxData as TaxCode[]) : (seedTaxCodes as TaxCode[]));
  const paymentChannels: Channel[] = localChannels ?? ((Array.isArray(channelData) && channelData.length > 0) ? (channelData as Channel[]) : (seedChannels as Channel[]));

  // Edit Drawers State
  const [per, setPer] = useState<Period | null>(null);
  const [map, setMap] = useState<Charge | null>(null);
  const [ch, setCh] = useState<Channel | null>(null);
  const [activeGl, setActiveGl] = useState<GlSetting | null>(null);
  const [activeTax, setActiveTax] = useState<TaxCode | null>(null);

  // Add Modals State
  const [addPeriodOpen, setAddPeriodOpen] = useState(false);
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [addTaxOpen, setAddTaxOpen] = useState(false);
  const [addChannelOpen, setAddChannelOpen] = useState(false);

  const gl = (k: string) => glList.find((g) => g.settingKey === k)?.glAccount || seedGlSettings.find((g) => g.settingKey === k)?.glAccount;
  const unmapped = charges.filter((c) => !c.revenueGlAccount && !c.isDisbursement);
  const oldestOpen = [...periods].filter((p) => p.status === 'OPEN').sort((a, b) => a.periodKey.localeCompare(b.periodKey))[0];

  return (
    <SetupPage
      title="Finance setup"
      ms="M3"
      sub="Accounting periods, how charges post to the ledger, VAT, and how customers pay"
      sources={[{ table: 'accounting_period, m_gl_setting, m_payment_channel' }, SRC.tax, SRC.charges]}
    >
      {/* Quick Links Navigation Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.625rem 1rem',
        background: 'var(--panel-bg, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: 'var(--text-muted, #64748b)'
      }}>
        <span style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>Finance Modules:</span>
        <Link to="/tariffs" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', textDecoration: 'none' }}>
          <Sliders size={14} /> Tariffs & Rates <ArrowUpRight size={12} />
        </Link>
        <span>·</span>
        <Link to="/ledger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', textDecoration: 'none' }}>
          <BookOpen size={14} /> General Ledger <ArrowUpRight size={12} />
        </Link>
        <span>·</span>
        <Link to="/invoices" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', textDecoration: 'none' }}>
          <FileText size={14} /> Customer Invoices <ArrowUpRight size={12} />
        </Link>
        <span>·</span>
        <Link to="/cashier" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', textDecoration: 'none' }}>
          <CreditCard size={14} /> Cashier Desk <ArrowUpRight size={12} />
        </Link>
        <span>·</span>
        <Link to="/exchange-rates" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', textDecoration: 'none' }}>
          <DollarSign size={14} /> FX Rates <ArrowUpRight size={12} />
        </Link>
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'periods', label: 'Accounting periods', count: periods.length },
          { id: 'gl', label: 'GL mapping', count: unmapped.length || undefined },
          { id: 'tax', label: 'Tax codes', count: taxCodes.length },
          { id: 'charges', label: 'Charge codes', count: charges.length },
          { id: 'channels', label: 'Payment channels', count: paymentChannels.length },
        ]}
      />

      {tab === 'periods' && (
        <>
          <Panel
            flush
            title="Accounting periods"
            sub="Postings go to the period of the document date. A closed period refuses new postings; corrections go to the next open period."
            actions={
              <div className="row" style={{ gap: '0.5rem' }}>
                <Link to="/ledger" className="btn btn-sm btn-ghost" style={{ textDecoration: 'none' }}>
                  View in General Ledger →
                </Link>
                <Button size="sm" icon={<Plus />} perm="finance.period.close" onClick={() => setAddPeriodOpen(true)}>
                  Open next period
                </Button>
              </div>
            }
          >
            <DataTable
              rows={periods}
              rowKey={(p) => p.periodKey}
              cols={[
                { key: 'k', header: 'Period', render: (p) => <span className="adm-cond strong">{p.periodKey}</span> },
                { key: 'd', header: 'Dates', render: (p) => <span className="small">{fmtD(p.periodStart)} – {fmtD(p.periodEnd)}</span> },
                { key: 's', header: 'Status', render: (p) => p.status === 'CLOSED' ? <Pill icon={<Lock />}>Closed</Pill> : <Pill tone="go">Open</Pill> },
                { key: 'c', header: 'Closed', render: (p) => p.closedAt ? <span className="small muted">{fmtDT(p.closedAt)} · {p.closedBy}</span> : '—' },
                {
                  key: 'a',
                  header: '',
                  render: (p) => p.status === 'OPEN'
                    ? (p === oldestOpen ? <Button size="sm" icon={<Lock />} perm="finance.period.close" onClick={() => setPer(p)}>Close period</Button> : <span className="xs faint">Close {oldestOpen?.periodKey} first</span>)
                    : <Button size="sm" variant="ghost" icon={<LockOpen />} perm="finance.period.close" onClick={() => setPer(p)}>Reopen</Button>
                },
              ]}
            />
          </Panel>
          <AuditNote />
        </>
      )}

      {tab === 'gl' && (
        <>
          {unmapped.length > 0 && (
            <Banner tone="stop" title={`${unmapped.length} charge codes have no revenue account`}>
              Invoices with {unmapped.map((c) => c.chargeCode).join(', ')} cannot post to the ledger. Map them before using them.
            </Banner>
          )}
          <Panel flush title="Charge code → accounts" sub="Revenue account per charge; VAT output comes from the tax code; receivables and disbursement clearing from the control accounts below">
            <DataTable rows={charges} rowKey={(c) => c.chargeCode} onRow={setMap} cols={[
              { key: 'c', header: 'Charge', render: (c) => <><strong className="small">{c.chargeName}</strong><div className="xs faint">{c.chargeCode}</div></> },
              { key: 'r', header: 'Revenue (credit)', render: (c) => c.isDisbursement ? <span className="small muted">— (pass-through)</span> : c.revenueGlAccount ? <span className="adm-code">{c.revenueGlAccount}</span> : <Pill tone="stop">Not mapped</Pill> },
              { key: 'v', header: 'VAT output', render: (c) => { const t = taxCodes.find((x) => x.taxCode === c.defaultTaxCode); return t?.outputGlAccount ? <span className="adm-code">{t.outputGlAccount}</span> : <span className="faint small">No VAT</span>; } },
              { key: 'ar', header: 'Receivables (debit)', render: () => <span className="adm-code">{gl('AR_CONTROL')}</span> },
              { key: 'dc', header: 'Disbursement clearing', render: (c) => c.isDisbursement ? <span className="adm-code">{gl('DISBURSEMENT_CLEARING')}</span> : <span className="faint">—</span> },
            ]} />
          </Panel>

          <Panel flush title="Control accounts" sub="Click any control account to update its general ledger mapping">
            <DataTable rows={glList} rowKey={(g) => g.settingKey} onRow={setActiveGl} cols={[
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
          <Panel
            flush
            title="Tax codes"
            sub="Click any tax code to inspect or update rate, output GL account, and fiscal class."
            actions={
              <Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => setAddTaxOpen(true)}>
                Add tax code
              </Button>
            }
          >
            <DataTable rows={taxCodes} rowKey={(t) => t.taxCode} onRow={setActiveTax} cols={[
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
        <Panel
          flush
          title="Charge codes"
          sub="What can appear on an invoice, in print order. Rates live in tariffs."
          actions={
            <div className="row" style={{ gap: '0.5rem' }}>
              <Link to="/tariffs" className="btn btn-sm btn-ghost" style={{ textDecoration: 'none' }}>
                Configure tariff rate cards →
              </Link>
              <Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => setAddChargeOpen(true)}>
                Add charge code
              </Button>
            </div>
          }
        >
          <DataTable rows={charges} rowKey={(c) => c.chargeCode} onRow={setMap} cols={[
            { key: 'o', header: 'Order', num: true, render: (c) => c.printOrder },
            { key: 'c', header: 'Code', render: (c) => <span className="adm-code">{c.chargeCode}</span> },
            { key: 'n', header: 'Name on invoice', render: (c) => <><strong className="small">{c.chargeName}</strong><div className="xs faint">{c.revenueGlAccount ? `GL: ${c.revenueGlAccount}` : 'Unmapped GL'}</div></> },
            { key: 'g', header: 'Group', render: (c) => <span className="small">{label(c.chargeGroup)}</span> },
            { key: 't', header: 'Default tax', render: (c) => <span className="small">{c.defaultTaxCode}</span> },
            { key: 'd', header: 'Disbursement', render: (c) => <YesNo v={c.isDisbursement} /> },
          ]} />
        </Panel>
      )}

      {tab === 'channels' && (
        <>
          <Panel
            flush
            title="Payment channels"
            sub="Each channel has its own bank or till account and a rule for the reference the cashier types"
            actions={
              <div className="row" style={{ gap: '0.5rem' }}>
                <Link to="/cashier" className="btn btn-sm btn-ghost" style={{ textDecoration: 'none' }}>
                  Open Cashier Counter →
                </Link>
                <Button size="sm" icon={<Plus />} perm="finance.period.close" onClick={() => setAddChannelOpen(true)}>
                  Add channel
                </Button>
              </div>
            }
          >
            <DataTable<Channel> rows={paymentChannels} rowKey={(c) => c.channelCode} onRow={(selectedChannel) => setCh(selectedChannel)} cols={[
              { key: 'n', header: 'Channel', render: (c: Channel) => <><strong>{c.channelName}</strong><div className="xs faint">{c.channelCode}</div></> },
              { key: 'm', header: 'Method', render: (c: Channel) => <span className="small">{label(c.method)}</span> },
              { key: 'cur', header: 'Currency', render: (c: Channel) => c.currency },
              { key: 'g', header: 'Account', render: (c: Channel) => <span className="adm-code">{c.glAccount}</span> },
              { key: 'r', header: 'Reference rule', render: (c: Channel) => c.referencePattern ? <span className="adm-code-box">{c.referencePattern}</span> : <span className="faint small">None</span> },
              { key: 'x', header: 'Example', render: (c: Channel) => <span className="adm-cond">{c.example}</span> },
            ]} />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>The same reference cannot be used twice on one channel, so a payment is never recorded twice.</p>
        </>
      )}

      {/* Period Close / Reopen Drawer */}
      <PeriodDrawer
        per={per}
        onClose={() => setPer(null)}
        onSave={(why) => {
          if (!per) return;
          const isClosing = per.status === 'OPEN';
          if (isClosing) {
            financeApi.closePeriod(per.periodKey, why).catch(() => {});
            setPeriods((all) => all.map((p) => (p.periodKey === per.periodKey ? { ...p, status: 'CLOSED', closedAt: new Date().toISOString(), closedBy: 'Ashok Kumar' } : p)));
            toast(`Period ${per.periodKey} closed`);
          } else {
            financeApi.reopenPeriod(per.periodKey, why).catch(() => {});
            setPeriods((all) => all.map((p) => (p.periodKey === per.periodKey ? { ...p, status: 'OPEN', closedAt: undefined, closedBy: undefined } : p)));
            toast(`Period ${per.periodKey} reopened`);
          }
          setPer(null);
        }}
      />

      {/* Add Period Modal */}
      <AddPeriodModal
        open={addPeriodOpen}
        onClose={() => setAddPeriodOpen(false)}
        existingPeriods={periods}
        onSave={(newPer) => {
          financeApi.createPeriod(newPer).catch(() => {});
          setPeriods((all) => [newPer, ...all]);
          toast(`Period ${newPer.periodKey} opened`);
          setAddPeriodOpen(false);
        }}
      />

      {/* Charge Mapping / Edit Drawer */}
      <ChargeMapDrawer
        map={map}
        taxCodes={taxCodes}
        onClose={() => setMap(null)}
        setMap={setMap}
        onSave={() => {
          if (!map) return;
          const id = (map as any).chargeCodeId ?? map.chargeCode;
          financeApi.updateCharge(id, map).catch(() => {});
          setCharges((all) => all.map((c) => (c.chargeCode === map.chargeCode ? map : c)));
          toast('Charge mapping saved');
          setMap(null);
        }}
      />

      {/* Add Charge Code Modal */}
      <AddChargeCodeModal
        open={addChargeOpen}
        onClose={() => setAddChargeOpen(false)}
        taxCodes={taxCodes}
        onSave={(newCharge) => {
          financeApi.createChargeCode(newCharge).catch(() => {});
          setCharges((all) => [newCharge, ...all]);
          toast(`Charge code ${newCharge.chargeCode} added`);
          setAddChargeOpen(false);
        }}
      />

      {/* Tax Code Drawer */}
      <TaxCodeDrawer
        taxCode={activeTax}
        onClose={() => setActiveTax(null)}
        onSave={(updated) => {
          const id = updated.taxCodeId ?? updated.taxCode;
          financeApi.updateTaxCode(id, updated).catch(() => {});
          const next = taxCodes.map((t) => (t.taxCode === updated.taxCode ? updated : t));
          setLocalTaxCodes(next);
          toast(`Tax code ${updated.taxCode} updated`);
          setActiveTax(null);
        }}
      />

      {/* Add Tax Code Modal */}
      <AddTaxCodeModal
        open={addTaxOpen}
        onClose={() => setAddTaxOpen(false)}
        onSave={(newTax) => {
          financeApi.createTaxCode(newTax).catch(() => {});
          setLocalTaxCodes([newTax, ...taxCodes]);
          toast(`Tax code ${newTax.taxCode} added`);
          setAddTaxOpen(false);
        }}
      />

      {/* Payment Channel Drawer */}
      <ChannelDrawer
        ch={ch}
        onClose={() => setCh(null)}
        onSave={(updated) => {
          const id = (updated as any).paymentChannelId ?? updated.channelCode;
          financeApi.updatePaymentChannel(id, updated).catch(() => {});
          const next = paymentChannels.map((c) => (c.channelCode === updated.channelCode ? updated : c));
          setLocalChannels(next);
          toast(`Payment channel ${updated.channelName} updated`);
          setCh(null);
        }}
      />

      {/* Add Channel Modal */}
      <AddChannelModal
        open={addChannelOpen}
        onClose={() => setAddChannelOpen(false)}
        onSave={(newChannel) => {
          financeApi.createPaymentChannel(newChannel).catch(() => {});
          setLocalChannels([newChannel, ...paymentChannels]);
          toast(`Payment channel ${newChannel.channelName} added`);
          setAddChannelOpen(false);
        }}
      />

      {/* Control Account GL Setting Drawer */}
      <GlSettingDrawer
        setting={activeGl}
        onClose={() => setActiveGl(null)}
        onSave={(updated) => {
          financeApi.updateGlSetting(updated.settingKey, updated).catch(() => {});
          setGlList((all) => all.map((g) => (g.settingKey === updated.settingKey ? updated : g)));
          toast(`Control account ${label(updated.settingKey)} updated`);
          setActiveGl(null);
        }}
      />
    </SetupPage>
  );
}

export { FinanceView as Finance };
export default FinanceView;
