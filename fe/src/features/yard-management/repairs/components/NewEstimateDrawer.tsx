import { useState } from 'react';
import { Button, Drawer, Field, Input, Select, Textarea, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { repairsApi, type RepairCode } from '../api';

interface NewEstimateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_REPAIR_CODES: [string, string][] = [
  ['STR-DT', 'STR-DT · Straighten dent'],
  ['PAT-WLD', 'PAT-WLD · Patch weld, steel insert'],
  ['FLR-PLY', 'FLR-PLY · Replace floor plywood (per board)'],
  ['DR-GSK', 'DR-GSK · Replace door gasket'],
  ['LB-STR', 'LB-STR · Straighten locking bar'],
  ['CR-WLD', 'CR-WLD · Corner post weld and straighten'],
  ['RF-PAT', 'RF-PAT · Roof patch'],
  ['CLN-WSH', 'CLN-WSH · Sweep and wash inside'],
  ['PNT-TCH', 'PNT-TCH · Paint touch-up'],
  ['LBL-REM', 'LBL-REM · Remove old labels and placards'],
];

const SHIPPING_LINES: [string, string][] = [
  ['4', 'BML · Blue Meridian Line'],
  ['5', 'IOS · Indian Ocean Shipping'],
  ['6', 'SCL · Swahili Coast Lines'],
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
  const [unitNo, setUnitNo] = useState('BMLU5914756');
  const [unitStayId, setUnitStayId] = useState('5012');
  const [partyId, setPartyId] = useState('4');
  const [repairCode, setRepairCode] = useState('STR-DT');
  const [locationDetail, setLocationDetail] = useState('Left door, front panel');
  const [quantity, setQuantity] = useState('1');
  const [labourHours, setLabourHours] = useState('1.5');
  const [materialCost, setMaterialCost] = useState('0.00');
  const [responsibility, setResponsibility] = useState('OWNER');
  const [notes, setNotes] = useState('Identified during gate-in inspection');

  const { data: dbCodes = [] } = useQ(['repair-codes'], () => repairsApi.getRepairCodes());

  const repairCodeOptions: [string, string][] =
    dbCodes.length > 0
      ? dbCodes.map((c: RepairCode) => [c.repairCode, `${c.repairCode} · ${c.repairName}`])
      : DEFAULT_REPAIR_CODES;

  const handleRepairCodeChange = (newCode: string) => {
    setRepairCode(newCode);
    const found = dbCodes.find((c: RepairCode) => c.repairCode === newCode);
    if (found?.defaultLabourHours) {
      setLabourHours(found.defaultLabourHours);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const labourRate = 18.0;
      const hours = parseFloat(labourHours) || 1.5;
      const qty = parseFloat(quantity) || 1;
      const mat = parseFloat(materialCost) || 0;
      const labCost = (hours * qty * labourRate).toFixed(2);

      await repairsApi.createEstimate({
        unitStayId: Number(unitStayId) || 5012,
        unitNo: unitNo.trim() || 'BMLU5914756',
        partyId: Number(partyId) || 4,
        labourRate: String(labourRate),
        lines: [
          {
            lineNo: 1,
            repairCode,
            locationDetail: locationDetail.trim(),
            quantity: String(qty),
            labourHours: String(hours * qty),
            labourCost: String(labCost),
            materialCost: mat.toFixed(2),
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
            placeholder="e.g. BMLU5914756"
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
              onChange={(e) => handleRepairCodeChange(e.target.value)}
              options={repairCodeOptions}
            />
          </Field>

          <Field label="Location Detail">
            <Input
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder="e.g. Left door, front panel"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Quantity">
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>

            <Field label="Labour Hours">
              <Input
                type="number"
                step="0.1"
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
