import { Sparkles, Zap } from 'lucide-react';
import { Button, DataTable, Panel, Pill, fmtD, fmtDT } from '@/ds/components';
import { models as seedModels } from '@/mock/admin';

type Model = (typeof seedModels)[number];
const NAME: Record<string, [string, string]> = {
  YARD_ALLOC: ['Yard slot suggestions', 'Ranks free slots for a unit so the planner picks one of the top three'],
  DWELL: ['Dwell prediction', 'Predicts when a unit will leave (median and 90th percentile)'],
  OCCUPANCY: ['Occupancy forecast', 'Forecasts yard fill per block for the next 14 days'],
};
const METRIC: Record<string, (v: number) => string> = {
  top3Acceptance: (v) => `${Math.round(v * 100)}% top-3 accepted`,
  rehandlesPerMove: (v) => `${v} rehandles per move`,
  maeDays: (v) => `± ${v} days average error`,
  p90Coverage: (v) => `${Math.round(v * 100)}% inside the 90% range`,
  mapePct: (v) => `${v}% average error`,
  horizonDays: (v) => `${v}-day horizon`,
  holdout: (v) => `${v.toLocaleString()} held-out cases`,
};

export function ModelCard({
  code,
  models,
  phase,
  onActivate,
}: {
  code: string;
  models: Model[];
  phase: number;
  onActivate: (m: Model) => void;
}) {
  const vs = models.filter((m) => m.modelCode === code);
  const active = vs.find((m) => m.isActive);

  return (
    <Panel
      flush
      title={
        <h2 className="row">
          <Sparkles size={16} />
          {NAME[code][0]}
        </h2>
      }
      sub={NAME[code][1]}
    >
      <DataTable
        rows={vs}
        rowKey={(m) => m.mlModelVersionId}
        cols={[
          { key: 'v', header: 'Version', render: (m) => <span className="adm-cond strong">{m.versionLabel}</span> },
          { key: 't', header: 'Trained', render: (m) => <span className="small">{fmtDT(m.trainedAt)}</span> },
          {
            key: 'w',
            header: 'Trained on',
            render: (m) => (
              <span className="small">
                {fmtD(m.from)} – {fmtD(m.to)}
              </span>
            ),
          },
          { key: 'm', header: 'How good', render: (m) => <span className="small">{m.summary}</span> },
          {
            key: 'x',
            header: 'Metrics',
            render: (m) => (
              <span className="row-wrap">
                {Object.entries(m.metrics ?? {}).map(([k, v]) => (
                  <span key={k} className="tag">
                    {METRIC[k]?.(Number(v)) ?? `${k} ${v}`}
                  </span>
                ))}
              </span>
            ),
          },
          {
            key: 'a',
            header: '',
            render: (m) =>
              m.isActive ? (
                <Pill tone="go">Active</Pill>
              ) : (
                <Button
                  size="sm"
                  icon={<Zap />}
                  perm="admin.config.manage"
                  disabled={phase !== 2}
                  onClick={() => onActivate(m)}
                >
                  Activate
                </Button>
              ),
          },
        ]}
      />
      {active && (
        <div style={{ padding: '8px 16px' }} className="xs faint">
          Active since {fmtD(active.trainedAt)}. Older versions stay for comparison and roll-back.
        </div>
      )}
    </Panel>
  );
}
