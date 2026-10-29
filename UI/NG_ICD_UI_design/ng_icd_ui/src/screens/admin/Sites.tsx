import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Pencil, Plus, Power } from 'lucide-react';
import {
  Banner, Button, Check, DL, DataTable, Field, Input, Panel, Pill, Segmented, Select,
  useToast,
} from '@/ds/components';
import {
  FACILITY_NAME, SRC, calendars, company as seedCompany, countryPacks, sites as seedSites, type CountryPack, type Site,
} from '@/mock/admin';
import { AuditNote, EditDrawer, ListPanel, SetupPage, Split, VerifyPill, useEditable } from './AdminKit';

/* Company and sites: GET/PUT /company, /sites, /country-packs. A site is
   one physical depot with its own time zone, customs station, gates and
   yard; facilities switch whole menus on and off. */
const FACILITIES = ['ICD', 'ICDV', 'CFS', 'EMPTY_DEPOT', 'WAREHOUSE'] as const;
const SIGN: Record<string, string> = { SCREEN: 'On screen', PAPER: 'Paper only', EITHER: 'Screen or paper' };

export function Sites() {
  const toast = useToast();
  const [sites, setSites] = useEditable<Site>('sites', seedSites);
  const [packs, setPacks] = useEditable<CountryPack>('packs', countryPacks);
  const [company, setCompany] = useState(seedCompany);
  const [sel, setSel] = useState<string | number>('company');
  const [edit, setEdit] = useState<'company' | 'site' | 'new' | null>(null);
  const [packOpen, setPackOpen] = useState<CountryPack | null>(null);
  const site = sites.find((s) => s.siteId === sel);

  return (
    <SetupPage title="Company & sites" ms="M0" sub="Legal entity, country pack and the depots it runs"
      sources={[SRC.company, SRC.site, SRC.pack]}
      actions={<Button variant="primary" icon={<Plus />} perm="admin.site.manage" onClick={() => setEdit('new')}>Add site</Button>}>
      <Split list={
        <ListPanel title="Company and sites" selected={sel} onSelect={setSel} items={[
          { id: 'company', lead: <Building2 size={18} />, title: company.tradingName ?? company.legalName, sub: 'Company · ' + company.baseCurrency },
          ...sites.map((s) => ({ id: s.siteId!, lead: <MapPin size={18} />, title: `${s.siteCode} · ${s.siteName}`, sub: s.facilities.join(', '), aside: s.isActive ? undefined : <Pill>Inactive</Pill> })),
        ]} />
      }>
        {sel === 'company' && (
          <>
            <Panel title="Company" sub="Printed on invoices, receipts and gate passes"
              actions={<Button size="sm" icon={<Pencil />} perm="admin.site.manage" onClick={() => setEdit('company')}>Edit company</Button>}>
              <DL cols items={[
                ['Legal name', company.legalName], ['Trading name', company.tradingName], ['Company code', company.companyCode],
                ['TIN', <span key="t" className="adm-cond strong">{company.taxId}</span>], ['VRN (VAT number)', <span key="v" className="adm-cond strong">{company.vatNo}</span>],
                ['Base currency', company.baseCurrency], ['Country', 'Tanzania'], ['Address', `${company.addressLine1}, ${company.addressLine2}, ${company.city}`],
                ['Phone', company.phone], ['Email', company.email],
              ]} />
            </Panel>
            <Panel flush title="Country packs" sub="A pack brings regimes, customs reference types, authority holds and tax codes for one country">
              <DataTable rows={packs} rowKey={(p) => p.packCode} cols={[
                { key: 'n', header: 'Pack', render: (p) => <><strong>{p.packName}</strong><div className="xs faint">{p.packCode} · version {p.version}</div></> },
                { key: 'c', header: 'Contains', render: (p) => <span className="small">{p.contents}</span> },
                { key: 's', header: 'Status', render: (p) => p.isActive ? <Pill tone="go">Active</Pill> : <span className="row-wrap"><Pill>Inactive</Pill>{p.verify && <VerifyPill />}</span> },
                { key: 'a', header: '', render: (p) => p.isActive ? <span className="xs faint">In use by 3 sites</span>
                  : <Button size="sm" icon={<Power />} perm="admin.site.manage" onClick={() => setPackOpen(p)}>Activate pack</Button> },
              ]} />
            </Panel>
            <AuditNote />
          </>
        )}

        {site && (
          <>
            {!site.customsStationCode && site.facilities.some((f) => f !== 'WAREHOUSE' && f !== 'CFS') && (
              <Banner tone="wait" title="No customs station code">Customs references from this site cannot be checked against TRA until the station code is set.</Banner>
            )}
            <Panel title={`${site.siteCode} · ${site.siteName}`} sub={site.addressLine1 + ', ' + site.city}
              actions={<Button size="sm" icon={<Pencil />} perm="admin.site.manage" onClick={() => setEdit('site')}>Edit site</Button>}>
              <div className="stack">
                <div className="row-wrap">{site.facilities.map((f) => <Pill key={f} tone="info">{FACILITY_NAME[f]}</Pill>)}</div>
                <DL cols items={[
                  ['Site code', <span key="c" className="adm-cond strong">{site.siteCode}</span>], ['Time zone', site.timeZone],
                  ['Customs station', site.customsStationCode ?? <span className="faint">Not set</span>], ['Regulator licence', site.regulatorLicenceNo ?? <span className="faint">Not set</span>],
                  ['Customer signature', SIGN[site.signatureMode ?? 'EITHER']], ['Offline gate limit', `${site.offlineGateLimitMin} min`],
                  ['Calendar', calendars.find((c) => c.calendarId === site.calendarId)?.calendarName ?? '—'],
                  ['Location', site.latitude ? `${site.latitude}, ${site.longitude}` : '—'],
                ]} />
              </div>
            </Panel>
            <div className="grid-3">
              <Panel title="Gates"><div className="stack"><span className="unitno unitno-md">{site.gates}</span><Link className="small" to="/admin/gates">Gates & visit types</Link></div></Panel>
              <Panel title="Yard slots"><div className="stack"><span className="unitno unitno-md">{site.slots}</span><Link className="small" to="/admin/yard">Yard designer</Link></div></Panel>
              <Panel title="Holidays"><div className="stack"><span className="unitno unitno-md">16</span><Link className="small" to="/admin/settings">Calendars</Link></div></Panel>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              The offline gate limit is how long a gate tablet may keep admitting trucks without a connection. After it, the tablet asks for a supervisor and the queued events wait to sync.
            </p>
            <AuditNote />
          </>
        )}
      </Split>

      <EditDrawer open={edit === 'company'} onClose={() => setEdit(null)} title="Edit company" saveLabel="Save company" perm="admin.site.manage"
        onSave={() => { setCompany({ ...company }); toast('Company saved'); }} reason="The legal name, TIN and VRN print on tax invoices.">
        <div className="form-grid">
          <Field label="Legal name" required span={2}><Input defaultValue={company.legalName} /></Field>
          <Field label="Trading name"><Input defaultValue={company.tradingName ?? ''} /></Field>
          <Field label="TIN" required hint="9 digits, as on the TRA certificate"><Input defaultValue={company.taxId ?? ''} /></Field>
          <Field label="VRN" required hint="VAT registration number"><Input defaultValue={company.vatNo ?? ''} /></Field>
          <Field label="Base currency" hint="Cannot change after the first invoice"><Select disabled value={company.baseCurrency} options={['USD', 'TZS']} /></Field>
        </div>
      </EditDrawer>

      {site && (
        <SiteDrawer key={site.siteId} open={edit === 'site'} onClose={() => setEdit(null)} site={site}
          onSave={(s) => { setSites((all) => all.map((x) => (x.siteId === s.siteId ? s : x))); toast('Site saved'); }} />
      )}
      <SiteDrawer key="new" open={edit === 'new'} onClose={() => setEdit(null)} isNew
        site={{ siteId: 9, siteCode: '', siteName: '', companyId: 1, countryCode: 'TZ', timeZone: 'Africa/Dar_es_Salaam', calendarId: 1, calendarCode: 'TZ_PUBLIC', offlineGateLimitMin: 60, signatureMode: 'EITHER', facilities: ['ICD'], isActive: true, gates: 0, slots: 0, addressLine1: '', city: '' }}
        onSave={(s) => { setSites((all) => [...all, s]); setSel(s.siteId!); toast('Site added'); }} />

      <EditDrawer open={!!packOpen} onClose={() => setPackOpen(null)} title={`Activate ${packOpen?.packName}`} saveLabel="Activate pack" perm="admin.site.manage" danger
        reason="Say who verified the customs reference names and VAT rates, and when."
        onSave={() => { setPacks((all) => all.map((p) => (p.packCode === packOpen?.packCode ? { ...p, isActive: true, verify: false } : p))); toast('Pack activated'); }}>
        <Banner tone="wait" title="Starter pack: not verified">
          The {packOpen?.packName} pack was seeded from general knowledge. Its customs reference names, VAT rate and effective dates must be confirmed with a local clearing agent and tax adviser before any site uses it.
        </Banner>
        <p className="small muted">Activating makes the pack available to sites in {packOpen?.countryCode}. No existing site changes.</p>
      </EditDrawer>
    </SetupPage>
  );
}

