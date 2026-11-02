import { useState, type ReactNode } from 'react';
import { Lock, Plus, RefreshCw, Search } from 'lucide-react';
import {
  Banner, Button, DataTable, Panel, Pill, SearchInput, Tabs, useToast, type Col,
} from '@/ds/components';
import { parties } from '@/mock/core';
import { api } from '@/api/client';
import type { Truck, Driver } from '@/mock/admin';
import { AuditNote, SetupPage, SourcePill, YesNo, useEditable } from '../shared/AdminKit';
import { useQ } from '@/api/query';
import { mastersApi } from './api';
import { LicenceState } from './components/LicenceState';
import { LocalTable } from './components/LocalTable';
import { MasterDrawer } from './components/MasterDrawer';
import { MatchModal } from './components/MatchModal';
import { PortDrawer, type PortItem } from './components/PortDrawer';
import { CommodityDrawer, type CommodityItem } from './components/CommodityDrawer';
import { EquipmentDrawer, type EquipmentItem } from './components/EquipmentDrawer';
import { VesselDrawer, type VesselItem } from './components/VesselDrawer';
import { TruckFormDrawer, type NewTruckItem } from './components/TruckFormDrawer';
import { DriverFormDrawer, type NewDriverItem } from './components/DriverFormDrawer';

export { mastersApi } from './api';

type Tab = 'trucks' | 'drivers' | 'vessels' | 'ports' | 'commodities' | 'equipment';
const daysTo = (d?: string | null) => (d ? Math.ceil((Date.parse(d) - Date.now()) / 86400000) : null);

