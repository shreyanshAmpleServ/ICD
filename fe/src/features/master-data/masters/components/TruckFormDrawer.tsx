import { useEffect, useState } from 'react';
import { Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

export interface NewTruckItem {
  truckId?: number;
  plateNo: string;
  plateDisplay?: string;
  vehicleKind?: string;
  transporterPartyId?: number;
  carrierPartyId?: number;
  makeModel?: string;
  axleCount?: number;
  tareKg?: number;
  countryCode?: string;
  source?: string;
  syncStatus?: string;
  localNote?: string;
  gateBlocked?: boolean;
}

interface TruckFormDrawerProps {
  open: boolean;
  truck?: any | null;
  transporterList?: any[];
  onClose: () => void;
  onSave: (t: NewTruckItem) => void;
}

const VEHICLE_KINDS: [string, string][] = [
  ['TRUCK', 'Truck (rigid / tractor)'],
  ['TRAILER', 'Trailer'],
  ['CAR_CARRIER', 'Car carrier'],
];

export function TruckFormDrawer({ open, truck, transporterList = [], onClose, onSave }: TruckFormDrawerProps) {
  const [t, setT] = useState<NewTruckItem>({
    plateNo: '',
    plateDisplay: '',
    vehicleKind: 'TRUCK',
    transporterPartyId: 7,
    makeModel: 'Scania R460',
    axleCount: 3,
    tareKg: 9200,
    countryCode: 'TZ',
    source: 'LOCAL',
    syncStatus: 'PROVISIONAL',
  });

  useEffect(() => {
    if (truck) {
      setT({
        truckId: truck.truckId,
        plateNo: truck.plateNo || '',
        plateDisplay: truck.plateDisplay || truck.plateNo || '',
        vehicleKind: truck.vehicleKind || 'TRUCK',
        transporterPartyId: truck.transporterPartyId || 7,
        makeModel: truck.makeModel || '',
        axleCount: truck.axleCount ?? 3,
        tareKg: truck.tareKg ?? 9200,
        countryCode: truck.countryCode || 'TZ',
        source: truck.source || 'LOCAL',
        syncStatus: truck.syncStatus || 'PROVISIONAL',
        localNote: truck.localNote || '',
        gateBlocked: !!truck.gateBlocked,
      });
    } else {
      setT({
        plateNo: '',
        plateDisplay: '',
        vehicleKind: 'TRUCK',
        transporterPartyId: 7,
        makeModel: 'Scania R460',
        axleCount: 3,
        tareKg: 9200,
        countryCode: 'TZ',
        source: 'LOCAL',
        syncStatus: 'PROVISIONAL',
      });
    }
  }, [truck, open]);

  const set = (partial: Partial<NewTruckItem>) => setT((prev) => ({ ...prev, ...partial }));

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
      title={truck ? `Edit truck ${truck.plateDisplay || truck.plateNo}` : 'Add truck / trailer'}
      saveLabel={truck ? 'Save truck' : 'Add truck'}
      perm="masters.local.edit"
      disabled={!t.plateNo.trim()}
      onSave={() =>
        onSave({
          ...t,
          plateDisplay: t.plateDisplay || t.plateNo,
          plateNo: t.plateNo.replace(/\s/g, '').toUpperCase(),
          carrierPartyId: t.transporterPartyId,
        })
      }
    >
      <div className="form-grid">
        <Field label="Plate number" required hint="e.g. T 412 DKL">
          <Input
            value={t.plateNo}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              set({ plateNo: val, plateDisplay: val });
            }}
            placeholder="T 412 DKL"
          />
        </Field>
        <Field label="Vehicle kind">
          <Select
            value={t.vehicleKind || 'TRUCK'}
            onChange={(e) => set({ vehicleKind: e.target.value })}
            options={VEHICLE_KINDS}
          />
        </Field>
        <Field label="Transporter company">
          <Select
            value={String(t.transporterPartyId ?? 7)}
            onChange={(e) => set({ transporterPartyId: Number(e.target.value) })}
            options={transporterOpts}
          />
        </Field>
        <Field label="Make and model">
          <Input
            value={t.makeModel || ''}
            onChange={(e) => set({ makeModel: e.target.value })}
            placeholder="e.g. Scania R460"
          />
        </Field>
        <Field label="Axle count">
          <Input
            type="number"
            value={String(t.axleCount ?? 3)}
            onChange={(e) => set({ axleCount: Number(e.target.value) || 2 })}
          />
        </Field>
        <Field label="Tare weight (kg)">
          <Input
            type="number"
            value={String(t.tareKg ?? 9200)}
            onChange={(e) => set({ tareKg: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Country code">
          <Input
            value={t.countryCode || 'TZ'}
            onChange={(e) => set({ countryCode: e.target.value.toUpperCase() })}
            placeholder="TZ"
          />
        </Field>
        <Field label="Local note">
          <Input
            value={t.localNote || ''}
            onChange={(e) => set({ localNote: e.target.value })}
            placeholder="e.g. Gate pass warning or driver contact"
          />
        </Field>
      </div>
    </EditDrawer>
  );
}
