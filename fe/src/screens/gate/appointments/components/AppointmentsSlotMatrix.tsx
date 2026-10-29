import { X } from 'lucide-react';
import { Button, Meter, Panel, cx } from '@/ds/components';
import { APPT_TYPES, HOURS } from '@/mock/ops';
import { VISIT_TYPES } from '@/screens/gate/types';
import type { SlotSelection } from '../types';

interface AppointmentsSlotMatrixProps {
  date: string;
  dayLabel: (d: string) => string;
  slot: SlotSelection | null;
  onToggleSlot: (slot: SlotSelection | null) => void;
  cap: (t: string, h: number) => number;
  booked: (t: string, h: number) => number;
  hh: (h: number) => string;
}

export function AppointmentsSlotMatrix({
  date,
  dayLabel,
  slot,
  onToggleSlot,
  cap,
  booked,
  hh,
}: AppointmentsSlotMatrixProps) {
  return (
    <Panel
      title={`Slots on ${dayLabel(date)}`}
      sub="Booked / capacity per hour. Select a slot to see its bookings."
      flush
      actions={
        slot && (
          <Button size="sm" variant="ghost" icon={<X />} onClick={() => onToggleSlot(null)}>
            Show all slots
          </Button>
        )
      }
    >
      <div className="table-wrap">
        <table className="dt" style={{ minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{ width: 150 }}>Visit type</th>
              {HOURS.map((h) => (
                <th key={h} style={{ textAlign: 'center' }}>
                  {hh(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APPT_TYPES.map((t) => (
              <tr key={t}>
                <td className="strong small">{VISIT_TYPES[t]}</td>
                {HOURS.map((h) => {
                  const c = cap(t, h);
                  const b = booked(t, h);
                  const sel = slot?.t === t && slot.h === h;
                  if (!c) {
                    return (
                      <td key={h} className="xs faint" style={{ textAlign: 'center' }}>
                        closed
                      </td>
                    );
                  }
                  return (
                    <td key={h} style={{ padding: 4 }}>
                      <button
                        onClick={() => onToggleSlot(sel ? null : { t, h })}
                        aria-pressed={sel}
                        aria-label={`${VISIT_TYPES[t]} ${hh(h)}: ${b} of ${c} booked`}
                        className={cx('btn', 'btn-sm')}
                        style={{
                          width: '100%',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          gap: 4,
                          height: 'auto',
                          padding: '6px 8px',
                          borderColor: sel ? 'var(--ink)' : undefined,
                          borderWidth: sel ? 2 : 1,
                        }}
                      >
                        <span
                          className="small"
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            color: b >= c ? 'var(--stop)' : undefined,
                          }}
                        >
                          {b}/{c}
                          {b >= c && <span className="xs"> full</span>}
                        </span>
                        <Meter pct={(b / c) * 100} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
