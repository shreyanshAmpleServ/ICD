import { type ReactNode } from 'react';

export interface PartyCellProps {
  name: ReactNode;
  sub?: ReactNode;
  role?: string;
}

/** Formatted Party cell (Consignee, Transporter, Line, Agent) */
export function PartyCell({
  name,
  sub,
  role
}: PartyCellProps) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      <div className="small strong">{name}</div>
      {(sub || role) && (
        <div className="xs faint">
          {role ? <span className="tag" style={{ marginRight: 4 }}>{role}</span> : null}
          {sub}
        </div>
      )}
    </div>
  );
}
