import { useMemo, useState } from 'react';
import { ArrowRight, Landmark } from 'lucide-react';
import type { S } from '@/api/types';
import { Banner, Button, Drawer, Field, Input, Segmented, Select, StatusPill, UnitNo, useToast } from '@/ds/components';
import { allStays, consignments, consignment } from '@/mock/core';
import { REF_TYPES } from '@/mock/cargo';
import { day } from '@/mock/gen';
import { Evidence } from './shared';

/* POST /customs/refs. The fields follow the reference type: bonds have an
   amount and a validity, transit declarations a validity. Types that set a
   customs status (entry, exam notice, release) say what they will change
   before you save. */
let nextId = 100;
export function CustomsRefDrawer({ open, onClose, consignmentId, onSaved }: {
  open: boolean; onClose: () => void; consignmentId?: number;
  onSaved?: (r: S<'CustomsRef'>, affected: number[], sets?: string) => void;
}) {
  const toast = useToast();
  const [type, setType] = useState('CUSTOMS_RELEASE');
  const [cid, setCid] = useState<number>(consignmentId ?? 104);
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
  const units = useMemo(() => allStays.filter((s) => s.consignmentId === effCid && s.physicalStatus !== 'DEPARTED'), [effCid]);
  const unitScope = t.attachTo === 'unit' || (t.attachTo === 'either' && scope === 'one');
  const affected = !t.sets ? [] : unitScope ? units.filter((s) => s.unitStayId === (unitId ?? units[0]?.unitStayId)) : units;
  const changing = affected.filter((s) => s.customsStatus !== t.sets);
  const errs = {
    refNo: !refNo.trim() && 'Enter the number exactly as on the customs document',
    amount: t.hasAmount && !(Number(amount) > 0) && 'Bond amount is needed',
    validTo: t.hasValidity && validTo <= refDate && 'Valid-to must be after the reference date',
  };
  const ok = !errs.refNo && !errs.amount && !errs.validTo;

  const save = () => {
    setTried(true);
    if (!ok) return;
    const r: S<'CustomsRef'> = {
      customsRefId: ++nextId, refTypeCode: type, refNo: refNo.trim().toUpperCase(), refDate, status: 'ACTIVE', source: 'MANUAL',
      ...(unitScope ? { unitStayId: unitId ?? units[0]?.unitStayId } : { consignmentId: effCid }),
      ...(t.hasValidity ? { validTo } : {}), ...(t.hasAmount ? { amount: Number(amount).toFixed(2), amountCurrency: cur } : {}),
    };
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
              <Select value={String(cid)} onChange={(e) => { setCid(Number(e.target.value)); setUnitId(null); }} options={consignments.map((c) => [String(c.consignmentId), `${c.refNo} · ${c.cargoDescription}`])} />
            </Field>
          )}
          {t.attachTo === 'either' && (
            <Field label="Applies to" span={2}>
              <Segmented value={scope} onChange={setScope} options={[{ id: 'all', label: 'Whole consignment' }, { id: 'one', label: 'One unit' }]} />
            </Field>
          )}
          {unitScope && (
            <Field label="Unit" required span={2}>
              <Select value={String(unitId ?? units[0]?.unitStayId ?? '')} onChange={(e) => setUnitId(Number(e.target.value))} options={units.map((s) => [String(s.unitStayId), `${s.cargoUnit.unitNo} · ${s.cargoUnit.unitTypeCode}`])} />
            </Field>
          )}
          <Field label="Reference number" required error={tried && errs.refNo}>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder={{ ENTRY_NO: 'TZDL-26-…', EXAM_NOTICE: 'EXN/DSM/26/…', TRANSIT_DECL: 'T1-DSM-26-…', TRANSIT_BOND: 'BND-…', CUSTOMS_RELEASE: 'REL-DSM-26-…', EXPORT_ENTRY: 'TZEX-26-…' }[type]} />
          </Field>
          <Field label="Reference date" required><Input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} /></Field>
          {t.hasValidity && <Field label="Valid to" required error={tried && errs.validTo} hint="You will be warned 7 days before it ends"><Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} /></Field>}
          {t.hasAmount && (
            <Field label="Bond amount" required error={tried && errs.amount}>
              <div className="row"><Select aria-label="Currency" value={cur} onChange={(e) => setCur(e.target.value)} options={['USD', 'TZS']} style={{ width: 90 }} /><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
            </Field>
          )}
        </div>
        <Field label="Evidence" hint={`${t.evidence}. Kept with the reference for audit.`}><Evidence value={file} onChange={setFile} fileName={`${t.name}.pdf`} /></Field>

        {t.sets && (
          affected.length === 0 ? <Banner title="No units to update">This consignment has no units on site yet. The status is set when they gate in.</Banner> : (
            <div className="stack" style={{ gap: 8 }}>
              <Banner tone={t.sets === 'CLEARED' ? 'go' : 'customs'} title={changing.length ? `Saving sets ${changing.length} unit${changing.length === 1 ? '' : 's'} to "${t.sets === 'CLEARED' ? 'Cleared' : t.sets === 'UNDER_EXAM' ? 'Under exam' : 'Lodged'}"` : 'All units already have this customs status'}>
                {t.sets === 'CLEARED' ? 'The customs condition then passes for release. Holds placed by customs still need lifting on their own.' : 'Release stays blocked until customs releases the units.'}
              </Banner>
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                {changing.slice(0, 30).map((s) => (
                  <div key={s.unitStayId} className="row small" style={{ padding: '4px 0' }}>
                    <span style={{ minWidth: 150 }}><UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} /></span>
                    <StatusPill value={s.customsStatus} track="customs" /><ArrowRight size={14} /><StatusPill value={t.sets} track="customs" />
                  </div>
                ))}
              </div>
            </div>
          )
        )}
        {!consignmentId && <p className="xs faint">Attached to {consignment(effCid)?.refNo}.</p>}
      </div>
    </Drawer>
  );
}
