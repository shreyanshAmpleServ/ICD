import { DataTable, Panel } from '@/ds/components';
import { shortDate } from '../../components/bits';

export function KpiDataTable({
  period,
  rows,
}: {
  period: string;
  rows: any[];
}) {
  return (
    <Panel flush title={`Daily figures, last ${period} days`} sub="Newest first">
      <DataTable
        dense
        rows={rows}
        rowKey={(r) => r.d}
        cols={[
          { key: 'd', header: 'Date', render: (r) => shortDate(r.d) },
          { key: 'gin', header: 'Gate in', num: true },
          { key: 'gout', header: 'Gate out', num: true },
          { key: 'di', header: 'Dwell import (days)', num: true, render: (r) => r.di.toFixed(1) },
          { key: 'dt', header: 'Dwell transit (days)', num: true, render: (r) => r.dt.toFixed(1) },
          { key: 'o1', header: 'Occupancy DAR1', num: true, render: (r) => `${r.o1}%` },
          { key: 'o2', header: 'Occupancy DAR2', num: true, render: (r) => `${r.o2}%` },
        ]}
      />
    </Panel>
  );
}
