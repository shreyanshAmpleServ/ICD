import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, FileSpreadsheet, Plus } from 'lucide-react';
import type { S } from '@/api/types';
import { Banner, Button, Chips, DL, DataTable, Drawer, Empty, Kpi, Page, PageHeader, Panel, Pill, StatusPill, fmtDT, useToast } from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { allStays, consignments, partyName, vesselCalls } from '@/mock/core';
import { hoursUntil, manifests } from '@/mock/cargo';
import { Countdown, Progress } from './shared';

/* GET /vessel-calls. For imports the key moment is "discharge completed":
   that is when the storage clock starts for every unit on the call. For
   export calls the cut-offs decide what can still go. */
type Quick = 'all' | 'import' | 'export';
const isExport = (v: S<'VesselCall'>) => consignments.some((c) => c.vesselCallId === v.vesselCallId && c.cargoRegimeCode === 'EXPORT');
const stats = (v: S<'VesselCall'>) => {
  const cs = consignments.filter((c) => c.vesselCallId === v.vesselCallId);
  const us = allStays.filter((s) => cs.some((c) => c.consignmentId === s.consignmentId));
  return { cs, expected: cs.reduce((n, c) => n + (c.unitsExpected ?? 0), 0), received: us.filter((s) => s.physicalStatus !== 'EXPECTED').length, out: us.filter((s) => s.physicalStatus === 'DEPARTED').length };
};

export function VesselCalls() {
  const [quick, setQuick] = useState<Quick>('all');
  const [sel, setSel] = useState<number | null>(null);
  const { data = [] } = useQ(['vessel-calls'], () => delay(vesselCalls));
  const rows = [...data].sort((a, b) => Date.parse(b.eta ?? '') - Date.parse(a.eta ?? '')).filter((v) => quick === 'all' || (quick === 'export') === isExport(v));
  const v = data.find((x) => x.vesselCallId === sel);
  const nextExport = data.find((x) => isExport(x) && x.status === 'EXPECTED');

  return (
    <Page>
      <PageHeader title="Vessel calls" ms="M1" sub="Ships whose cargo comes to or goes from this depot through Dar es Salaam port"
        actions={<Button variant="primary" icon={<Plus />} perm="consignment.edit">Add vessel call</Button>} />
      <div className="stack-lg">
        <Banner tone="customs" title="Discharge completed starts the storage clock">
          Free days for every unit on a call count from the moment the port reports discharge completed, not from gate-in. Check the time against the port's discharge report.
        </Banner>
        <div className="kpi-strip">
          <Kpi label="Expected at port" value={data.filter((x) => x.status === 'EXPECTED').length} unit="calls" />
          <Kpi label="Discharged, units still to come" value={data.filter((x) => x.dischargeCompletedAt && stats(x).received < stats(x).expected).length} unit="calls" />
          <Kpi label="Next gate cut-off" value={nextExport?.gateCutoffAt ? fmtDT(nextExport.gateCutoffAt) : '—'} delta={nextExport ? `${nextExport.vesselName} ${nextExport.voyageNo}` : undefined} />
        </div>
        <Panel flush>
          <div className="toolbar">
            <Chips<Quick> value={quick} onChange={setQuick} options={[{ id: 'all', label: 'All calls' }, { id: 'import', label: 'Import' }, { id: 'export', label: 'Export' }]} />
          </div>
          <DataTable rows={rows} rowKey={(x) => x.vesselCallId!} onRow={(x) => setSel(x.vesselCallId!)} selected={sel}
            empty={<Empty title="No vessel calls">Add a call or import a manifest to create one.</Empty>}
            cols={[
              { key: 'v', header: 'Vessel', render: (x) => <><span className="unitno">{x.vesselName} {x.voyageNo}</span><div className="xs faint">{partyName(x.shippingLinePartyId)} · {x.portCallRef}</div></> },
              { key: 'k', header: 'Kind', render: (x) => <Pill tone="info">{isExport(x) ? 'Export' : 'Import'}</Pill> },
              { key: 'eta', header: 'ETA', render: (x) => <span className="small">{fmtDT(x.eta)}</span> },
              { key: 'ata', header: 'ATA', render: (x) => <span className="small">{x.ata ? fmtDT(x.ata) : <span className="faint">—</span>}</span> },
              { key: 'dc', header: 'Discharge completed', render: (x) => x.dischargeCompletedAt ? <span className="small strong">{fmtDT(x.dischargeCompletedAt)}<div className="xs faint">Storage clock started</div></span> : <span className="small faint">Not yet</span> },
              { key: 'cut', header: 'Cut-offs', render: (x) => x.gateCutoffAt ? <span className="small">Gate {fmtDT(x.gateCutoffAt)}<div className="xs"><Countdown hours={hoursUntil(x.gateCutoffAt)} label="closes in" /></div></span> : <span className="small faint">—</span> },
              { key: 'u', header: 'Units received / expected', render: (x) => { const s = stats(x); return <div style={{ minWidth: 120 }}><div className="small"><strong>{s.received}</strong> <span className="faint">/ {s.expected}</span></div><Progress pct={s.expected ? (s.received / s.expected) * 100 : 0} label="Units received" /></div>; } },
              { key: 's', header: 'Status', render: (x) => <StatusPill value={x.status} /> },
            ]} />
        </Panel>
      </div>
      {v && <CallDrawer v={v} onClose={() => setSel(null)} />}
    </Page>
  );
}

