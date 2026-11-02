import { useState } from 'react';
import { Button, Drawer, Field, Input, Select, Textarea, useToast } from '@/ds/components';
import { repairsApi } from '../api';

interface NewEstimateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REPAIR_CODES: [string, string][] = [
  ['STR-DT', 'Straighten dent (panel / post)'],
  ['WLD-CRK', 'Weld crack on corner post'],
  ['RPL-GST', 'Replace door gasket'],
  ['PNT-TCH', 'Touch-up paint / undercoating'],
  ['FLR-SEC', 'Secure loose floor screw'],
  ['HND-RPL', 'Replace door locking handle'],
];

const SHIPPING_LINES: [string, string][] = [
  ['1', 'MSK · A.P. Moller - Maersk'],
  ['2', 'MSC · Mediterranean Shipping Company'],
  ['3', 'CMA · CMA CGM Group'],
];

const RESPONSIBILITIES: [string, string][] = [
  ['OWNER', 'Owner (Shipping Line)'],
  ['USER', 'User (Depot / Shipper)'],
  ['INSURANCE', 'Third party / Insurance'],
];

export function NewEstimateDrawer({ open, onClose, onSuccess }: NewEstimateDrawerProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [unitNo, setUnitNo] = useState('MSKU0192834');
  const [unitStayId, setUnitStayId] = useState('1');
  const [partyId, setPartyId] = useState('1');
  const [repairCode, setRepairCode] = useState('STR-DT');
  const [locationDetail, setLocationDetail] = useState('Right side panel front');
  const [quantity, setQuantity] = useState('1');
  const [labourHours, setLabourHours] = useState('2.0');
  const [materialCost, setMaterialCost] = useState('45.00');
  const [responsibility, setResponsibility] = useState('OWNER');
  const [notes, setNotes] = useState('Identified during gate-in inspection');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const labourRate = 18.0;
      const hours = parseFloat(labourHours) || 1.5;
      const mat = parseFloat(materialCost) || 0;
      const labCost = hours * labourRate;

      await repairsApi.createEstimate({
        unitStayId: Number(unitStayId),
        unitNo,
        partyId: Number(partyId),
        labourRate: String(labourRate),
        lines: [
          {
            lineNo: 1,
            repairCode,
            locationDetail,
            quantity: quantity || '1',
            labourHours: String(hours),
            labourCost: String(labCost),
            materialCost: String(mat),
            responsibility,
            lineStatus: 'PROPOSED',
          },
        ],
        notes,
      });

      toast('Repair estimate created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast(`Failed to create repair estimate: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Draft new M&R repair estimate"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create estimate'}
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <Field label="Container Number" required hint="Container needing repair">
          <Input
            value={unitNo}
            onChange={(e) => setUnitNo(e.target.value.toUpperCase())}
            placeholder="e.g. MSKU0192834"
          />
        </Field>

        <Field label="Unit Stay ID" hint="Database unit stay reference">
          <Input
            type="number"
            value={unitStayId}
            onChange={(e) => setUnitStayId(e.target.value)}
          />
        </Field>

        <Field label="Shipping Line / Approver" required>
          <Select
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            options={SHIPPING_LINES}
          />
        </Field>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)' }}>
            Repair Line Item
          </h4>

          <Field label="Repair Code / Operation" required>
            <Select
              value={repairCode}
              onChange={(e) => setRepairCode(e.target.value)}
              options={REPAIR_CODES}
            />
          </Field>

          <Field label="Location Detail">
            <Input
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder="e.g. Left front post bottom"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Quantity">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>

            <Field label="Labour Hours">
              <Input
                type="number"
                step="0.5"
                value={labourHours}
                onChange={(e) => setLabourHours(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Material Cost (USD)">
            <Input
              type="number"
              step="5"
              value={materialCost}
              onChange={(e) => setMaterialCost(e.target.value)}
            />
          </Field>

          <Field label="Responsibility">
            <Select
              value={responsibility}
              onChange={(e) => setResponsibility(e.target.value)}
              options={RESPONSIBILITIES}
            />
          </Field>
        </div>

        <Field label="Inspector Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details regarding the damage findings"
          />
        </Field>
      </div>
    </Drawer>
  );
}

