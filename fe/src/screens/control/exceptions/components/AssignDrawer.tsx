import { useState } from 'react';
import { Button, Drawer, Field, Select } from '@/ds/components';
import { ROLE_NAME } from '@/mock/cargo';

export function AssignDrawer({
  open,
  onClose,
  initialRole,
  onAssign,
}: {
  open: boolean;
  onClose: () => void;
  initialRole?: string;
  onAssign: (who: string) => void;
}) {
  const [who, setWho] = useState('Daniel K.');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Assign exception"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            perm="exception.manage"
            onClick={() => {
              onAssign(who);
              onClose();
            }}
          >
            Assign
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <Field label="Team">
          <Select defaultValue={initialRole ?? ''} options={Object.entries(ROLE_NAME)} />
        </Field>
        <Field label="Person">
          <Select
            value={who}
            onChange={(x) => setWho(x.target.value)}
            options={['Daniel K.', 'Grace P.', 'Rehema K.', 'Hamisi J.', 'Amina S.']}
          />
        </Field>
        <p className="xs muted">They get it in their inbox and by SMS if the case is critical.</p>
      </div>
    </Drawer>
  );
}