function CallDrawer({ v, onClose }: { v: S<'VesselCall'>; onClose: () => void }) {
  const nav = useNavigate();
  const toast = useToast();
  const s = stats(v);
  const exp = isExport(v);
  const mf = manifests.filter((m) => m.vesselCallId === v.vesselCallId);
  return (
    <Drawer open onClose={onClose} wide title={`${v.vesselName} ${v.voyageNo}`}
      footer={<>
        {!v.dischargeCompletedAt && !exp && <Button perm="consignment.edit" icon={<Clock />} onClick={() => { toast('Discharge completed recorded: storage clock started'); onClose(); }}>Record discharge completed</Button>}
        <Button icon={<FileSpreadsheet />} perm="manifest.import" onClick={() => nav('/manifests')}>Import manifest</Button>
        <Button variant="primary" onClick={onClose}>Close</Button>
      </>}>
      <div className="stack-lg">
        <DL cols items={[
          ['Shipping line', partyName(v.shippingLinePartyId)], ['Port call', v.portCallRef], ['Status', <StatusPill key="s" value={v.status} />],
          ['ETA', fmtDT(v.eta)], ['ATA', fmtDT(v.ata)], ['Discharge completed', fmtDT(v.dischargeCompletedAt)],
        ]} />
        {v.dischargeCompletedAt ? (
          <Banner tone="customs" title={`Storage clock started ${fmtDT(v.dischargeCompletedAt)}`}>Every unit on this call has 7 free calendar days from then. Changing this time re-rates storage for all its units and needs approval once invoices exist.</Banner>
        ) : !exp ? <Banner tone="wait" title="Discharge not completed yet">Record it from the port's discharge report; the storage clock for all units on this call starts then.</Banner> : null}
        {exp && (
          <Panel title="Export cut-offs" sub="Units arriving after the gate cut-off are not loaded on this call">
            <div className="stack">
              {([['Documents', v.docCutoffAt], ['VGM (verified weight)', v.vgmCutoffAt], ['Gate', v.gateCutoffAt]] as const).map(([k, t]) => (
                <div key={k} className="row"><span className="spacer small strong">{k}</span><span className="small">{fmtDT(t)}</span><span style={{ minWidth: 150, textAlign: 'right' }}><Countdown hours={hoursUntil(t)} label="closes in" /></span></div>
              ))}
            </div>
          </Panel>
        )}
        <div className="kpi-strip">
          <Kpi label="Expected" value={s.expected} unit="units" />
          <Kpi label="Received" value={s.received} />
          <Kpi label="Delivered" value={s.out} />
        </div>
        <Panel flush title="Consignments on this call">
          <DataTable rows={s.cs} rowKey={(c) => c.consignmentId!} onRow={(c) => nav(`/consignments/${c.consignmentId}`)} empty={<Empty title="No consignments yet">Import the manifest to create them.</Empty>} cols={[
            { key: 'r', header: 'Reference', render: (c) => <span className="unitno">{c.refNo}</span> },
            { key: 'p', header: 'Consignee / shipper', render: (c) => <span className="small">{partyName(c.consigneePartyId ?? c.shipperPartyId)}</span> },
            { key: 'u', header: 'Received', num: true, render: (c) => `${c.unitsReceived} / ${c.unitsExpected}` },
          ]} />
        </Panel>
        <Panel title="Manifests">
          {mf.length ? (
            <ul className="list-plain">{mf.map((m) => <li key={m.manifestId} className="row small"><span className="spacer">{m.fileName}<div className="xs faint">{fmtDT(m.importedAt)} · {m.importedBy}</div></span><StatusPill value={m.status} /></li>)}</ul>
          ) : <p className="small muted">No manifest yet. <Link to="/manifests">Import one</Link> to create consignments and expected units.</p>}
        </Panel>
      </div>
    </Drawer>
  );
}
