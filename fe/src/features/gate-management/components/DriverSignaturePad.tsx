import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, RotateCcw, FileSignature, Check } from 'lucide-react';
import { Button } from '@/ds/components';

export function DriverSignaturePad({
  onSigned,
}: {
  onSigned?: (signatureDataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (confirmed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || confirmed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setConfirmed(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setConfirmed(true);
    const dataUrl = canvas.toDataURL('image/png');
    if (onSigned) onSigned(dataUrl);
  };

  return (
    <div
      style={{
        border: '1px solid var(--edge, #e2e8f0)',
        borderRadius: 8,
        padding: 16,
        background: 'var(--panel, #f8fafc)',
      }}
      className="stack"
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 6 }}>
          <FileSignature size={18} color="var(--ink)" />
          <span className="small strong">Driver Digital Signature (Touch / Pen / Mouse)</span>
        </div>
        {confirmed && (
          <span className="row" style={{ color: 'var(--go, #16a34a)', fontSize: 13, fontWeight: 600, gap: 4 }}>
            <CheckCircle2 size={16} /> Signature Verified
          </span>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={540}
          height={140}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            width: '100%',
            height: 140,
            borderRadius: 6,
            background: confirmed ? '#f0fdf4' : '#ffffff',
            border: `2px dashed ${confirmed ? 'var(--go, #16a34a)' : '#cbd5e1'}`,
            cursor: confirmed ? 'default' : 'crosshair',
            touchAction: 'none',
          }}
        />
        {!hasDrawn && !confirmed && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
              fontSize: 14,
              fontStyle: 'italic',
            }}
          >
            Driver signs here on screen
          </div>
        )}
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={handleClear} disabled={!hasDrawn}>
          Clear
        </Button>
        <Button
          size="sm"
          variant={confirmed ? 'secondary' : 'primary'}
          icon={<Check size={14} />}
          onClick={handleConfirm}
          disabled={!hasDrawn || confirmed}
        >
          {confirmed ? 'Signed & Confirmed' : 'Confirm Signature'}
        </Button>
      </div>
    </div>
  );
}
