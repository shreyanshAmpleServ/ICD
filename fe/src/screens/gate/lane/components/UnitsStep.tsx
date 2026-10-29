import { useState } from 'react';
import { Camera, CheckCircle2, Check } from 'lucide-react';
import { Banner, Button, Field, Input, Panel, Pill, Segmented, UnitNo, useToast } from '@/ds/components';
import { GatePhotoModal, type GatePhoto } from '../../components/GatePhotoModal';
import { DriverSignaturePad } from '../../components/DriverSignaturePad';

export function UnitsStep({
  v,
  isOut,
  seal,
  setSeal,
  sig,
  setSig,
  onComplete,
}: {
  v: any;
  isOut: boolean;
  seal: Record<number, string>;
  setSeal: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  sig: 'SCREEN' | 'PAPER';
  setSig: (s: 'SCREEN' | 'PAPER') => void;
  onComplete: () => void;
}) {
  const toast = useToast();
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [activeUnitStayId, setActiveUnitStayId] = useState<number | null>(null);
  const [unitPhotos, setUnitPhotos] = useState<Record<number, GatePhoto[]>>({});
  const [driverSigned, setDriverSigned] = useState(false);

  const openPhotos = (unitStayId: number) => {
    setActiveUnitStayId(unitStayId);
    setPhotoModalOpen(true);
  };

  const handleSavePhotos = (photos: GatePhoto[]) => {
    if (activeUnitStayId != null) {
      setUnitPhotos((prev) => ({ ...prev, [activeUnitStayId]: photos }));
      toast(`Saved ${photos.length} inspection photos`);
    }
  };

  const currentPhotos = activeUnitStayId != null ? (unitPhotos[activeUnitStayId] ?? []) : [];

  return (
    <Panel title={isOut ? 'Hand over the units' : 'Receive the units'}>
      <div className="stack-lg">
        {(v.units ?? []).length === 0 ? (
          <div className="panel" style={{ padding: 16 }}>
            <span className="small muted">No mounted containers for this tractor (Bobtail move).</span>
          </div>
        ) : (
          (v.units ?? []).map((u: any) => {
            const val = seal[u.unitStayId] ?? '';
            const ok = !u.sealExpected || val === '' || val === u.sealExpected;
            const photosCount = (unitPhotos[u.unitStayId] ?? []).length;

            return (
              <div key={u.unitStayId} className="panel" style={{ padding: 16 }}>
                <div className="row-wrap" style={{ marginBottom: 12 }}>
                  <UnitNo
                    no={u.unitNo || 'MSKU 882014 9'}
                    category={(u.unitNo || '').length === 17 ? 'VEHICLE' : 'CONTAINER'}
                    size="md"
                  />
                  <span className="spacer" />
                  <Pill tone="info">{u.direction === 'PICK' ? 'Leaving' : 'Arriving'}</Pill>
                </div>
                <div className="grid-2">
                  <Field
                    label="Seal on the door"
                    hint={u.sealExpected ? `Expected ${u.sealExpected}` : 'No seal expected'}
                    error={!ok ? 'Does not match: the unit will be held and an exception opened' : undefined}
                  >
                    <Input
                      xl
                      value={val}
                      placeholder={u.sealExpected ?? 'e.g. SEAL-99821'}
                      onChange={(e) => setSeal({ ...seal, [u.unitStayId]: e.target.value.toUpperCase() })}
                    />
                  </Field>

                  <Field label="Photos" hint="Four sides and the seal (5 angles)">
                    <Button
                      size="xl"
                      variant={photosCount > 0 ? 'secondary' : undefined}
                      icon={photosCount > 0 ? <Check color="var(--go)" /> : <Camera />}
                      onClick={() => openPhotos(u.unitStayId)}
                    >
                      {photosCount > 0
                        ? `Inspection Photos (${photosCount} of 5 saved)`
                        : 'Take photos (0 of 5)'}
                    </Button>
                  </Field>
                </div>
              </div>
            );
          })
        )}

        <Field label="Driver signature">
          <Segmented
            xl
            value={sig}
            onChange={setSig}
            options={[
              { id: 'SCREEN', label: `Sign on screen${driverSigned ? ' (Captured)' : ''}` },
              { id: 'PAPER', label: 'Paper EIR, scan later' },
            ]}
          />
        </Field>

        {sig === 'SCREEN' ? (
          <DriverSignaturePad
            onSigned={() => {
              setDriverSigned(true);
              toast('Driver signature captured and recorded for EIR');
            }}
          />
        ) : (
          <Banner tone="wait">
            Print the EIR, have the driver sign it, then scan it within 24 hours. Until then the EIR shows “signature pending”.
          </Banner>
        )}

        <Button size="xl" variant="primary" icon={<CheckCircle2 />} onClick={onComplete}>
          Complete {isOut ? 'gate-out' : 'gate-in'}
        </Button>
      </div>

      <GatePhotoModal
        open={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photos={currentPhotos}
        onSave={handleSavePhotos}
        title="Gate Lane Inspection Photos"
      />
    </Panel>
  );
}