export function MastersView() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('trucks');
  const [q, setQ] = useState('');

  // Live parties from database
  const { data: partyData } = useQ<any[]>(['parties-list'], () =>
    api.get<any>('/parties').then((r: any) => r?.items ?? (Array.isArray(r) ? r : []))
  );
  const partyList = Array.isArray(partyData) && partyData.length > 0 ? partyData : parties;
  const pname = (id?: number | null) =>
    (partyList.find((p: any) => p.partyId === id)?.partyName ||
      partyList.find((p: any) => p.partyId === id)?.legalName ||
      parties.find((p) => p.partyId === id)?.partyName) ??
    '—';

  // Live editable state backed by API
  const [trucks, setTrucks, , refetchTrucks] = useEditable<Truck>('trucks', [], () => mastersApi.getTrucks());
  const [drivers, setDrivers, , refetchDrivers] = useEditable<Driver>('drivers', [], () => mastersApi.getDrivers());

  const { data: vesselData, refetch: refetchVessels } = useQ<any[]>(['admin', 'vessels'], () => mastersApi.getVessels());
  const { data: portData, refetch: refetchPorts } = useQ<any[]>(['admin', 'ports'], () => mastersApi.getPorts());
  const { data: commData, refetch: refetchCommodities } = useQ<any[]>(['admin', 'commodities'], () => mastersApi.getCommodities());
  const { data: eqData, refetch: refetchEquipment } = useQ<any[]>(['admin', 'equipment'], () => mastersApi.getEquipment());

  const vessels = Array.isArray(vesselData) ? vesselData : [];
  const ports = Array.isArray(portData) ? portData : [];
  const commodities = Array.isArray(commData) ? commData : [];
  const equipment = Array.isArray(eqData) ? eqData : [];

  // Edit / Add Modal States
  const [truck, setTruck] = useState<Truck | null>(null);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [addTruckOpen, setAddTruckOpen] = useState(false);

  const [driver, setDriver] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [addDriverOpen, setAddDriverOpen] = useState(false);

  const [selectedVessel, setSelectedVessel] = useState<VesselItem | null>(null);
  const [addVesselOpen, setAddVesselOpen] = useState(false);

  const [selectedPort, setSelectedPort] = useState<PortItem | null>(null);
  const [addPortOpen, setAddPortOpen] = useState(false);

  const [selectedCommodity, setSelectedCommodity] = useState<CommodityItem | null>(null);
  const [addCommodityOpen, setAddCommodityOpen] = useState(false);

  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);

  const [match, setMatch] = useState<{ kind: string; label: string } | null>(null);

  const n = q.replace(/\s/g, '').toUpperCase();
  const expiring = drivers.filter((d) => {
    const x = daysTo(d.licenceExpiry);
    return x !== null && x >= 0 && x <= 30;
  });
  const expired = drivers.filter((d) => (daysTo(d.licenceExpiry) ?? 1) < 0);

  const toolbar = (extra?: ReactNode) => (
    <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ width: 280, maxWidth: '100%' }}>
        <SearchInput
          icon={<Search />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search this list"
          aria-label="Search this list"
        />
      </div>
      <div className="row" style={{ gap: 8 }}>
        {extra}
      </div>
    </div>
  );

  return (
    <SetupPage
      title="Trucks, drivers, vessels"
      ms="M0"
      sub="Master data from ICD database. Synchronized with NG ICD; local fields and records are kept here."
      sources={[{ table: 'm_truck, m_driver, m_vessel' }, { table: 'm_port, m_commodity, m_equipment' }]}
      actions={
        <Button
          icon={<RefreshCw />}
          perm="admin.config.manage"
          onClick={() => {
            mastersApi.runSync('truck').catch(() => { });
            mastersApi.runSync('driver').catch(() => { });
            refetchTrucks();
            refetchDrivers();
            refetchVessels();
            refetchPorts();
            refetchCommodities();
            refetchEquipment();
            toast('Sync completed and live data refreshed');
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
          {toolbar(
            <>
              <span className="xs faint row"><Lock size={12} />Edit local notes by clicking row</span>
              <Button size="sm" icon={<Plus />} perm="masters.local.edit" onClick={() => setAddTruckOpen(true)}>
                Add truck
              </Button>
            </>
          )}
          <DataTable
            rows={trucks.filter((t) =>
              !n ||
              (t.plateNo && t.plateNo.includes(n)) ||
              (t.plateDisplay && t.plateDisplay.toUpperCase().replace(/\s/g, '').includes(n)) ||
              (t.makeModel && t.makeModel.toUpperCase().includes(q.toUpperCase())) ||
              ((t as any).transporterName && (t as any).transporterName.toUpperCase().includes(q.toUpperCase())) ||
              pname(t.transporterPartyId).toUpperCase().includes(q.toUpperCase())
            )}
            rowKey={(t) => t.truckId!}
            onRow={setTruck}
            cols={[
              { key: 'p', header: 'Plate', render: (t) => <span className="unitno unitno-sm">{t.plateDisplay || t.plateNo}</span> },
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
            <Banner
              tone={expired.length ? 'stop' : 'wait'}
              title={`${expired.length} licence${expired.length === 1 ? ' has' : 's have'} expired; ${expiring.length} expire within 30 days`}
            >
              The gate refuses a driver with an expired licence and warns 30 days before. Ask the transporter to renew their driving licence.
            </Banner>
          )}
          <Panel flush>
            {toolbar(
              <Button size="sm" icon={<Plus />} perm="masters.local.edit" onClick={() => setAddDriverOpen(true)}>
                Add driver
              </Button>
            )}
            <DataTable
              rows={drivers.filter((d) =>
                !n ||
                (d.driverName && d.driverName.toUpperCase().replace(/\s/g, '').includes(n)) ||
                (d.licenceNo && d.licenceNo.includes(n)) ||
                (d.phone && d.phone.includes(q)) ||
                ((d as any).transporterName && (d as any).transporterName.toUpperCase().includes(q.toUpperCase()))
              )}
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
          {toolbar(
            <Button size="sm" icon={<Plus />} perm="masters.local.edit" onClick={() => setAddVesselOpen(true)}>
              Add vessel
            </Button>
          )}
          <DataTable
            rows={vessels.filter((v) =>
              !q ||
              (v.vesselName && v.vesselName.toUpperCase().includes(q.toUpperCase())) ||
              (v.imoNo ?? '').includes(q) ||
              (v.callSign ?? '').toUpperCase().includes(q.toUpperCase()) ||
              (v.operatorName && v.operatorName.toUpperCase().includes(q.toUpperCase()))
            )}
            rowKey={(v) => v.vesselId!}
            onRow={(v) => setSelectedVessel(v)}
            cols={[
              { key: 'n', header: 'Vessel', render: (v) => <strong>{v.vesselName}</strong> },
              { key: 'i', header: 'IMO number', render: (v) => <span className="adm-cond">{v.imoNo || v.lloydsImo}</span> },
              { key: 'c', header: 'Call sign', render: (v) => <span className="adm-cond">{v.callSign}</span> },
              { key: 'f', header: 'Flag', render: (v) => v.flagCountry || v.countryCode },
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
          rows={ports.filter((p) =>
            !q ||
            p.portName.toUpperCase().includes(q.toUpperCase()) ||
            (p.unlocode && p.unlocode.toUpperCase().includes(q.toUpperCase())) ||
            (p.countryCode && p.countryCode.toUpperCase().includes(q.toUpperCase()))
          )}
          rowKey={(p) => p.portId!}
          toolbar={toolbar()}
          onAdd={() => setAddPortOpen(true)}
          onRow={(p) => setSelectedPort(p)}
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
          rows={commodities.filter((c) =>
            !q ||
            c.commodityName.toUpperCase().includes(q.toUpperCase()) ||
            c.commodityCode.toUpperCase().includes(q.toUpperCase()) ||
            (c.hsCode ?? '').startsWith(q)
          )}
          rowKey={(c) => c.commodityId!}
          toolbar={toolbar()}
          onAdd={() => setAddCommodityOpen(true)}
          onRow={(c) => setSelectedCommodity(c)}
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
          rows={equipment.filter((e) =>
            !q ||
            (e.equipmentName ?? '').toUpperCase().includes(q.toUpperCase()) ||
            (e.equipmentCode ?? '').toUpperCase().includes(q.toUpperCase()) ||
            (e.equipmentType ?? '').toUpperCase().includes(q.toUpperCase())
          )}
          rowKey={(e) => e.equipmentId!}
          toolbar={toolbar()}
          onAdd={() => setAddEquipmentOpen(true)}
          onRow={(e) => setSelectedEquipment(e)}
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

      {/* Truck Local Note Edit Drawer */}
      {truck && (
        <MasterDrawer
          title={`Truck ${truck.plateDisplay || truck.plateNo}`}
          onClose={() => setTruck(null)}
          source={truck.source}
          sync={truck.syncStatus}
          ngRef={truck.ngRefId}
          onMatch={() => setMatch({ kind: 'truck', label: truck.plateDisplay ?? truck.plateNo })}
          onEditDetails={() => {
            setEditingTruck(truck);
            setTruck(null);
          }}
          ng={[
            ['Plate', truck.plateDisplay || truck.plateNo],
            ['Transporter', (truck as any).transporterName || pname(truck.transporterPartyId)],
            ['Make and model', truck.makeModel],
            ['Axles', truck.axleCount],
            ['Tare (kg)', truck.tareKg?.toLocaleString()],
          ]}
          onSave={(note, flag) => {
            if (truck.truckId) {
              mastersApi.updateTruck(Number(truck.truckId), { localNote: note, gateBlocked: flag })
                .then(() => refetchTrucks())
                .catch(() => { });
            }
            setTrucks((all) => all.map((t) => (t.truckId === truck.truckId ? { ...t, localNote: note, gateBlocked: flag } : t)));
            setTruck(null);
            toast('Truck local notes saved');
          }}
          note={truck.localNote}
          flag={truck.gateBlocked}
          flagLabel="Warn the gate officer when this truck arrives"
        />
      )}

        {/* Add / Edit Truck Drawer */ }
      {(addTruckOpen || editingTruck) && (
        <TruckFormDrawer
          open
          truck={editingTruck}
          transporterList={partyList}
          onClose={() => {
            setAddTruckOpen(false);
            setEditingTruck(null);
          }}
          onSave={async (newTruck: NewTruckItem) => {
            try {
              if (editingTruck?.truckId) {
                await mastersApi.updateTruck(Number(editingTruck.truckId), newTruck);
                toast('Truck updated in database successfully');
              } else {
                await mastersApi.createTruck(newTruck);
                toast('Truck added to database successfully');
              }
              await refetchTrucks();
              setAddTruckOpen(false);
              setEditingTruck(null);
            } catch (err: any) {
              toast(`Failed to save truck: ${err.message}`);
            }
          }}
        />
      )}

      {/* Driver Local Note Edit Drawer */}
      {driver && (
        <MasterDrawer
          title={driver.driverName}
          onClose={() => setDriver(null)}
          source={driver.source}
          sync={driver.syncStatus}
          ngRef={driver.ngRefId}
          onMatch={() => setMatch({ kind: 'driver', label: driver.driverName })}
          onEditDetails={() => {
            setEditingDriver(driver);
            setDriver(null);
          }}
          ng={[
            ['Licence', `${driver.licenceNo} · class ${driver.licenceClass}`],
            ['Licence expiry', <LicenceState key="e" expiry={driver.licenceExpiry} />],
            ['Country', driver.licenceCountry],
            ['Phone', driver.phone],
            ['Transporter', (driver as any).transporterName || pname(driver.transporterPartyId)],
          ]}
          onSave={(note) => {
            if (driver.driverId) {
              mastersApi.updateDriver(Number(driver.driverId), { localNote: note })
                .then(() => refetchDrivers())
                .catch(() => { });
            }
            setDrivers((all) => all.map((d) => (d.driverId === driver.driverId ? { ...d, localNote: note } : d)));
            setDriver(null);
            toast('Driver local notes saved');
          }}
          note={driver.localNote}
        />
      )}

        {/* Add / Edit Driver Drawer */ }
      {(addDriverOpen || editingDriver) && (
        <DriverFormDrawer
          open
          driver={editingDriver}
          transporterList={partyList}
          onClose={() => {
            setAddDriverOpen(false);
            setEditingDriver(null);
          }}
          onSave={async (newDriver: NewDriverItem) => {
            try {
              if (editingDriver?.driverId) {
                await mastersApi.updateDriver(Number(editingDriver.driverId), newDriver);
                toast('Driver updated in database successfully');
              } else {
                await mastersApi.createDriver(newDriver);
                toast('Driver added to database successfully');
              }
              await refetchDrivers();
              setAddDriverOpen(false);
              setEditingDriver(null);
            } catch (err: any) {
              toast(`Failed to save driver: ${err.message}`);
            }
          }}
        />
      )}

      {/* Add / Edit Vessel Drawer */}
      {addVesselOpen && (
        <VesselDrawer
          open
          isNew
          vessel={{ vesselName: '', imoNo: '', callSign: '', flagCountry: 'PA', operatorPartyId: 1 }}
          onClose={() => setAddVesselOpen(false)}
          onSave={async (v: VesselItem) => {
            try {
              await mastersApi.createVessel(v);
              await refetchVessels();
              setAddVesselOpen(false);
              toast('Vessel added to database successfully');
            } catch (err: any) {
              toast(`Failed to add vessel: ${err.message}`);
            }
          }}
        />
      )}

      {selectedVessel && (
        <VesselDrawer
          open
          vessel={selectedVessel}
          onClose={() => setSelectedVessel(null)}
          onSave={async (v: VesselItem) => {
            try {
              if (selectedVessel.vesselId) {
                await mastersApi.updateVessel(selectedVessel.vesselId, v);
                await refetchVessels();
              }
              setSelectedVessel(null);
              toast('Vessel updated successfully');
            } catch (err: any) {
              toast(`Failed to update vessel: ${err.message}`);
            }
          }}
        />
      )}

      {/* Add / Edit Port Drawer */}
      {addPortOpen && (
        <PortDrawer
          open
          isNew
          port={{ portName: '', unlocode: '', countryCode: 'TZ', portKind: 'SEAPORT', isActive: true }}
          onClose={() => setAddPortOpen(false)}
          onSave={async (p: PortItem) => {
            try {
              await mastersApi.createPort(p);
              await refetchPorts();
              setAddPortOpen(false);
              toast('Port / border added to database successfully');
            } catch (err: any) {
              toast(`Failed to add port: ${err.message}`);
            }
          }}
        />
      )}

      {selectedPort && (
        <PortDrawer
          open
          port={selectedPort}
          onClose={() => setSelectedPort(null)}
          onSave={async (p: PortItem) => {
            try {
              if (selectedPort.portId) {
                await mastersApi.updatePort(selectedPort.portId, p);
                await refetchPorts();
              }
              setSelectedPort(null);
              toast('Port / border updated successfully');
            } catch (err: any) {
              toast(`Failed to update port: ${err.message}`);
            }
          }}
        />
      )}

      {/* Add / Edit Commodity Drawer */}
      {addCommodityOpen && (
        <CommodityDrawer
          open
          isNew
          commodity={{ commodityCode: '', commodityName: '', hsCode: '', isHazardous: false, isActive: true }}
          onClose={() => setAddCommodityOpen(false)}
          onSave={async (c: CommodityItem) => {
            try {
              await mastersApi.createCommodity(c);
              await refetchCommodities();
              setAddCommodityOpen(false);
              toast('Commodity added to database successfully');
            } catch (err: any) {
              toast(`Failed to add commodity: ${err.message}`);
            }
          }}
        />
      )}

      {selectedCommodity && (
        <CommodityDrawer
          open
          commodity={selectedCommodity}
          onClose={() => setSelectedCommodity(null)}
          onSave={async (c: CommodityItem) => {
            try {
              if (selectedCommodity.commodityId) {
                await mastersApi.updateCommodity(selectedCommodity.commodityId, c);
                await refetchCommodities();
              }
              setSelectedCommodity(null);
              toast('Commodity updated successfully');
            } catch (err: any) {
              toast(`Failed to update commodity: ${err.message}`);
            }
          }}
        />
      )}

      {/* Add / Edit Equipment Drawer */}
      {addEquipmentOpen && (
        <EquipmentDrawer
          open
          isNew
          equipment={{ equipmentCode: '', equipmentName: '', equipmentType: 'REACH_STACKER', capacityKg: 45000, isActive: true }}
          onClose={() => setAddEquipmentOpen(false)}
          onSave={async (eq: EquipmentItem) => {
            try {
              await mastersApi.createEquipment(eq);
              await refetchEquipment();
              setAddEquipmentOpen(false);
              toast('Yard equipment added to database successfully');
            } catch (err: any) {
              toast(`Failed to add equipment: ${err.message}`);
            }
          }}
        />
      )}

      {selectedEquipment && (
        <EquipmentDrawer
          open
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          onSave={async (eq: EquipmentItem) => {
            try {
              if (selectedEquipment.equipmentId) {
                await mastersApi.updateEquipment(selectedEquipment.equipmentId, eq);
                await refetchEquipment();
              }
              setSelectedEquipment(null);
              toast('Yard equipment updated successfully');
            } catch (err: any) {
              toast(`Failed to update equipment: ${err.message}`);
            }
          }}
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
