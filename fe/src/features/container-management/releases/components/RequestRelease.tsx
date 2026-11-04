import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Select, useToast } from '@/ds/components';
import { UnitPicker } from '@/features/container-management/shared';
import { useQ } from '@/api/query';
import { api } from '@/api/client';

export function RequestRelease({ open, onClose, consignmentId, onDone }: {
  open: boolean; onClose: () => void; consignmentId?: number; onDone?: (r: any) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: dbConsignments = [] } = useQ(['consignments'], () =>
    api.get<any>('/consignments').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const { data: dbUnits = [] } = useQ(['units'], () =>
    api.get<any>('/units').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const { data: dbParties = [] } = useQ(['parties'], () =>
    api.get<any>('/parties').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );

  const allCons = Array.isArray(dbConsignments) ? dbConsignments : [];
  const allStaysPool = Array.isArray(dbUnits) ? dbUnits : [];
  const partiesList = Array.isArray(dbParties) ? dbParties : [];

  const transporters = useMemo(() => {
    const list = partiesList.filter((p: any) => p.roles?.includes('TRANSPORTER') || p.roles?.includes('AGENT'));
    return list.length > 0 ? list : partiesList;
  }, [partiesList]);

  const fallbackConsId = allCons[0]?.consignmentId || 1;
  const [cid, setCid] = useState<number>(consignmentId ?? fallbackConsId);
  const [units, setUnits] = useState<number[]>([]);
  const [collector, setCollector] = useState('');
  const [idType, setIdType] = useState('Driving licence');
  const [idNo, setIdNo] = useState('');
  const [transporter, setTransporter] = useState(String(transporters[0]?.partyId || '1'));
  const [exit, setExit] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [tried, setTried] = useState(false);

  const effCid = consignmentId ?? cid;
  const stays = useMemo(() =>
    allStaysPool.filter((s: any) => s.consignmentId === effCid && s.physicalStatus !== 'DEPARTED'),
    [allStaysPool, effCid]
  );

  const errs = { units: !units.length && 'Pick at least one unit', collector: !collector.trim() && 'Name of the person collecting' };
  const ok = !errs.units && !errs.collector;

  const submit = async () => {
    setTried(true);
    if (!ok) return;

    try {
      const res = await api.post<any>('/release-orders', {
        releaseKind: 'DELIVERY',
        consignmentId: effCid,
        plannedExitDate: exit,
        transporterPartyId: Number(transporter),
        collectorName: collector.trim(),
        collectorIdType: idType,
        collectorIdNumber: idNo.trim() || undefined,
        unitStayIds: units,
      });

      qc.invalidateQueries({ queryKey: ['release-orders'] });
      qc.invalidateQueries({ queryKey: ['releases'] });
      qc.invalidateQueries({ queryKey: ['units'] });
      toast('Release order requested successfully');
      if (onDone) onDone(res);
      onClose();
    } catch (err: any) {
      toast('Failed to create release order: ' + err.message);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      title="Request release order"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<BadgeCheck />} disabled={!ok} onClick={submit}>
            Request release order
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        {!consignmentId && (
          <Field label="Consignment (BL / Booking)">
            <Select
              value={String(cid)}
              onChange={(e) => {
                setCid(Number(e.target.value));
                setUnits([]);
              }}
              options={allCons.map((c: any) => [String(c.consignmentId), `${c.refNo} · ${c.cargoDescription || 'Consignment'}`])}
            />
          </Field>
        )}
        <Field label="Units to release" required error={tried && !units.length && 'Pick at least one unit'}>
          <UnitPicker stays={stays.length > 0 ? stays : allStaysPool} value={units} onChange={setUnits} />
        </Field>
        <div className="form-grid">
          <Field label="Transporter / haulier" required>
            <Select
              value={transporter}
              onChange={(e) => setTransporter(e.target.value)}
              options={transporters.map((p: any) => [String(p.partyId), p.partyName])}
            />
          </Field>
          <Field label="Planned exit date" required>
            <Input type="date" value={exit} onChange={(e) => setExit(e.target.value)} />
          </Field>
          <Field label="Driver / collector name" required error={tried && !collector.trim() && 'Collector name required'}>
            <Input value={collector} onChange={(e) => setCollector(e.target.value)} placeholder="Full legal name" />
          </Field>
          <Field label="ID document">
            <div className="row" style={{ gap: 8 }}>
              <Select value={idType} onChange={(e) => setIdType(e.target.value)} options={['Driving licence', 'National ID (NIDA)', 'Passport']} style={{ width: 140 }} />
              <Input value={idNo} onChange={(e) => setIdNo(e.target.value)} placeholder="Document number" />
            </div>
          </Field>
        </div>
        <Banner tone="info" title="Eight-point release engine">
          When requested, the release engine checks customs status, cargo holds, unpaid charges, and port clearance automatically.
        </Banner>
      </div>
    </Drawer>
  );
}

export default RequestRelease;
