import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import {
  Button, Chips, CommonTable, DateCell, Drawer, Field, HoldPill, Input, MiniTracks, Page,
  PageHeader, ReferenceCell, Select, StatusCell, Textarea, NOW, useToast,
} from '@/ds/components';
import { FLOW } from '@/ds/status';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { api } from '@/api/client';

/* GET /units with filters. The quick filters are the questions people ask
   most: what is held, what can leave, what is about to start costing money. */
type Quick = 'all' | 'held' | 'ready' | 'expected' | 'freeEnding' | 'long';

export function Units() {
  const { site } = useSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [quick, setQuick] = useState<Quick>('all');
  const [cat, setCat] = useState('ALL');
  const [addOpen, setAddOpen] = useState(false);

  const { data: dbUnits = [] } = useQ(['units', site.siteId], () =>
    api.get<any>('/units').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );

  const data = Array.isArray(dbUnits) ? dbUnits : [];

  const counts = useMemo(() => ({
    held: data.filter((s: any) => (s.activeHoldCount ?? s.unitSummary?.activeHoldCount ?? 0) > 0).length,
    ready: data.filter((s: any) => s.releaseStatus === 'APPROVED' && (s.physicalStatus === 'IN_YARD' || s.physicalStatus === 'ON_SITE')).length,
    expected: data.filter((s: any) => s.physicalStatus === 'EXPECTED').length,
    freeEnding: data.filter((s: any) => s.freeUntil && Math.abs(Date.parse(s.freeUntil) - NOW.getTime()) < 3 * 86400000).length,
    long: data.filter((s: any) => (s.unitSummary?.dwellDays ?? 0) > 14).length,
  }), [data]);

  const rows = data.filter((s: any) => {
    const u = s.unitSummary || {
      unitNo: s.cargoUnit?.unitNo || s.unitNo || '',
      category: s.cargoUnit?.category || 'CONTAINER',
      activeHoldCount: s.activeHoldCount ?? 0,
      releaseStatus: s.releaseStatus || 'PENDING_CHARGES',
      physicalStatus: s.physicalStatus || 'ON_SITE',
      dwellDays: 4,
      consignmentRef: s.consignments?.refNo || s.consignmentRef,
    };
    const unitNo = (u.unitNo || s.cargoUnit?.unitNo || s.unitNo || '').toUpperCase();
    const consRef = (u.consignmentRef || s.consignments?.refNo || s.consignmentRef || '').toUpperCase();
    const query = q.replace(/\s/g, '').toUpperCase();

    if (query && !unitNo.includes(query) && !consRef.includes(query)) return false;
    if (cat !== 'ALL' && (u.category || s.cargoUnit?.category) !== cat) return false;
    if (quick === 'held') return (u.activeHoldCount || s.activeHoldCount || 0) > 0;
    if (quick === 'ready') return u.releaseStatus === 'APPROVED' && (u.physicalStatus === 'IN_YARD' || u.physicalStatus === 'ON_SITE');
    if (quick === 'expected') return u.physicalStatus === 'EXPECTED' || s.physicalStatus === 'EXPECTED';
    if (quick === 'freeEnding') return s.freeUntil && Math.abs(Date.parse(s.freeUntil) - NOW.getTime()) < 3 * 86400000;
    if (quick === 'long') return (u.dwellDays ?? 0) > 14;
    return true;
  });

  return (
    <Page>
      <PageHeader
        title="Units"
        ms="M1"
        sub={`${data.length} units at ${site.siteName}`}
        actions={
          <>
            <Button icon={<Download />} perm="reports.operational">Export</Button>
            <Button variant="primary" icon={<Plus />} perm="consignment.edit" onClick={() => setAddOpen(true)}>Add expected unit</Button>
          </>
        }
      />
      <CommonTable
        rows={rows}
        rowKey={(s: any) => s.unitStayId!}
        onRow={(s: any) => nav(`/units/${s.unitStayId}`)}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Container, VIN or BL"
        itemLabel="units"
        emptyTitle="No units match these filters"
        emptySubtitle="Clear the search or pick another quick filter."
        toolbarFilters={
          <>
            <Select
              aria-label="Category"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              options={[['ALL', 'All categories'], ['CONTAINER', 'Containers'], ['VEHICLE', 'Vehicles'], ['LOT', 'Cargo lots']]}
            />
            <Chips<Quick>
              value={quick}
              onChange={setQuick}
              options={[
                { id: 'all', label: 'All' },
                { id: 'held', label: 'On hold', count: counts.held },
                { id: 'ready', label: 'Ready to leave', count: counts.ready },
                { id: 'freeEnding', label: 'Free time ending', count: counts.freeEnding },
                { id: 'expected', label: 'Expected', count: counts.expected },
                { id: 'long', label: 'Over 14 days', count: counts.long },
              ]}
            />
          </>
        }
        cols={[
          {
            key: 'no',
            header: 'Unit',
            render: (s: any) => <ReferenceCell refNo={s.cargoUnit?.unitNo || s.unitNo || `UNIT-${s.unitStayId}`} category={s.cargoUnit?.category || 'CONTAINER'} />
          },
          {
            key: 'type',
            header: 'Type',
            render: (s: any) => (
              <span className="small">
                {s.cargoUnit?.unitTypeCode || '40HC'}
                {s.cargoUnit?.make ? <div className="xs faint">{s.cargoUnit.make} {s.cargoUnit.model}</div> : null}
              </span>
            )
          },
          {
            key: 'flow',
            header: 'Flow',
            render: (s: any) => <span className="small">{FLOW[s.flow as keyof typeof FLOW] ?? s.flow ?? 'Import'}{s.fullEmpty === 'E' ? ' (empty)' : ''}</span>
          },
          {
            key: 'tracks',
            header: 'Status',
            render: (s: any) => (
              <span className="row" style={{ gap: 4 }}>
                <MiniTracks s={s} />
                <StatusCell value={s.physicalStatus} track="physical" />
                <HoldPill count={s.activeHoldCount ?? s.unitSummary?.activeHoldCount ?? 0} />
              </span>
            )
          },
          {
            key: 'customs',
            header: 'Customs',
            render: (s: any) => <StatusCell value={s.customsStatus} track="customs" />
          },
          {
            key: 'release',
            header: 'Release',
            render: (s: any) => <StatusCell value={s.releaseStatus} track="release" />
          },
          {
            key: 'loc',
            header: 'Location',
            render: (s: any) => <span className="cond strong">{s.currentLocation?.fullCode ?? '—'}</span>
          },
          {
            key: 'bl',
            header: 'Consignment',
            render: (s: any) => <span className="small">{s.unitSummary?.consignmentRef || s.consignments?.refNo || s.consignmentRef || '—'}</span>
          },
          {
            key: 'free',
            header: 'Free until',
            render: (s: any) => <DateCell value={s.freeUntil} />
          },
          {
            key: 'dwell',
            header: 'Days',
            num: true,
            render: (s: any) => s.unitSummary?.dwellDays ?? 4
          },
        ]}
      />

      {addOpen && (
        <AddExpectedUnitDrawer
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['units'] });
            qc.invalidateQueries({ queryKey: ['consignments'] });
            toast('Expected unit added');
            setAddOpen(false);
          }}
        />
      )}
    </Page>
  );
}

function AddExpectedUnitDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [unitNo, setUnitNo] = useState('');
  const [consignmentId, setConsignmentId] = useState('1');
  const [category, setCategory] = useState('CONTAINER');
  const [unitTypeCode, setUnitTypeCode] = useState('40HC');
  const [fullEmpty, setFullEmpty] = useState('F');
  const [flow, setFlow] = useState('IMPORT');
  const [sealNo, setSealNo] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [grossWeightKg, setGrossWeightKg] = useState('25000');
  const [submitting, setSubmitting] = useState(false);

  const { data: dbConsignments = [] } = useQ(['consignments'], () =>
    api.get<any>('/consignments').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const consList = Array.isArray(dbConsignments) ? dbConsignments : [];

  const handleSubmit = async () => {
    if (!unitNo.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/units', {
        unitNo: unitNo.trim().toUpperCase(),
        consignmentId: Number(consignmentId),
        category,
        unitTypeCode,
        fullEmpty,
        flow,
        sealNo: sealNo.trim() || 'SEAL-001',
        cargoDescription: cargoDescription.trim() || 'General Merchandise',
        grossWeightKg: Number(grossWeightKg) || 25000,
        physicalStatus: 'EXPECTED',
        customsStatus: 'PENDING',
        releaseStatus: 'PENDING_CHARGES',
      });
      onCreated();
    } catch (err: any) {
      console.error('Failed to create unit:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add Expected Unit"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || !unitNo.trim()}>
            {submitting ? 'Adding...' : 'Add expected unit'}
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <div className="form-grid">
          <Field label="Unit number" required>
            <Input
              value={unitNo}
              onChange={(e) => setUnitNo(e.target.value.toUpperCase())}
              placeholder="e.g. MSKU1234567"
            />
          </Field>
          <Field label="Consignment (BL)" required>
            <Select
              value={consignmentId}
              onChange={(e) => setConsignmentId(e.target.value)}
              options={consList.map((c: any) => [String(c.consignmentId), `${c.refNo} · ${c.consigneeName || 'Consignee'}`])}
            />
          </Field>
          <Field label="Category">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[['CONTAINER', 'Container'], ['VEHICLE', 'Vehicle'], ['LOT', 'Cargo lot']]}
            />
          </Field>
          <Field label="Unit type">
            <Select
              value={unitTypeCode}
              onChange={(e) => setUnitTypeCode(e.target.value)}
              options={[['40HC', '40HC - High Cube'], ['20GP', '20GP - General Purpose'], ['40GP', '40GP - General Purpose'], ['45HC', '45HC - 45ft High Cube'], ['20RF', '20RF - Reefer']]}
            />
          </Field>
          <Field label="Full / Empty">
            <Select
              value={fullEmpty}
              onChange={(e) => setFullEmpty(e.target.value)}
              options={[['F', 'Full (Loaded)'], ['E', 'Empty']]}
            />
          </Field>
          <Field label="Flow">
            <Select
              value={flow}
              onChange={(e) => setFlow(e.target.value)}
              options={[['IMPORT', 'Import'], ['EXPORT', 'Export'], ['TRANSSHIPMENT', 'Transshipment']]}
            />
          </Field>
          <Field label="Seal number">
            <Input
              value={sealNo}
              onChange={(e) => setSealNo(e.target.value)}
              placeholder="e.g. ML-TZ-98442"
            />
          </Field>
          <Field label="Gross weight (kg)">
            <Input
              type="number"
              value={grossWeightKg}
              onChange={(e) => setGrossWeightKg(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Cargo description">
          <Textarea
            value={cargoDescription}
            onChange={(e) => setCargoDescription(e.target.value)}
            placeholder="e.g. Industrial machinery parts"
          />
        </Field>
      </div>
    </Drawer>
  );
}
