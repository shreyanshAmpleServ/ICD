import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Select, Textarea, useToast } from '@/ds/components';
import { day } from '@/mock/gen';
import { APPROVAL_LIMITS, type DelegationRow } from '@/mock/cargo';

const permLabel = (p: string) => APPROVAL_LIMITS[p]?.label ?? p;

export function NewDelegation({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (d: DelegationRow) => void;
}) {
  const toast = useToast();
  const [to, setTo] = useState('Rehema K. (Doc & clearance)');
  const [perm, setPerm] = useState('');
  const [from, setFrom] = useState(day(1));
  const [until, setUntil] = useState(day(8));
  const [reason, setReason] = useState('');
  const days = (Date.parse(until) - Date.parse(from)) / 86400000;
  const err = days <= 0 ? 'End must be after start' : days > 30 ? 'At most 30 days; renew if leave is longer' : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Delegate my approvals"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CalendarRange />}
            disabled={!!err || !reason.trim()}
            onClick={() => {
              onSave({
                approvalDelegationId: 50 + Math.round(days),
                fromUserId: 1,
                toUserId: 2,
                fromName: 'You',
                toName: to,
                permissionCode: perm || null,
                permName: perm ? permLabel(perm) : 'All approvals',
                siteId: 1,
                validFrom: `${from}T00:00:00+03:00`,
                validTo: `${until}T23:59:00+03:00`,
                reason,
              });
              toast('Delegation saved');
              onClose();
            }}
          >
            Save delegation
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <Field label="Delegate to" required hint="Must already hold the permission at approve level">
          <Select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            options={[
              'Rehema K. (Doc & clearance)',
              'Daniel K. (Ops)',
              'Joseph N. (Finance)',
              'Grace P. (Customer service)',
            ]}
          />
        </Field>
        <Field label="Which approvals">
          <Select
            value={perm}
            onChange={(e) => setPerm(e.target.value)}
            options={[
              ['', 'All my approvals'],
              ...Object.entries(APPROVAL_LIMITS).map(([k, v]) => [k, v.label] as [string, string]),
            ]}
          />
        </Field>
        <div className="form-grid">
          <Field label="From" required>
            <Input type="date" value={from} min={day(0)} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Until" required error={err}>
            <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
        </div>
        <Field label="Reason" required>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Annual leave, training, sick leave"
          />
        </Field>
        <Banner>
          The delegate cannot approve requests they raised themselves, and every decision records that it was made on your
          behalf.
        </Banner>
      </div>
    </Drawer>
  );
}
