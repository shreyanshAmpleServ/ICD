import { useState, useRef } from 'react';
import { Camera, Check, Eye, Trash2, Upload, X } from 'lucide-react';
import { Button, Drawer, Field, useToast } from '@/ds/components';

export interface GatePhoto {
  id: string;
  angle: string;
  dataUrl: string;
  timestamp: string;
}

const DEFAULT_ANGLES = [
  'Plate (ANPR)',
  'Front of truck',
  'Rear of truck / doors',
  'Seal close-up',
  'Container side',
];

export function GatePhotoModal({
  open,
  onClose,
  photos = [],
  onSave,
  title = 'Gate Inspection Photos',
}: {
  open: boolean;
  onClose: () => void;
  photos: GatePhoto[];
  onSave: (photos: GatePhoto[]) => void;
  title?: string;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentList, setCurrentList] = useState<GatePhoto[]>(photos);
  const [selectedAngle, setSelectedAngle] = useState(DEFAULT_ANGLES[0]);
  const [previewPhoto, setPreviewPhoto] = useState<GatePhoto | null>(null);

  // Sync with prop when drawer opens
  useState(() => {
    setCurrentList(photos);
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newPhoto: GatePhoto = {
        id: `photo-${Date.now()}`,
        angle: selectedAngle,
        dataUrl,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };
      const updated = [...currentList.filter(p => p.angle !== selectedAngle), newPhoto];
      setCurrentList(updated);
      toast(`Captured photo for: ${selectedAngle}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSimulatedSnap = () => {
    // Generate a high-contrast inspection SVG badge
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#g)"/>
      <rect x="20" y="20" width="360" height="260" rx="8" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="8 6"/>
      <circle cx="200" cy="130" r="45" fill="#0284c7" opacity="0.4"/>
      <text x="200" y="136" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#38bdf8" text-anchor="middle">📸</text>
      <text x="200" y="190" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#f8fafc" text-anchor="middle">${selectedAngle}</text>
      <text x="200" y="215" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Gate Camera GT-07 · ${new Date().toLocaleTimeString('en-GB')}</text>
      <text x="200" y="240" font-family="monospace" font-size="11" fill="#38bdf8" text-anchor="middle">VERIFIED · 1080P OCR OK</text>
    </svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    const newPhoto: GatePhoto = {
      id: `photo-${Date.now()}`,
      angle: selectedAngle,
      dataUrl,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [...currentList.filter(p => p.angle !== selectedAngle), newPhoto];
    setCurrentList(updated);
    toast(`Snapped camera photo for: ${selectedAngle}`);

    // Cycle to next angle if available
    const nextIdx = (DEFAULT_ANGLES.indexOf(selectedAngle) + 1) % DEFAULT_ANGLES.length;
    setSelectedAngle(DEFAULT_ANGLES[nextIdx]);
  };

  const handleRemove = (id: string) => {
    setCurrentList(currentList.filter(p => p.id !== id));
  };

  const handleFinish = () => {
    onSave(currentList);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={<Check />} onClick={handleFinish}>
            Save photos ({currentList.length})
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <Field label="Select inspection angle to capture">
          <div className="row-wrap" style={{ gap: 8 }}>
            {DEFAULT_ANGLES.map((angle) => {
              const hasPhoto = currentList.some((p) => p.angle === angle);
              const isSelected = selectedAngle === angle;
              return (
                <button
                  key={angle}
                  type="button"
                  onClick={() => setSelectedAngle(angle)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: isSelected ? 'var(--ink)' : 'transparent',
                    color: isSelected ? '#fff' : 'inherit',
                    borderColor: hasPhoto ? 'var(--go)' : undefined,
                  }}
                >
                  {angle} {hasPhoto ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="panel" style={{ padding: 16, textAlign: 'center' }}>
          <div className="stack" style={{ alignItems: 'center' }}>
            <Camera size={36} color="var(--ink)" />
            <div className="strong" style={{ fontSize: 16 }}>
              Target: {selectedAngle}
            </div>
            <p className="small muted">
              Use tablet camera or upload an image file from the device
            </p>
            <div className="row-wrap" style={{ justifyContent: 'center', gap: 12 }}>
              <Button size="xl" variant="primary" icon={<Camera />} onClick={handleSimulatedSnap}>
                Snap from camera
              </Button>
              <Button
                size="xl"
                icon={<Upload />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload image file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
            Captured photos ({currentList.length} of {DEFAULT_ANGLES.length})
          </h3>
          {currentList.length === 0 ? (
            <div className="small faint" style={{ padding: 16, textAlign: 'center' }}>
              No photos captured yet. Select an angle above and snap or upload a picture.
            </div>
          ) : (
            <div className="grid-2" style={{ gap: 12 }}>
              {currentList.map((photo) => (
                <div
                  key={photo.id}
                  className="panel"
                  style={{ padding: 8, position: 'relative', overflow: 'hidden' }}
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.angle}
                    style={{
                      width: '100%',
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                    onClick={() => setPreviewPhoto(photo)}
                  />
                  <div className="row-wrap" style={{ marginTop: 6, justifyContent: 'space-between' }}>
                    <span className="xs strong">{photo.angle}</span>
                    <span className="xs muted">{photo.timestamp}</span>
                  </div>
                  <div className="row" style={{ marginTop: 4, gap: 4 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Eye size={12} />}
                      onClick={() => setPreviewPhoto(photo)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={12} color="var(--stop)" />}
                      onClick={() => handleRemove(photo.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setPreviewPhoto(null)}
        >
          <div style={{ maxWidth: 640, width: '100%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={previewPhoto.dataUrl}
              alt={previewPhoto.angle}
              style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
            />
            <div style={{ color: '#fff', marginTop: 12, fontSize: 16, fontWeight: 600 }}>
              {previewPhoto.angle} · {previewPhoto.timestamp}
            </div>
            <div style={{ marginTop: 12 }}>
              <Button variant="ghost" icon={<X />} onClick={() => setPreviewPhoto(null)}>
                Close preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
