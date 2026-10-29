import { useState } from 'react';
import { Banner, Check, Field, Input } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import { locationTags, type YardNode } from '@/mock/admin';

interface TagDrawerProps {
  open: boolean;
  onClose: () => void;
  node: YardNode;
  onSave: (tags: string[], plugs: string) => void;
}

export function TagDrawer({ open, onClose, node, onSave }: TagDrawerProps) {
  const [tags, setTags] = useState<string[]>(node.tags ?? []);
  const [plugs, setPlugs] = useState(node.reeferPlugNo ?? '');

  return (
    <EditDrawer open={open} onClose={onClose} title={`Tags on ${node.locationCode}`} saveLabel="Save tags" perm="admin.yard.design" onSave={() => onSave(tags, plugs)}>
      <p className="small muted">Tags steer allocation and the map overlays. They apply to every slot under this {node.kind.toLowerCase()}.</p>
      <div className="stack">
        {locationTags.map((t) => (
          <Check
            key={t.tagCode}
            label={t.tagName}
            checked={tags.includes(t.tagCode)}
            onChange={(e) => setTags(e.target.checked ? [...tags, t.tagCode] : tags.filter((x) => x !== t.tagCode))}
          />
        ))}
      </div>
      {tags.includes('REEFER') && (
        <Field label="Reefer plug numbers" hint="Range or list, e.g. R-01…R-32">
          <Input value={plugs} onChange={(e) => setPlugs(e.target.value)} />
        </Field>
      )}
      {tags.includes('HAZARDOUS') && (
        <Banner tone="wait" title="Segregation rules are not loaded">
          Load the IMDG segregation table before allocating dangerous goods here.
        </Banner>
      )}
    </EditDrawer>
  );
}
