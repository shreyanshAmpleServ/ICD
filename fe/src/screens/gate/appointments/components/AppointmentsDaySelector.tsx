import type { Appt } from '@/mock/ops';

interface AppointmentsDaySelectorProps {
  days: string[];
  date: string;
  all: Appt[];
  live: (a: Appt) => boolean;
  weekday: (d: string) => number;
  dayLabel: (d: string) => string;
  today: string;
  onSelectDate: (d: string) => void;
}

export function AppointmentsDaySelector({
  days,
  date,
  all,
  live,
  weekday,
  dayLabel,
  today,
  onSelectDate,
}: AppointmentsDaySelectorProps) {
  return (
    <div className="chipset" role="group" aria-label="Day">
      {days.map((d) => {
        const closed = weekday(d) === 0;
        const n = all.filter((a) => a.date === d && live(a)).length;
        return (
          <button
            key={d}
            className="chip"
            aria-pressed={d === date}
            onClick={() => onSelectDate(d)}
            style={{ height: 40, borderRadius: 8 }}
          >
            {d === today ? 'Today' : dayLabel(d)}
            <span className="count">{closed ? 'closed' : n}</span>
          </button>
        );
      })}
    </div>
  );
}
