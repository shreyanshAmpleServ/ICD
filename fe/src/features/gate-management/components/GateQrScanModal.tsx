import { useState } from 'react';
import { QrCode, ScanLine, X, Truck } from 'lucide-react';
import { Button, Input, Pill } from '@/ds/components';

export function GateQrScanModal({
  open,
  onClose,
  waiting = [],
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  waiting: any[];
  onSelect: (visitId: number) => void;
}) {
  const [barcodeInput, setBarcodeInput] = useState('');

  if (!open) return null;

  const handleSimulateScan = (v: any) => {
    onSelect(v.truckVisitId);
    onClose();
  };

  const handleManualSubmit = () => {
    if (!barcodeInput.trim()) return;
    const query = barcodeInput.trim().toLowerCase();
    const found = waiting.find(
      (w) =>
        w.plateNo?.toLowerCase().includes(query) ||
        String(w.truckVisitId) === query ||
        (w.visitNo && w.visitNo.toLowerCase().includes(query))
    );
    if (found) {
      onSelect(found.truckVisitId);
      onClose();
    } else if (waiting[0]) {
      // Default to first match or trigger
      onSelect(waiting[0].truckVisitId);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          color: 'var(--ink, #1f2937)',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          width: '100%',
          maxWidth: 520,
          overflow: 'hidden',
          border: '1px solid var(--edge, #e5e7eb)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--edge, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel, #f9fafb)',
          }}
        >
          <div className="row" style={{ gap: 8 }}>
            <ScanLine size={20} color="var(--ink)" />
            <span className="strong" style={{ fontSize: 16 }}>Scan Pass QR or Barcode</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--faint, #6b7280)',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }} className="stack-lg">
          {/* Camera Frame Simulator */}
          <div
            style={{
              height: 180,
              borderRadius: 8,
              border: '2px dashed var(--accent, #0284c7)',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: '#38bdf8',
                boxShadow: '0 0 8px #38bdf8',
                animation: 'pulse 2s infinite',
              }}
            />
            <QrCode size={48} color="#38bdf8" />
            <div className="small strong" style={{ marginTop: 8 }}>Optical Scanner Active</div>
            <div className="xs muted" style={{ color: '#94a3b8' }}>Point camera at driver gate pass or ANPR plate</div>
          </div>

          {/* Barcode scanner input */}
          <div className="stack" style={{ gap: 6 }}>
            <label className="small strong">Scanner Device Input / Type Plate or Pass #</label>
            <div className="row" style={{ gap: 8 }}>
              <Input
                xl
                value={barcodeInput}
                placeholder="Scan GP-26-XXXX or type plate..."
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSubmit();
                }}
              />
              <Button size="xl" variant="primary" onClick={handleManualSubmit}>
                Scan
              </Button>
            </div>
          </div>

          {/* Queued Trucks Quick Scan */}
          <div className="stack" style={{ gap: 8 }}>
            <span className="xs strong muted">CURRENT TRUCKS IN LANE QUEUE (CLICK TO SCAN):</span>
            <div className="stack" style={{ gap: 6, maxHeight: 180, overflowY: 'auto' }}>
              {waiting.length === 0 ? (
                <div className="xs muted" style={{ padding: 8 }}>No waiting trucks in this lane</div>
              ) : (
                waiting.map((w) => (
                  <button
                    key={w.truckVisitId}
                    onClick={() => handleSimulateScan(w)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--edge)',
                      background: 'var(--panel)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div className="row" style={{ gap: 8 }}>
                      <Truck size={16} />
                      <span className="strong font-mono">{w.plateNo}</span>
                      <span className="xs muted">· {w.driverName}</span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <span className="xs font-mono muted">GP-26-{String(w.truckVisitId).padStart(4, '0')}</span>
                      <Pill tone="info">Simulate Scan</Pill>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
