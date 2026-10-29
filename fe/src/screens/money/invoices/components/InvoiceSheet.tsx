import { party } from '@/mock/core';
import { COMPANY, TODAY, dLong, dShort, num, releaseValidTo, type Invoice } from '@/mock/money';
import { PrintSheet } from '../../components/shared';
import { fmtDT } from '@/ds/components';

export function InvoiceSheet({ inv, rate }: { inv: Invoice; rate: number }) {
  const p = party(inv.billToPartyId);
  const other = inv.currency === 'USD' ? 'TZS' : 'USD';
  const k = inv.currency === 'USD' ? rate : 1 / rate;
  const f = (n: string | number, cur = inv.currency) =>
    Number(n).toLocaleString('en-US', {
      minimumFractionDigits: cur === 'TZS' ? 0 : 2,
      maximumFractionDigits: cur === 'TZS' ? 0 : 2,
    });
  const title = {
    PROFORMA: 'Proforma invoice',
    TAX_INVOICE: 'Tax invoice',
    CREDIT_NOTE: 'Credit note',
    DEBIT_NOTE: 'Debit note',
  }[inv.docKind];

  return (
    <PrintSheet>
      <div className="hdr">
        <div>
          <h1>{COMPANY.legalName}</h1>
          <div>{COMPANY.address}</div>
          <div>
            {COMPANY.phone} · {COMPANY.email}
          </div>
          <div>
            <b>TIN</b> {COMPANY.tin} · <b>VRN</b> {COMPANY.vrn}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 20 }}>{title}</h1>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{inv.invoiceNo}</div>
          <div>Date {dLong(inv.invoiceDate)}</div>
          {inv.dueDate && <div>Due {dLong(inv.dueDate)}</div>}
          {inv.status === 'DRAFT' && (
            <div style={{ color: 'var(--stop)', fontWeight: 700 }}>DRAFT, not valid for payment</div>
          )}
        </div>
      </div>
      <div className="two">
        <div className="box">
          <div className="lbl">Bill to</div>
          <div style={{ fontWeight: 700 }}>{p?.partyName}</div>
          <div>
            {p?.city}
            {p?.countryCode !== 'TZ' ? `, ${p?.countryCode}` : ''}
          </div>
          <div>
            TIN {p?.taxId ?? '—'} · VRN {p?.vatNo ?? '—'}
          </div>
        </div>
        <div className="box">
          <div className="lbl">Cargo</div>
          <div>B/L {inv.consignmentRef ?? '—'}</div>
          {inv.serviceToDate && <div>Services to {dLong(inv.serviceToDate)}</div>}
          {inv.releaseValidTo && <div>Release valid to {releaseValidTo(inv.releaseValidTo)}</div>}
          <div>
            Currency {inv.currency} · Rate TZS{' '}
            {rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} per USD (
            {dShort(inv.status === 'DRAFT' ? TODAY : inv.exchangeRateDate)})
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Description</th>
            <th>Period</th>
            <th className="num">Qty</th>
            <th className="num">Rate</th>
            <th className="num">VAT</th>
            <th className="num">Amount {inv.currency}</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l) => (
            <tr key={l.lineNo}>
              <td style={{ whiteSpace: 'nowrap' }}>{l.unitNo ?? ''}</td>
              <td>{l.description}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {l.serviceFrom
                  ? l.serviceFrom === l.serviceTo
                    ? dShort(l.serviceFrom)
                    : `${dShort(l.serviceFrom)}–${dShort(l.serviceTo!)}`
                  : ''}
              </td>
              <td className="num">{l.quantity}</td>
              <td className="num">{f(l.unitRate)}</td>
              <td className="num">{num(l.taxRatePct)}%</td>
              <td className="num">{f(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="two">
        <div className="fiscal">
          <div className="mx-qr" aria-hidden />
          <div>
            <div className="lbl">TRA fiscal receipt (VFD)</div>
            {inv.docKind === 'PROFORMA' ? (
              <div>Proforma: not a tax document. A fiscal receipt is issued with the tax invoice.</div>
            ) : inv.fiscalReceipt?.status === 'ISSUED' ? (
              <>
                <div>
                  Receipt no. <b>{inv.fiscalReceipt.receiptNo}</b>
                </div>
                <div>
                  Verification code <b>{inv.fiscalReceipt.verificationCode}</b>
                </div>
                <div>
                  Serial {COMPANY.vfdSerial} · {fmtDT(inv.fiscalReceipt.issuedAt)}
                </div>
              </>
            ) : (
              <div>Fiscal receipt pending. Do not hand over without the verification code.</div>
            )}
          </div>
        </div>
        <table>
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="num">
                {inv.currency} {f(inv.subtotal)}
              </td>
              <td className="num">
                {other} {f(num(inv.subtotal) * k, other)}
              </td>
            </tr>
            <tr>
              <td>VAT</td>
              <td className="num">
                {inv.currency} {f(inv.taxTotal)}
              </td>
              <td className="num">
                {other} {f(num(inv.taxTotal) * k, other)}
              </td>
            </tr>
            <tr>
              <td>
                <b>Total</b>
              </td>
              <td className="num">
                <b>
                  {inv.currency} {f(inv.total)}
                </b>
              </td>
              <td className="num">
                <b>
                  {other} {f(num(inv.total) * k, other)}
                </b>
              </td>
            </tr>
            {inv.docKind !== 'CREDIT_NOTE' && (
              <tr>
                <td>Balance due</td>
                <td className="num">
                  {inv.currency} {f(inv.balance)}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {inv.zeroRated && <div className="xs">Transit services zero-rated for VAT.</div>}
      <div className="foot">
        Pay to {COMPANY.bank}. Quote {inv.invoiceNo} as the reference. Mobile money: M-Pesa, Tigo Pesa and Airtel Money till
        504411. Storage is charged per calendar day from vessel discharge; free days include Sundays and public holidays.
        Release is valid to the paid-through date.
      </div>
    </PrintSheet>
  );
}
