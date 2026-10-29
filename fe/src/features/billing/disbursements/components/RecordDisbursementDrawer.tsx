import { useState } from 'react';
import { CheckCircle2, Paperclip, Plus } from 'lucide-react';
import { Button, Drawer, Field, Input, Segmented, Select } from '@/ds/components';
import { consignment, consignments, partyName } from '@/mock/core';
import { CHARGE_NAMES, TODAY, m2, type Disb } from '@/mock/money';

export type DisbRow = Disb & { pending?: boolean };

export interface RecordDisbursementDrawerProps {
  open: boolean;
  onClose: () => void;
  onDone: (d: DisbRow) => void;
}

export function RecordDisbursementDrawer({ open, onClose, onDone }: RecordDisbursementDrawerProps) {
  const [cons, setCons] = useState('101');
  const [code, setCode] = useState('DISB_PORT');
  const [payee, setPayee] = useState('Port authority, Dar es Salaam port');
  const [cur, setCur] = useState<'USD' | 'TZS'>('USD');
  const [amt, setAmt] = useState('');
  const [rct, setRct] = useState('');
  const [mode, setMode] = useState<'AT_COST' | 'COST_PLUS_FEE'>('COST_PLUS_FEE');
  const [fee, setFee] = useState('15');
  const [file, setFile] = useState(false);
  const c = consignment(Number(cons));
  const ok = Number(amt) > 0 && rct.trim() && file;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record a disbursement"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Plus />}
            perm="finance.disbursement.record"
            disabled={!ok}
            onClick={() => {
              onDone({
                disbursementId: 190,
                disbNo: 'DSB-DAR1-26-0190',
                consignmentId: Number(cons),
                billToPartyId: c?.billToPartyId ?? 2,
                payeeName: payee,
                chargeCode: code,
                description: CHARGE_NAMES[code].replace(' (paid on your behalf)', ''),
                currency: cur,
                amountPaid: m2(Number(amt)),
                paidAt: TODAY,
                payeeReceiptNo: rct,
                rebillMode: mode,
                handlingFee: m2(mode === 'AT_COST' ? 0 : Number(fee)),
                status: 'RECORDED',
                recordedBy: 'Neema Mushi',
              });
              onClose();
              setAmt('');
              setRct('');
              setFile(false);
            }}
          >
            Record disbursement
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Consignment" required hint={c ? `Billed to ${partyName(c.billToPartyId)}` : undefined}>
            <Select
              value={cons}
              onChange={(e) => setCons(e.target.value)}
              options={consignments.map((x) => [String(x.consignmentId), x.refNo])}
            />
          </Field>
          <Field label="What was paid" required>
            <Select
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setPayee(
                  e.target.value === 'DISB_DUTY'
                    ? 'TRA customs (duty and taxes)'
                    : e.target.value === 'DISB_LINE'
                    ? partyName(consignment(Number(cons))?.shippingLinePartyId)
                    : 'Port authority, Dar es Salaam port'
                );
              }}
              options={['DISB_PORT', 'DISB_LINE', 'DISB_DUTY'].map((x) => [
                x,
                CHARGE_NAMES[x].replace(' (paid on your behalf)', ''),
              ])}
            />
          </Field>
          <Field label="Paid to" required>
            <Input value={payee} onChange={(e) => setPayee(e.target.value)} />
          </Field>
          <Field label="Currency">
            <Segmented
              value={cur}
              onChange={setCur}
              options={[
                { id: 'USD', label: 'USD' },
                { id: 'TZS', label: 'TZS' },
              ]}
            />
          </Field>
          <Field label={`Amount paid (${cur})`} required>
            <Input type="number" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} />
          </Field>
          <Field label="Payee receipt no." required>
            <Input
              value={rct}
              onChange={(e) => setRct(e.target.value.toUpperCase())}
              placeholder="PA-DSM-26-…"
            />
          </Field>
        </div>
        <Field label="Payee's receipt" required>
          <Button icon={file ? <CheckCircle2 /> : <Paperclip />} onClick={() => setFile(!file)}>
            {file ? 'receipt-scan.pdf attached' : 'Attach scanned receipt'}
          </Button>
        </Field>
        <Field label="Re-bill as">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { id: 'AT_COST', label: 'At cost' },
              { id: 'COST_PLUS_FEE', label: 'Cost plus handling fee' },
            ]}
          />
        </Field>
        {mode === 'COST_PLUS_FEE' && (
          <Field label={`Handling fee (${cur})`} hint="Separate line on the invoice, VAT 18%">
            <Input
              type="number"
              min={0}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              style={{ maxWidth: 160 }}
            />
          </Field>
        )}
        <p className="xs muted">
          It goes on the customer's next invoice for this consignment. It can be billed only once.
        </p>
      </div>
    </Drawer>
  );
}
