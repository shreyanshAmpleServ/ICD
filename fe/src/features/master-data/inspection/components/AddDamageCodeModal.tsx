import { useState } from 'react';
import { Button, Drawer, Field, Input, Segmented, Select, Textarea, useToast } from '@/ds/components';
import { inspectionApi } from '../api';

interface AddDamageCodeModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (newDamage: any) => void;
}

export function AddDamageCodeModal({ open, onClose, onCreated }: AddDamageCodeModalProps) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [appliesTo, setAppliesTo] = useState<'ANY' | 'CONTAINER' | 'VEHICLE'>('ANY');
  const [severity, setSeverity] = useState<'MIN' | 'MOD' | 'MAJ'>('MOD');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!code || code === name.toUpperCase().replace(/[^A-Z0-9]/g, '_')) {
      setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast('Please enter both damage code and name');
      return;
    }

    setLoading(true);
    try {
      const created = await inspectionApi.createDamageCode({
        damageCode: code.trim(),
        damageName: name.trim(),
        appliesTo,
        severity,
        description: description.trim() || name.trim(),
      });

      toast(`Damage code "${code.trim()}" created successfully`);
      onCreated(created);
      onClose();
      setCode('');
      setName('');
      setDescription('');
    } catch {
      toast('Failed to create damage code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add damage code"
            footer={
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading || !name.trim() || !code.trim()}>
            {loading ? 'Creating...' : 'Create damage code'}
          </Button>
        </div>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <Field label="Damage Name" required hint="e.g. Panel puncture / Hole, Major dent, Oil leak">
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Hole or puncture"
            autoFocus
          />
        </Field>

        <Field label="Damage Code" required hint="Short unique standard code (max 10 chars)">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 10))}
            placeholder="e.g. HOLE"
          />
        </Field>

        <Field label="Applies To" required>
          <Segmented<'ANY' | 'CONTAINER' | 'VEHICLE'>
            value={appliesTo}
            onChange={setAppliesTo}
            options={[
              { id: 'ANY', label: 'All cargo' },
              { id: 'CONTAINER', label: 'Containers only' },
              { id: 'VEHICLE', label: 'Vehicles only' },
            ]}
          />
        </Field>

        <Field label="Severity Level" hint="Determines default M&R claim escalation priority">
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            options={[
              ['MIN', 'Minor (cosmetic scratches, surface rust)'],
              ['MOD', 'Moderate (dents, floor scrape, locking bar bent)'],
              ['MAJ', 'Major (hole, structural deformation, reefer failure)'],
            ]}
          />
        </Field>

        <Field label="Description / Inspection Notes" hint="Optional guidance notes shown to field inspector">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe criteria for identifying and recording this damage finding..."
            rows={3}
          />
        </Field>
      </div>
    </Drawer>
  );
}

