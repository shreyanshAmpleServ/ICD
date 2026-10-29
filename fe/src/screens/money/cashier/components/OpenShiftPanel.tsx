import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button, Field, Input } from '@/ds/components';
import { ME, m2, type Shift } from '@/mock/money';

export function OpenShiftPanel({ onOpen }: { onOpen: (s: Shift[]) => void }) {
  const [usd, setUsd] = useState('200');
  const [tzs, setTzs] = useState('300000');

  return (
    <div className="stack">
      <p className="small muted">Count the float in each drawer before the first customer.</p>
      <Field label="Opening float USD">
        <Input type="number" min={0} value={usd} onChange={(e) => setUsd(e.target.value)} />
      </Field>
      <Field label="Opening float TZS">
        <Input type="number" min={0} value={tzs} onChange={(e) => setTzs(e.target.value)} />
      </Field>
      <Button
        variant="primary"
        icon={<Wallet />}
        perm="payment.record"
        onClick={() =>
          onOpen([
            {
              cashierShiftId: 990,
              cashier: ME,
              currency: 'USD',
              status: 'OPEN',
              openingFloat: m2(Number(usd)),
              expectedCash: m2(Number(usd)),
              receiptsCount: 0,
              nonCash: '0',
              openedAt: '2026-10-07T07:30:00Z',
            },
            {
              cashierShiftId: 991,
              cashier: ME,
              currency: 'TZS',
              status: 'OPEN',
              openingFloat: m2(Number(tzs)),
              expectedCash: m2(Number(tzs)),
              receiptsCount: 0,
              nonCash: '0',
              openedAt: '2026-10-07T07:30:00Z',
            },
          ])
        }
      >
        Open shift
      </Button>
    </div>
  );
}
