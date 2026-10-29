import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Money, Select, Textarea } from '@/ds/components';
import { consignments, parties } from '@/mock/core';
import { CHARGE_NAMES, TODAY, m2 } from '@/mock/money';
import { type Row } from './WaiveDrawer';

export function ManualDrawer({
  open,
  onClose,
  siteId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  siteId: number;
  onDone: (r: Row) => void;
}) {
  const [bill, setBill] = useState('2');
  const [cons, setCons] = useState('101');
  const [code, setCode] = useState('WEIGHING');
  const [qty, setQty] = useState('1');
  const [rate, setRate] = useState('25.00');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(TODAY);
  const cs = consignments.filter(
    (c) => c.billToPartyId === Number(bill) && (siteId === 2 ? c.vesselCallId === 13 : c.vesselCallId !== 13)
  );
  const amt = (Number(qty) || 0) * (Number(rate) || 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a manual charge"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Plus />}
            perm="billing.invoice.create"
            disabled={!reason.trim() || amt <= 0}
            onClick={() => {
              onDone({
                key: `m-${Date.parse(date)}-${code}`,
                chargeId: 990000 + Number(qty) * 7 + reason.length,
                status: 'MANUAL_PENDING',
                ratedAt: new Date(Date.parse(date)).toISOString(),
                billToPartyId: Number(bill),
                consignmentId: Number(cons) || null,
                chargeCode: code,
                chargeName: CHARGE_NAMES[code],
                description: `${CHARGE_NAMES[code]} (manual): ${reason.slice(0, 40)}`,
                serviceFrom: date,
                serviceTo: date,
                quantity: qty,
                uom: 'each',
                unitRate: m2(Number(rate)),
                amount: m2(amt),
                taxCode: 'VAT18',
                taxPct: 18,
                taxAmount: m2(amt * 0.18),
                how: ['Manual charge'],
                kind: 'MANUAL',
              });
              onClose();
              setReason('');
            }}
          >
            Request manual charge
          </Button>
        </>
      }
    >
      <div className="stack">
        <Banner tone="wait">Manual charges always need approval by finance before they can go on an invoice.</Banner>
        <div className="form-grid">
          <Field label="Bill to" required>
            <Select
              value={bill}
              onChange={(e) => {
                setBill(e.target.value);
                setCons('');
              }}
              options={parties
                .filter((p) => p.roles.includes('CUSTOMER') || p.roles.includes('SHIPPING_LINE'))
                .map((p) => [String(p.partyId), p.partyName])}
            />
          </Field>
          <Field label="Consignment">
            <Select
              value={cons}
              onChange={(e) => setCons(e.target.value)}
              options={[['', 'None'], ...cs.map((c) => [String(c.consignmentId), c.refNo] as [string, string])]}
            />
          </Field>
          <Field label="Charge" required>
            <Select
              value={code}
              onChange={(e) => setCode(e.target.value)}
              options={['WEIGHING', 'EXAM_HANDLING', 'CFS_HANDLING', 'LIFT_ON_OFF', 'DOC_FEE', 'HAZ_SURCHARGE'].map(
                (c) => [c, CHARGE_NAMES[c]]
              )}
            />
          </Field>
          <Field label="Service date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Quantity" required>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Rate (USD)" required>
            <Input type="number" min={0} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">Amount before VAT 18%</span>
          <Money amount={amt} currency="USD" strong />
        </div>
        <Field label="Reason" required hint="Why the tariff did not rate this automatically">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Extra weighing requested by the agent, ticket WB-DAR1-26-08840"
          />
        </Field>
      </div>
    </Drawer>
  );
}
