import { useState } from 'react';
import { Plus, Check, ShieldCheck, Phone, CreditCard } from 'lucide-react';
import { Button, Field, Input, Modal, Segmented, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { truckVisitsApi } from '../visits/api';

function unwrapList<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export interface DriverInfo {
  id?: number;
  name: string;
  licence?: string;
  phone?: string;
  carrierName?: string;
}

export function AssignDriverModal({
  open,
  onClose,
  visitId,
  currentDriver,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  visitId: number;
  currentDriver?: { id?: number; name?: string; licence?: string; phone?: string };
  onAssigned: (driver: DriverInfo) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<'SELECT' | 'NEW'>('SELECT');
  const [saving, setSaving] = useState(false);

  // New Driver Form Fields
  const [fullName, setFullName] = useState('');
  const [licenceNo, setLicenceNo] = useState('');
  const [phone, setPhone] = useState('+255 ');
  const [carrierName, setCarrierName] = useState('Independent Haulier');

  // Search Filter for existing drivers
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch live drivers from database
  const { data: driversRaw = [], refetch } = useQ(['masters-drivers-modal'], async () => {
    const res = await api.get<any>('/drivers');
    return unwrapList<any>(res);
  });

  const driversList: any[] = Array.isArray(driversRaw) ? driversRaw : [];

  const filteredDrivers = driversList.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (d.fullName || '').toLowerCase().includes(q) ||
      (d.licenceNo || '').toLowerCase().includes(q) ||
      (d.phone || '').includes(q) ||
      (d.carrierName || '').toLowerCase().includes(q)
    );
  });

  const handleSelectExisting = async (driver: any) => {
    setSaving(true);
    try {
      await truckVisitsApi.updateDriver(visitId, {
        driverId: driver.driverId,
        driverName: driver.fullName,
        licenceNo: driver.licenceNo,
        phone: driver.phone,
      });

      const updated: DriverInfo = {
        id: driver.driverId,
        name: driver.fullName,
        licence: driver.licenceNo,
        phone: driver.phone,
        carrierName: driver.carrierName,
      };

      toast(`Driver ${driver.fullName} assigned to Visit #${visitId}`);
      onAssigned(updated);
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to assign driver');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    if (!fullName.trim()) {
      toast('Driver full name is required');
      return;
    }
    if (!licenceNo.trim()) {
      toast('Driver licence number is required');
      return;
    }

    setSaving(true);
    try {
      // 1. Create in database (prisma.drivers)
      const created = await api.post<any>('/drivers', {
        fullName: fullName.trim(),
        licenceNo: licenceNo.trim().toUpperCase(),
        phone: phone.trim(),
        carrierName: carrierName.trim() || 'Independent Haulier',
      });

      // 2. Link to this visit in database (prisma.truck_visits)
      await truckVisitsApi.updateDriver(visitId, {
        driverId: created.driverId,
        driverName: created.fullName,
        licenceNo: created.licenceNo,
        phone: created.phone,
      });

      await refetch();

      const updated: DriverInfo = {
        id: created.driverId,
        name: created.fullName,
        licence: created.licenceNo,
        phone: created.phone,
        carrierName: created.carrierName,
      };

      toast(`New driver ${created.fullName} registered & assigned!`);
      onAssigned(updated);
      setFullName('');
      setLicenceNo('');
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to create and assign driver');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Driver Identification & Assignment"
      footer={
        tab === 'NEW' ? (
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={() => setTab('SELECT')}>
              Back
            </Button>
            <Button variant="primary" icon={<Check />} disabled={saving} onClick={handleCreateNew}>
              {saving ? 'Saving...' : 'Save to Database & Assign'}
            </Button>
          </div>
        ) : (
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        )
      }
    >
      <div className="stack" style={{ gap: 16, maxWidth: 580 }}>
        <Segmented
          xl
          value={tab}
          onChange={(v) => setTab(v as any)}
          options={[
            { id: 'SELECT', label: `Select Registered Driver (${driversList.length})` },
            { id: 'NEW', label: '+ Register New Driver' },
          ]}
        />

        {tab === 'SELECT' ? (
          <div className="stack" style={{ gap: 12 }}>
            <Input
              xl
              placeholder="Search driver by name, licence number, or transporter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            <div
              style={{
                maxHeight: 340,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                paddingRight: 4,
              }}
            >
              {filteredDrivers.length === 0 ? (
                <div className="panel" style={{ padding: 24, textAlign: 'center' }}>
                  <p className="muted">No matching drivers found in database.</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus />}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      setFullName(searchTerm);
                      setTab('NEW');
                    }}
                  >
                    Register "{searchTerm}" as new driver
                  </Button>
                </div>
              ) : (
                filteredDrivers.map((d) => {
                  const isCurrent =
                    (currentDriver?.id && d.driverId === currentDriver.id) ||
                    (currentDriver?.name && d.fullName?.toLowerCase() === currentDriver.name?.toLowerCase());

                  return (
                    <div
                      key={d.driverId}
                      className="panel"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: isCurrent ? '2px solid var(--go, #16a34a)' : '1px solid var(--edge)',
                        backgroundColor: isCurrent ? 'rgba(34, 197, 94, 0.04)' : undefined,
                        borderRadius: 8,
                      }}
                    >
                      <div className="stack" style={{ gap: 2 }}>
                        <div className="row" style={{ gap: 8 }}>
                          <span className="strong" style={{ fontSize: 15 }}>
                            {d.fullName}
                          </span>
                          {isCurrent && (
                            <span className="pill pill-success" style={{ fontSize: 11, padding: '2px 6px' }}>
                              Current
                            </span>
                          )}
                        </div>
                        <div className="row-wrap small muted" style={{ gap: 12 }}>
                          <span className="row" style={{ gap: 4 }}>
                            <CreditCard size={13} /> {d.licenceNo || 'No licence on file'}
                          </span>
                          <span className="row" style={{ gap: 4 }}>
                            <Phone size={13} /> {d.phone || 'No phone'}
                          </span>
                          <span>· {d.carrierName || 'Independent'}</span>
                        </div>
                      </div>

                      <Button
                        size="md"
                        variant={isCurrent ? 'ghost' : 'secondary'}
                        disabled={isCurrent || saving}
                        onClick={() => handleSelectExisting(d)}
                      >
                        {isCurrent ? 'Assigned' : 'Select'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            <Field label="Driver Full Name" required hint="e.g. Hassan Ali Mwamba">
              <Input
                xl
                value={fullName}
                placeholder="Full official name"
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </Field>

            <div className="grid-2">
              <Field label="Licence Number" required hint="e.g. DL-TZ-44102">
                <Input
                  xl
                  value={licenceNo}
                  placeholder="Official driving licence"
                  onChange={(e) => setLicenceNo(e.target.value.toUpperCase())}
                />
              </Field>

              <Field label="Phone Number" hint="e.g. +255 75 901 2233">
                <Input
                  xl
                  value={phone}
                  placeholder="+255 7..."
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Transporter / Haulier Company" hint="e.g. Simba Haulage Co. or Independent">
              <Input
                xl
                value={carrierName}
                placeholder="Company name"
                onChange={(e) => setCarrierName(e.target.value)}
              />
            </Field>

            <div className="panel" style={{ padding: 12, backgroundColor: 'var(--panel-alt, #f8fafc)' }}>
              <div className="row small" style={{ gap: 6, color: 'var(--steel)' }}>
                <ShieldCheck size={16} color="var(--go, #16a34a)" />
                <span>
                  This driver will be permanently stored in the ICD database and instantly linked to this gate visit.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
