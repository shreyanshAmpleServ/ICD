import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Money, Select, useToast } from '@/ds/components';
import { allStays, consignments, parties } from '@/mock/core';
import { evaluate } from '@/mock/control';
import { at, day } from '@/mock/gen';
import { allReleaseOrders, type RO } from '@/mock/cargo';
import { UnitPicker } from '@/features/container-management/shared';
import { useQ, delay } from '@/api/query';
import { api } from '@/api/client';

export function RequestRelease({ open, onClose, consignmentId, onDone }: {
  open: boolean; onClose: () => void; consignmentId?: number; onDone?: (r: RO) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: dbConsignments = [] } = useQ(['consignments'], () => delay(consignments));
  const { data: dbUnits = [] } = useQ(['units'], () => delay(allStays));

  const allCons = dbConsignments.length ? dbConsignments : consignments;
  const allStaysPool = dbUnits.length ? dbUnits : allStays;

  const withUnits = allCons.filter((c) => allStaysPool.some((s) => s.consignmentId === c.consignmentId && s.physicalStatus === 'IN_YARD'));
  const fallbackConsId = withUnits.length > 0 ? withUnits[0].consignmentId! : (allCons[0]?.consignmentId || 101);

  const [cid, setCid] = useState<number>(consignmentId ?? fallbackConsId);
  const [units, setUnits] = useState<number[]>([]);
  const [collector, setCollector] = useState('');
  const [idType, setIdType] = useState('Driving licence');
  const [idNo, setIdNo] = useState('');
  const [transporter, setTransporter] = useState('7');
  const [plate, setPlate] = useState('');
  const [exit, setExit] = useState(day(1));
  const [tried, setTried] = useState(false);

  const effCid = consignmentId ?? cid;
  const stays = useMemo(() => allStaysPool.filter((s) => s.consignmentId === effCid && s.physicalStatus === 'IN_YARD'), [allStaysPool, effCid]);
  const chosen = stays.filter((s) => units.includes(s.unitStayId!));
  const fails = chosen.map((s) => ({ s, f: evaluate(s, 'APPROVAL').filter((c) => c.result === 'FAIL' && c.conditionCode !== 'RELEASE_VALID') })).filter((x) => x.f.length);
  const extraDays = Math.max(0, Math.round((Date.parse(exit) - Date.parse(day(0))) / 86400000));
  const due = chosen.reduce((n, s) => n + (s.billingStatus === 'PAID' || s.billingStatus === 'CREDIT' ? 0 : Number(s.accruedCharges?.total ?? 0)) + extraDays * ((s.cargoUnit?.unitTypeCode || '').startsWith('4') ? 16 : 8) * 1.18, 0);
  const errs = { units: !units.length && 'Pick at least one unit', collector: !collector && 'Name of the person collecting' };
  const ok = !errs.units && !errs.collector;

  const submit = async () => {
    setTried(true);
    if (!ok) return;
    const no = `RO-DAR1-26-0${1950 + Math.floor(Math.random() * 500)}`;
    const ro: any = {
      releaseNo: no,
      releaseKind: 'DELIVERY',
      consignmentId: effCid,
      status: 'REQUESTED',
      requestedAt: at(0),
      plannedExitDate: exit,
      unitsTotal: chosen.length,
      unitsOut: 0,
      transporterPartyId: Number(transporter),
      collectorName: collector,
      collectorIdType: idType,
      collectorIdNo: idNo,
      units: chosen.map((s) => ({ unitStayId: s.unitStayId!, unitNo: s.cargoUnit?.unitNo || (s as any).unitNo, status: 'PENDING' })),
    };

    try {
      const created = await api.post<any>('/release-orders', ro);
      qc.invalidateQueries({ queryKey: ['release-orders'] });
      qc.invalidateQueries({ queryKey: ['units'] });
      onDone?.(created || ro);
      toast(`Release requested: ${created?.releaseNo || no}`);
    } catch (err: any) {
      allReleaseOrders.unshift(ro);
      onDone?.(ro);
      toast(`Release requested: ${no}`);
    }

    onClose();
    setUnits([]); setCollector(''); setIdNo(''); setPlate(''); setTried(false);
  };

  return (
    <Drawer open={open} onClose={onClose} wide title="Request release"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<BadgeCheck />} perm="release.issue" onClick={submit}>Request release</Button></>}>
      <div className="stack-lg">
        <div className="form-grid">
          <Field label="Consignment" required span={2}>
            {consignmentId ? <Input value={allCons.find(c => c.consignmentId === consignmentId)?.refNo || String(consignmentId)} readOnly /> : (
              <Select value={String(cid)} onChange={(e) => { setCid(Number(e.target.value)); setUnits([]); }} options={allCons.map((c) => [String(c.consignmentId), `${c.refNo} · ${c.cargoDescription || 'General Goods'}`])} />
            )}
          </Field>
          <Field label="Planned exit date" required hint="Storage must be paid through this date"><Input type="date" value={exit} min={day(0)} onChange={(e) => setExit(e.target.value)} /></Field>
        </div>
        <Field label="Units to release" required error={tried && errs.units}>
          <UnitPicker stays={stays} value={units} onChange={setUnits} height={220} />
        </Field>
        <div className="form-grid">
          <Field label="Collector name" required error={tried && errs.collector}><Input value={collector} onChange={(e) => setCollector(e.target.value)} placeholder="As on the ID" /></Field>
          <Field label="ID type"><Select value={idType} onChange={(e) => setIdType(e.target.value)} options={['Driving licence', 'National ID (NIDA)', 'Passport']} /></Field>
          <Field label="ID number"><Input value={idNo} onChange={(e) => setIdNo(e.target.value)} placeholder="e.g. DL-TZ-..." /></Field>
          <Field label="Transporter" hint="Company taking the cargo"><Select value={transporter} onChange={(e) => setTransporter(e.target.value)} options={parties.filter((p) => p.roles.includes('TRANSPORTER')).map((p) => [String(p.partyId), p.partyName])} /></Field>
          <Field label="Truck plate" hint="Optional at request; confirmed at gate in"><Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="T 123 ABC" /></Field>
        </div>
        {fails.length > 0 && (
          <Banner tone="wait" title={`${fails.length} unit${fails.length === 1 ? '' : 's'} have conditions that do not pass yet`}>
            {fails.map(({ s, f }) => `${s.cargoUnit?.unitNo || (s as any).unitNo}: ${f.map((c) => c.conditionName).join(', ')}`).join(' · ')}. The release order will be marked Waiting until these pass or are approved.
          </Banner>
        )}
        <div className="panel alt row" style={{ gap: 16 }}>
          <span className="spacer"><strong>Estimated charges through {exit}</strong><div className="xs faint">Includes {extraDays} additional day{extraDays === 1 ? '' : 's'} of storage beyond today</div></span>
          <Money amount={due.toFixed(2)} currency="USD" />
        </div>
      </div>
    </Drawer>
  );
}

export default RequestRelease;
