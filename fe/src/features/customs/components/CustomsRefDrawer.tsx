import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import type { S } from '@/api/types';
import { Banner, Button, Drawer, Field, Input, Segmented, Select, useToast } from '@/ds/components';
import { allStays, consignments } from '@/mock/core';
import { REF_TYPES } from '@/mock/cargo';
import { day } from '@/mock/gen';
import { Evidence } from '@/features/container-management/shared';
import { useQ, delay } from '@/api/query';
import { api } from '@/api/client';

let nextId = 100;
export function CustomsRefDrawer({ open, onClose, consignmentId, onSaved }: {
  open: boolean; onClose: () => void; consignmentId?: number;
  onSaved?: (r: S<'CustomsRef'>, affected: number[], sets?: string) => void;
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: dbConsignments = [] } = useQ(['consignments'], () => delay(consignments));
  const { data: dbUnits = [] } = useQ(['units'], () => delay(allStays));

  const allCons = dbConsignments.length ? dbConsignments : consignments;
  const allStaysPool = dbUnits.length ? dbUnits : allStays;

  const [type, setType] = useState('CUSTOMS_RELEASE');
  const [cid, setCid] = useState<number>(consignmentId ?? (allCons[0]?.consignmentId || 104));
  const [scope, setScope] = useState<'all' | 'one'>('all');
  const [unitId, setUnitId] = useState<number | null>(null);
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState(day(0));
  const [validTo, setValidTo] = useState(day(30));
  const [amount, setAmount] = useState('');
  const [cur, setCur] = useState('USD');
  const [file, setFile] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const t = REF_TYPES.find((x) => x.code === type)!;
  const effCid = consignmentId ?? cid;
  const units = useMemo(() => allStaysPool.filter((s) => s.consignmentId === effCid && s.physicalStatus !== 'DEPARTED'), [allStaysPool, effCid]);
  const unitScope = t.attachTo === 'unit' || (t.attachTo === 'either' && scope === 'one');
  const affected = !t.sets ? [] : unitScope ? units.filter((s) => s.unitStayId === (unitId ?? units[0]?.unitStayId)) : units;
  const changing = affected.filter((s) => s.customsStatus !== t.sets);
  const errs = {
    refNo: !refNo.trim() && 'Enter the number exactly as on the customs document',
    amount: t.hasAmount && !(Number(amount) > 0) && 'Bond amount is needed',
    validTo: t.hasValidity && validTo <= refDate && 'Valid-to must be after the reference date',
  };
  const ok = !errs.refNo && !errs.amount && !errs.validTo;

  const save = async () => {
    setTried(true);
    if (!ok) return;
    const r: S<'CustomsRef'> = {
      customsRefId: ++nextId, refTypeCode: type, refNo: refNo.trim().toUpperCase(), refDate, status: 'ACTIVE', source: 'MANUAL',
      ...(unitScope ? { unitStayId: unitId ?? units[0]?.unitStayId } : { consignmentId: effCid }),
      ...(t.hasValidity ? { validTo } : {}), ...(t.hasAmount ? { amount: Number(amount).toFixed(2), amountCurrency: cur } : {}),
    };

    try {
      await api.post('/customs/refs', {
        consignmentId: effCid,
        unitStayId: unitScope ? (unitId ?? units[0]?.unitStayId) : undefined,
        refTypeCode: type,
        refNo: refNo.trim().toUpperCase(),
        refDate,
        validTo: t.hasValidity ? validTo : undefined,
        amount: t.hasAmount ? Number(amount) : undefined,
        amountCurrency: cur,
        sets: t.sets,
      });
      qc.invalidateQueries({ queryKey: ['customs-refs'] });
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['consignments'] });
    } catch (e) {}

    onSaved?.(r, changing.map((s) => s.unitStayId!), t.sets);
    toast(`${t.name} recorded${changing.length && t.sets === 'CLEARED' ? `: ${changing.length} unit${changing.length === 1 ? '' : 's'} cleared` : ''}`);
    onClose();
    setRefNo(''); setAmount(''); setFile(null); setTried(false);
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add customs reference"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Landmark />} perm="customs.ref.edit" onClick={save}>Record {t.name.toLowerCase()}</Button></>}>
      <div className="stack-lg">
        <Field label="Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value)} options={REF_TYPES.map((r) => [r.code, r.name])} />
        </Field>
        <div className="form-grid">
          {!consignmentId && (
            <Field label="Consignment" required span={2}>
              <Select value={String(cid)} onChange={(e) => { setCid(Number(e.target.value)); setUnitId(null); }} options={allCons.map((c) => [String(c.consignmentId), `${c.refNo} · ${c.cargoDescription || 'Cargo'}`])} />
            </Field>
          )}
          {t.attachTo === 'either' && (
            <Field label="Applies to" span={2}>
              <Segmented value={scope} onChange={setScope} options={[{ id: 'all', label: 'Whole consignment' }, { id: 'one', label: 'One unit' }]} />
            </Field>
          )}
          {unitScope && (
            <Field label="Unit" required span={2}>
              <Select value={String(unitId ?? units[0]?.unitStayId ?? '')} onChange={(e) => setUnitId(Number(e.target.value))} options={units.map((s) => [String(s.unitStayId), `${s.cargoUnit?.unitNo || (s as any).unitNo} · ${s.cargoUnit?.unitTypeCode || '40HC'}`])} />
            </Field>
          )}
          <Field label="Reference number" required error={tried && errs.refNo} span={2}>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value.toUpperCase())} placeholder={(t as any).placeholder || 'e.g. REF-12345'} />
          </Field>
          <Field label="Reference date" required><Input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} /></Field>
          {t.hasValidity && <Field label="Valid to" required error={tried && errs.validTo}><Input type="date" value={validTo} min={refDate} onChange={(e) => setValidTo(e.target.value)} /></Field>}
          {t.hasAmount && (
            <>
              <Field label="Bond amount" required error={tried && errs.amount}><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></Field>
              <Field label="Currency"><Select value={cur} onChange={(e) => setCur(e.target.value)} options={['USD', 'TZS', 'EUR']} /></Field>
            </>
          )}
        </div>
        {t.sets && (
          <Banner tone={t.sets === 'CLEARED' ? 'go' : 'wait'} title={`Sets customs status to ${t.sets.toLowerCase()}`}>
            {affected.length === 0 ? 'No units on this consignment.' : affected.length === 1 ? `Unit ${affected[0].cargoUnit?.unitNo || (affected[0] as any).unitNo} customs status changes from ${affected[0].customsStatus ?? 'pending'} to ${t.sets}.` : `All ${affected.length} units on this consignment change to ${t.sets}.`}
          </Banner>
        )}
        <Field label="Attach document (optional)" hint="PDF or photo of the customs paperwork"><Evidence value={file} onChange={setFile} fileName={`${refNo || 'Customs-doc'}.pdf`} /></Field>
      </div>
    </Drawer>
  );
}

export default CustomsRefDrawer;
