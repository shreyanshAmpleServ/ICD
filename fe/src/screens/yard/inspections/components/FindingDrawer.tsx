import { useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import { Button, Check, Drawer, Field, Input, Segmented, Select, Textarea, cx } from '@/ds/components';
import { damageCodes, type Finding } from '@/mock/ops';
import type { Zone } from './DamageDiagram';

export interface FindingDrawerProps {
  zone: Zone | null;
  category: 'CONTAINER' | 'VEHICLE';
  onClose: () => void;
  onAdd: (f: Finding) => void;
}

export function FindingDrawer({ zone, category, onClose, onAdd }: FindingDrawerProps) {
  const codes = damageCodes.filter((d) => d.appliesTo === 'ANY' || d.appliesTo === category);
  const [code, setCode] = useState(codes[0].damageCode);
  const [sev, setSev] = useState<Finding['severity']>('MINOR');
  const [size, setSize] = useState('');
  const [desc, setDesc] = useState('');
  const [pre, setPre] = useState(false);
  const [photo, setPhoto] = useState(0);

  if (!zone) return null;
  const close = () => {
    setSize('');
    setDesc('');
    setPre(false);
    setPhoto(0);
    setSev('MINOR');
    onClose();
  };

  return (
    <Drawer
      open
      onClose={close}
      title={`Damage on ${zone.label.toLowerCase()}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            size="xl"
            variant="primary"
            icon={<Plus />}
            disabled={photo === 0}
            title={photo ? undefined : 'Take at least one photo'}
            onClick={() => {
              onAdd({
                inspectionFindingId:
                  (Date.parse('2026-10-07') % 100000) + Math.round(Number(size.replace(/\D/g, '') || 0)) + desc.length,
                area: zone.area,
                locationDetail: zone.label,
                damageCode: code,
                severity: sev,
                sizeCm: size || undefined,
                description: desc || undefined,
                isPreexisting: pre,
                needsRepair: sev !== 'MINOR',
                photoDocumentIds: Array.from({ length: photo }, (_, i) => 900 + i),
              });
              close();
            }}
          >
            Add finding
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="What is it?" required>
          <Select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            options={codes.map((d) => [d.damageCode, `${d.damageName} (${d.damageCode})`])}
          />
        </Field>
        <Field
          label="How bad?"
          required
          hint={
            sev === 'MINOR'
              ? 'Cosmetic, the unit can be used'
              : sev === 'MAJOR'
              ? 'Needs repair; goes to the operations manager for approval'
              : 'Not fit for use; unit is rejected'
          }
        >
          <div>
            <Segmented
              xl
              value={sev}
              onChange={setSev}
              options={[
                { id: 'MINOR', label: 'Minor' },
                { id: 'MAJOR', label: 'Major' },
                { id: 'CRITICAL', label: 'Critical' },
              ]}
            />
          </div>
        </Field>
        <Field label="Size (cm)" hint="Length × width, e.g. 30 × 20">
          <Input xl value={size} onChange={(e) => setSize(e.target.value)} placeholder="30 × 20" />
        </Field>
        <Field label="Where exactly, and anything else">
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g. Lower panel near the third corrugation from the front"
          />
        </Field>
        <Check
          label="Damage was already there before (from the previous EIR)"
          checked={pre}
          onChange={(e) => setPre(e.target.checked)}
        />
        <Field label="Photos" required hint="At least one close-up">
          <div className="row-wrap">
            {Array.from({ length: photo }, (_, i) => (
              <div key={i} className={cx('photo')} style={{ width: 110 }}>
                Close-up {i + 1}
              </div>
            ))}
            <Button size="xl" icon={<Camera />} onClick={() => setPhoto((p) => p + 1)}>
              Take photo
            </Button>
          </div>
        </Field>
      </div>
    </Drawer>
  );
}
