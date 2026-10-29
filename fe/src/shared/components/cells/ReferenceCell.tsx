import { type ReactNode } from 'react';

export interface ReferenceCellProps {
  refNo: ReactNode;
  sub?: ReactNode;
  category?: ReactNode;
  to?: string;
}

/** Formatted reference cell (BL, Container, Invoice, Ticket, Order) */
export function ReferenceCell({
  refNo,
  sub,
  category,
  to
}: ReferenceCellProps) {
  const content = (
    <div className="stack" style={{ gap: 2 }}>
      <div className="row" style={{ gap: 6 }}>
        <span className="unitno unitno-sm">{refNo}</span>
        {category && <span className="tag">{category}</span>}
      </div>
      {sub && <div className="xs faint">{sub}</div>}
    </div>
  );

  if (to) {
    return <a href={to} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</a>;
  }
  return content;
}
