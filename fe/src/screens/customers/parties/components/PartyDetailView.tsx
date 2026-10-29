import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText, Link2, Pencil, RefreshCw } from 'lucide-react';
import {
  Banner, Button, DL, DataTable, Empty, Kpi, Meter, Money, Page, PageHeader, Panel, Pill,
  StatusPill, Tabs, Tag, Timeline, UnitNo, fmtD, useToast,
} from '@/ds/components';
import { allStays, consignments, parties, party as partyOf } from '@/mock/core';
import { balanceOf, contactsOf, invoicesOf, partySync } from '@/mock/insight';
import { MatchDrawer } from './MatchDrawer';
import { ContactDrawer } from './ContactDrawer';

type Party = (typeof parties)[number];
type Tab = 'overview' | 'contacts' | 'cargo' | 'sync';
type Contact = ReturnType<typeof contactsOf>[number];
const roleText = (r: string) => r.toLowerCase().replace(/_/g, ' ');
const CREDIT: Record<string, ['go' | 'idle' | 'stop', string]> = {
  CREDIT: ['go', 'Credit'],
  CASH: ['idle', 'Cash'],
  BLOCKED: ['stop', 'Credit stopped'],
};

export function PartyDetailView() {
  const { partyId } = useParams();
  const id = Number(partyId);
  const nav = useNavigate();
  const toast = useToast();
  const base = partyOf(id);
  const [matched, setMatched] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [matchOpen, setMatchOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [edit, setEdit] = useState<Contact | null>(null);

  if (!base) {
    return (
      <Page>
        <Empty title="Party not found" action={<Link to="/parties">Back to customers & parties</Link>}>
          It may have been merged into its NG record. Search by name instead.
        </Empty>
      </Page>
    );
  }

  const p: Party = matched ? { ...base, syncStatus: 'SYNCED', source: 'NG', ngRefId: matched } : base;
  const cs = contacts ?? contactsOf(id);
  const invs = invoicesOf(id);
  const bal = balanceOf(id);
  const limit = Number(p.creditLimit ?? 0);
  const cons = consignments.filter((c) =>
    [c.billToPartyId, c.consigneePartyId, c.agentPartyId, c.shippingLinePartyId, c.shipperPartyId].includes(id)
  );
  const units = allStays.filter(
    (s) => s.physicalStatus !== 'DEPARTED' && cons.some((c) => c.consignmentId === s.consignmentId)
  );
  const sync = partySync[id] ?? [
    { at: '2026-09-01T06:00:00Z', title: 'Synced from NG', detail: p.ngRefId ?? '', tone: 'go' as const },
  ];

  return (
    <Page>
      <PageHeader
        crumbs={[['Customers & parties', '/parties'], [p.partyName]]}
        title={p.partyName}
        ms="M0"
        sub={
          <span className="row-wrap" style={{ marginTop: 6 }}>
            <span className="small muted">{p.partyCode}</span>
            {p.roles.map((r) => (
              <Tag key={r}>{roleText(r)}</Tag>
            ))}
            <Pill tone={CREDIT[p.creditStatus ?? 'CASH'][0]}>{CREDIT[p.creditStatus ?? 'CASH'][1]}</Pill>
            {p.syncStatus === 'SYNCED' ? <StatusPill value="SYNCED" /> : <Pill tone="wait">Provisional</Pill>}
          </span>
        }
        actions={
          <>
            <Button
              icon={<RefreshCw />}
              perm="masters.view"
              onClick={() => toast('Refreshed from NG')}
              disabled={p.syncStatus !== 'SYNCED'}
            >
              Refresh from NG
            </Button>
            <Button
              variant="primary"
              icon={<FileText />}
              perm="billing.invoice.view"
              onClick={() => nav(`/statements/${id}`)}
            >
              Open statement
            </Button>
          </>
        }
      />

      <div className="stack-lg">
        {p.syncStatus !== 'SYNCED' && (
          <Banner
            tone="wait"
            title="Provisional — match to NG record"
            action={
              <Button
                variant="primary"
                icon={<Link2 />}
                perm="masters.local.edit"
                onClick={() => setMatchOpen(true)}
              >
                Match to NG record
              </Button>
            }
          >
            Created locally at the gate while NG was unreachable. Invoices to this party stay in draft until it is
            matched, so they post against the right customer account.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi
            label="Open balance"
            value={<Money amount={bal} currency="USD" />}
            delta={<Link to={`/statements/${id}`}>Open statement</Link>}
          />
          <Kpi
            label="Credit used"
            value={limit ? `${Math.round((bal / limit) * 100)}%` : '—'}
            delta={
              limit
                ? `of USD ${limit.toLocaleString()}`
                : p.creditStatus === 'BLOCKED'
                ? 'Credit stopped: cash only'
                : 'Cash customer'
            }
          >
            {limit ? <Meter pct={(bal / limit) * 100} label="Credit used" /> : null}
          </Kpi>
          <Kpi
            label="Open units"
            value={units.length}
            delta={`${cons.length} consignment${cons.length === 1 ? '' : 's'}`}
          />
          <Kpi label="Contacts" value={cs.length} delta={`${cs.filter((c) => c.notifyWhatsapp).length} on WhatsApp`} />
        </div>

        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'contacts', label: 'Contacts & notifications', count: cs.length },
            { id: 'cargo', label: 'Cargo', count: units.length },
            { id: 'sync', label: 'NG sync' },
          ]}
        />

        {tab === 'overview' && (
          <div className="grid-main-side">
            <Panel title="Details">
              <DL
                cols
                items={[
                  ['Code', p.partyCode],
                  ['NG record', p.ngRefId ?? 'Not matched'],
                  ['TIN', p.taxId],
                  ['VAT number', p.vatNo],
                  ['City', `${p.city ?? '—'}${p.countryCode && p.countryCode !== 'TZ' ? `, ${p.countryCode}` : ''}`],
                  ['Phone', p.phone],
                  ['Email', p.email],
                  ['Default currency', p.defaultCurrency],
                  ['Disbursements', p.disbursementService ? 'We pay port and line charges for them' : 'No'],
                ]}
              />
            </Panel>
            <Panel
              flush
              title="Invoices"
              sub={`${invs.filter((i) => Number(i.balance) > 0).length} open`}
              actions={
                <Link to={`/statements/${id}`} className="small">
                  Statement
                </Link>
              }
            >
              <DataTable
                dense
                rows={invs.slice(0, 6)}
                rowKey={(i) => i.invoiceId!}
                empty={<p className="small muted" style={{ padding: 16, margin: 0 }}>No invoices yet.</p>}
                cols={[
                  {
                    key: 'n',
                    header: 'Invoice',
                    render: (i) => (
                      <span className="small">
                        {i.invoiceNo}
                        <div className="xs faint">{fmtD(i.invoiceDate)}</div>
                      </span>
                    ),
                  },
                  { key: 's', header: 'Status', render: (i) => <StatusPill value={i.status} /> },
                  {
                    key: 'b',
                    header: 'Balance',
                    num: true,
                    render: (i) => (Number(i.balance) ? <Money amount={i.balance} /> : <span className="faint">—</span>),
                  },
                ]}
              />
            </Panel>
          </div>
        )}

        {tab === 'contacts' && (
          <Panel
            flush
            title="Contacts"
            sub="Who gets messages about gate-in, holds, release, invoices and free time ending"
          >
            <DataTable
              rows={cs}
              rowKey={(c) => c.partyContactId!}
              empty={<Empty title="No contacts">Add one so the customer hears about holds and free time.</Empty>}
              cols={[
                {
                  key: 'n',
                  header: 'Name',
                  render: (c) => (
                    <span>
                      <strong>{c.contactName}</strong>
                      {c.isPrimary && (
                        <>
                          {' '}
                          <Pill tone="info">Main</Pill>
                        </>
                      )}
                      <div className="xs faint">{c.jobTitle}</div>
                    </span>
                  ),
                },
                {
                  key: 'p',
                  header: 'Phone / email',
                  render: (c) => (
                    <span className="small">
                      {c.phone ?? '—'}
                      <div className="xs faint">{c.email ?? 'No email'}</div>
                    </span>
                  ),
                },
                {
                  key: 'ch',
                  header: 'Notify by',
                  render: (c) => (
                    <span className="row-wrap" style={{ gap: 4 }}>
                      {c.notifyEmail && <Tag>Email</Tag>}
                      {c.notifySms && <Tag>SMS</Tag>}
                      {c.notifyWhatsapp && <Tag>WhatsApp</Tag>}
                      {!c.notifyEmail && !c.notifySms && !c.notifyWhatsapp && <span className="xs faint">Nothing</span>}
                    </span>
                  ),
                },
                {
                  key: 'l',
                  header: 'Language',
                  render: (c) => <span className="small">{c.preferredLanguage === 'sw' ? 'Kiswahili' : 'English'}</span>,
                },
                {
                  key: 'e',
                  header: '',
                  render: (c) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Pencil />}
                      perm="masters.local.edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEdit(c);
                      }}
                    >
                      Edit
                    </Button>
                  ),
                },
              ]}
            />
          </Panel>
        )}

        {tab === 'cargo' && (
          <div className="grid-main-side">
            <Panel flush title="Open units">
              <DataTable
                dense
                rows={units.slice(0, 30)}
                rowKey={(s) => s.unitStayId!}
                empty={<Empty title="No open units">Units appear once a manifest names this party.</Empty>}
                cols={[
                  {
                    key: 'u',
                    header: 'Unit',
                    render: (s) => (
                      <UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} to={`/units/${s.unitStayId}`} />
                    ),
                  },
                  { key: 'bl', header: 'BL', render: (s) => <span className="small">{s.unitSummary.consignmentRef}</span> },
                  { key: 'w', header: 'Where', render: (s) => <StatusPill value={s.physicalStatus} track="physical" /> },
                  { key: 'c', header: 'Customs', render: (s) => <StatusPill value={s.customsStatus} track="customs" /> },
                  { key: 'd', header: 'Days', num: true, render: (s) => s.unitSummary.dwellDays ?? '—' },
                ]}
              />
              {units.length > 30 && (
                <p className="xs muted" style={{ padding: '8px 16px', margin: 0 }}>
                  Showing 30 of {units.length}. <Link to="/units">See all in Units</Link>
                </p>
              )}
            </Panel>
            <Panel flush title="Consignments">
              <ul className="list-plain">
                {cons.map((c) => (
                  <li key={c.consignmentId} style={{ padding: '10px 16px' }}>
                    <Link to={`/consignments/${c.consignmentId}`} className="strong small">
                      {c.refNo}
                    </Link>
                    <div className="xs muted">
                      {c.cargoDescription} · {c.unitsReceived}/{c.unitsExpected} received ·{' '}
                      {[
                        c.billToPartyId === id && 'bill-to',
                        c.consigneePartyId === id && 'consignee',
                        c.agentPartyId === id && 'agent',
                        c.shippingLinePartyId === id && 'line',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  </li>
                ))}
                {cons.length === 0 && (
                  <li className="small muted" style={{ padding: 16 }}>
                    No consignments name this party.
                  </li>
                )}
              </ul>
            </Panel>
          </div>
        )}

        {tab === 'sync' && (
          <Panel
            title="Sync with NG"
            sub={
              p.syncStatus === 'SYNCED'
                ? `Linked to ${p.ngRefId}. Name, TIN and credit come from NG and cannot be edited here.`
                : 'Not linked yet'
            }
          >
            <Timeline
              items={[
                ...(matched
                  ? [
                      {
                        at: '2026-10-07T07:30:00Z',
                        title: `Matched to ${matched}`,
                        detail: 'Provisional record merged; local invoices re-pointed',
                        tone: 'go' as const,
                      },
                    ]
                  : []),
                ...sync,
              ]}
            />
          </Panel>
        )}
      </div>

      <MatchDrawer
        open={matchOpen}
        name={p.partyName}
        onClose={() => setMatchOpen(false)}
        onMatch={(ref) => {
          setMatched(ref);
          setMatchOpen(false);
          toast(`Matched to NG record ${ref}`);
        }}
      />
      <ContactDrawer
        c={edit}
        onClose={() => setEdit(null)}
        onSave={(c) => {
          setContacts(cs.map((x) => (x.partyContactId === c.partyContactId ? c : x)));
          setEdit(null);
          toast('Contact saved');
        }}
      />
    </Page>
  );
}
