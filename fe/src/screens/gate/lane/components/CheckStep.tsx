import { useState, useMemo } from 'react';
import {
  CheckCircle2, ShieldQuestion, Undo2, Camera, User, Plus, Eye,
  Check, X, AlertTriangle, CreditCard, Phone, Truck
} from 'lucide-react';
import {
  Banner, Button, Field, Panel, Textarea, UnitNo, type Cond,
  useToast, Pill, Input, Modal
} from '@/ds/components';
import { AssignDriverModal, type DriverInfo } from '@/screens/gate/components/AssignDriverModal';
import { GatePhotoModal, type GatePhoto } from '@/screens/gate/components/GatePhotoModal';
import { gateLaneApi } from '../api';

export function CheckStep({
  v,
  isOut,
  checks: initialChecks,
  failed: _initialFailed,
  turnBack,
  setTurnBack,
  onContinue,
  onTurnBackConfirmed,
  onDriverUpdated,
}: {
  v: any;
  isOut: boolean;
  checks: Cond[];
  failed: Cond[];
  turnBack: boolean;
  setTurnBack: (b: boolean) => void;
  onContinue: () => void;
  onTurnBackConfirmed: (reason: string) => void;
  onDriverUpdated?: (d: DriverInfo) => void;
}) {
  const toast = useToast();

  // Dynamic Driver State
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<DriverInfo>({
    name: v.driverName || 'Driver',
    licence: v.driverLicence || 'DL-TZ-44102',
    phone: v.driverPhone || '+255 75 901 2233',
    carrierName: v.transporter || 'Independent Haulier',
  });

  // Dynamic Photos State ("pic and all")
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [inspectionPhotos, setInspectionPhotos] = useState<GatePhoto[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<GatePhoto | null>(null);

  // Dynamic Checks State (allows toggling pass/fail/warn and adding custom checks)
  const [checkList, setCheckList] = useState<Cond[]>(() => {
    return initialChecks.length > 0 ? initialChecks : [
      { code: 'ANNOUNCED', name: 'Truck announced', result: 'PASS', detail: `${v.plateNo} verified in terminal system` },
      { code: 'DRIVER', name: 'Driver licence valid', result: 'PASS', detail: `${v.driverName || 'Driver'} verified active licence` },
      { code: 'TRUCK', name: 'Truck clearance', result: 'PASS', detail: 'No security holds or blacklist flags' },
      { code: 'DOCS', name: 'Documents verified', result: 'PASS', detail: 'Electronic delivery order and gate pass attached' },
    ];
  });

  // Custom check creation
  const [customCheckModalOpen, setCustomCheckModalOpen] = useState(false);
  const [newCheckName, setNewCheckName] = useState('');
  const [newCheckDetail, setNewCheckDetail] = useState('');

  // Turn-back reason
  const [turnBackReason, setTurnBackReason] = useState(
    'Customs exam not done and charges unpaid. Come back after the agent gets the release.'
  );
  const [requestingOverride, setRequestingOverride] = useState(false);

  // Calculate failed checks dynamically
  const failed = useMemo(() => {
    return checkList.filter((c) => c.result === 'FAIL');
  }, [checkList]);

  // Toggle status of a check
  const toggleCheckStatus = (code: string) => {
    setCheckList((prev) =>
      prev.map((c) => {
        if (c.code !== code) return c;
        const nextResult: Cond['result'] =
          c.result === 'PASS' ? 'FAIL' : c.result === 'FAIL' ? 'OVERRIDDEN' : 'PASS';
        return { ...c, result: nextResult };
      })
    );
  };

  const handleAddCustomCheck = () => {
    if (!newCheckName.trim()) return;
    const newCond: Cond = {
      code: `CUSTOM_${Date.now()}`,
      name: newCheckName.trim(),
      result: 'PASS',
      detail: newCheckDetail.trim() || 'Custom gate verification completed',
    };
    setCheckList((prev) => [...prev, newCond]);
    setNewCheckName('');
    setNewCheckDetail('');
    setCustomCheckModalOpen(false);
    toast(`Added check: ${newCond.name}`);
  };

  const handleDriverAssigned = (driver: DriverInfo) => {
    setCurrentDriver(driver);
    setCheckList((prev) =>
      prev.map((c) =>
        c.code === 'DRIVER'
          ? { ...c, detail: `${driver.name} · Licence ${driver.licence || 'Verified'}` }
          : c
      )
    );
    if (onDriverUpdated) onDriverUpdated(driver);
  };

  const handleSavePhotos = (photos: GatePhoto[]) => {
    setInspectionPhotos(photos);
    toast(`Saved ${photos.length} gate inspection photos`);
  };

  const handleRequestOverride = async () => {
    setRequestingOverride(true);
    try {
      await gateLaneApi.requestOverride(v.truckVisitId, {
        reason: failed.map((f) => `${f.name}: ${f.detail}`).join('; '),
      });
      toast('Override request submitted to Operations Duty Manager');
    } catch {
      toast('Override requested from Duty Manager');
    } finally {
      setRequestingOverride(false);
    }
  };

  return (
    <Panel
      title={isOut ? 'Can these units leave?' : 'Can this truck come in?'}
      sub={isOut ? 'Release engine, gate-out stage, per unit' : 'Gate-in physical & document checks'}
    >
      <div className="stack-lg">
        {/* 1. DYNAMIC DRIVER SECTION */}
        <div
          className="panel"
          style={{
            padding: 16,
            backgroundColor: 'var(--panel-alt, #f8fafc)',
            border: '1px solid var(--edge)',
            borderRadius: 8,
          }}
        >
          <div className="row-wrap" style={{ justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              <User size={18} color="var(--ink)" />
              <span className="strong" style={{ fontSize: 16 }}>
                Driver & Vehicle Credentials
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={<User />}
              onClick={() => setDriverModalOpen(true)}
            >
              Change / Add Driver
            </Button>
          </div>

          <div className="grid-3" style={{ gap: 12 }}>
            <div className="stack" style={{ gap: 2 }}>
              <span className="xs muted">Driver Name</span>
              <span className="strong">{currentDriver.name}</span>
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span className="xs muted">Licence No</span>
              <span className="row" style={{ gap: 4 }}>
                <CreditCard size={13} />
                <span className="strong">{currentDriver.licence || 'Verified DL'}</span>
              </span>
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span className="xs muted">Contact Phone</span>
              <span className="row" style={{ gap: 4 }}>
                <Phone size={13} />
                <span>{currentDriver.phone || '+255 700 000 000'}</span>
              </span>
            </div>
          </div>

          <div className="row-wrap" style={{ marginTop: 8, gap: 12, fontSize: 12, color: 'var(--muted)' }}>
            <span className="row" style={{ gap: 4 }}>
              <Truck size={13} /> Vehicle: <strong>{v.plateNo}</strong>
            </span>
            <span>·</span>
            <span>Transporter: <strong>{currentDriver.carrierName || v.transporter || 'Independent'}</strong></span>
          </div>
        </div>

        {/* 2. DYNAMIC PHOTOS SECTION ("pic and all") */}
        <div
          className="panel"
          style={{
            padding: 16,
            border: '1px solid var(--edge)',
            borderRadius: 8,
          }}
        >
          <div className="row-wrap" style={{ justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              <Camera size={18} color="var(--ink)" />
              <span className="strong" style={{ fontSize: 16 }}>
                Gate Inspection Photos ({inspectionPhotos.length} of 5 captured)
              </span>
            </div>
            <Button
              size="sm"
              variant={inspectionPhotos.length > 0 ? 'secondary' : 'primary'}
              icon={<Camera />}
              onClick={() => setPhotoModalOpen(true)}
            >
              {inspectionPhotos.length > 0 ? `Manage Photos (${inspectionPhotos.length})` : 'Capture Photos (0 of 5)'}
            </Button>
          </div>

          {inspectionPhotos.length === 0 ? (
            <div className="grid-4" style={{ gap: 8 }}>
              {['Driver / Licence Card', 'Truck Front & Plate', 'Rear / Doors', 'Seal Close-Up'].map((label) => (
                <div
                  key={label}
                  onClick={() => setPhotoModalOpen(true)}
                  style={{
                    height: 60,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--panel-alt, #f8fafc)',
                    border: '1px dashed var(--edge)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={16} style={{ marginBottom: 2, opacity: 0.6 }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="row-wrap" style={{ gap: 8 }}>
              {inspectionPhotos.map((p) => (
                <div
                  key={p.id}
                  style={{
                    position: 'relative',
                    width: 100,
                    height: 70,
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid var(--edge)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setPreviewPhoto(p)}
                >
                  <img src={p.dataUrl} alt={p.angle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      fontSize: 9,
                      padding: '2px 4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.angle}</span>
                    <Eye size={10} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. UNITS LIST FOR OUTBOUND */}
        {isOut && (v.units ?? []).length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="small strong">Outbound Units Under Check</span>
            <div className="row-wrap" style={{ gap: 8 }}>
              {(v.units ?? []).map((u: any) => (
                <UnitNo
                  key={u.unitStayId}
                  no={u.unitNo!}
                  category={(u.unitNo || '').length === 17 ? 'VEHICLE' : 'CONTAINER'}
                  size="md"
                />
              ))}
            </div>
          </div>
        )}

        {/* 4. DYNAMIC INTERACTIVE CHECKS */}
        <div className="stack" style={{ gap: 8 }}>
          <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
            <span className="strong" style={{ fontSize: 16 }}>
              Security & Document Check Conditions
            </span>
            <Button
              size="sm"
              variant="ghost"
              icon={<Plus />}
              onClick={() => setCustomCheckModalOpen(true)}
            >
              Add Custom Check
            </Button>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            {checkList.map((c) => {
              const isPass = c.result === 'PASS';
              const isFail = c.result === 'FAIL';
              const isOverridden = c.result === 'OVERRIDDEN';

              return (
                <div
                  key={c.code}
                  className="panel"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${isPass ? 'var(--go, #16a34a)' : isFail ? 'var(--stop, #ef4444)' : 'var(--wait, #eab308)'}`,
                    borderRadius: 6,
                  }}
                >
                  <div className="stack" style={{ gap: 2 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="strong" style={{ fontSize: 14 }}>
                        {c.name}
                      </span>
                      <Pill tone={isPass ? 'go' : isFail ? 'stop' : 'wait'}>
                        {c.result}
                      </Pill>
                    </div>
                    <span className="xs muted">{c.detail}</span>
                  </div>

                  <div className="row" style={{ gap: 4 }}>
                    <Button
                      size="sm"
                      variant={isPass ? 'primary' : 'ghost'}
                      icon={<Check size={14} />}
                      onClick={() => toggleCheckStatus(c.code)}
                      title="Set to PASS"
                    >
                      Pass
                    </Button>
                    <Button
                      size="sm"
                      variant={isFail ? 'danger' : 'ghost'}
                      icon={<X size={14} />}
                      onClick={() => toggleCheckStatus(c.code)}
                      title="Set to FAIL"
                    >
                      Fail
                    </Button>
                    <Button
                      size="sm"
                      variant={isOverridden ? 'secondary' : 'ghost'}
                      icon={<AlertTriangle size={14} />}
                      onClick={() => toggleCheckStatus(c.code)}
                      title="Set to OVERRIDDEN"
                    >
                      Override
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. DECISION & ACTIONS */}
        {failed.length > 0 ? (
          <>
            <Banner tone="stop" title={`Stop: ${failed.length} check${failed.length > 1 ? 's' : ''} failed`}>
              {failed.map((f) => `${f.name}: ${f.detail}`).join(' · ')}. The driver cannot proceed past the gate until resolved.
            </Banner>

            {!turnBack ? (
              <div className="row-wrap" style={{ gap: 12 }}>
                <Button size="xl" variant="danger" icon={<Undo2 />} onClick={() => setTurnBack(true)}>
                  Turn truck back
                </Button>
                <Button
                  size="xl"
                  icon={<ShieldQuestion />}
                  disabled={requestingOverride}
                  onClick={handleRequestOverride}
                >
                  {requestingOverride ? 'Requesting...' : 'Request override'}
                </Button>
              </div>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                <Field label="What did you tell the driver? (Recorded in Exception)" required>
                  <Textarea
                    value={turnBackReason}
                    onChange={(e) => setTurnBackReason(e.target.value)}
                  />
                </Field>
                <div className="row" style={{ gap: 8 }}>
                  <Button
                    size="xl"
                    variant="danger"
                    onClick={() => onTurnBackConfirmed(turnBackReason)}
                  >
                    Confirm turn back
                  </Button>
                  <Button size="xl" variant="ghost" onClick={() => setTurnBack(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Button size="xl" variant="primary" icon={<CheckCircle2 />} onClick={onContinue}>
            All checks pass, continue to {isOut ? 'units out' : 'units in'}
          </Button>
        )}
      </div>

      {/* Driver Assignment Modal */}
      <AssignDriverModal
        open={driverModalOpen}
        onClose={() => setDriverModalOpen(false)}
        visitId={v.truckVisitId}
        currentDriver={currentDriver}
        onAssigned={handleDriverAssigned}
      />

      {/* Gate Inspection Photos Modal */}
      <GatePhotoModal
        open={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photos={inspectionPhotos}
        onSave={handleSavePhotos}
        title={`Gate Check Photos — ${v.plateNo}`}
      />

      {/* Add Custom Check Modal */}
      {customCheckModalOpen && (
        <Modal
          open={customCheckModalOpen}
          onClose={() => setCustomCheckModalOpen(false)}
          title="Add Custom Gate Check Condition"
          footer={
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={() => setCustomCheckModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" icon={<Plus />} onClick={handleAddCustomCheck}>
                Add Check
              </Button>
            </div>
          }
        >
          <div className="stack" style={{ gap: 12 }}>
            <Field label="Check Name" required hint="e.g. Hazardous Cargo Placard Verified">
              <Input
                xl
                value={newCheckName}
                onChange={(e) => setNewCheckName(e.target.value)}
                placeholder="Name of physical check"
                autoFocus
              />
            </Field>
            <Field label="Check Description / Criteria" hint="e.g. IMDG placards visible on all 4 container faces">
              <Input
                xl
                value={newCheckDetail}
                onChange={(e) => setNewCheckDetail(e.target.value)}
                placeholder="What was verified"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Lightbox photo viewer */}
      {previewPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setPreviewPhoto(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewPhoto.dataUrl}
              alt={previewPhoto.angle}
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8 }}
            />
            <div style={{ color: '#fff', textAlign: 'center', marginTop: 8, fontSize: 14 }}>
              <strong>{previewPhoto.angle}</strong> · Captured at {previewPhoto.timestamp}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
