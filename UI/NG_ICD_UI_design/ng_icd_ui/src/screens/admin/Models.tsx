import { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { Banner, Button, DL, DataTable, Panel, Pill, fmtD, fmtDT, useToast } from '@/ds/components';
import { useSession } from '@/app/session';
import { models as seedModels } from '@/mock/admin';
import { AuditNote, EditDrawer, SetupPage, useEditable } from './AdminKit';

/* Prediction models (M6): /ml/models, POST /ml/models/{id}/activate.
   One active version per model. Predictions are advice only: no billing,
   release or gate decision reads them. */
type Model = (typeof seedModels)[number];
const NAME: Record<string, [string, string]> = {
  YARD_ALLOC: ['Yard slot suggestions', 'Ranks free slots for a unit so the planner picks one of the top three'],
  DWELL: ['Dwell prediction', 'Predicts when a unit will leave (median and 90th percentile)'],
  OCCUPANCY: ['Occupancy forecast', 'Forecasts yard fill per block for the next 14 days'],
};
const METRIC: Record<string, (v: number) => string> = {
  top3Acceptance: (v) => `${Math.round(v * 100)}% top-3 accepted`, rehandlesPerMove: (v) => `${v} rehandles per move`,
  maeDays: (v) => `± ${v} days average error`, p90Coverage: (v) => `${Math.round(v * 100)}% inside the 90% range`,
  mapePct: (v) => `${v}% average error`, horizonDays: (v) => `${v}-day horizon`, holdout: (v) => `${v.toLocaleString()} held-out cases`,
};

export function Models() {
  const { phase } = useSession();
  const toast = useToast();
  const [ms, setMs] = useEditable<Model>('models', seedModels);
  const [act, setAct] = useState<Model | null>(null);
  const codes = Object.keys(NAME);
  return (
    <SetupPage title="Prediction models" ms="M6" sub="Trained versions behind slot suggestions, dwell and occupancy forecasts"
      sources={[{ table: 'ml_model_version, yard_suggestion_log' }]}>
      {phase !== 2 && <Banner tone="info" title="Phase 2">Prediction models arrive with milestone M6. Switch the demo to Phase 2 to try them.</Banner>}
      <Banner tone="info" title="Predictions are advice only">Suggestions and forecasts help people decide. No billing, release or gate decision reads them, and every suggestion is logged next to what the officer actually chose.</Banner>
      {codes.map((c) => {
        const vs = ms.filter((m) => m.modelCode === c);
        const active = vs.find((m) => m.isActive);
        return (
          <Panel key={c} flush title={<h2 className="row"><Sparkles size={16} />{NAME[c][0]}</h2>} sub={NAME[c][1]}>
            <DataTable rows={vs} rowKey={(m) => m.mlModelVersionId} cols={[
              { key: 'v', header: 'Version', render: (m) => <span className="adm-cond strong">{m.versionLabel}</span> },
              { key: 't', header: 'Trained', render: (m) => <span className="small">{fmtDT(m.trainedAt)}</span> },
              { key: 'w', header: 'Trained on', render: (m) => <span className="small">{fmtD(m.from)} – {fmtD(m.to)}</span> },
              { key: 'm', header: 'How good', render: (m) => <span className="small">{m.summary}</span> },
              { key: 'x', header: 'Metrics', render: (m) => <span className="row-wrap">{Object.entries(m.metrics ?? {}).map(([k, v]) => <span key={k} className="tag">{METRIC[k]?.(Number(v)) ?? `${k} ${v}`}</span>)}</span> },
              { key: 'a', header: '', render: (m) => m.isActive ? <Pill tone="go">Active</Pill> : <Button size="sm" icon={<Zap />} perm="admin.config.manage" disabled={phase !== 2} onClick={() => setAct(m)}>Activate</Button> },
            ]} />
            {active && <div style={{ padding: '8px 16px' }} className="xs faint">Active since {fmtD(active.trainedAt)}. Older versions stay for comparison and roll-back.</div>}
          </Panel>
        );
      })}
      <AuditNote />
      {act && (() => {
        const cur = ms.find((m) => m.modelCode === act.modelCode && m.isActive);
        return (
          <EditDrawer open onClose={() => setAct(null)} title={`Activate ${NAME[act.modelCode][0].toLowerCase()} ${act.versionLabel}`} saveLabel="Activate version" perm="admin.config.manage"
            reason="Say why this version is better, e.g. the hold-out results."
            onSave={() => { setMs((all) => all.map((m) => (m.modelCode === act.modelCode ? { ...m, isActive: m.mlModelVersionId === act.mlModelVersionId } : m))); toast('Version activated'); }}>
            <DL items={[['Now active', cur ? `${cur.versionLabel} · ${cur.summary}` : 'None'], ['New', `${act.versionLabel} · ${act.summary}`]]} />
            <p className="small muted">Takes effect for new suggestions within a minute. You can switch back to {cur?.versionLabel ?? 'the old version'} at any time.</p>
          </EditDrawer>
        );
      })()}
    </SetupPage>
  );
}
