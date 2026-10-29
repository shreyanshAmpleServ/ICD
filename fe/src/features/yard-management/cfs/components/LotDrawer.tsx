import { useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { Button, Drawer, Field, Input, Kpi, Timeline, useToast } from '@/ds/components';
import type { Lot } from '@/mock/ops';

export interface LotDrawerProps {
  lot: Lot | null;
  onClose: () => void;
}

export function LotDrawer({ lot, onClose }: LotDrawerProps) {
  const toast = useToast();
  const [qty, setQty] = useState('');
  const [ro, setRo] = useState('');
  if (!lot) return null;
  const bal = Number(lot.qtyBalance);
  const q = Number(qty);
  const err = qty && (q <= 0 || q > bal) ? `Between 1 and ${bal}` : undefined;

  return (
    <Drawer
      open
      onClose={() => {
        setQty('');
        onClose();
      }}
      title={`Lot ${lot.unitNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            icon={<PackageCheck />}
            perm="cfs.job.manage"
            disabled={!q || !!err || !/^RO-/.test(ro.toUpperCase())}
            onClick={() => {
              toast(`${q} ${lot.packageType?.toLowerCase()}s delivered; ${bal - q} left in the shed`);
              setQty('');
              onClose();
            }}
          >
            Record delivery
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="small muted">
          {lot.description} · {lot.consignmentRef} · {lot.location}
        </p>
        <div className="kpi-strip">
          <Kpi label="Received" value={lot.qtyReceived} />
          <Kpi label="Delivered" value={lot.qtyDelivered} />
          <Kpi label="Balance" value={lot.qtyBalance} />
        </div>
        <h3>Deliveries</h3>
        {lot.deliveries.length ? (
          <Timeline
            items={lot.deliveries.map((d) => ({
              at: d.at,
              title: `${d.qty} ${lot.packageType?.toLowerCase()}s on ${d.plateNo}`,
              detail: d.ref,
              tone: 'go' as const,
            }))}
          />
        ) : (
          <p className="small muted">Nothing delivered yet.</p>
        )}
        {bal > 0 && (
          <>
            <h3>Deliver part of the lot</h3>
            <div className="form-grid">
              <Field label="Quantity" required error={err} hint={`Up to ${bal}`}>
                <Input
                  value={qty}
                  inputMode="numeric"
                  onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
              <Field label="Release order" required>
                <Input value={ro} onChange={(e) => setRo(e.target.value)} placeholder="RO-DAR1-26-…" />
              </Field>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
