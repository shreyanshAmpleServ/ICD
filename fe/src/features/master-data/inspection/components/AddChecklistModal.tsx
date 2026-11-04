import { useState } from 'react';
import { Button, Drawer, Field, Input, Segmented, Select, useToast } from '@/ds/components';
import { inspectionApi } from '../api';

interface AddChecklistModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (newTemplate: any) => void;
}

export function AddChecklistModal({ open, onClose, onCreated }: AddChecklistModalProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<'CONTAINER' | 'VEHICLE'>('CONTAINER');
  const [inspectionKind, setInspectionKind] = useState<'GATE_IN' | 'GATE_OUT' | 'YARD'>('GATE_IN');
  const [minPhotos, setMinPhotos] = useState(4);
  const [preset, setPreset] = useState<'STANDARD' | 'REEFER' | 'EMPTY'>('STANDARD');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!code || code === name.toUpperCase().replace(/[^A-Z0-9]/g, '_')) {
      setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast('Please enter both checklist name and code');
      return;
    }

    setLoading(true);
    try {
      let initialItems: any[] = [];
      if (preset === 'STANDARD') {
        if (category === 'CONTAINER') {
          initialItems = [
            { itemCode: 'DOORS', itemName: 'Doors, hinges and locking bars', area: 'DOORS', inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: 10 },
            { itemCode: 'WALL_LEFT', itemName: 'Left side wall', area: 'WALLS', inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: 20 },
            { itemCode: 'WALL_RIGHT', itemName: 'Right side wall', area: 'WALLS', inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: 30 },
            { itemCode: 'ROOF', itemName: 'Roof panel & bow', area: 'ROOF', inputType: 'OK_DAMAGE', isMandatory: false, sortOrder: 40 },
            { itemCode: 'SEAL', itemName: 'Seal present and intact', area: 'SEAL', inputType: 'YES_NO', isMandatory: true, sortOrder: 50 },
          ];
        } else {
          initialItems = [
            { itemCode: 'EXT_BODY', itemName: 'Body panels, bumper & paint', area: 'EXTERIOR', inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: 10 },
            { itemCode: 'GLASS', itemName: 'Windscreen, windows and mirrors', area: 'EXTERIOR', inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: 20 },
            { itemCode: 'TIRES', itemName: 'Tires and spare wheel', area: 'UNDERCARRIAGE', inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: 30 },
            { itemCode: 'CABIN', itemName: 'Interior cabin and accessories', area: 'CABIN', inputType: 'OK_DAMAGE', isMandatory: false, sortOrder: 40 },
          ];
        }
      } else if (preset === 'REEFER') {
        initialItems = [
          { itemCode: 'PLUG_CABLE', itemName: 'Reefer power cable and plug', area: 'ACCESSORIES', inputType: 'YES_NO', isMandatory: true, sortOrder: 10 },
          { itemCode: 'CONTROLLER', itemName: 'Microprocessor display & setpoint', area: 'ENGINE', inputType: 'TEXT', isMandatory: true, sortOrder: 20 },
          { itemCode: 'DEFROST', itemName: 'Defrost drain and fan inspection', area: 'INTERIOR', inputType: 'OK_DAMAGE', isMandatory: false, sortOrder: 30 },
          { itemCode: 'DOOR_SEAL', itemName: 'Thermal door gaskets and seals', area: 'DOORS', inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: 40 },
        ];
      }

      const created = await inspectionApi.createInspectionTemplate({
        templateCode: code.trim(),
        templateName: name.trim(),
        category,
        inspectionKind,
        minPhotos: Number(minPhotos) || 4,
        versionNo: 1,
        items: initialItems,
      });

      toast(`Checklist "${name.trim()}" created successfully`);
      onCreated(created);
      onClose();
      setName('');
      setCode('');
    } catch {
      toast('Failed to create checklist template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add inspection checklist"
            footer={
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading || !name.trim() || !code.trim()}>
            {loading ? 'Creating...' : 'Create checklist'}
          </Button>
        </div>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <Field label="Checklist Name" required hint="e.g. Reefer PTI Survey, Gate-Out Departure Inspection">
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Reefer Pre-Trip Inspection (PTI)"
            autoFocus
          />
        </Field>

        <Field label="Template Code" required hint="Unique alphanumeric identifier (max 30 chars)">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 30))}
            placeholder="e.g. REEFER_PTI_GATE_IN"
          />
        </Field>

        <Field label="Cargo Category" required>
          <Segmented<'CONTAINER' | 'VEHICLE'>
            value={category}
            onChange={setCategory}
            options={[
              { id: 'CONTAINER', label: 'Containers (ISO / Dry / Reefer)' },
              { id: 'VEHICLE', label: 'Vehicles (Ro-Ro / Fleet)' },
            ]}
          />
        </Field>

        <Field label="Inspection Kind / Stage" required>
          <Select
            value={inspectionKind}
            onChange={(e) => setInspectionKind(e.target.value as any)}
            options={[
              ['GATE_IN', 'Gate-In survey (terminal arrival)'],
              ['GATE_OUT', 'Gate-Out departure check'],
              ['YARD', 'Yard / Depot storage survey'],
            ]}
          />
        </Field>

        <Field label="Minimum Required Photos" hint="Inspector tablet will enforce at least this many captured photos">
          <Input
            type="number"
            min={0}
            max={20}
            value={minPhotos}
            onChange={(e) => setMinPhotos(Number(e.target.value))}
            style={{ width: 120 }}
          />
        </Field>

        <Field label="Initial Item Template Preset" hint="Pre-populate with standard walk-around survey items">
          <Select
            value={preset}
            onChange={(e) => setPreset(e.target.value as any)}
            options={[
              ['STANDARD', 'Standard survey walk-around items'],
              ['REEFER', 'Reefer machinery & cold chain checklist'],
              ['EMPTY', 'Empty checklist (add items manually in editor)'],
            ]}
          />
        </Field>
      </div>
    </Drawer>
  );
}

