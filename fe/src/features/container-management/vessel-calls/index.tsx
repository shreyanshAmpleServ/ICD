import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, FileSpreadsheet, Plus } from 'lucide-react';
import type { S } from '@/api/types';
import {
  Banner, Button, Chips, CommonTable, DL, DateCell, Drawer, Field, Input, Kpi, Page,
  PageHeader, Panel, PartyCell, Pill, ReferenceCell, Select, StatusCell, StatusPill, fmtDT, useToast
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { api } from '@/api/client';
import { allStays, consignments, parties, partyName, vesselCalls } from '@/mock/core';
import { hoursUntil, manifests } from '@/mock/cargo';
import { Countdown, Progress } from '@/features/container-management/shared';

export { vesselCallsApi } from './api';

type Quick = 'all' | 'import' | 'export';
const isExport = (v: S<'VesselCall'>) => consignments.some((c) => c.vesselCallId === v.vesselCallId && c.cargoRegimeCode === 'EXPORT');
const stats = (v: S<'VesselCall'>) => {
  const cs = consignments.filter((c) => c.vesselCallId === v.vesselCallId);
  const us = allStays.filter((s) => cs.some((c) => c.consignmentId === s.consignmentId));
  return { cs, expected: cs.reduce((n, c) => n + (c.unitsExpected ?? 0), 0) || 120, received: us.filter((s) => s.physicalStatus !== 'EXPECTED').length || 95, out: us.filter((s) => s.physicalStatus === 'DEPARTED').length || 40 };
};

export function VesselCalls() {
  const [quick, setQuick] = useState<Quick>('all');
  const [sel, setSel] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const { data = [] } = useQ(['vessel-calls'], () => delay(vesselCalls));
  const rows = [...data].sort((a, b) => Date.parse(b.eta ?? '') - Date.parse(a.eta ?? '')).filter((v) => quick === 'all' || (quick === 'export') === isExport(v));
  const v = data.find((x) => x.vesselCallId === sel);
  const nextExport = data.find((x) => isExport(x) && x.status === 'EXPECTED');

  return (
    <Page>
      <PageHeader
        title="Vessel calls"
        ms="M1"
        sub="Ships whose cargo comes to or goes from this depot through Dar es Salaam port"
        actions={<Button variant="primary" icon={<Plus />} perm="consignment.edit" onClick={() => setAddOpen(true)}>Add vessel call</Button>}
      />
      <div className="stack-lg">
        <Banner tone="customs" title="Discharge completed starts the storage clock">
          Free days for every unit on a call count from the moment the port reports discharge completed, not from gate-in. Check the time against the port's discharge report.
        </Banner>
        <div className="kpi-strip">
          <Kpi label="Expected at port" value={data.filter((x) => x.status === 'EXPECTED').length} unit="calls" />
          <Kpi label="Discharged, units still to come" value={data.filter((x) => x.dischargeCompletedAt && stats(x).received < stats(x).expected).length} unit="calls" />
          <Kpi label="Next gate cut-off" value={nextExport?.gateCutoffAt ? fmtDT(nextExport.gateCutoffAt) : '—'} delta={nextExport ? `${nextExport.vesselName} ${nextExport.voyageNo}` : undefined} />
        </div>
        <CommonTable
          rows={rows}
          rowKey={(x) => x.vesselCallId!}
          onRow={(x) => setSel(x.vesselCallId!)}
          selected={sel}
          itemLabel="vessel calls"
          emptyTitle="No vessel calls"
          emptySubtitle="Add a call or import a manifest to create one."
          toolbarFilters={
            <Chips<Quick>
              value={quick}
              onChange={setQuick}
              options={[{ id: 'all', label: 'All calls' }, { id: 'import', label: 'Import' }, { id: 'export', label: 'Export' }]}
            />
          }
          cols={[
            {
              key: 'v',
              header: 'Vessel',
              render: (x) => (
                <ReferenceCell
                  refNo={`${x.vesselName} ${x.voyageNo}`}
                  sub={`${partyName(x.shippingLinePartyId)} · ${x.portCallRef ?? 'PORT-CALL'}`}
                />
              )
            },
            {
              key: 'k',
              header: 'Kind',
              render: (x) => <Pill tone="info">{isExport(x) ? 'Export' : 'Import'}</Pill>
            },
            {
              key: 'eta',
              header: 'ETA',
              render: (x) => <DateCell value={x.eta} withTime />
            },
            {
              key: 'ata',
              header: 'ATA',
              render: (x) => <DateCell value={x.ata} withTime />
            },
            {
              key: 'dc',
              header: 'Discharge completed',
              render: (x) => x.dischargeCompletedAt ? (
                <span className="small strong">
                  <DateCell value={x.dischargeCompletedAt} withTime />
                  <div className="xs faint">Storage clock started</div>
                </span>
              ) : <span className="small faint">Not yet</span>
            },
            {
              key: 'cut',
              header: 'Cut-offs',
              render: (x) => x.gateCutoffAt ? (
                <span className="small">
                  Gate {fmtDT(x.gateCutoffAt)}
                  <div className="xs"><Countdown hours={hoursUntil(x.gateCutoffAt)} label="closes in" /></div>
                </span>
              ) : <span className="small faint">—</span>
            },
            {
              key: 'u',
              header: 'Units received / expected',
              render: (x) => {
                const s = stats(x);
                return (
                  <div style={{ minWidth: 120 }}>
                    <div className="small">
                      <strong>{s.received}</strong> <span className="faint">/ {s.expected}</span>
                    </div>
                    <Progress pct={s.expected ? (s.received / s.expected) * 100 : 0} label="Units received" />
                  </div>
                );
              }
            },
            {
              key: 's',
              header: 'Status',
              render: (x) => <StatusCell value={x.status} />
            },
          ]}
        />
      </div>
      {v && <CallDrawer v={v} onClose={() => setSel(null)} />}
      <AddVesselDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </Page>
  );
}

function AddVesselDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [vesselName, setVesselName] = useState('');
  const [voyageNo, setVoyageNo] = useState('');
  const [callSign, setCallSign] = useState('');
  const [line, setLine] = useState('1');
  const [eta, setEta] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));

  const shippingLines = parties.filter((p) => p.roles.includes('SHIPPING_LINE'));

  const submit = async () => {
    if (!vesselName.trim() || !voyageNo.trim()) {
      toast('Please enter vessel name and voyage number');
      return;
    }
    try {
      await api.post('/vessel-calls', {
        vesselName: vesselName.trim(),
        voyageNo: voyageNo.trim(),
        callSign: callSign.trim() || 'CALL-01',
        shippingLinePartyId: Number(line),
        eta: new Date(eta).toISOString(),
        status: 'EXPECTED',
      });
      qc.invalidateQueries({ queryKey: ['vessel-calls'] });
      toast('Vessel call added successfully');
      onClose();
    } catch (err: any) {
      toast('Error adding vessel call: ' + err.message);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add Vessel Call"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Plus />} onClick={submit}>Create Vessel Call</Button></>}>
      <div className="stack-lg">
        <Field label="Vessel Name" required><Input value={vesselName} onChange={(e) => setVesselName(e.target.value)} placeholder="e.g. MV Ocean Voyager" /></Field>
        <Field label="Voyage Number" required><Input value={voyageNo} onChange={(e) => setVoyageNo(e.target.value)} placeholder="e.g. 2603W" /></Field>
        <Field label="Call Sign"><Input value={callSign} onChange={(e) => setCallSign(e.target.value)} placeholder="e.g. 5LDF8" /></Field>
        <Field label="Shipping Line" required>
          <Select value={line} onChange={(e) => setLine(e.target.value)} options={shippingLines.map((p) => [String(p.partyId), p.partyName])} />
        </Field>
        <Field label="ETA (Estimated Time of Arrival)" required><Input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}

function CallDrawer({ v, onClose }: { v: S<'VesselCall'>; onClose: () => void }) {
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const s = stats(v);
  const exp = isExport(v);

  const { data: dbManifests = [] } = useQ(['manifests'], () => delay(manifests));
  const { data: dbConsignments = [] } = useQ(['consignments'], () => delay(consignments));

  const allMans = dbManifests.length ? dbManifests : manifests;
  const allCons = dbConsignments.length ? dbConsignments : consignments;

  const mf = allMans.filter((m) => m.vesselCallId === v.vesselCallId);
  const vCons = allCons.filter((c) => c.vesselCallId === v.vesselCallId);

  const handleRecordDischarge = async () => {
    try {
      await api.patch(`/vessel-calls/${v.vesselCallId}`, {
        dischargeCompletedAt: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['vessel-calls'] });
      toast('Discharge completed recorded: storage clock started');
      onClose();
    } catch (e: any) {
      toast('Error recording discharge: ' + e.message);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={`${v.vesselName} ${v.voyageNo}`}
      footer={
        <>
          {!v.dischargeCompletedAt && !exp && (
            <Button perm="consignment.edit" icon={<Clock />} onClick={handleRecordDischarge}>
              Record discharge completed
            </Button>
          )}
          <Button icon={<FileSpreadsheet />} perm="manifest.import" onClick={() => nav('/manifests')}>
            Import manifest
          </Button>
          <Button variant="primary" onClick={onClose}>Close</Button>
        </>
      }
    >
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
          <CommonTable
            rows={vCons.length ? vCons : s.cs}
            rowKey={(c) => c.consignmentId!}
            onRow={(c) => nav(`/consignments/${c.consignmentId}`)}
            emptyTitle="No consignments yet"
            emptySubtitle="Import the manifest to create them."
            itemLabel="consignments"
            cols={[
              { key: 'r', header: 'Reference', render: (c) => <ReferenceCell refNo={c.refNo} /> },
              { key: 'p', header: 'Consignee / shipper', render: (c) => <PartyCell name={partyName(c.consigneePartyId ?? c.shipperPartyId)} /> },
              { key: 'u', header: 'Received', render: (c) => <span className="small">{c.unitsReceived ?? 0} / {c.unitsExpected ?? 1}</span> },
            ]}
          />
        </Panel>
        <Panel title="Manifests">
          {mf.length ? (
            <ul className="list-plain">{mf.map((m) => <li key={m.manifestId} className="row small"><span className="spacer">{m.fileName}<div className="xs faint">{fmtDT(m.importedAt)} · {m.importedBy || 'System'}</div></span><StatusPill value={m.status} /></li>)}</ul>
          ) : <p className="small muted">No manifest yet. <Link to="/manifests">Import one</Link> to create consignments and expected units.</p>}
        </Panel>
      </div>
    </Drawer>
  );
}

export default VesselCalls;
