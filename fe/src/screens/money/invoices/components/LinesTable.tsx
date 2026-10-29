import { Money, UnitNo } from '@/ds/components';
import { TAX, dShort, type Invoice } from '@/mock/money';
import { qtyU } from '../../components/shared';

export function LinesTable({ inv, rateCol }: { inv: Invoice; rateCol: boolean }) {
  return (
    <div className="table-wrap">
      <table className="dt">
        <thead>
          <tr>
            <th>#</th>
            <th>Unit</th>
            <th>Charge</th>
            <th>Service period</th>
            <th className="num">Qty</th>
            {rateCol && <th className="num">Rate</th>}
            <th className="num">VAT</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l) => (
            <tr key={l.lineNo}>
              <td className="xs faint">{l.lineNo}</td>
              <td>{l.unitNo ? <UnitNo no={l.unitNo} /> : <span className="faint">—</span>}</td>
              <td>
                <span className="strong small">{l.description}</span>
                <div className="xs faint">
                  {l.chargeCode} · {TAX[l.taxCode]?.name ?? l.taxCode}
                </div>
              </td>
              <td className="small nowrap">
                {l.serviceFrom
                  ? l.serviceFrom === l.serviceTo
                    ? dShort(l.serviceFrom)
                    : `${dShort(l.serviceFrom)} – ${dShort(l.serviceTo!)}`
                  : '—'}
              </td>
              <td className="num small">{qtyU(l.quantity, l.uom)}</td>
              {rateCol && (
                <td className="num">
                  <Money amount={l.unitRate} />
                </td>
              )}
              <td className="num">
                <Money amount={l.taxAmount} />
              </td>
              <td className="num">
                <Money amount={l.lineTotal} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
