import { useState } from 'react';
import { Ban } from 'lucide-react';
import { Banner, Button, Drawer, Field, Select, Textarea, useToast } from '@/ds/components';

export const CANCEL_REASONS = [
  'Driver left without entering',
  'Wrong truck announced',
  'Release not ready, customer asked to cancel',
  'Duplicate visit',
  'Other',
];

export function CancelVisitDrawer({
  open,
  onClose,
  plate,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  plate: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [note, setNote] = useState('');
  const needNote = reason === 'Other';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Cancel visit for ${plate}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep visit
          </Button>
          <Button
            variant="danger"
            icon={<Ban />}
            disabled={needNote && note.trim().length < 5}
            onClick={() => {
              onDone();
              onClose();
              toast('Visit cancelled');
            }}
          >
            Cancel visit
          </Button>
        </>
      }
    >
      <div className="stack">
        <Banner tone="wait">
          The gate pass stops working at once. Units already handed over are not reversed: cancel only before any unit moves.
        </Banner>
        <Field label="Reason" required>
          <Select value={reason} onChange={(e) => setReason(e.target.value)} options={CANCEL_REASONS} />
        </Field>
        <Field
          label="Note"
          required={needNote}
          hint={needNote ? 'Say what happened, at least a few words' : 'Optional'}
        >
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Drawer>
  );
}
