import { useState } from 'react';
import { Button, Drawer, Field, Input, Select, Textarea, useToast } from '@/ds/components';
import { cfsApi } from '../api';

interface PlanJobDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const JOB_KINDS: [string, string][] = [
  ['DESTUFF', 'De-stuffing (Stripping)'],
  ['STUFF', 'Stuffing'],
  ['RESTUFF', 'Re-stuffing'],
  ['TRANSLOAD', 'Transload'],
];

const CONTRACTORS: [string, string][] = [
  ['1', 'Umoja Labour Group'],
  ['2', 'Bandari Casuals Cooperative'],
  ['3', 'Mwenge Handling Crew'],
];

const PACKAGE_TYPES: [string, string][] = [
  ['CARTON', 'Cartons'],
  ['BAG', 'Bags'],
  ['DRUM', 'Drums'],
  ['PALLET', 'Pallets'],
  ['CRATE', 'Crates'],
  ['BUNDLE', 'Bundles'],
];

export function PlanJobDrawer({ open, onClose, onSuccess }: PlanJobDrawerProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [containerStayId, setContainerStayId] = useState('1');
  const [containerNo, setContainerNo] = useState('MSKU0192834');
  const [jobKind, setJobKind] = useState('DESTUFF');
  const [labourContractorId, setLabourContractorId] = useState('1');
  const [labourCount, setLabourCount] = useState('8');
  const [supervisor, setSupervisor] = useState('Halima S.');
  const [customsOfficer, setCustomsOfficer] = useState('Rehema K. (TRA)');
  const [description, setDescription] = useState('Consumer Electronics & Appliances');
  const [marksNumbers, setMarksNumbers] = useState('EL-2026-TZ-041');
  const [packageType, setPackageType] = useState('CARTON');
  const [packagesDeclared, setPackagesDeclared] = useState('450');
  const [weightKg, setWeightKg] = useState('14200');
  const [remarks, setRemarks] = useState('Direct discharge to CFS warehouse section A');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await cfsApi.createJob({
        containerStayId: Number(containerStayId),
        containerNo,
        jobKind,
        labourContractorId: Number(labourContractorId),
        labourCount: Number(labourCount),
        supervisorSub: supervisor,
        customsOfficerName: customsOfficer,
        remarks,
        lines: [
          {
            lineNo: 1,
            marksNumbers,
            description,
            packageType,
            packagesDeclared: Number(packagesDeclared) || 100,
            packagesCounted: 0,
            weightKg: weightKg || '10000',
          },
        ],
      });
      toast('CFS Job successfully planned in database');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(`Error creating job: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Plan a new CFS handling job"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create handling job'}
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <Field label="Container Number" required hint="Container unit to stuff or de-stuff">
          <Input
            value={containerNo}
            onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
            placeholder="e.g. MSKU0192834"
          />
        </Field>

        <Field label="Unit Stay ID" hint="Database unit stay reference">
          <Input
            type="number"
            value={containerStayId}
            onChange={(e) => setContainerStayId(e.target.value)}
          />
        </Field>

        <Field label="Handling Job Kind" required>
          <Select
            value={jobKind}
            onChange={(e) => setJobKind(e.target.value)}
            options={JOB_KINDS}
          />
        </Field>

        <Field label="Labour Contractor" required>
          <Select
            value={labourContractorId}
            onChange={(e) => setLabourContractorId(e.target.value)}
            options={CONTRACTORS}
          />
        </Field>

        <Field label="Labour Crew Size">
          <Input
            type="number"
            value={labourCount}
            onChange={(e) => setLabourCount(e.target.value)}
            placeholder="8"
          />
        </Field>

        <Field label="CFS Supervisor">
          <Input
            value={supervisor}
            onChange={(e) => setSupervisor(e.target.value)}
            placeholder="Halima S."
          />
        </Field>

        <Field label="Customs Officer Name">
          <Input
            value={customsOfficer}
            onChange={(e) => setCustomsOfficer(e.target.value)}
            placeholder="TRA Officer"
          />
        </Field>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)' }}>
            Primary Cargo Line
          </h4>
          <Field label="Cargo Description" required>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Goods description"
            />
          </Field>

          <Field label="Marks & Numbers">
            <Input
              value={marksNumbers}
              onChange={(e) => setMarksNumbers(e.target.value)}
              placeholder="e.g. EL-2026-TZ-041"
            />
          </Field>

          <Field label="Package Type">
            <Select
              value={packageType}
              onChange={(e) => setPackageType(e.target.value)}
              options={PACKAGE_TYPES}
            />
          </Field>

          <Field label="Declared Packages" required>
            <Input
              type="number"
              value={packagesDeclared}
              onChange={(e) => setPackagesDeclared(e.target.value)}
              placeholder="450"
            />
          </Field>

          <Field label="Weight (kg)">
            <Input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="14200"
            />
          </Field>
        </div>

        <Field label="Remarks">
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Special handling instructions or warehouse notes"
          />
        </Field>
      </div>
    </Drawer>
  );
}

