import { useEffect, useState } from 'react';
import { Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

export interface NewDriverItem {
  driverId?: number;
  driverName: string;
  fullName?: string;
  licenceNo: string;
  licenceClass?: string;
  licenceExpiry?: string;
  licenceCountry?: string;
  phone?: string;
  transporterPartyId?: number;
  source?: string;
  syncStatus?: string;
  localNote?: string;
  isActive?: boolean;
}

interface DriverFormDrawerProps {
  open: boolean;
  driver?: any | null;
  transporterList?: any[];
  onClose: () => void;
  onSave: (d: NewDriverItem) => void;
}

  export function DriverFormDrawer({ open, driver, transporterList = [], onClose, onSave }: DriverFormDrawerProps) {
    const oneYearAhead = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
    const [d, setD] = useState<NewDriverItem>({
      driverName: '',
      licenceNo: '',
      licenceClass: 'E',
      licenceExpiry: oneYearAhead,
      licenceCountry: 'TZ',
      phone: '+255 754 000 000',
      transporterPartyId: 7,
      source: 'LOCAL',
      syncStatus: 'PROVISIONAL',
      isActive: true,
    });

    useEffect(() => {
      if (driver) {
        setD({
          driverId: driver.driverId,
          driverName: driver.driverName || driver.fullName || '',
          fullName: driver.driverName || driver.fullName || '',
          licenceNo: driver.licenceNo || '',
          licenceClass: driver.licenceClass || 'E',
          licenceExpiry: driver.licenceExpiry || oneYearAhead,
          licenceCountry: driver.licenceCountry || 'TZ',
          phone: driver.phone || '+255 754 000 000',
          transporterPartyId: driver.transporterPartyId || 7,
          source: driver.source || 'LOCAL',
          syncStatus: driver.syncStatus || 'PROVISIONAL',
          localNote: driver.localNote || '',
          isActive: driver.isActive ?? true,
        });
      } else {
        setD({
          driverName: '',
          licenceNo: '',
          licenceClass: 'E',
          licenceExpiry: oneYearAhead,
          licenceCountry: 'TZ',
          phone: '+255 754 000 000',
          transporterPartyId: 7,
          source: 'LOCAL',
          syncStatus: 'PROVISIONAL',
          isActive: true,
        });
      }
    }, [driver, open]);

    const set = (partial: Partial<NewDriverItem>) => setD((prev) => ({ ...prev, ...partial }));

    const dynamicTransporters: [string, string][] = transporterList.map((p) => [
      String(p.partyId),
      p.partyName || p.legalName || `Party #${p.partyId}`,
    ]);

    const transporterOpts: [string, string][] =
      dynamicTransporters.length > 0
        ? dynamicTransporters
        : [
          ['1', 'A.P. Moller - Maersk'],
          ['2', 'Mediterranean Shipping Company'],
          ['3', 'CMA CGM Group'],
          ['7', 'Twiga Minerals Corporation'],
          ['8', 'Bolloré Transport & Logistics Tanzania'],
          ['9', 'Freight Forwarders Tanzania Limited'],
          ['11', 'Kilele Clearing & Forwarding'],
          ['17', 'Upepo Transporters'],
          ['18', 'Simba Haulage Co.'],
        ];

    return (
      <EditDrawer
        open={open}
        onClose={onClose}
        title={driver ? `Edit driver ${driver.driverName || driver.fullName}` : 'Add driver'}
        saveLabel={driver ? 'Save driver' : 'Add driver'}
        perm="masters.local.edit"
        disabled={!d.driverName.trim() || !d.licenceNo.trim()}
        onSave={() => onSave({ ...d, fullName: d.driverName })}
      >
        <div className="form-grid">
            <Field label="Full name" required>
              <Input
                value={d.driverName}
                onChange={(e) => set({ driverName: e.target.value })}
                placeholder="e.g. Juma Kassim"
              />
            </Field>
            <Field label="Driving licence number" required>
              <Input
                value={d.licenceNo}
                onChange={(e) => set({ licenceNo: e.target.value.toUpperCase() })}
                placeholder="e.g. TZ-DL-98211"
              />
            </Field>
            <Field label="Licence class">
              <Input
                value={d.licenceClass || 'E'}
                onChange={(e) => set({ licenceClass: e.target.value.toUpperCase() })}
                placeholder="E"
              />
            </Field>
              <Field label="Licence expiry date" required>
                <Input
                  type="date"
                  value={d.licenceExpiry || ''}
                  onChange={(e) => set({ licenceExpiry: e.target.value })}
                />
              </Field>
                <Field label="Licence issuing country">
                  <Input
                    value={d.licenceCountry || 'TZ'}
                    onChange={(e) => set({ licenceCountry: e.target.value.toUpperCase() })}
                    placeholder="TZ"
                  />
                </Field>
                  <Field label="Phone number">
                    <Input
                      value={d.phone || ''}
                      onChange={(e) => set({ phone: e.target.value })}
                      placeholder="+255 754 000 000"
                    />
                  </Field>
                    <Field label="Transporter employer">
                      <Select
                        value={String(d.transporterPartyId ?? 7)}
                        onChange={(e) => set({ transporterPartyId: Number(e.target.value) })}
                        options={transporterOpts}
                      />
                    </Field>
                    <Field label="Local note">
                      <Input
                        value={d.localNote || ''}
                        onChange={(e) => set({ localNote: e.target.value })}
                        placeholder="e.g. Preferred contact or notes"
                      />
                    </Field>
                  </div>
                </EditDrawer>
                );
}
