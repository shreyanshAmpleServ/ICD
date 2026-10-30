import { useState, type ReactNode } from 'react';
import { Lock, RefreshCw, Search } from 'lucide-react';
import {
  Banner, Button, DataTable, Panel, Pill, SearchInput, Tabs, useToast, type Col,
} from '@/ds/components';
import { parties } from '@/mock/core';
import type { Truck, Driver } from '@/mock/admin';
import { AuditNote, SetupPage, SourcePill, YesNo, useEditable } from '../shared/AdminKit';
import { useQ } from '@/api/query';
import { mastersApi } from './api';
import { LicenceState } from './components/LicenceState';
import { LocalTable } from './components/LocalTable';
import { MasterDrawer } from './components/MasterDrawer';
import { MatchModal } from './components/MatchModal';

export { mastersApi } from './api';

type Tab = 'trucks' | 'drivers' | 'vessels' | 'ports' | 'commodities' | 'equipment';
const pname = (id?: number | null) => parties.find((p) => p.partyId === id)?.partyName ?? '—';
const daysTo = (d?: string | null) => (d ? Math.ceil((Date.parse(d) - Date.now()) / 86400000) : null);

export function MastersView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('trucks');
  const [q, setQ] = useState('');
  const [trucks, setTrucks] = useEditable<Truck>('trucks', [], () => mastersApi.getTrucks());
  const [drivers, setDrivers] = useEditable<Driver>('drivers', [], () => mastersApi.getDrivers());

  const { data: vesselData } = useQ<any[]>(['admin', 'vessels'], () => mastersApi.getVessels());
  const { data: portData } = useQ<any[]>(['admin', 'ports'], () => mastersApi.getPorts());
  const { data: commData } = useQ<any[]>(['admin', 'commodities'], () => mastersApi.getCommodities());
  const { data: eqData } = useQ<any[]>(['admin', 'equipment'], () => mastersApi.getEquipment());

  const vessels = Array.isArray(vesselData) ? vesselData : [];
  const ports = Array.isArray(portData) ? portData : [];
  const commodities = Array.isArray(commData) ? commData : [];
  const equipment = Array.isArray(eqData) ? eqData : [];

  const [truck, setTruck] = useState<Truck | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [match, setMatch] = useState<{ kind: string; label: string } | null>(null);
  const n = q.replace(/\s/g, '').toUpperCase();
  const expiring = drivers.filter((d) => { const x = daysTo(d.licenceExpiry); return x !== null && x >= 0 && x <= 30; });
  const expired = drivers.filter((d) => (daysTo(d.licenceExpiry) ?? 1) < 0);

  const toolbar = (extra?: ReactNode) => (
    <div className="toolbar">
      <div style={{ width: 280, maxWidth: '100%' }}>
        <SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search this list" />
      </div>
      {extra}
    </div>
  );

  return (
    <SetupPage
      title="Trucks, drivers, vessels"
      ms="M0"
      sub="Master data. NG is the source for parties, trucks, drivers and vessels; local fields are kept here."
      sources={[{ table: 'm_truck, m_driver, m_vessel (from NG)' }, { table: 'm_port, m_commodity, m_equipment' }]}
      actions={
        <Button
          icon={<RefreshCw />}
          perm="admin.config.manage"
          onClick={() => {
            mastersApi.runSync('truck').catch(() => { });
            mastersApi.runSync('driver').catch(() => { });
            toast('Sync from NG started');
          }}
        >
          Sync from NG now
        </Button>
      }
    >
      <Tabs<Tab>
        value={tab}
        onChange={(t) => { setTab(t); setQ(''); }}
        tabs={[
          { id: 'trucks', label: 'Trucks', count: trucks.length },
          { id: 'drivers', label: 'Drivers', count: drivers.length },
          { id: 'vessels', label: 'Vessels', count: vessels.length },
          { id: 'ports', label: 'Ports & borders', count: ports.length },
          { id: 'commodities', label: 'Commodities', count: commodities.length },
          { id: 'equipment', label: 'Equipment', count: equipment.length },
        ]}
      />

      {tab === 'trucks' && (
        <Panel flush>
          {toolbar(<span className="xs faint row"><Lock size={12} />Rows synced from NG are read-only. Edit them in NG; local notes stay here.</span>)}
          <DataTable
            rows={trucks.filter((t) => !n || t.plateNo.includes(n) || pname(t.transporterPartyId).toUpperCase().includes(q.toUpperCase()))}
            rowKey={(t) => t.truckId!}
            onRow={setTruck}
            cols={[
              { key: 'p', header: 'Plate', render: (t) => <span className="unitno unitno-sm">{t.plateDisplay}</span> },
              { key: 'k', header: 'Kind', render: (t) => <span className="small">{({ TRUCK: 'Truck', TRAILER: 'Trailer', CAR_CARRIER: 'Car carrier' } as Record<string, string>)[t.vehicleKind ?? 'TRUCK']}</span> },
              { key: 't', header: 'Transporter', render: (t: any) => t.transporterName || pname(t.transporterPartyId) },
              { key: 'm', header: 'Make and model', render: (t) => <span className="small">{t.makeModel}</span> },
              { key: 'tare', header: 'Tare', num: true, render: (t) => `${t.tareKg?.toLocaleString()} kg` },
              { key: 's', header: 'Source', render: (t) => <SourcePill source={t.source} sync={t.syncStatus} /> },
              { key: 'n', header: 'Local note', render: (t) => <span className="small muted">{t.gateBlocked && <Pill tone="stop">Gate warning</Pill>} {t.localNote}</span> },
            ] satisfies Col<Truck>[]}
          />
        </Panel>
      )}

      {tab === 'drivers' && (
        <>
          {(expired.length > 0 || expiring.length > 0) && (
            <Banner tone={expired.length ? 'stop' : 'wait'} title={`${expired.length} licence${expired.length === 1 ? ' has' : 's have'} expired; ${expiring.length} expire within 30 days`}>
              The gate refuses a driver with an expired licence and warns 30 days before. Ask the transporter to update NG.
            </Banner>
          )}
          <Panel flush>
            {toolbar()}
            <DataTable
              rows={drivers.filter((d) => !n || d.driverName.toUpperCase().replace(/\s/g, '').includes(n) || d.licenceNo.includes(n))}
              rowKey={(d) => d.driverId!}
              onRow={setDriver}
              cols={[
                { key: 'n', header: 'Driver', render: (d) => <strong>{d.driverName}</strong> },
                { key: 'l', header: 'Licence', render: (d) => <span className="adm-cond">{d.licenceNo} <span className="faint">· class {d.licenceClass} · {d.licenceCountry}</span></span> },
                { key: 'e', header: 'Licence expiry', render: (d) => <LicenceState expiry={d.licenceExpiry} /> },
                { key: 't', header: 'Transporter', render: (d: any) => d.transporterName || pname(d.transporterPartyId) },
                { key: 'ph', header: 'Phone', render: (d) => <span className="small">{d.phone}</span> },
                { key: 's', header: 'Source', render: (d) => <SourcePill source={d.source} sync={d.syncStatus} /> },
              ] satisfies Col<Driver>[]}
            />
          </Panel>
        </>
      )}

      {tab === 'vessels' && (
        <Panel flush>
          {toolbar()}
          <DataTable
            rows={vessels.filter((v) => !q || v.vesselName.toUpperCase().includes(q.toUpperCase()) || (v.imoNo ?? '').includes(q))}
            rowKey={(v) => v.vesselId!}
            cols={[
              { key: 'n', header: 'Vessel', render: (v) => <strong>{v.vesselName}</strong> },
              { key: 'i', header: 'IMO number', render: (v) => <span className="adm-cond">{v.imoNo}</span> },
              { key: 'c', header: 'Call sign', render: (v) => <span className="adm-cond">{v.callSign}</span> },
              { key: 'f', header: 'Flag', render: (v) => v.flagCountry },
              { key: 'o', header: 'Operator', render: (v: any) => v.operatorName || pname(v.operatorPartyId) },
              { key: 's', header: 'Source', render: () => <SourcePill source="NG" /> },
            ]}
          />
        </Panel>
      )}

      {tab === 'ports' && (
        <LocalTable
          title="Ports, dry ports and border posts"
          addLabel="Add port"
          rows={ports.filter((p) => !q || p.portName.toUpperCase().includes(q.toUpperCase()))}
          rowKey={(p) => p.portId!}
          toolbar={toolbar()}
          cols={[
            { key: 'n', header: 'Name', render: (p) => <strong>{p.portName}</strong> },
            { key: 'u', header: 'UN/LOCODE', render: (p) => p.unlocode ? <span className="adm-cond">{p.unlocode}</span> : <span className="faint">—</span> },
            { key: 'k', header: 'Kind', render: (p) => <span className="small">{p.portKind.toLowerCase()}</span> },
            { key: 'c', header: 'Country', render: (p) => p.countryCode },
            { key: 'a', header: 'Active', render: (p) => <YesNo v={p.isActive} /> },
          ]}
        />
      )}

      {tab === 'commodities' && (
        <LocalTable
          title="Commodities"
          addLabel="Add commodity"
          rows={commodities.filter((c) => !q || c.commodityName.toUpperCase().includes(q.toUpperCase()) || (c.hsCode ?? '').startsWith(q))}
          rowKey={(c) => c.commodityId!}
          toolbar={toolbar()}
          cols={[
            { key: 'c', header: 'Code', render: (c) => <span className="adm-cond strong">{c.commodityCode}</span> },
            { key: 'n', header: 'Name', render: (c) => c.commodityName },
            { key: 'h', header: 'HS heading', render: (c) => <span className="adm-cond">{c.hsCode}</span> },
            { key: 'd', header: 'Hazardous', render: (c) => c.isHazardous ? <Pill tone="wait">Dangerous goods</Pill> : <YesNo v={false} /> },
          ]}
        />
      )}

      {tab === 'equipment' && (
        <LocalTable
          title="Yard equipment"
          addLabel="Add equipment"
          rows={equipment.filter((e) => !q || (e.equipmentName ?? '').toUpperCase().includes(q.toUpperCase()) || (e.equipmentCode ?? '').toUpperCase().includes(q.toUpperCase()))}
          rowKey={(e) => e.equipmentId!}
          toolbar={toolbar()}
          cols={[
            { key: 'c', header: 'Code', render: (e) => <span className="adm-cond strong">{e.equipmentCode}</span> },
            { key: 'n', header: 'Name', render: (e) => e.equipmentName },
            { key: 't', header: 'Type', render: (e) => <span className="small">{e.equipmentType.replace(/_/g, ' ').toLowerCase()}</span> },
            { key: 'k', header: 'Capacity', num: true, render: (e) => e.capacityKg ? `${e.capacityKg.toLocaleString()} kg` : '—' },
            { key: 'a', header: 'Active', render: (e) => <YesNo v={e.isActive} /> },
          ]}
        />
      )}
      <AuditNote />

      {truck && (
        <MasterDrawer
          title={`Truck ${truck.plateDisplay}`}
          onClose={() => setTruck(null)}
          source={truck.source}
          sync={truck.syncStatus}
          ngRef={truck.ngRefId}
          onMatch={() => setMatch({ kind: 'truck', label: truck.plateDisplay ?? truck.plateNo })}
          ng={[
            ['Plate', truck.plateDisplay],
            ['Transporter', pname(truck.transporterPartyId)],
            ['Make and model', truck.makeModel],
            ['Axles', truck.axleCount],
            ['Tare (kg)', truck.tareKg?.toLocaleString()],
          ]}
          onSave={(note, flag) => {
            if (truck.truckId) mastersApi.updateTruck(Number(truck.truckId), { localNote: note, gateBlocked: flag }).catch(() => { });
            setTrucks((all) => all.map((t) => (t.truckId === truck.truckId ? { ...t, localNote: note, gateBlocked: flag } : t)));
            toast('Local notes saved');
          }}
          note={truck.localNote}
          flag={truck.gateBlocked}
          flagLabel="Warn the gate officer when this truck arrives"
        />
      )}

      {driver && (
        <MasterDrawer
          title={driver.driverName}
          onClose={() => setDriver(null)}
          source={driver.source}
          sync={driver.syncStatus}
          ngRef={driver.ngRefId}
          onMatch={() => setMatch({ kind: 'driver', label: driver.driverName })}
          ng={[
            ['Licence', `${driver.licenceNo} · class ${driver.licenceClass}`],
            ['Licence expiry', <LicenceState key="e" expiry={driver.licenceExpiry} />],
            ['Country', driver.licenceCountry],
            ['Phone', driver.phone],
            ['Transporter', pname(driver.transporterPartyId)],
          ]}
          onSave={(note) => {
            if (driver.driverId) mastersApi.updateDriver(Number(driver.driverId), { localNote: note }).catch(() => { });
            setDrivers((all) => all.map((d) => (d.driverId === driver.driverId ? { ...d, localNote: note } : d)));
            toast('Local notes saved');
          }}
          note={driver.localNote}
        />
      )}

      <MatchModal
        match={match}
        onClose={() => setMatch(null)}
        onMatch={() => { toast('Matched to NG record'); setMatch(null); }}
      />
    </SetupPage>
  );
}

export { MastersView as Masters };
export default MastersView;
