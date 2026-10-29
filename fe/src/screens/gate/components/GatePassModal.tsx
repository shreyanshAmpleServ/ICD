import { Printer, X, ShieldCheck, QrCode } from 'lucide-react';
import { Button } from '@/ds/components';

export function GatePassModal({
  open,
  onClose,
  visit,
}: {
  open: boolean;
  onClose: () => void;
  visit: any;
}) {
  if (!open || !visit) return null;

  const passNo = visit.gatePassNo || `GP-26-${String(visit.truckVisitId || 1001).padStart(5, '0')}`;
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const handlePrint = () => {
    window.print();
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
          maxWidth: 640,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--edge, #e5e7eb)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
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
            <Printer size={20} color="var(--ink)" />
            <span className="strong" style={{ fontSize: 16 }}>Official Terminal Gate Pass</span>
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

        {/* Printable Pass Body */}
        <div
          className="print-section"
          style={{
            padding: 24,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Header block with Logo and Pass ID */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--ink)', paddingBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>DAR ES SALAAM ICD TERMINAL</div>
              <div className="small muted">Inland Container Depot · Security & Gate Authority</div>
              <div className="xs muted" style={{ marginTop: 4 }}>Terminal Site: DAR-01 (Kurasini Complex)</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent, #0284c7)' }}>
                {passNo}
              </div>
              <div className="xs muted">Issued: {now}</div>
              <span className="pill pill-success" style={{ marginTop: 4, display: 'inline-block' }}>
                VALID / AUTHORIZED
              </span>
            </div>
          </div>

          {/* Barcode & QR Code Simulator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--panel, #f9fafb)',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px dashed var(--edge, #d1d5db)',
            }}
          >
            <div className="stack" style={{ gap: 4 }}>
              <div className="xs strong muted">OPTICAL BARCODE / PASS ID</div>
              <div style={{ letterSpacing: 5, fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}>
                ||| | |||| | |||||| || | ||| ||||
              </div>
              <div className="xs font-mono">{passNo}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <QrCode size={48} />
              <div className="stack" style={{ gap: 2 }}>
                <span className="xs strong">ANPR FastPass</span>
                <span className="xs muted">Lane Scanner Valid</span>
              </div>
            </div>
          </div>

          {/* Vehicle & Driver Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              background: 'var(--panel, #f9fafb)',
              padding: 16,
              borderRadius: 8,
            }}
          >
            <div>
              <div className="xs muted strong">TRUCK REGISTRATION</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>
                {visit.plateNo || 'T 000 AAA'}
              </div>
              <div className="xs muted" style={{ marginTop: 4 }}>
                Lane: <strong>{visit.lane || 'In 1'}</strong>
              </div>
            </div>

            <div>
              <div className="xs muted strong">DRIVER NAME</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
                {visit.driverName || 'Authorized Driver'}
              </div>
              <div className="xs muted" style={{ marginTop: 4 }}>
                Licence: {visit.driverLicence || 'Verified On File'}
              </div>
            </div>

            <div>
              <div className="xs muted strong">TRANSPORTER / HAULIER</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                {visit.transporter || 'Independent Haulier'}
              </div>
            </div>

            <div>
              <div className="xs muted strong">VISIT PURPOSE / STAGE</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                {visit.visitTypeCode || 'IMPORT_PICKUP'}
              </div>
              <div className="xs muted" style={{ marginTop: 2 }}>Status: {visit.status || 'IN_PROGRESS'}</div>
            </div>
          </div>

          {/* Units / Cargo table */}
          <div>
            <div className="small strong" style={{ marginBottom: 8 }}>Authorized Units / Containers</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--edge)', textAlign: 'left', background: 'var(--panel)' }}>
                  <th style={{ padding: '8px 10px' }}>Unit No</th>
                  <th style={{ padding: '8px 10px' }}>Type</th>
                  <th style={{ padding: '8px 10px' }}>Direction</th>
                  <th style={{ padding: '8px 10px' }}>Seal Verified</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(visit.units && visit.units.length > 0) ? (
                  visit.units.map((u: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--edge)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, fontFamily: 'monospace' }}>
                        {u.unitNo || 'MSKU 882014 9'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>40ft HC (45G1)</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span className="pill pill-info">{u.direction === 'PICK' ? 'Leaving (Pick)' : 'Arriving (Drop)'}</span>
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                        {u.sealExpected || 'SEAL-OK'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span className="pill pill-success">PASS</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr style={{ borderBottom: '1px solid var(--edge)' }}>
                    <td colSpan={5} style={{ padding: 12, textAlign: 'center', color: 'var(--muted)' }}>
                      Tractor Only / Bobtail (No mounted containers)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Verification Stamps */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
            <div className="row" style={{ gap: 6, color: 'var(--go, #16a34a)', fontSize: 13, fontWeight: 600 }}>
              <ShieldCheck size={18} />
              <span>Identity & customs checks verified</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="xs muted">Duty Officer Signature:</div>
              <div style={{ fontFamily: 'cursive', fontSize: 16, borderBottom: '1px solid var(--edge)', paddingBottom: 2 }}>
                Officer Ally S. (ID #4092)
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--edge, #e5e7eb)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            background: 'var(--panel, #f9fafb)',
          }}
        >
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon={<Printer />} onClick={handlePrint}>
            Print Gate Pass
          </Button>
        </div>
      </div>
    </div>
  );
}
