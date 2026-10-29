import { Printer } from 'lucide-react';
import { Button, Modal, fmtDT } from '@/ds/components';
import { partyName } from '@/mock/core';
import { COMPANY, channel, num, type Payment } from '@/mock/money';
import { PrintSheet, fmtAmt } from '../../components/shared';

export function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: Payment | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!receipt}
      onClose={onClose}
      title={`Receipt ${receipt?.receiptNo ?? ''}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
          <Button variant="primary" icon={<Printer />} perm="payment.record" onClick={() => window.print()}>
            Print receipt
          </Button>
        </>
      }
    >
      {receipt && (
        <PrintSheet small>
          <div style={{ textAlign: 'center' }}>
            <div className="strong">{COMPANY.legalName}</div>
            <div className="xs">
              TIN {COMPANY.tin} · VRN {COMPANY.vrn}
            </div>
            <div className="xs">{COMPANY.address}</div>
          </div>
          <div
            style={{
              textAlign: 'center',
              borderTop: '1px dashed var(--ink-3)',
              borderBottom: '1px dashed var(--ink-3)',
              padding: '8px 0',
            }}
          >
            <div className="strong">Payment receipt</div>
            <div>{receipt.receiptNo}</div>
            <div className="xs">
              {fmtDT(receipt.receivedAt)} · Cashier {receipt.cashier}
            </div>
          </div>
          <table>
            <tbody>
              <tr>
                <td>Received from</td>
                <td className="num">{partyName(receipt.partyId)}</td>
              </tr>
              {receipt.payerName && (
                <tr>
                  <td>Paid by</td>
                  <td className="num">{receipt.payerName}</td>
                </tr>
              )}
              <tr>
                <td>Channel</td>
                <td className="num">{channel(receipt.channelCode)?.channelName}</td>
              </tr>
              {receipt.externalRef && (
                <tr>
                  <td>Reference</td>
                  <td className="num">{receipt.externalRef}</td>
                </tr>
              )}
              <tr>
                <td>
                  <b>Amount</b>
                </td>
                <td className="num">
                  <b>{fmtAmt(num(receipt.amount), receipt.currency)}</b>
                </td>
              </tr>
              {receipt.allocations.map((a) => (
                <tr key={a.invoiceId}>
                  <td>Applied to {a.invoiceNo}</td>
                  <td className="num">{fmtAmt(num(a.amount), receipt.currency)}</td>
                </tr>
              ))}
              {num(receipt.unallocated) > 0 && (
                <tr>
                  <td>Kept on account</td>
                  <td className="num">{fmtAmt(num(receipt.unallocated), receipt.currency)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="xs" style={{ textAlign: 'center' }}>
            This is a payment receipt, not a tax invoice. The TRA fiscal receipt is on the tax invoice.
          </div>
        </PrintSheet>
      )}
    </Modal>
  );
}
