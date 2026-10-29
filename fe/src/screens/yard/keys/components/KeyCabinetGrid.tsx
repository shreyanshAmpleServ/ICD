import { KeyRound } from 'lucide-react';
import { Panel, cx } from '@/ds/components';
import type { Tone } from '@/ds/status';
import { KEY_HOOKS, type Key } from '@/mock/ops';

export const STATUS: Record<string, [string, Tone]> = {
  IN_CABINET: ['In cabinet', 'go'],
  ISSUED: ['Issued', 'wait'],
  HANDED_OVER: ['Handed over', 'idle'],
  LOST: ['Lost', 'stop'],
};

export interface KeyCabinetGridProps {
  byHook: Map<number, Key>;
  match: (k: Key) => boolean;
  onSelectKey: (id: number) => void;
}

export function KeyCabinetGrid({ byHook, match, onSelectKey }: KeyCabinetGridProps) {
  return (
    <Panel title="Cabinet KC1" sub="One hook per vehicle. Select a hook to issue or return its key.">
      <div className="key-grid">
        {Array.from({ length: KEY_HOOKS }, (_, i) => {
          const k = byHook.get(i + 1);
          if (!k) {
            return (
              <div key={i} className="key-hook key-empty">
                <span className="xs faint">Hook {i + 1}</span>
                <span className="xs faint">free</span>
              </div>
            );
          }
          const [label, tone] = STATUS[k.status!];
          return (
            <button
              key={i}
              className={cx('key-hook', `key-${tone}`, !match(k) && 'key-dim')}
              onClick={() => onSelectKey(k.keyCustodyId!)}
              aria-label={`Hook ${i + 1}, ${k.keyTagNo}, ${k.make} ${k.model}, ${label}`}
            >
              <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
                <span className="xs faint">Hook {i + 1}</span>
                <KeyRound size={14} />
              </span>
              <span className="strong" style={{ fontFamily: 'var(--font-cond)', fontSize: 16 }}>
                {k.keyTagNo}
              </span>
              <span className="xs">
                {k.vin.slice(-6)} · {k.model}
              </span>
              <span className="xs strong">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="legend" style={{ marginTop: 12 }}>
        <span>
          <i style={{ background: 'var(--go-soft)', border: '1px solid var(--go)' }} />
          In cabinet
        </span>
        <span>
          <i style={{ background: 'var(--wait-soft)', border: '1px solid var(--wait)' }} />
          Issued
        </span>
        <span>
          <i style={{ background: 'var(--stop-soft)', border: '1px solid var(--stop)' }} />
          Lost
        </span>
        <span>
          <i style={{ background: 'var(--paper)', border: '1px dashed var(--ink-3)' }} />
          Free hook
        </span>
      </div>
    </Panel>
  );
}
