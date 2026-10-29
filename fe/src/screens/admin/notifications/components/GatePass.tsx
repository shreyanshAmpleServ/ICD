export function GatePass({ watermark, sw }: { watermark: string | null; sw?: boolean }) {
  return (
    <div className="adm-pass" role="img" aria-label="Gate pass preview">
      <div className="hd">
        <b>{sw ? 'KIBALI CHA GETI' : 'GATE PASS'}</b>
        <span>GP-26-08812</span>
      </div>
      <div className="row2">
        <div>
          <div className="lbl">Mlimani ICD · DAR1</div>
          <div>07 Oct 2026 10:05</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="lbl">{sw ? 'Gari' : 'Truck'}</div>
          <div className="big" style={{ fontSize: 14 }}>T 412 DKL</div>
        </div>
      </div>
      <div>
        <div className="lbl">{sw ? 'Kontena' : 'Unit'}</div>
        <div className="big">MSKU 402117 8</div>
        <div>45G1 · seal ML-7781203</div>
      </div>
      <div className="row2">
        <div>
          <div className="lbl">{sw ? 'Dereva' : 'Driver'}</div>
          <div>Baraka Mwita</div>
        </div>
        <div>
          <div className="lbl">Release</div>
          <div>RO-DAR1-26-01942</div>
        </div>
      </div>
      <div className="qr" aria-hidden />
      <div style={{ textAlign: 'center' }} className="lbl">
        {sw ? 'Onyesha getini. Halali leo tu.' : 'Show at the outer gate. Valid today only.'}
      </div>
      {watermark && <div className="wm">{watermark}</div>}
    </div>
  );
}
