import { Banner, Field, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

interface MatchModalProps {
  match: { kind: string; label: string } | null;
  onClose: () => void;
  onMatch: () => void;
}

export function MatchModal({ match, onClose, onMatch }: MatchModalProps) {
  if (!match) return null;

  return (
    <EditDrawer
      open
      onClose={onClose}
      title={`Match ${match.label} to NG`}
      saveLabel="Match to NG record"
      perm="masters.local.edit"
      onSave={onMatch}
    >
      <p className="small muted">
        This {match.kind} was created at the gate while NG was unreachable. Pick the NG record it should become. Visits already recorded move to that record.
      </p>
      <Field label="NG record">
        <Select
          options={[
            ['NG-T5188', `NG-T5188 · ${match.label} · Upepo Transporters`],
            ['NG-T5201', 'NG-T5201 · similar plate · Simba Haulage Co.'],
          ]}
        />
      </Field>
      <Banner tone="info">After matching, the row becomes read-only and follows NG.</Banner>
    </EditDrawer>
  );
}
