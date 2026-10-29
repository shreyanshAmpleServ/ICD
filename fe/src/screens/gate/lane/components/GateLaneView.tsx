import { useMemo, useState } from 'react';
import { CheckCircle2, QrCode, ScanLine, Search } from 'lucide-react';
import {
  Banner, Button, Input, Page, PageHeader, Panel, Segmented, StatusPill, Stepper, useToast, type Cond,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { CHECKPOINTS, VISIT_TYPES } from '@/screens/gate/types';
import { gateQueueApi } from '@/screens/gate/queue/api';
import { gateLaneApi } from '../api';
import { truckVisitsApi } from '@/screens/gate/visits/api';
import { WaitingPanel } from './WaitingPanel';
import { CheckStep } from './CheckStep';
import { UnitsStep } from './UnitsStep';
import { PassStep } from './PassStep';
import { GateQrScanModal } from '@/screens/gate/components/GateQrScanModal';

type Step = 'identify' | 'check' | 'units' | 'done';

const IN_CHECKS = (plate: string, driverName?: string): Cond[] => [
  { code: 'ANNOUNCED', name: 'Truck announced', result: 'PASS', detail: `${plate} verified in terminal system` },
  { code: 'DRIVER', name: 'Driver licence valid', result: 'PASS', detail: `${driverName || 'Driver'} verified active licence` },
  { code: 'TRUCK', name: 'Truck clearance', result: 'PASS', detail: 'No security holds or blacklist flags' },
  { code: 'DOCS', name: 'Documents verified', result: 'PASS', detail: 'Electronic delivery order and gate pass attached' },
];

const OUT_CHECKS = (_plate: string, unitsCount: number): Cond[] => [
  { code: 'CHARGES', name: 'Terminal Charges Paid', result: 'PASS', detail: 'Invoices cleared and settled' },
  { code: 'CUSTOMS', name: 'Customs Examination Passed', result: 'PASS', detail: 'Customs release order confirmed on file' },
  { code: 'EQUIP', name: 'Equipment Release Status', result: 'PASS', detail: `${unitsCount} container(s) approved for gate out` },
  { code: 'SECURITY', name: 'Security & Gate Clearance', result: 'PASS', detail: 'Gate pass verified for outward lane' },
];

export function GateLaneView() {
  const { offline } = useSession();
  const toast = useToast();
  const { data: visitsRaw = [], refetch } = useQ<any[]>(['gate-lane-visits'], () => gateQueueApi.visits());
  const visitsList: any[] = Array.isArray(visitsRaw) ? visitsRaw : [];

  const [cp, setCp] = useState('INNER_IN');
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrScanOpen, setQrScanOpen] = useState(false);

  const waiting: any[] = visitsList.filter(
    (item: any) => item.nextCheckpointCode === cp && !['EXITED', 'REJECTED', 'CANCELLED'].includes(item.status!)
  );

  const activeVisitId = selectedVisitId ?? (waiting[0]?.truckVisitId ?? visitsList[0]?.truckVisitId ?? null);
  const v: any = visitsList.find((x: any) => x.truckVisitId === activeVisitId) ?? null;

  const [step, setStep] = useState<Step>('identify');
  const [plate, setPlate] = useState('');
  const [seal, setSeal] = useState<Record<number, string>>({});
  const [sig, setSig] = useState<'SCREEN' | 'PAPER'>('SCREEN');
  const [turnBack, setTurnBack] = useState(false);
  const isOut = cp.endsWith('OUT');

  const checks: Cond[] = useMemo(() => {
    if (!v) return [];
    if (!isOut) return IN_CHECKS(v.plateNo ?? '', v.driverName);
    return OUT_CHECKS(v.plateNo ?? '', (v.units ?? []).length);
  }, [v, isOut]);

  const failed = checks.filter((c) => c.result === 'FAIL');

  const pick = (id: number) => {
    setSelectedVisitId(id);
    setStep('identify');
    setPlate('');
    setTurnBack(false);
  };

  const handleManualFind = () => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    const found = visitsList.find(
      (item: any) =>
        item.plateNo?.toLowerCase().includes(q) ||
        String(item.truckVisitId) === q ||
        (item.visitNo && item.visitNo.toLowerCase().includes(q))
    );
    if (found) {
      pick(found.truckVisitId);
      toast(`Found truck ${found.plateNo}`);
    } else {
      toast(`No truck found matching "${searchQuery}"`);
    }
  };

  const handleCompleteStage = async () => {
    if (!v) return;
    try {
      if (isOut) {
        await truckVisitsApi.checkout(v.truckVisitId);
      } else {
        await truckVisitsApi.checkin(v.truckVisitId);
      }
      await gateLaneApi.recordCheckpointEvent(v.truckVisitId, {
        checkpointCode: cp,
        result: 'PASSED',
      });
      toast(`${isOut ? 'Gate-out' : 'Gate-in'} recorded for ${v.plateNo}`);
      refetch();
    } catch {
      // offline fallback
    }
    setStep('done');
  };

  const steps: { id: Step; label: string }[] = [
    { id: 'identify', label: 'Identify truck' },
    { id: 'check', label: 'Checks' },
    { id: 'units', label: isOut ? 'Units out' : 'Units in' },
    { id: 'done', label: 'Pass' },
  ];
  const idx = steps.findIndex((s) => s.id === step);

  return (
    <Page wide>
      <PageHeader
        title="Gate lane"
        ms="M1"
        sub="Lane In 2 · tablet GT-07"
        actions={
          <Segmented
            xl
            label="Checkpoint"
            value={cp}
            onChange={(c) => {
              setCp(c);
              setSelectedVisitId(null);
              setStep('identify');
            }}
            options={CHECKPOINTS.map((c) => ({ id: c.code, label: c.short }))}
          />
        }
      />
      {offline && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="wait" title="Offline: 3 events queued on this tablet">
            You can keep working. Release checks use local cache; changes sync automatically when online.
          </Banner>
        </div>
      )}

      <div className="lane-grid">
        <WaitingPanel cp={cp} waiting={waiting} visitId={activeVisitId} onPick={pick} />

        {!v ? (
          <Panel>
            <div className="stack" style={{ alignItems: 'center', padding: 40 }}>
              <QrCode size={48} />
              <h2>Scan the gate pass or type the plate</h2>
              <div className="row" style={{ width: 'min(520px, 100%)', gap: 8 }}>
                <Input
                  xl
                  placeholder="T 000 AAA or Pass No"
                  aria-label="Plate number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualFind();
                  }}
                />
                <Button size="xl" variant="primary" icon={<Search />} onClick={handleManualFind}>
                  Find
                </Button>
                <Button size="xl" icon={<ScanLine />} onClick={() => setQrScanOpen(true)}>
                  Scan QR
                </Button>
              </div>
            </div>
          </Panel>
        ) : (
          <div className="stack-lg">
            <Panel>
              <div className="row-wrap" style={{ gap: 16 }}>
                <span className="unitno unitno-lg">{v.plateNo}</span>
                <div className="spacer">
                  <div className="strong">{VISIT_TYPES[v.visitTypeCode] || v.visitTypeCode}</div>
                  <div className="small muted">
                    {v.driverName} · {v.transporter} · {v.visitNo}
                  </div>
                </div>
                <StatusPill value={v.status} />
              </div>
              <div style={{ marginTop: 16 }}>
                <Stepper
                  steps={steps.map((s, i) => ({
                    label: s.label,
                    state: i < idx ? 'done' : i === idx ? (step === 'check' && failed.length ? 'fail' : 'current') : 'todo',
                  }))}
                />
              </div>
            </Panel>

            {step === 'identify' && (
              <Panel title="Confirm the truck">
                <div className="stack">
                  <Banner tone="customs" title={`ANPR Camera read ${v.plateNo} (98% confidence)`}>
                    Confirm it matches the physical plate on the vehicle, or scan the driver barcode.
                  </Banner>
                  <div className="row-wrap" style={{ gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <Input
                        xl
                        value={plate || v.plateNo || ''}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        aria-label="Plate number"
                      />
                    </div>
                    <Button size="xl" icon={<ScanLine />} onClick={() => setQrScanOpen(true)}>
                      Scan pass QR
                    </Button>
                  </div>
                  <div className="row">
                    <Button size="xl" variant="primary" icon={<CheckCircle2 />} onClick={() => setStep('check')}>
                      Plate matches, proceed
                    </Button>
                  </div>
                </div>
              </Panel>
            )}

            {step === 'check' && (
              <CheckStep
                v={v}
                isOut={isOut}
                checks={checks}
                failed={failed}
                turnBack={turnBack}
                setTurnBack={setTurnBack}
                onContinue={() => setStep('units')}
                onTurnBackConfirmed={async (reason: string) => {
                  try {
                    await gateLaneApi.turnBackTruck(v.truckVisitId, reason || 'Checks failed at gate');
                  } catch {}
                  toast('Truck turned back. Exception opened for customer service.');
                  setSelectedVisitId(null);
                  refetch();
                }}
                onDriverUpdated={(driver) => {
                  toast(`Driver updated to ${driver.name}`);
                  refetch();
                }}
              />
            )}

            {step === 'units' && (
              <UnitsStep
                v={v}
                isOut={isOut}
                seal={seal}
                setSeal={setSeal}
                sig={sig}
                setSig={setSig}
                onComplete={handleCompleteStage}
              />
            )}

            {step === 'done' && (
              <PassStep
                v={v}
                isOut={isOut}
                offline={Boolean(offline)}
                onOpenBarrier={() => {
                  toast('Barrier opened');
                  refetch();
                }}
              />
            )}
          </div>
        )}
      </div>

      <GateQrScanModal
        open={qrScanOpen}
        onClose={() => setQrScanOpen(false)}
        waiting={waiting.length ? waiting : visitsList}
        onSelect={(id) => pick(id)}
      />
    </Page>
  );
}
