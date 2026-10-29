import { holidays as seedHol } from '@/mock/admin';

type Hol = (typeof seedHol)[number];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MiniMonth({ month, hols }: { month: number; hols: Hol[] }) {
  const first = new Date(Date.UTC(2026, month, 1));
  const days = new Date(Date.UTC(2026, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;

  return (
    <div>
      <div className="xs strong" style={{ marginBottom: 4 }}>
        {MONTHS[month]} 2026
      </div>
      <div className="adm-cal">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="dow">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={'l' + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const ds = `2026-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          const h = hols.find((x) => x.holidayDate === ds);
          const sun = new Date(ds + 'T00:00:00Z').getUTCDay() === 0;
          return (
            <span
              key={i}
              title={h?.holidayName ?? (sun ? 'Sunday' : undefined)}
              className={[h ? 'hol' : sun ? 'sun' : '', ds === '2026-10-08' ? 'today' : ''].join(' ')}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}
