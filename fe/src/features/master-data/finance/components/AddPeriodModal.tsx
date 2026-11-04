import { useState, useEffect } from 'react';
import { Banner, Field, Input } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

interface AddPeriodModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (period: any) => void;
  existingPeriods?: any[];
}

export function AddPeriodModal({ open, onClose, onSave, existingPeriods = [] }: AddPeriodModalProps) {
  const [periodKey, setPeriodKey] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  useEffect(() => {
    if (open) {
      // Find latest period key (e.g. '2026-10')
      const sorted = [...existingPeriods]
        .map((p) => p.periodKey)
        .filter((k) => typeof k === 'string' && /^\d{4}-\d{2}$/.test(k))
        .sort();
      const latest = sorted[sorted.length - 1] || '2026-10';
      const [yStr, mStr] = latest.split('-');
      let y = parseInt(yStr, 10);
      let m = parseInt(mStr, 10) + 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      const nextKey = `${y}-${String(m).padStart(2, '0')}`;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      setPeriodKey(nextKey);
      setPeriodStart(`${nextKey}-01`);
      setPeriodEnd(`${nextKey}-${String(lastDay).padStart(2, '0')}`);
    }
  }, [open, existingPeriods]);

  const handlePeriodChange = (val: string) => {
    setPeriodKey(val);
    if (/^\d{4}-\d{2}$/.test(val)) {
      const [yStr, mStr] = val.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      if (m >= 1 && m <= 12) {
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        setPeriodStart(`${val}-01`);
        setPeriodEnd(`${val}-${String(lastDay).padStart(2, '0')}`);
      }
    }
  };

  const handleSave = () => {
    if (!periodKey.trim()) return;
    onSave({
      periodKey: periodKey.trim(),
      periodStart: periodStart.trim() || `${periodKey.trim()}-01`,
      periodEnd: periodEnd.trim() || `${periodKey.trim()}-28`,
      status: 'OPEN',
      companyId: 1,
    });
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title={`Open accounting period ${periodKey || ''}`}
      saveLabel="Open period"
      perm="finance.period.close"
      disabled={!periodKey.trim()}
      onSave={handleSave}
    >
      <Banner tone="info" title="Period posting control">
        Opening a period allows commercial transactions, invoices, and journal entries dated within these dates to post to the General Ledger.
      </Banner>

      <div className="form-grid" style={{ marginTop: '1rem' }}>
        <Field label="Period key" required hint="Format: YYYY-MM (e.g. 2026-11)">
          <Input
            value={periodKey}
            onChange={(e) => handlePeriodChange(e.target.value)}
            placeholder="2026-11"
            className="adm-cond"
          />
        </Field>
      </div>

      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        <Field label="Start date" required>
          <Input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </Field>
        <Field label="End date" required>
          <Input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </Field>
      </div>
    </EditDrawer>
  );
}

