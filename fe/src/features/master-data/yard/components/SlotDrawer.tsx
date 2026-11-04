import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Unlock } from 'lucide-react';
import { Banner, Button, Field, Textarea } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

interface SlotDrawerProps {
  code: string | null;
  reason?: string;
  onClose: () => void;
  onBlock: (c: string, r: string) => void;
  onUnblock: (c: string) => void;
}

export function SlotDrawer({ code, reason, onClose, onBlock, onUnblock }: SlotDrawerProps) {
  const navigate = useNavigate();
  const [why, setWhy] = useState('');
  const toBlock = !reason;
  const blockCode = code ? code.split('-')[0] : '';

  return (
    <EditDrawer
      key={code ?? ''}
      open={!!code}
      onClose={onClose}
      title={`Slot ${code}`}
      saveLabel={toBlock ? 'Block slot' : 'Unblock slot'}
      danger={toBlock}
      perm="admin.yard.design"
      disabled={toBlock && why.trim().length < 5}
      onSave={() => {
        if (!code) return;
        if (toBlock) onBlock(code, why);
        else onUnblock(code);
        setWhy('');
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Button
          size="sm"
          icon={<MapPin />}
          onClick={() => {
            onClose();
            navigate(`/yard?block=${encodeURIComponent(blockCode)}&slot=${encodeURIComponent(code || '')}`);
          }}
        >
          Locate on Yard map
        </Button>
      </div>
      {toBlock ? (
        <>
          <p className="small muted">A blocked slot is never suggested by allocation and refuses moves. Units already in it stay until moved.</p>
          <Field label="Why is it blocked?" required hint="Shown to yard staff on the map">
            <Textarea value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. Drainage repair until 15 Oct" />
          </Field>
        </>
      ) : (
        <>
          <Banner tone="stop" title="Blocked">{reason}</Banner>
          <p className="small muted">Unblocking makes the slot available to allocation straight away.</p>
          <div className="row">
            <Unlock size={16} />
            <span className="small">Check the reason has gone before unblocking.</span>
          </div>
        </>
      )}
    </EditDrawer>
  );
}
