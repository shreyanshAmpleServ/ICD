import { DL } from '@/ds/components';
import { models as seedModels } from '@/mock/admin';
import { EditDrawer } from '../../shared/AdminKit';

type Model = (typeof seedModels)[number];
const NAME: Record<string, [string, string]> = {
  YARD_ALLOC: ['Yard slot suggestions', 'Ranks free slots for a unit so the planner picks one of the top three'],
  DWELL: ['Dwell prediction', 'Predicts when a unit will leave (median and 90th percentile)'],
  OCCUPANCY: ['Occupancy forecast', 'Forecasts yard fill per block for the next 14 days'],
};

export function ActivateModelModal({
  act,
  cur,
  onClose,
  onSave,
}: {
  act: Model;
  cur?: Model;
  onClose: () => void;
  onSave: (why: string) => void;
}) {
  return (
    <EditDrawer
      open
      onClose={onClose}
      title={`Activate ${NAME[act.modelCode][0].toLowerCase()} ${act.versionLabel}`}
      saveLabel="Activate version"
      perm="admin.config.manage"
      reason="Say why this version is better, e.g. the hold-out results."
      onSave={onSave}
    >
      <DL
        items={[
          ['Now active', cur ? `${cur.versionLabel} · ${cur.summary}` : 'None'],
          ['New', `${act.versionLabel} · ${act.summary}`],
        ]}
      />
      <p className="small muted">
        Takes effect for new suggestions within a minute. You can switch back to {cur?.versionLabel ?? 'the old version'} at any time.
      </p>
    </EditDrawer>
  );
}
