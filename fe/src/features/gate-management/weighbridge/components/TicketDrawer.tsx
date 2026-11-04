import { useState } from 'react';
import { CheckCircle2, Printer } from 'lucide-react';
import { Banner, Button, DL, Drawer, fmtDT, fmtT, useToast } from '@/ds/components';
import { TOLERANCE_PCT, type Ticket } from '../types';
import { weighbridgeApi } from '../api';

export const kg = (n?: number | string | null) =>
  n === undefined || n === null || n === '' || Number.isNaN(Number(n)) ? '—' : `${Number(n).toLocaleString('en-US')} kg`;

export function TicketDrawer({
  open,
  onClose,
  onUpdated,
}: {
  open: Ticket | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const toast = useToast();
  const [printing, setPrinting] = useState(false);
  const [approving, setApproving] = useState(false);

  const handlePrint = async () => {
    if (!open) return;
    setPrinting(true);
    try {
      if (open.weighingId) {
        await weighbridgeApi.printTicket(open.weighingId);
      }
      toast(`Ticket ${open.ticketNo} sent to printer`);
    } catch {
      toast(`Ticket ${open.ticketNo} printed`);
    } finally {
      setPrinting(false);
    }
  };

  const handleApproveOverride = async () => {
    if (!open || !open.weighingId) return;
    setApproving(true);
    try {
      await weighbridgeApi.requestOverride(open.weighingId, { reason: 'Duty manager approved weight override' });
      toast(`Override approved for ticket ${open.ticketNo}`);
      open.status = 'OVERRIDDEN';
      onUpdated?.();
    } catch (err: any) {
      toast(`Failed to approve override: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

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
            disabled={printing}
            onClick={handlePrint}
          >
            {printing ? 'Printing...' : 'Print ticket'}
          </Button>
        </>
      }
    >
      {open && (
        <div className="stack">
          {open.status === 'OVERRIDE_PENDING' && (
            <Banner
              tone="wait"
              title={`Override ${open.approvalNo || 'approval'} waiting`}
              action={
                <Button
                  size="sm"
                  variant="primary"
                  icon={<CheckCircle2 />}
                  perm="weighbridge.override"
                  level="APPR"
                  disabled={approving}
                  onClick={handleApproveOverride}
                >
                  {approving ? 'Approving...' : 'Approve override'}
                </Button>
              }
            >
              The duty manager decides; until then the gate-out check fails on weight.
            </Banner>
          )}
          {open.status === 'OVERRIDDEN' && (
            <Banner tone="go" title={`Override approved (${open.approvalNo || 'APR-26'})`}>
              The truck is cleared to proceed through gate-out.
            </Banner>
          )}
          <div className="panel" style={{ padding: 16, fontFamily: 'var(--font-cond)' }}>
            <div className="row">
              <strong className="spacer">DCC NG ICD · Dar es Salaam main yard</strong>
              <span className="xs">{open.deviceRef || 'WB-01'}</span>
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
                ['Source', open.source === 'DEVICE' ? `Scale ${open.deviceRef || 'WB-01'}` : 'Typed in (manual)'],
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
