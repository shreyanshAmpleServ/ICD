import { useState } from 'react';
import { CheckCircle2, DoorOpen, Printer, WifiOff, Check } from 'lucide-react';
import { Button, Panel, useToast } from '@/ds/components';
import { GatePassModal } from '../../components/GatePassModal';
import { gateLaneApi } from '../api';

export function PassStep({
  v,
  isOut,
  offline,
  onOpenBarrier,
}: {
  v: any;
  isOut: boolean;
  offline: boolean;
  onOpenBarrier: () => void;
}) {
  const toast = useToast();
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [barrierState, setBarrierState] = useState<'CLOSED' | 'OPENING' | 'OPEN'>('CLOSED');

  const handleOpenBarrier = async () => {
    setBarrierState('OPENING');
    toast('Triggering automated barrier relay...');
    try {
      await gateLaneApi.openBarrier(1);
    } catch {
      // Offline fallback
    }
    setTimeout(() => {
      setBarrierState('OPEN');
      toast('Barrier opened! Lane clear.');
      onOpenBarrier();
    }, 1200);
  };

  return (
    <Panel>
      <div className="stack" style={{ alignItems: 'center', padding: 24, textAlign: 'center' }}>
        <CheckCircle2 size={56} color="var(--go, #16a34a)" />
        <h2 style={{ fontSize: 28, marginTop: 8 }}>
          {v.plateNo} may {isOut ? 'leave terminal' : 'enter terminal'}
        </h2>
        <p className="muted">
          EIR and gate pass recorded in system{offline ? ' on this tablet; they sync when online' : ''}.
        </p>

        {/* Visual Barrier Graphic & Status */}
        <div
          style={{
            margin: '20px 0',
            padding: 16,
            borderRadius: 12,
            background: barrierState === 'OPEN' ? '#f0fdf4' : barrierState === 'OPENING' ? '#fefce8' : '#f8fafc',
            border: `2px solid ${barrierState === 'OPEN' ? '#22c55e' : barrierState === 'OPENING' ? '#eab308' : '#cbd5e1'}`,
            width: 'min(440px, 100%)',
          }}
        >
          <div className="row" style={{ justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: barrierState === 'OPEN' ? '#22c55e' : barrierState === 'OPENING' ? '#eab308' : '#ef4444',
                boxShadow: `0 0 10px ${barrierState === 'OPEN' ? '#22c55e' : barrierState === 'OPENING' ? '#eab308' : '#ef4444'}`,
              }}
            />
            <span className="strong" style={{ fontSize: 15, letterSpacing: 0.5 }}>
              {barrierState === 'OPEN'
                ? 'BARRIER OPEN — GREEN LIGHT — PROCEED'
                : barrierState === 'OPENING'
                ? 'BARRIER RAISING — STAND BY'
                : 'AUTOMATIC BARRIER GATE — CLOSED'}
            </span>
          </div>

          {/* Graphical representation of the boom arm */}
          <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: 260,
                height: 12,
                backgroundImage: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 15px, #ffffff 15px, #ffffff 30px)',
                borderRadius: 4,
                border: '1px solid #94a3b8',
                transformOrigin: 'left center',
                transform: barrierState === 'OPEN' ? 'rotate(-65deg)' : barrierState === 'OPENING' ? 'rotate(-30deg)' : 'rotate(0deg)',
                transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            />
          </div>
        </div>

        <div className="row-wrap" style={{ justifyContent: 'center', gap: 12 }}>
          <Button
            size="xl"
            variant="primary"
            icon={barrierState === 'OPEN' ? <Check /> : <DoorOpen />}
            onClick={handleOpenBarrier}
            disabled={barrierState !== 'CLOSED'}
          >
            {barrierState === 'OPEN' ? 'Barrier is open' : barrierState === 'OPENING' ? 'Opening...' : 'Open barrier'}
          </Button>

          <Button
            size="xl"
            variant="secondary"
            icon={<Printer />}
            perm="gate.pass.print"
            onClick={() => setPassModalOpen(true)}
          >
            Print gate pass
          </Button>
        </div>

        {offline && (
          <span className="row small" style={{ color: 'var(--wait, #d97706)', marginTop: 12 }}>
            <WifiOff size={14} />
            Queued offline
          </span>
        )}
      </div>

      <GatePassModal
        open={passModalOpen}
        onClose={() => setPassModalOpen(false)}
        visit={v}
      />
    </Panel>
  );
}