function SiteDrawer({ open, onClose, site, onSave, isNew }: { open: boolean; onClose: () => void; site: Site; onSave: (s: Site) => void; isNew?: boolean }) {
  const [s, setS] = useState(site);
  const set = (p: Partial<Site>) => setS((x) => ({ ...x, ...p }));
  const codeOk = /^[A-Z0-9]{3,8}$/.test(s.siteCode);
  return (
    <EditDrawer open={open} onClose={onClose} title={isNew ? 'Add site' : `Edit ${site.siteCode}`} saveLabel={isNew ? 'Add site' : 'Save site'}
      perm="admin.site.manage" disabled={!codeOk || !s.siteName} onSave={() => onSave(s)} wide>
      <div className="form-grid">
        <Field label="Site code" required error={s.siteCode && !codeOk ? '3 to 8 capital letters or digits' : undefined} hint={isNew ? 'Used in document numbers, e.g. INV-DAR1-26-…' : 'Cannot change: it is in issued numbers'}>
          <Input value={s.siteCode} disabled={!isNew} onChange={(e) => set({ siteCode: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Site name" required><Input value={s.siteName} onChange={(e) => set({ siteName: e.target.value })} /></Field>
        <Field label="Time zone" hint="All times are stored in UTC and shown in this zone"><Select value={s.timeZone} onChange={(e) => set({ timeZone: e.target.value })} options={['Africa/Dar_es_Salaam', 'Africa/Nairobi', 'Africa/Kampala', 'Africa/Lusaka']} /></Field>
        <Field label="Customs station code" hint="TRA station code for this depot"><Input value={s.customsStationCode ?? ''} onChange={(e) => set({ customsStationCode: e.target.value.toUpperCase() })} /></Field>
        <Field label="Regulator licence"><Input value={s.regulatorLicenceNo ?? ''} onChange={(e) => set({ regulatorLicenceNo: e.target.value })} /></Field>
        <Field label="Calendar"><Select value={String(s.calendarId)} onChange={(e) => set({ calendarId: Number(e.target.value) })} options={calendars.map((c) => [String(c.calendarId), c.calendarName])} /></Field>
        <Field label="Offline gate limit (minutes)" hint="0 turns offline gate entry off"><Input type="number" min={0} max={240} value={s.offlineGateLimitMin} onChange={(e) => set({ offlineGateLimitMin: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Customer signature on EIR and gate pass">
        <Segmented value={s.signatureMode ?? 'EITHER'} onChange={(v) => set({ signatureMode: v })} options={[{ id: 'SCREEN', label: 'On screen' }, { id: 'PAPER', label: 'Paper' }, { id: 'EITHER', label: 'Either' }]} />
      </Field>
      <Field label="Facilities at this site" hint="Turning a facility on adds its screens to the menu for this site">
        <div className="row-wrap" style={{ gap: 16 }}>
          {FACILITIES.map((f) => (
            <Check key={f} label={`${f.replace('_', ' ')} · ${FACILITY_NAME[f]}`} checked={s.facilities.includes(f)}
              onChange={(e) => set({ facilities: e.target.checked ? [...s.facilities, f] : s.facilities.filter((x) => x !== f) })} />
          ))}
        </div>
      </Field>
    </EditDrawer>
  );
}
