import { useMemo, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Money, Select, useToast } from '@/ds/components';
import { allStays, consignments, parties, consignment } from '@/mock/core';
import { evaluate } from '@/mock/control';
import { at, day } from '@/mock/gen';
import { allReleaseOrders, type RO } from '@/mock/cargo';
import { UnitPicker } from './shared';

/* POST /release-orders. The agent (or doc & clearance on their behalf)
   picks units, the collector and the planned exit date. The order is valid
   to the date storage is paid through, so the exit date drives what to pay. */
let next = 1956;
export function RequestRelease({ open, onClose, consignmentId, onDone }: {
  open: boolean; onClose: () => void; consignmentId?: number; onDone?: (r: RO) => void;
}) {
  const toast = useToast();
  const withUnits = consignments.filter((c) => allStays.some((s) => s.consignmentId === c.consignmentId && s.physicalStatus === 'IN_YARD'));
  const [cid, setCid] = useState<number>(consignmentId ?? withUnits[0].consignmentId!);
  const [units, setUnits] = useState<number[]>([]);
  const [collector, setCollector] = useState('');
  const [idType, setIdType] = useState('Driving licence');
  const [idNo, setIdNo] = useState('');
  const [transporter, setTransporter] = useState('7');
  const [plate, setPlate] = useState('');
  const [exit, setExit] = useState(day(1));
  const [tried, setTried] = useState(false);

  const effCid = consignmentId ?? cid;
  const stays = useMemo(() => allStays.filter((s) => s.consignmentId === effCid && s.physicalStatus === 'IN_YARD'), [effCid]);
  const chosen = stays.filter((s) => units.includes(s.unitStayId!));
  const fails = chosen.map((s) => ({ s, f: evaluate(s, 'APPROVAL').filter((c) => c.result === 'FAIL' && c.conditionCode !== 'RELEASE_VALID') })).filter((x) => x.f.length);
  const extraDays = Math.max(0, Math.round((Date.parse(exit) - Date.parse(day(0))) / 86400000));
  const due = chosen.reduce((n, s) => n + (s.billingStatus === 'PAID' || s.billingStatus === 'CREDIT' ? 0 : Number(s.accruedCharges?.total ?? 0)) + extraDays * (s.cargoUnit.unitTypeCode.startsWith('4') ? 16 : 8) * 1.18, 0);
  const errs = { units: !units.length && 'Pick at least one unit', collector: !collector && 'Name of the person collecting' };
  const ok = !errs.units && !errs.collector;

  const submit = () => {
    setTried(true);
    if (!ok) return;
    const no = `RO-DAR1-26-0${++next}`;
    const ro: RO = {
      releaseOrderId: 950 + next, releaseNo: no, releaseKind: 'DELIVERY', consignmentId: effCid, status: 'REQUESTED', requestedAt: at(0),
      plannedExitDate: exit, unitsTotal: chosen.length, unitsOut: 0, transporterPartyId: Number(transporter), collectorName: collector, collectorIdType: idType, collectorIdNo: idNo,
      units: chosen.map((s) => ({ unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, status: 'PENDING' })),
    };
    allReleaseOrders.unshift(ro); // prototype only: lets the detail page find it
    onDone?.(ro);
    toast(`Release requested: ${no}`);
    onClose();
    setUnits([]); setCollector(''); setIdNo(''); setPlate(''); setTried(false);
  };

  return (
    <Drawer open={open} onClose={onClose} wide title="Request release"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<BadgeCheck />} perm="release.issue" onClick={submit}>Request release</Button></>}>
      <div className="stack-lg">
        <div className="form-grid">
          <Field label="Consignment" required span={2}>
            {consignmentId ? <Input value={consignment(consignmentId)?.refNo} readOnly /> : (
              <Select value={String(cid)} onChange={(e) => { setCid(Number(e.target.value)); setUnits([]); }} options={withUnits.map((c) => [String(c.consignmentId), `${c.refNo} · ${c.cargoDescription}`])} />
            )}
          </Field>
          <Field label="Planned exit date" required hint="Storage must be paid through this date"><Input type="date" value={exit} min={day(0)} onChange={(e) => setExit(e.target.value)} /></Field>
        </div>
        <Field label="Units to release" required error={tried && errs.units}>
          <UnitPicker stays={stays} value={units} onChange={setUnits} height={220} />
        </Field>
        <div className="form-grid">
          <Field label="Collector name" required error={tried && errs.collector}><Input value={collector} onChange={(e) => setCollector(e.target.value)} placeholder="As on the ID" /></Field>
          <Field label="ID type"><Select value={idType} onChange={(e) => setIdType(e.target.value)} options={['Driving licence', 'National ID (NIDA)', 'Passport', 'Company ID']} /></Field>
          <Field label="ID number"><Input value={idNo} onChange={(e) => setIdNo(e.target.value)} /></Field>
          <Field label="Transporter"><Select value={transporter} onChange={(e) => setTransporter(e.target.value)} options={parties.filter((p) => p.roles.includes('TRANSPORTER')).map((p) => [String(p.partyId), p.partyName])} /></Field>
          <Field label="Truck plate" hint="Optional; the gate checks it if given"><Input className="unitno" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="T 123 ABC" /></Field>
        </div>
        {chosen.length > 0 && (
          fails.length ? (
            <Banner tone="wait" title={`${fails.length} of ${chosen.length} units would not pass approval today`}>
              {fails.slice(0, 4).map(({ s, f }) => `${s.cargoUnit.unitNo}: ${f.map((c) => c.conditionName.toLowerCase()).join(', ')}`).join('. ')}.
              {' '}You can still request; the order waits in "checks pending" until they pass.
            </Banner>
          ) : <Banner tone="go" title="All chosen units pass the approval checks now" />
        )}
        {chosen.length > 0 && (
          <div className="row-wrap small">
            <span className="muted">To pay before approval, through {new Date(exit).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}:</span>
            <Money amount={due} currency="USD" strong />
            <span className="xs faint">incl. VAT 18%. A proforma is created when the order is approved.</span>
          </div>
        )}
      </div>
    </Drawer>
  );
}
