import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Panel, Pill } from '@/ds/components';

export interface QueueItem {
  label: string;
  count: number;
  note: string;
  to: string;
  perm?: string;
  level?: 'VIEW' | 'DO' | 'APPR';
  urgent?: boolean;
}

export interface HomeQueuesPanelProps {
  queues: QueueItem[];
}

export function HomeQueuesPanel({ queues }: HomeQueuesPanelProps) {
  return (
    <Panel flush title="Needs you now">
      <ul className="list-plain">
        {queues.map((q) => (
          <li key={q.label} style={{ padding: 0 }}>
            <Link
              to={q.to}
              className="row"
              style={{
                padding: '14px 16px',
                color: 'inherit',
                textDecoration: 'none',
                gap: 16,
              }}
            >
              <span
                className="unitno unitno-md"
                style={{
                  minWidth: 44,
                  textAlign: 'right',
                  color: q.urgent ? 'var(--stop)' : 'var(--ink)',
                }}
              >
                {q.count}
              </span>
              <span className="spacer">
                <span className="strong" style={{ display: 'block' }}>
                  {q.label}
                </span>
                <span className="small muted">{q.note}</span>
              </span>
              {q.urgent && <Pill tone="stop">Urgent</Pill>}
              <ChevronRight size={18} color="var(--ink-3)" />
            </Link>
          </li>
        ))}
      </ul>
      {queues.length === 0 && (
        <p className="muted" style={{ padding: 16 }}>
          Your queues are clear. New work appears here as it arrives.
        </p>
      )}
    </Panel>
  );
}
