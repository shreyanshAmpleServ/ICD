import { useState } from 'react';
import { Landmark, Smartphone } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Money, Segmented, useToast } from '@/ds/components';
import type { Inv } from '@/mock/insight';

export function PayDrawer({
  inv,
  onClose,
  onPaid,
}: {
  inv: Inv | null;
  onClose: () => void;
  onPaid: (i: Inv) => void;
}) {
  const toast = useToast();
  const [method, setMethod] = useState<'MPESA' | 'TIGO' | 'AIRTEL' | 'BANK'>('MPESA');
  const [phone, setPhone] = useState('+255 7');
  if (!inv) return null;
  const mobile = method !== 'BANK';
  const phoneOk = /^\+255\s?[67]\d{2}\s?\d{3}\s?\d{3}$/.test(phone.trim());
  const tzs = Math.round(Number(inv.balance) * 2655);

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Pay ${inv.invoiceNo}`}
      footer={
        mobile ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Smartphone />}
              disabled={!phoneOk}
              perm="portal.request.submit"
              onClick={() => {
                toast(`Payment request sent to ${phone}`);
                onPaid(inv);
              }}
            >
              Send payment request
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              icon={<Landmark />}
              perm="portal.request.submit"
              onClick={() => {
                toast('Transfer noted · we confirm when the bank credits us');
                onPaid(inv);
              }}
            >
              I have paid by bank
            </Button>
          </>
        )
      }
    >
      <div className="stack-lg">
        <div className="row" style={{ alignItems: 'baseline' }}>
          <span className="spacer small muted">Amount to pay</span>
          <span className="big-ref">
            <Money amount={inv.balance} currency={inv.currency} />
          </span>
        </div>
        <Field label="Pay with">
          <Segmented
            label="Payment method"
            value={method}
            onChange={setMethod}
            options={[
              { id: 'MPESA', label: 'M-Pesa' },
              { id: 'TIGO', label: 'Tigo Pesa' },
              { id: 'AIRTEL', label: 'Airtel Money' },
              { id: 'BANK', label: 'Bank' },
            ]}
          />
        </Field>
        {mobile ? (
          <>
            <Field
              label="Phone number to pay from"
              required
              hint="You get a prompt on this phone. Enter your PIN to confirm."
              error={
                phone.length > 6 && !phoneOk
                  ? 'Use a Tanzanian mobile number, e.g. +255 754 123 456'
                  : undefined
              }
            >
              <Input xl inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <div className="pay-box small">
              <div className="strong">No prompt? Pay from the menu instead</div>
              <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>Choose “Pay by business number” (Lipa kwa namba ya biashara).</li>
                <li>
                  Business number <strong>555 222</strong>.
                </li>
                <li>
                  Account (kumbukumbu) <span className="big-ref">{inv.invoiceNo}</span>
                </li>
                <li>Amount TZS {tzs.toLocaleString()} (today’s rate 2,655).</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="stack">
            {[
              ['CRDB Bank', 'NG ICD Ltd · USD account', '0250 2741 990 00'],
              ['NMB Bank', 'NG ICD Ltd · TZS account', '2041 0033 718'],
            ].map(([b, n, a]) => (
              <div key={b} className="pay-box small">
                <div className="strong">{b}</div>
                <div>{n}</div>
                <div className="big-ref">{a}</div>
              </div>
            ))}
            <Banner tone="wait" title={`Use ${inv.invoiceNo} as the payment reference`}>
              Without it we cannot match your transfer and the release waits.
            </Banner>
          </div>
        )}
        <p className="xs faint" style={{ margin: 0 }}>
          When payment is confirmed you get an SMS and a TRA fiscal receipt, and the delivery order is issued if customs
          has released the cargo.
        </p>
      </div>
    </Drawer>
  );
}
