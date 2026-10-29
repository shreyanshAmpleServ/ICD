import { Printer } from 'lucide-react';
import { Banner, Button, DL, Drawer, fmtDT, fmtT, useToast } from '@/ds/components';
import { TOLERANCE_PCT, type Ticket } from '../types';

export const kg = (n?: number | string | null) =>
  n === undefined || n === null || n === '' || Number.isNaN(Number(n)) ? '—' : `${Number(n).toLocaleString('en-US')} kg`;

export function TicketDrawer({
  open,
  onClose,
}: {
  open: Ticket | null;
  onClose: () => void;
}) {
  const toast = useToast();

  return (
    <Drawer
      open={!!open}
      onClose={onClose}
      title={open ? `Weight ticket ${open.ticketNo}` : ''}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            icon={<Printer />}
            perm="weighbridge.ticket"
            onClick={() => {
              toast(`Ticket ${open?.ticketNo} printed`);
            }}
          >
            Print ticket
          </Button>
        </>
      }
    >
      {open && (
        <div className="stack">
          {open.status === 'OVERRIDE_PENDING' && (
            <Banner tone="wait" title={`Override ${open.approvalNo} waiting`}>
              The duty manager decides; until then the gate-out check fails on weight.
            </Banner>
          )}
          <div className="panel" style={{ padding: 16, fontFamily: 'var(--font-cond)' }}>
            <div className="row">
              <strong className="spacer">DCC NG ICD · Dar es Salaam main yard</strong>
              <span className="xs">WB-01</span>
            </div>
            <div className="divider" style={{ margin: '8px 0', borderTop: '1px dashed var(--steel)' }} />
            <DL
              items={[
                ['Ticket', open.ticketNo],
                ['Date and time', `${fmtDT(open.weighedAt)} (${fmtT(open.weighedAt)})`],
                ['Kind', open.weighKind],
                ['Truck', open.plateNo],
                ['Unit', open.unitNo ?? '—'],
                ['Gross', kg(open.grossKg)],
                ['Tare', kg(open.tareKg)],
                ...(open.containerTareKg ? ([['Container tare', kg(open.containerTareKg)]] as [string, string][]) : []),
                ['Net', <strong key="n">{kg(open.netKg)}</strong>],
                ['Declared', kg(open.declaredKg)],
                ['Variance', open.variancePct ? `${open.variancePct}% (±${TOLERANCE_PCT}%)` : '—'],
                ['Source', open.source === 'DEVICE' ? 'Scale WB-01' : 'Typed in (manual)'],
                ['Weighed by', open.operator],
              ]}
            />
            <div className="sig" style={{ marginTop: 12, height: 56 }}>
              Driver signature
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
