import { useState } from 'react';
import { Plus, Check, Truck, User, Building, Container } from 'lucide-react';
import { Button, Drawer, Field, Input, Select, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { gateQueueApi } from '../api';

function unwrapList<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export function RegisterTruckDrawer({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [plateNo, setPlateNo] = useState('');
  const [driverId, setDriverId] = useState<string>('');
  const [driverName, setDriverName] = useState('');
  const [driverLicence, setDriverLicence] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [transporterPartyId, setTransporterPartyId] = useState<string>('');
  const [transporterName, setTransporterName] = useState('');
  const [visitTypeCode, setVisitTypeCode] = useState('IMPORT_PICKUP');
  const [lane, setLane] = useState('In 1');
  const [unitNo, setUnitNo] = useState('');
  const [unitDirection, setUnitDirection] = useState<'PICK' | 'DROP'>('PICK');

  // Toggle for adding new driver inline
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [savingDriver, setSavingDriver] = useState(false);

  // Queries for live database assets
  const { data: drivers = [], refetch: refetchDrivers } = useQ(['masters-drivers'], async () => {
    const res = await api.get<any>('/drivers');
    return unwrapList<any>(res);
  });

  const { data: trucks = [] } = useQ(['masters-trucks'], async () => {
    const res = await api.get<any>('/trucks');
    return unwrapList<any>(res);
  });

  const { data: parties = [] } = useQ(['masters-parties'], async () => {
    const res = await api.get<any>('/parties');
    return unwrapList<any>(res);
  });

  const { data: visitTypes = [] } = useQ(['gate-visit-types'], async () => {
    const res = await api.get<any>('/visit-types');
    return unwrapList<any>(res);
  });

  const driverList = Array.isArray(drivers) ? drivers : [];
  const truckList = Array.isArray(trucks) ? trucks : [];
  const partyList = Array.isArray(parties) ? parties : [];
  const vtList = Array.isArray(visitTypes) ? visitTypes : [];

  const handleSelectDriver = (id: string) => {
    setDriverId(id);
    const d = driverList.find((x) => String(x.driverId) === id);
    if (d) {
      setDriverName(d.fullName);
      setDriverLicence(d.licenceNo || '');
      setDriverPhone(d.phone || '');
      if (d.carrierPartyId) {
        setTransporterPartyId(String(d.carrierPartyId));
        setTransporterName(d.carrierName || '');
      }
    }
  };

  const handleSelectTruck = (plate: string) => {
    setPlateNo(plate);
    const t = trucks.find((x) => x.plateNo === plate);
    if (t && t.carrierPartyId) {
      setTransporterPartyId(String(t.carrierPartyId));
      setTransporterName(t.carrierName || '');
    }
  };

  const handleSaveNewDriver = async () => {
    if (!driverName.trim()) {
      toast('Driver full name is required');
      return;
    }
    setSavingDriver(true);
    try {
      const created = await api.post<any>('/drivers', {
        fullName: driverName.trim(),
        licenceNo: driverLicence.trim() || `DL-${Date.now().toString().slice(-6)}`,
        phone: driverPhone.trim() || '+255 70 000 0000',
        transporterPartyId: transporterPartyId ? Number(transporterPartyId) : undefined,
        carrierName: transporterName || 'Independent Haulier',
      });
      toast(`Driver ${created.fullName} added to database!`);
      await refetchDrivers();
      setDriverId(String(created.driverId));
      setShowAddDriver(false);
    } catch (err: any) {
      toast(err?.message || 'Failed to save driver');
    } finally {
      setSavingDriver(false);
    }
  };

  const handleSubmit = async () => {
    if (!plateNo.trim()) {
      toast('Truck plate number is required');
      return;
    }
    if (!driverName.trim() && !driverId) {
      toast('Please select or add a driver');
      return;
    }

    setSubmitting(true);
    try {
      const finalDriverName = driverName || drivers.find((d) => String(d.driverId) === driverId)?.fullName || 'Driver';
      const finalTransporter = transporterName || parties.find((p) => String(p.partyId) === transporterPartyId)?.partyName || 'Independent Haulier';

      const payload: any = {
        plateNo: plateNo.trim().toUpperCase(),
        driverName: finalDriverName,
        driverId: driverId ? Number(driverId) : undefined,
        transporter: finalTransporter,
        transporterPartyId: transporterPartyId ? Number(transporterPartyId) : undefined,
        visitTypeCode,
        lane,
        status: 'AT_OUTER_GATE',
        units: unitNo.trim()
          ? [
              {
                visitUnitTxnId: Date.now(),
                unitStayId: Math.floor(5000 + Math.random() * 1000),
                unitNo: unitNo.trim().toUpperCase(),
                direction: unitDirection,
                status: 'PLANNED',
              },
            ]
          : [],
      };

      await gateQueueApi.registerTruck(payload);
      toast(`Truck ${payload.plateNo} registered in Gate Queue!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to register truck');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Register Inbound Truck"
      footer={
        <div className="row-wrap" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={<Check />} disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Registering...' : 'Register & Queue Truck'}
          </Button>
        </div>
      }
    >
      <div className="stack-lg">
        {/* Truck Identification */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <Truck size={18} color="var(--ink)" />
            <span className="strong">Truck Details</span>
          </div>

          <div className="grid-2">
            <Field label="Truck Plate" hint="Select from fleet or type new" required>
              <Input
                xl
                value={plateNo}
                placeholder="e.g. T 412 DKL"
                onChange={(e) => handleSelectTruck(e.target.value.toUpperCase())}
                list="truck-plate-suggestions"
              />
              <datalist id="truck-plate-suggestions">
                {truckList.map((t) => (
                  <option key={t.truckId || t.plateNo} value={t.plateNo}>
                    {t.plateNo} ({t.carrierName || 'Fleet'})
                  </option>
                ))}
              </datalist>
            </Field>

            <Field label="Assigned Lane" hint="Outer gate entry lane">
              <Select xl value={lane} onChange={(e) => setLane(e.target.value)}>
                <option value="In 1">In 1 (Lane 01 - General)</option>
                <option value="In 2">In 2 (Lane 02 - Fast Track)</option>
                <option value="In 3">In 3 (Lane 03 - Oversized)</option>
              </Select>
            </Field>
          </div>
        </div>

        {/* Driver Section with + Add Driver option */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 8, marginBottom: 12, justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 8 }}>
              <User size={18} color="var(--ink)" />
              <span className="strong">Driver Management</span>
            </div>
            <Button
              size="sm"
              variant={showAddDriver ? 'secondary' : 'ghost'}
              icon={<Plus size={14} />}
              onClick={() => setShowAddDriver(!showAddDriver)}
            >
              {showAddDriver ? 'Choose Existing Driver' : '+ Add New Driver'}
            </Button>
          </div>

          {!showAddDriver ? (
            <div className="stack">
              <Field label="Driver Name" hint="Select driver from database or add a new driver" required>
                <Select xl value={driverId} onChange={(e) => handleSelectDriver(e.target.value)}>
                  <option value="">-- Choose registered driver --</option>
                  {driverList.map((d) => (
                    <option key={d.driverId} value={d.driverId}>
                      {d.fullName} (Licence: {d.licenceNo || 'N/A'})
                    </option>
                  ))}
                </Select>
              </Field>

              {driverId && (
                <div className="row-wrap" style={{ gap: 12, padding: 8, background: 'var(--panel)', borderRadius: 6 }}>
                  <span className="small">Licence: <strong>{driverLicence || '—'}</strong></span>
                  <span className="small">Phone: <strong>{driverPhone || '—'}</strong></span>
                  <span className="small">Transporter: <strong>{transporterName || 'Independent'}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <div className="stack" style={{ border: '1px dashed var(--edge)', padding: 12, borderRadius: 8 }}>
              <span className="small strong" style={{ color: 'var(--accent)' }}>New Driver Profile (DB Record)</span>
              <div className="grid-2">
                <Field label="Full Name" required>
                  <Input
                    value={driverName}
                    placeholder="e.g. Ally Said Mwalimu"
                    onChange={(e) => setDriverName(e.target.value)}
                  />
                </Field>
                <Field label="Driving Licence No" required>
                  <Input
                    value={driverLicence}
                    placeholder="e.g. DL-TZ-884210"
                    onChange={(e) => setDriverLicence(e.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="Phone Number">
                  <Input
                    value={driverPhone}
                    placeholder="+255 7..."
                    onChange={(e) => setDriverPhone(e.target.value)}
                  />
                </Field>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="primary"
                    icon={<Check />}
                    disabled={savingDriver}
                    onClick={handleSaveNewDriver}
                    style={{ width: '100%' }}
                  >
                    {savingDriver ? 'Saving...' : 'Save Driver to DB'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Visit & Transporter Details */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <Building size={18} color="var(--ink)" />
            <span className="strong">Visit Type & Transporter</span>
          </div>

          <div className="grid-2">
            <Field label="Visit Type" required>
              <Select xl value={visitTypeCode} onChange={(e) => setVisitTypeCode(e.target.value)}>
                {vtList.length > 0 ? (
                  vtList.map((vt) => (
                    <option key={vt.visitTypeCode} value={vt.visitTypeCode}>
                      {vt.visitTypeName} ({vt.visitTypeCode})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="IMPORT_PICKUP">Import Pickup (Loaded Out)</option>
                    <option value="EMPTY_RETURN">Empty Return (Empty In)</option>
                    <option value="EXPORT_DROP">Export Drop (Loaded In)</option>
                    <option value="EMPTY_PICKUP">Empty Pickup (Empty Out)</option>
                  </>
                )}
              </Select>
            </Field>

            <Field label="Transporter Company">
              <Select
                xl
                value={transporterPartyId}
                onChange={(e) => {
                  setTransporterPartyId(e.target.value);
                  const p = partyList.find((x) => String(x.partyId) === e.target.value);
                  if (p) setTransporterName(p.partyName);
                }}
              >
                <option value="">-- Choose Transporter --</option>
                {partyList.map((p) => (
                  <option key={p.partyId} value={p.partyId}>
                    {p.partyName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        {/* Optional Unit / Container */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <Container size={18} color="var(--ink)" />
            <span className="strong">Unit / Container (Optional Initial)</span>
          </div>

          <div className="grid-2">
            <Field label="Container No" hint="ISO 6346 (e.g. MSKU 882014 9)">
              <Input
                xl
                value={unitNo}
                placeholder="MSKU 123456 7"
                onChange={(e) => setUnitNo(e.target.value.toUpperCase())}
              />
            </Field>

            <Field label="Direction">
              <Select xl value={unitDirection} onChange={(e) => setUnitDirection(e.target.value as any)}>
                <option value="PICK">Pick (Take out of yard)</option>
                <option value="DROP">Drop (Deliver into yard)</option>
              </Select>
            </Field>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
