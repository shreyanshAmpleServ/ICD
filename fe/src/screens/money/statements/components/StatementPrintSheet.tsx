import { Button, fmtD } from '@/ds/components';
import { Printer } from 'lucide-react';
import { party } from '@/mock/core';
import { COMPANY, TODAY, dLong } from '@/mock/money';
import { PrintSheet } from '../../components/shared';
import type { Statement } from '../api';

type Party = NonNullable<ReturnType<typeof party>>;

export interface StatementPrintSheetProps {
  p: Party;
  s: Statement;
  from: string;
}

export function StatementPrintSheet({ p, s, from }: StatementPrintSheetProps) {
  return (
    <>
      <div className="row-wrap">
        <Button variant="primary" icon={<Printer />} perm="billing.invoice.view" onClick={() => window.print()}>
          Print
        </Button>
        <span className="xs muted">Prints the sheet only, on A4.</span>
      </div>
      <PrintSheet>
        <div className="hdr">
          <div>
            <h1>{COMPANY.legalName}</h1>
            <div>{COMPANY.address}</div>
            <div>
              <b>TIN</b> {COMPANY.tin} · <b>VRN</b> {COMPANY.vrn}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: 20 }}>Statement of account</h1>
            <div>
              {dLong(from)} to {dLong(TODAY)}
            </div>
            <div>Currency USD</div>
          </div>
        </div>
        <div className="box">
          <div className="lbl">Customer</div>
          <b>{p.partyName}</b> · {p.partyCode}
          {p.taxId ? ` · TIN ${p.taxId}` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Document</th>
              <th>Reference</th>
              <th className="num">Debit</th>
              <th className="num">Credit</th>
              <th className="num">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{dLong(from)}</td>
              <td colSpan={4}>Opening balance</td>
              <td className="num">{s.openingBalance.toFixed(2)}</td>
            </tr>
            {s.lines.map((l: any) => (
              <tr key={l.docNo}>
                <td>{fmtD(l.date)}</td>
                <td>
                  {l.docKind} {l.docNo}
                </td>
                <td>{l.reference}</td>
                <td className="num">{l.debit ? l.debit.toFixed(2) : ''}</td>
                <td className="num">{l.credit ? l.credit.toFixed(2) : ''}</td>
                <td className="num">{l.balance.toFixed(2)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5}>
                <b>Closing balance</b>
              </td>
              <td className="num">
                <b>{s.closingBalance.toFixed(2)}</b>
              </td>
            </tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th className="num">Current</th>
              <th className="num">1–30</th>
              <th className="num">31–60</th>
              <th className="num">61–90</th>
              <th className="num">Over 90</th>
              <th className="num">Total due</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[s.ageing.current, s.ageing.d1_30, s.ageing.d31_60, s.ageing.d61_90, s.ageing.over90, s.outstanding].map(
                (v, i) => (
                  <td key={i} className="num">
                    {v.toFixed(2)}
                  </td>
                )
              )}
            </tr>
          </tbody>
        </table>
        <div className="foot">
          Pay to {COMPANY.bank}. Please quote the invoice numbers. Questions: {COMPANY.email}, {COMPANY.phone}.
        </div>
      </PrintSheet>
    </>
  );
}
