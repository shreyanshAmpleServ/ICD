import { useState } from 'react';
import { CheckCircle2, FileSignature } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input } from '@/ds/components';
import type { Job } from '@/mock/ops';

export interface CompleteJobDrawerProps {
  open: boolean;
  job: Job;
  disc: boolean;
  d: { short: number; excess: number; damaged: number };
  onClose: () => void;
  onDone: () => void;
}

export function CompleteJobDrawer({ open, job, disc, d, onClose, onDone }: CompleteJobDrawerProps) {
  const [sup, setSup] = useState(false);
  const [cust, setCust] = useState(false);
  const [seal, setSeal] = useState('');
  const stuff = job.jobKind === 'STUFF';
  const ok = sup && (!job.customsOfficerName || cust) && (!stuff || seal.length >= 5);
  const sig = (signed: boolean, set: (b: boolean) => void, who: string) => (
    <button
      type="button"
      className="sig"
      onClick={() => set(true)}
      style={{
        width: '100%',
        cursor: 'pointer',
        color: signed ? 'var(--go)' : undefined,
        borderColor: signed ? 'var(--go)' : undefined,
      }}
    >
      {signed ? (
        <>
          <CheckCircle2 size={18} />
          &nbsp;Signed by {who}
        </>
      ) : (
        <>
          <FileSignature size={18} />
          &nbsp;{who} signs here
        </>
      )}
    </button>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Complete ${job.jobNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="xl"
            variant="primary"
            icon={<CheckCircle2 />}
            perm="cfs.job.manage"
            disabled={!ok}
            onClick={() => {
              onDone();
              onClose();
            }}
          >
            Complete job
          </Button>
        </>
      }
    >
      <div className="stack">
        {disc ? (
          <Banner tone="stop" title="The tally does not match">
            {d.short} short, {d.excess} excess, {d.damaged} damaged. Completing sends it to the CFS manager for approval
            (cfs.job.approve).
          </Banner>
        ) : (
          <Banner tone="go">Every line matches the manifest. The job is approved on completion.</Banner>
        )}
        {stuff && (
          <Field label="New seal applied" required>
            <Input
              xl
              value={seal}
              onChange={(e) => setSeal(e.target.value.toUpperCase())}
              placeholder="SCL-0000000"
            />
          </Field>
        )}
        <Field label="Tally clerk / supervisor" required>
          {sig(sup, setSup, job.supervisorSub ?? 'Supervisor')}
        </Field>
        {job.customsOfficerName && (
          <Field label="Customs officer" required>
            {sig(cust, setCust, job.customsOfficerName)}
          </Field>
        )}
      </div>
    </Drawer>
  );
}
