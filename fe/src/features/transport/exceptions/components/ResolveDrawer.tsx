import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Banner, Button, Drawer, Field, Select, Textarea } from '@/ds/components';
import { RESOLUTION_CODES } from '@/mock/cargo';

export function ResolveDrawer({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (code: string, note: string) => void;
}) {
  const [code, setCode] = useState(RESOLUTION_CODES[0][0]);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Resolve exception"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CheckCircle2 />}
            perm="exception.manage"
            onClick={() => {
              setTried(true);
              if (!note.trim()) return;
              onDone(code, note);
              onClose();
            }}
          >
            Resolve exception
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <Field label="Resolution" required>
          <Select value={code} onChange={(e) => setCode(e.target.value)} options={RESOLUTION_CODES} />
        </Field>
        <Field
          label="Note"
          required
          error={tried && !note.trim() && 'Say what was done; it goes into the audit trail'}
        >
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What fixed it and who agreed"
          />
        </Field>
        <Banner>
          Resolving stops the SLA clock. A supervisor closes the case after checking; it can be reopened if the problem
          comes back.
        </Banner>
      </div>
    </Drawer>
  );
}
