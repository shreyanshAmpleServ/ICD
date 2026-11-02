import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button, Field, Input } from '@/ds/components';
import { ME, m2, type Shift } from '@/mock/money';
import { cashierApi } from '../api';

export function OpenShiftPanel({ onOpen }: { onOpen: (s: Shift[]) => void }) {
  const [usd, setUsd] = useState('200');
  const [tzs, setTzs] = useState('300000');
  const [opening, setOpening] = useState(false);

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
        disabled={opening}
        onClick={async () => {
          setOpening(true);
          const usdVal = Number(usd) || 0;
          const tzsVal = Number(tzs) || 0;
          let newShifts: Shift[] = [
            {
              cashierShiftId: 990,
              cashier: ME,
              currency: 'USD',
              status: 'OPEN',
              openingFloat: m2(usdVal),
              expectedCash: m2(usdVal),
              receiptsCount: 0,
              nonCash: '0',
              openedAt: new Date().toISOString(),
            },
            {
              cashierShiftId: 991,
              cashier: ME,
              currency: 'TZS',
              status: 'OPEN',
              openingFloat: m2(tzsVal),
              expectedCash: m2(tzsVal),
              receiptsCount: 0,
              nonCash: '0',
              openedAt: new Date().toISOString(),
            },
          ];

          try {
            const res = await cashierApi.openShift({
              usdFloat: usdVal,
              tzsFloat: tzsVal,
              openingFloatUSD: usdVal,
              openingFloatTZS: tzsVal,
            });
            if (res?.shifts && Array.isArray(res.shifts) && res.shifts.length > 0) {
              newShifts = res.shifts;
            }
          } catch (e) {
            console.warn('API openShift warning:', e);
          } finally {
            setOpening(false);
            onOpen(newShifts);
          }
        }}
      >
        {opening ? 'Opening shift...' : 'Open shift'}
      </Button>
    </div>
  );
}
