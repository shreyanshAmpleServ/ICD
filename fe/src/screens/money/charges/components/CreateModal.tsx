import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banner, Button, Field, Modal, Money, Segmented } from '@/ds/components';
import { party } from '@/mock/core';
import { TODAY, fx, num } from '@/mock/money';
import { fmtAmt } from '../../components/shared';
import { type Row } from './WaiveDrawer';

export function CreateModal({
  kind,
  onClose,
  rows,
  partyId,
  onDone,
}: {
  kind: null | 'PROFORMA' | 'TAX_INVOICE';
  onClose: () => void;
  rows: Row[];
  partyId?: number;
  onDone: (no: string, kind: string) => void;
}) {
  const [cur, setCur] = useState<'USD' | 'TZS'>('USD');
  const p = party(partyId);
  const rate = fx(TODAY);
  const sub = rows.reduce((a, r) => a + num(r.amount), 0),
    tax = rows.reduce((a, r) => a + num(r.taxAmount), 0);
  const k = cur === 'TZS' ? rate : 1;
  const zero = rows.some((r) => r.taxCode === 'VAT0');

  return (
    <Modal
      open={!!kind}
      onClose={onClose}
      title={kind === 'PROFORMA' ? 'Create proforma' : 'Create invoice'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            perm="billing.invoice.create"
            onClick={() =>
              onDone(kind === 'PROFORMA' ? 'PRO-DAR1-26-002063' : 'INV-DAR1-26-003321', kind!)
            }
          >
            {kind === 'PROFORMA' ? 'Create proforma' : 'Create draft invoice'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="small">
          {rows.length} charges for <b>{p?.partyName}</b>.
          {kind === 'TAX_INVOICE'
            ? ' The invoice is created as a draft; posting it fiscalises it with TRA and sends it to the NG ledger.'
            : ' A proforma is not a tax document. Once paid, convert it to a tax invoice.'}
        </p>
        <Field label="Invoice currency">
          <Segmented
            value={cur}
            onChange={setCur}
            options={[
              { id: 'USD', label: 'USD' },
              { id: 'TZS', label: 'TZS' },
            ]}
          />
        </Field>
        <p className="xs muted">
          Exchange rate today: TZS {rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} per USD. It is frozen on
          the document when it is posted.
        </p>
        {p?.creditStatus === 'CREDIT' && kind === 'TAX_INVOICE' && (
          <p className="xs muted">
            Due in 30 days (credit terms). Credit limit {fmtAmt(num(p.creditLimit))}.
          </p>
        )}
        {zero && (
          <Banner tone="wait" title="Includes zero-rated transit lines">
            Transit services are zero-rated under the transit tariff. Verify with tax adviser.
          </Banner>
        )}
        <div className="mx-totals">
          <dt>Subtotal</dt>
          <dd>
            <Money amount={sub * k} currency={cur} />
          </dd>
          <dt>VAT</dt>
          <dd>
            <Money amount={tax * k} currency={cur} />
          </dd>
          <dt className="grand">Total</dt>
          <dd className="grand">
            <Money amount={(sub + tax) * k} currency={cur} strong />
          </dd>
        </div>
        <Link to="/invoices/new" className="xs">
          Need a pay-through date for release? Use the full invoice flow
        </Link>
      </div>
    </Modal>
  );
}
