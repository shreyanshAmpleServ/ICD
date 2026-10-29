import { useState } from 'react';
import { Banner, Field, Input, Select } from '@/ds/components';
import { numberSequences as seedSeq, renderPattern } from '@/mock/admin';
import { EditDrawer, label } from '../../shared/AdminKit';

type Seq = (typeof seedSeq)[number];
const RESET: Record<string, string> = { NEVER: 'Never', YEARLY: 'Every 1 January', MONTHLY: 'Every month' };

export function SequenceDrawer({
  seq,
  onClose,
  onSave,
}: {
  seq: Seq;
  onClose: () => void;
  onSave: (s: Seq) => void;
}) {
  const [s, setS] = useState(seq);
  const lower = (s.nextValue ?? 0) < (seq.nextValue ?? 0);
  const okPattern = /\{#+\}|\{SEQ:\d\}/.test(s.pattern);
  const sample = renderPattern(s.pattern, s.prefix, s.siteCode, s.nextValue ?? 1);
  const nextYear = renderPattern(
    s.pattern,
    s.prefix,
    s.siteCode,
    s.resetPolicy === 'NEVER' ? (s.nextValue ?? 1) + 1 : 1,
    new Date('2027-01-01')
  );

  return (
    <EditDrawer
      open
      onClose={onClose}
      title={`${label(seq.documentKind)} numbers${seq.siteCode ? ` · ${seq.siteCode}` : ''}`}
      saveLabel="Save sequence"
      perm="admin.config.manage"
      disabled={lower || !okPattern}
      reason="Number formats appear on tax documents."
      onSave={() => onSave({ ...s, sample })}
    >
      <div className="form-grid">
        <Field label="Prefix">
          <Input value={s.prefix} onChange={(e) => setS({ ...s, prefix: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Pattern" error={!okPattern ? 'Needs a running number, e.g. {######}' : undefined}>
          <Input className="adm-code" value={s.pattern} onChange={(e) => setS({ ...s, pattern: e.target.value })} />
        </Field>
        <Field
          label="Next number"
          error={lower ? `Cannot go below ${seq.nextValue}: numbers would repeat` : undefined}
        >
          <Input
            type="number"
            value={s.nextValue}
            onChange={(e) => setS({ ...s, nextValue: Number(e.target.value) })}
          />
        </Field>
        <Field label="Restarts">
          <Select
            value={s.resetPolicy}
            onChange={(e) => setS({ ...s, resetPolicy: e.target.value as Seq['resetPolicy'] })}
            options={Object.entries(RESET)}
          />
        </Field>
      </div>
      <Banner tone={okPattern && !lower ? 'go' : 'idle'} title={`Next: ${sample}`}>
        First number next year: {nextYear}
      </Banner>
    </EditDrawer>
  );
}
