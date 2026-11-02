import { useState, type ReactNode } from 'react';
import { Edit2, Link2, Lock } from 'lucide-react';
import { Banner, Button, Check, Field, Input, Panel, Textarea } from '@/ds/components';
import { EditDrawer, SourcePill } from '../../shared/AdminKit';

interface MasterDrawerProps {
  title: string;
  onClose: () => void;
  source?: string;
  sync?: string;
  ngRef?: string;
  ng: [string, ReactNode][];
  note?: string;
  flag?: boolean;
  flagLabel?: string;
  onSave: (note: string, flag: boolean) => void;
  onMatch: () => void;
  onEditDetails?: () => void;
}

export function MasterDrawer({
  title, onClose, source, sync, ngRef, ng, note, flag, flagLabel, onSave, onMatch, onEditDetails
}: MasterDrawerProps) {
  const [n, setN] = useState(note ?? '');
  const [f, setF] = useState(!!flag);
  const provisional = sync === 'PROVISIONAL';

  return (
    <EditDrawer open onClose={onClose} title={title} saveLabel="Save local notes" perm="masters.local.edit" onSave={() => onSave(n, f)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="row-wrap" style={{ gap: 8, alignItems: 'center' }}>
            <SourcePill source={source} sync={sync} />
            {ngRef && <span className="xs faint">NG ref: {ngRef}</span>}
          </div>
          {onEditDetails && (
            <Button size="sm" variant="ghost" icon={<Edit2 size={13} />} onClick={onEditDetails}>
              Edit all details
            </Button>
          )}
        </div>

        {provisional && (
          <Banner tone="wait" title="Provisional record" action={<Button size="sm" icon={<Link2 />} perm="masters.local.edit" onClick={onMatch}>Match to NG</Button>}>
            Created at the gate while NG was unreachable. Match it to the NG record so billing and reports join up.
          </Banner>
        )}
        <Panel title={<h3 className="row"><Lock size={14} />{provisional ? 'Recorded at the gate' : 'From NG (read-only)'}</h3>}>
          <div className="form-grid">
            {ng.map(([k, v]) => (
              <Field key={k} label={k}>
                {typeof v === 'string' || typeof v === 'number' || v == null ? <Input value={v ?? ''} disabled readOnly /> : v}
              </Field>
            ))}
          </div>
        </Panel>
        <Field label="Local note" hint="Seen by gate and yard staff at this depot only">
          <Textarea value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        {flagLabel && <Check label={flagLabel} checked={f} onChange={(e) => setF(e.target.checked)} />}
    </EditDrawer>
  );
}
