import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Pencil, Plus, Power } from 'lucide-react';
import { Banner, Button, DL, DataTable, Panel, Pill, useToast } from '@/ds/components';
import { FACILITY_NAME, SRC, calendars, type CountryPack, type Site } from '@/mock/admin';
import { AuditNote, ListPanel, SetupPage, Split, VerifyPill, useEditable } from '../shared/AdminKit';
import { useQ } from '@/api/query';
import { sitesApi } from './api';
import { CompanyDrawer } from './components/CompanyDrawer';
import { SiteDrawer } from './components/SiteDrawer';
import { PackDrawer } from './components/PackDrawer';

export { sitesApi } from './api';

const SIGN: Record<string, string> = { SCREEN: 'On screen', PAPER: 'Paper only', EITHER: 'Screen or paper' };

export function SitesView() {
  const toast = useToast();
  const [sites, setSites] = useEditable<Site>('sites', [], () => sitesApi.getSites());
  const [packs, setPacks] = useEditable<CountryPack>('packs', [], () => sitesApi.getPacks());
  const { data: compRes } = useQ<any>(['admin', 'company'], () => sitesApi.getCompany());
  const [company, setCompany] = useState<any>(compRes || null);

  useEffect(() => {
    if (compRes) {
      if (Array.isArray(compRes) && compRes.length > 0) setCompany(compRes[0]);
      else if (compRes && typeof compRes === 'object' && !Array.isArray(compRes)) setCompany(compRes);
    }
  }, [compRes]);

  const [sel, setSel] = useState<string | number>('company');
  const [edit, setEdit] = useState<'company' | 'site' | 'new' | null>(null);
  const [packOpen, setPackOpen] = useState<CountryPack | null>(null);
  const site = sites.find((s) => s.siteId === sel);

  return (
    <SetupPage
      title="Company & sites"
      ms="M0"
      sub="Legal entity, country pack and the depots it runs"
      sources={[SRC.company, SRC.site, SRC.pack]}
      actions={<Button variant="primary" icon={<Plus />} perm="admin.site.manage" onClick={() => setEdit('new')}>Add site</Button>}
    >
      <Split
        list={
          <ListPanel
            title="Company and sites"
            selected={sel}
            onSelect={setSel}
            items={[
              { id: 'company', lead: <Building2 size={18} />, title: company ? (company.tradingName ?? company.legalName) : 'Company', sub: 'Company · ' + (company?.baseCurrency ?? 'USD') },
              ...sites.map((s) => ({ id: s.siteId!, lead: <MapPin size={18} />, title: `${s.siteCode} · ${s.siteName}`, sub: (s.facilities || []).join(', '), aside: s.isActive ? undefined : <Pill>Inactive</Pill> })),
            ]}
          />
        }
      >
        {sel === 'company' && (
          <>
            <Panel
              title="Company"
              sub="Printed on invoices, receipts and gate passes"
              actions={<Button size="sm" icon={<Pencil />} perm="admin.site.manage" onClick={() => setEdit('company')}>Edit company</Button>}
            >
              {company && (
                <DL cols items={[
                  ['Legal name', company.legalName], ['Trading name', company.tradingName], ['Company code', company.companyCode],
                  ['TIN', <span key="t" className="adm-cond strong">{company.taxId}</span>], ['VRN (VAT number)', <span key="v" className="adm-cond strong">{company.vatNo}</span>],
                  ['Base currency', company.baseCurrency], ['Country', 'Tanzania'], ['Address', `${company.addressLine1 || ''}, ${company.addressLine2 || ''}, ${company.city || ''}`],
                  ['Phone', company.phone], ['Email', company.email],
                ]} />
              )}
            </Panel>
            <Panel flush title="Country packs" sub="A pack brings regimes, customs reference types, authority holds and tax codes for one country">
              <DataTable rows={packs} rowKey={(p) => p.packCode} cols={[
                { key: 'n', header: 'Pack', render: (p) => <><strong>{p.packName}</strong><div className="xs faint">{p.packCode} · version {p.version}</div></> },
                { key: 'c', header: 'Contains', render: (p) => <span className="small">{p.contents}</span> },
                { key: 's', header: 'Status', render: (p) => p.isActive ? <Pill tone="go">Active</Pill> : <span className="row-wrap"><Pill>Inactive</Pill>{p.verify && <VerifyPill />}</span> },
                {
                  key: 'a', header: '', render: (p) => p.isActive ? <span className="xs faint">In use by 3 sites</span>
                    : <Button size="sm" icon={<Power />} perm="admin.site.manage" onClick={() => setPackOpen(p)}>Activate pack</Button>
                },
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
            <Panel
              title={`${site.siteCode} · ${site.siteName}`}
              sub={site.addressLine1 + ', ' + site.city}
              actions={<Button size="sm" icon={<Pencil />} perm="admin.site.manage" onClick={() => setEdit('site')}>Edit site</Button>}
            >
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

      {company && (
        <CompanyDrawer
          open={edit === 'company'}
          onClose={() => setEdit(null)}
          company={company}
          setCompany={setCompany}
          onSave={(reason) => {
            sitesApi.updateCompany(1, { ...company, reason }).catch(() => { });
            setCompany({ ...company });
            toast('Company saved');
          }}
        />
      )}

      {site && (
        <SiteDrawer
          key={site.siteId}
          open={edit === 'site'}
          onClose={() => setEdit(null)}
          site={site}
          onSave={(s) => {
            if (s.siteId) sitesApi.updateSite(Number(s.siteId), s).catch(() => { });
            setSites((all) => all.map((x) => (x.siteId === s.siteId ? s : x)));
            toast('Site saved');
          }}
        />
      )}

      <SiteDrawer
        key="new"
        open={edit === 'new'}
        onClose={() => setEdit(null)}
        isNew
        site={{
          siteId: 9, siteCode: '', siteName: '', companyId: 1, countryCode: 'TZ',
          timeZone: 'Africa/Dar_es_Salaam', calendarId: 1, calendarCode: 'TZ_PUBLIC',
          offlineGateLimitMin: 60, signatureMode: 'EITHER', facilities: ['ICD'],
          isActive: true, gates: 0, slots: 0, addressLine1: '', city: ''
        }}
        onSave={(s) => {
          sitesApi.createSite(s).catch(() => { });
          setSites((all) => [...all, s]);
          setSel(s.siteId ?? 'company');
          toast('Site added');
        }}
      />

      <PackDrawer
        packOpen={packOpen}
        onClose={() => setPackOpen(null)}
        onActivate={() => {
          setPacks((all) => all.map((p) => (p.packCode === packOpen?.packCode ? { ...p, isActive: true, verify: false } : p)));
          toast('Pack activated');
        }}
      />
    </SetupPage>
  );
}

export { SitesView as Sites };
export default SitesView;
