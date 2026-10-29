import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Plus, Settings2, Trash2, TriangleAlert } from 'lucide-react';
import {
  Banner, Button, Check, CommonTable, Drawer, Field, Input, Kpi, Page, PageHeader, Panel, Pill, ReferenceCell, Select, UnitNo, useToast,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { allStays, type Stay } from '@/mock/core';
import { IMO_CLASSES, SEG_DEMO, dgLines as seed, segregationWarnings, type DgRow } from '@/mock/cargo';

/* Dangerous goods (M5): DG lines per unit (GET /dg-lines, GET/PUT /units/{id}/dg-lines)
   and segregation checks against where units stand in the yard. */
const className = (c: string) => IMO_CLASSES.find(([k]) => k === c)?.[1] ?? '';

export function DangerousGoods() {
  const toast = useToast();
  const { data: dbDgLines } = useQ(['dg-lines'], () =>
    api.get<{ items: DgRow[] }>('/dg-lines').then((r) => r.items).catch(() => seed)
  );
  const { data: dbUnits } = useQ(['units-dg'], () =>
    api.get<{ items: Stay[] }>('/units').then((r) => r.items).catch(() => allStays)
  );

  const [local, setLocal] = useState<DgRow[] | null>(null);
  const lines = local ?? (dbDgLines && dbDgLines.length > 0 ? dbDgLines : seed);
  const stayPool = dbUnits && dbUnits.length > 0 ? dbUnits : allStays;

  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<Stay | null>(null);

  const units = useMemo(
    () => [...new Set(lines.map((l) => l.unitStayId))]
      .map((id) => stayPool.find((s) => s.unitStayId === id)!)
      .filter(Boolean),
    [lines, stayPool]
  );
  const warnings = useMemo(() => segregationWarnings(lines), [lines]);
  const flagged = new Set(warnings.flatMap((w) => [w.a.unitStayId, w.b.unitStayId]));
  const candidates = stayPool.filter(
    (s) => s.physicalStatus !== 'DEPARTED' && s.cargoUnit?.category === 'CONTAINER' && s.fullEmpty === 'F' && !units.includes(s)
  );

  const filteredUnits = useMemo(() => {
    if (!search) return units;
    const q = search.toUpperCase();
    return units.filter((u) => {
      const dgForUnit = lines.filter((l) => l.unitStayId === u.unitStayId);
      return (
        u.cargoUnit?.unitNo?.toUpperCase().includes(q) ||
        u.currentLocation?.fullCode?.toUpperCase().includes(q) ||
        dgForUnit.some((l) => l.unNo?.includes(q) || l.properShippingName?.toUpperCase().includes(q) || l.imoClass?.includes(q))
      );
    });
  }, [units, search, lines]);

  return (
    <Page>
      <PageHeader title="Dangerous goods" ms="M5" sub="IMO-declared cargo on site and where it stands relative to other DG units"
        actions={<Button variant="primary" icon={<Plus />} perm="dg.manage" onClick={() => setEdit(candidates[0] || stayPool[0])}>Declare DG on a unit</Button>} />
      <div className="stack-lg">
        <Banner title="Segregation table not loaded" action={<Link to="/admin/units" className="btn btn-sm"><Settings2 size={14} />Open setup</Link>}>
          The real rules come from the IMDG Code segregation table (7.2.4), which an admin loads under Setup › Unit types & checks. It is not seeded. Until then this screen checks only the {SEG_DEMO.length} sample rules shown below.
        </Banner>
        <div className="kpi-strip">
          <Kpi label="DG units on site" value={units.length} />
          <Kpi label="DG lines" value={lines.length} />
          <Kpi label="Segregation warnings" value={warnings.length} delta={warnings.length ? 'Move one of each pair' : 'None'} />
          <Kpi label="Marine pollutants" value={lines.filter((l) => l.marinePollutant).length} />
        </div>

        {warnings.length > 0 && (
          <CommonTable
            rows={warnings}
            rowKey={(w) => `${w.a.unitStayId}-${w.b.unitStayId}-${w.ca}-${w.cb}`}
            itemLabel="segregation warnings"
            cols={[
              {
                key: 'a',
                header: 'Unit',
                render: (w) => (
                  <ReferenceCell
                    refNo={<UnitNo no={w.a.cargoUnit?.unitNo || `UNIT-${w.a.unitStayId}`} to={`/units/${w.a.unitStayId}`} />}
                    sub={`Class ${w.ca} · ${w.a.currentLocation?.fullCode ?? 'In yard'}`}
                  />
                )
              },
              {
                key: 'b',
                header: 'Too close to',
                render: (w) => (
                  <ReferenceCell
                    refNo={<UnitNo no={w.b.cargoUnit?.unitNo || `UNIT-${w.b.unitStayId}`} to={`/units/${w.b.unitStayId}`} />}
                    sub={`Class ${w.cb} · ${w.b.currentLocation?.fullCode ?? 'In yard'}`}
                  />
                )
              },
              {
                key: 'r',
                header: 'Rule',
                render: (w) => (
                  <span className="small">
                    <strong>Class {w.rule.a} {w.rule.label.toLowerCase()} class {w.rule.b}</strong>
                    <div className="xs faint">Both in the {w.where}</div>
                  </span>
                )
              },
              {
                key: 'x',
                header: '',
                render: (w) => <Button size="sm" perm="yard.allocate" onClick={() => toast(`Move order created for ${w.b.cargoUnit?.unitNo}`)}>Plan move</Button>
              },
            ]}
          />
        )}

        <CommonTable
          rows={filteredUnits}
          rowKey={(s) => s.unitStayId!}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter DG units by unit no, UN no, class..."
          itemLabel="DG units"
          emptyTitle="No DG units on site"
          emptySubtitle="Declare DG lines when the BL or booking lists IMO cargo."
          cols={[
            {
              key: 'u',
              header: 'Unit',
              render: (s) => (
                <div className="row" style={{ gap: 8 }}>
                  <UnitNo no={s.cargoUnit?.unitNo || `UNIT-${s.unitStayId}`} to={`/units/${s.unitStayId}`} />
                  {flagged.has(s.unitStayId) && <Pill tone="stop" icon={<TriangleAlert />}>Segregation</Pill>}
                </div>
              )
            },
            {
              key: 'loc',
              header: 'Location',
              render: (s) => <span className="unitno">{s.currentLocation?.fullCode ?? '—'}</span>
            },
            {
              key: 'l',
              header: 'DG lines',
              render: (s) => (
                <div className="stack" style={{ gap: 4 }}>
                  {lines.filter((l) => l.unitStayId === s.unitStayId).map((l) => (
                    <div key={l.unitDgLineId || (l as any).dgLineId} className="row-wrap small" style={{ gap: 6 }}>
                      <Pill tone="wait" icon={<Flame />}>Class {l.imoClass}</Pill>
                      <span className="unitno">UN {l.unNo}</span>
                      <span>{l.properShippingName}</span>
                      {l.packingGroup && <span className="xs muted">PG {l.packingGroup}</span>}
                      {l.flashpointC && <span className="xs muted">Flash point {l.flashpointC} °C</span>}
                      {l.marinePollutant && <span className="tag">Marine pollutant</span>}
                    </div>
                  ))}
                </div>
              )
            },
            {
              key: 'w',
              header: 'Weight',
              num: true,
              render: (s) => `${lines.filter((l) => l.unitStayId === s.unitStayId).reduce((n, l) => n + Number(l.grossWeightKg ?? 0), 0).toLocaleString()} kg`
            },
            {
              key: 'e',
              header: '',
              render: (s) => <Button size="sm" perm="dg.manage" onClick={() => setEdit(s)}>Edit DG lines</Button>
            },
          ]}
        />

        <CommonTable
          rows={SEG_DEMO}
          rowKey={(r) => `${r.a}-${r.b}`}
          itemLabel="segregation rules"
          cols={[
            { key: 'a', header: 'Class', render: (r) => <span className="small"><strong>{r.a}</strong> {className(r.a)}</span> },
            { key: 'q', header: 'Requirement', render: (r) => <span className="small strong">{r.label}</span> },
            { key: 'b', header: 'Class', render: (r) => <span className="small"><strong>{r.b}</strong> {className(r.b)}</span> },
          ]}
        />
      </div>
      {edit && <EditDg stay={edit} candidates={units.includes(edit) ? undefined : candidates} lines={lines.filter((l) => l.unitStayId === edit.unitStayId)} onClose={() => setEdit(null)}
        onSave={(id, ls) => setLocal([...lines.filter((l) => l.unitStayId !== id), ...ls])} />}
    </Page>
  );
}

let nextDg = 5000;
function EditDg({ stay, candidates, lines, onClose, onSave }: { stay: Stay; candidates?: Stay[]; lines: DgRow[]; onClose: () => void; onSave: (unitStayId: number, l: DgRow[]) => void }) {
  const toast = useToast();
  const [unit, setUnit] = useState(stay.unitStayId!);
  const blank = (): DgRow => ({ unitDgLineId: ++nextDg, unitStayId: unit, unNo: '', imoClass: '3', properShippingName: '', packingGroup: 'II', marinePollutant: false });
  const [rows, setRows] = useState<DgRow[]>(lines.length ? lines.map((l) => ({ ...l })) : [blank()]);
  const [tried, setTried] = useState(false);
  const set = (i: number, p: Partial<DgRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const bad = rows.some((r) => !/^\d{4}$/.test(r.unNo) || !r.properShippingName.trim() || (r.imoClass === '3' && !r.flashpointC));
  const s = allStays.find((x) => x.unitStayId === unit)!;
  return (
    <Drawer open onClose={onClose} wide title="DG lines"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" perm="dg.manage" onClick={() => { setTried(true); if (bad) return; onSave(unit, rows.map((r) => ({ ...r, unitStayId: unit }))); toast('DG lines saved'); onClose(); }}>Save DG lines</Button></>}>
      <div className="stack-lg">
        {candidates ? (
          <Field label="Unit" required><Select value={String(unit)} onChange={(e) => setUnit(Number(e.target.value))} options={candidates.slice(0, 60).map((c) => [String(c.unitStayId), `${c.cargoUnit.unitNo} · ${c.currentLocation?.fullCode ?? 'expected'}`])} /></Field>
        ) : <div className="row"><UnitNo no={s.cargoUnit.unitNo} size="md" /><span className="spacer" /><span className="unitno">{s.currentLocation?.fullCode}</span></div>}
        <Banner>Saving re-checks segregation for this unit and plans placement away from incompatible classes. Placards must match the declared classes.</Banner>
        {rows.map((r, i) => (
          <Panel key={r.unitDgLineId} title={`Line ${i + 1}`} actions={rows.length > 1 && <Button size="sm" variant="ghost" icon={<Trash2 />} aria-label={`Remove line ${i + 1}`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))} />}>
            <div className="form-grid">
              <Field label="UN number" required error={tried && !/^\d{4}$/.test(r.unNo) && 'Four digits'}><Input inputMode="numeric" maxLength={4} value={r.unNo} onChange={(e) => set(i, { unNo: e.target.value })} placeholder="1263" /></Field>
              <Field label="IMO class" required><Select value={r.imoClass} onChange={(e) => set(i, { imoClass: e.target.value })} options={IMO_CLASSES.map(([k, n]) => [k, `${k} · ${n}`])} /></Field>
              <Field label="Packing group"><Select value={r.packingGroup ?? ''} onChange={(e) => set(i, { packingGroup: (e.target.value || null) as DgRow['packingGroup'] })} options={[['', 'None'], ['I', 'I (high danger)'], ['II', 'II (medium)'], ['III', 'III (low)']]} /></Field>
              <Field label="Flash point °C" required={r.imoClass === '3'} error={tried && r.imoClass === '3' && !r.flashpointC && 'Needed for class 3'}><Input inputMode="decimal" value={r.flashpointC ?? ''} onChange={(e) => set(i, { flashpointC: e.target.value })} /></Field>
              <Field label="Proper shipping name" required span={2} error={tried && !r.properShippingName.trim() && 'As on the DG declaration'}><Input value={r.properShippingName} onChange={(e) => set(i, { properShippingName: e.target.value })} /></Field>
              <Field label="Gross weight kg"><Input inputMode="numeric" value={r.grossWeightKg ?? ''} onChange={(e) => set(i, { grossWeightKg: e.target.value })} /></Field>
              <Field label="Emergency contact"><Input value={r.emergencyContact ?? ''} onChange={(e) => set(i, { emergencyContact: e.target.value })} placeholder="+255 …" /></Field>
            </div>
            <div style={{ marginTop: 12 }}><Check label="Marine pollutant" checked={!!r.marinePollutant} onChange={(e) => set(i, { marinePollutant: e.target.checked })} /></div>
          </Panel>
        ))}
        <div><Button icon={<Plus />} onClick={() => setRows((x) => [...x, blank()])}>Add another line</Button></div>
      </div>
    </Drawer>
  );
}
