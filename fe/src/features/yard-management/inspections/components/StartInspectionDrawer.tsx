import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button, Drawer, Field, Input, Select, useToast } from '@/ds/components';
import { inspectionsApi } from '../api';

export interface StartInspectionDrawerProps {
  open: boolean;
  onClose: () => void;
  siteId: number;
  onStart: (id: number) => void;
}

  const CATEGORIES: [string, string][] = [
    ['CONTAINER', 'Container (ISO 6346)'],
    ['VEHICLE', 'Vehicle (Ro-Ro / RORO)'],
  ];

  const KINDS: [string, string][] = [
    ['PERIODIC', 'Periodic (yard check)'],
    ['EXAM', 'Customs exam'],
    ['GATE_OUT', 'Gate-out check'],
    ['GATE_IN', 'Gate-in arrival check'],
  ];

  export function StartInspectionDrawer({ open, onClose, onStart }: StartInspectionDrawerProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [unitNo, setUnitNo] = useState('MSKU0192834');
    const [unitStayId, setUnitStayId] = useState('1');
    const [category, setCategory] = useState('CONTAINER');
    const [kind, setKind] = useState('PERIODIC');
    const [inspector, setInspector] = useState('Juma M.');
    const [remarks, setRemarks] = useState('Scheduled yard condition inspection');

    const handleStart = async () => {
      if (!unitNo.trim()) {
        toast('Please enter a container number or VIN');
        return;
      }
      setLoading(true);
      try {
        const created = await inspectionsApi.startInspection({
          unitNo: unitNo.trim().toUpperCase(),
          unitStayId: Number(unitStayId) || 1,
          inspectionKind: kind as any,
          category: category as any,
          inspector,
          remarks,
        });

        toast('Inspection started successfully');
        onClose();
        if (created?.inspectionId) {
          onStart(Number(created.inspectionId));
        }
      } catch (err: any) {
        toast(`Failed to start inspection: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Drawer
        open={open}
        onClose={onClose}
        title="Start an inspection"
        footer={
        <>
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<ClipboardCheck />}
                perm="inspection.perform"
                disabled={loading || !unitNo.trim()}
                onClick={handleStart}
              >
                {loading ? 'Starting...' : 'Start inspection'}
              </Button>
            </>
      }
    >
                <div className="stack" style={{ gap: 16 }}>
                  <Field label="Container number or VIN" required hint="e.g. MSKU0192834">
                    <Input
                      value={unitNo}
                      onChange={(e) => setUnitNo(e.target.value.toUpperCase())}
                      placeholder="e.g. MSKU0192834"
                      autoFocus
                    />
                  </Field>

                    <Field label="Unit Stay ID" hint="Database stay ID reference">
                      <Input
                        type="number"
                        value={unitStayId}
                        onChange={(e) => setUnitStayId(e.target.value)}
                      />
                    </Field>

                    <Field label="Cargo Unit Category" required>
                      <Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        options={CATEGORIES}
                      />
                    </Field>

                    <Field label="Inspection Kind" required>
                      <Select
                        value={kind}
                        onChange={(e) => setKind(e.target.value)}
                        options={KINDS}
                      />
                    </Field>

                    <Field label="Inspector Name">
                      <Input
                        value={inspector}
                        onChange={(e) => setInspector(e.target.value)}
                        placeholder="Juma M."
                      />
                    </Field>

                    <Field label="Initial Remarks">
                      <Input
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Notes or inspection reason"
                      />
                    </Field>

                    <p className="xs faint">
                      The created inspection is saved directly to SQL Server database and linked to the active unit stay.
                    </p>
                </div>
              </Drawer>
              );
}
