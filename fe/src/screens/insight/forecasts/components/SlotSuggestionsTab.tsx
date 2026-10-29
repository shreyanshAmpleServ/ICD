import { Chips, DataTable, Kpi, Panel, UnitNo, fmtDT } from '@/ds/components';

export function SlotSuggestionsTab({
  rank1,
  suggestionLog,
  log,
  overridesOnly,
  setOverridesOnly,
}: {
  rank1: number;
  suggestionLog: any[];
  log: any[];
  overridesOnly: 'all' | 'over';
  setOverridesOnly: (v: 'all' | 'over') => void;
}) {
  return (
    <>
      <div className="kpi-strip">
        <Kpi label="Chose suggestion rank 1" value={rank1} unit="%" delta="Last 40 placements" />
        <Kpi
          label="Overrides"
          value={suggestionLog.filter((s) => s.chosenRank !== 1).length}
          delta="With a reason each"
        />
        <Kpi
          label="Picked a slot not suggested"
          value={suggestionLog.filter((s) => s.chosenRank === null).length}
          delta="Reviewed weekly by the yard planner"
        />
      </div>
      <Panel
        flush
        title="Slot suggestion log"
        sub="What the system suggested and what the yard chose"
        actions={
          <Chips<'all' | 'over'>
            value={overridesOnly}
            onChange={setOverridesOnly}
            options={[
              { id: 'all', label: 'All' },
              { id: 'over', label: 'Overrides only' },
            ]}
          />
        }
      >
        <DataTable
          rows={log}
          rowKey={(s) => s.yardSuggestionLogId}
          cols={[
            { key: 'at', header: 'When', render: (s) => <span className="small nowrap">{fmtDT(s.suggestedAt)}</span> },
            { key: 'u', header: 'Unit', render: (s) => <UnitNo no={s.unitNo} to={`/units/${s.unitStayId}`} /> },
            {
              key: 'e',
              header: 'Engine',
              render: (s) => <span className="small">{s.engine === 'ML' ? 'Learned' : 'Rules'}</span>,
            },
            { key: 't', header: 'Suggested first', render: (s) => <span className="cond strong">{s.top}</span> },
            { key: 'c', header: 'Chosen', render: (s) => <span className="cond strong">{s.chosen}</span> },
            { key: 'r', header: 'Rank chosen', num: true, render: (s) => s.chosenRank ?? 'Not suggested' },
            {
              key: 'why',
              header: 'Override reason',
              render: (s) => <span className="small">{s.overrideReason ?? <span className="faint">—</span>}</span>,
            },
            { key: 'by', header: 'By', render: (s) => <span className="small">{s.by}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
