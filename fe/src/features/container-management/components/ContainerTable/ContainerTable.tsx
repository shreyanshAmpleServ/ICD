import { DataTable, type Col } from '@/components';
import { UnitNo, StatusPill } from '@/ds/components';

export interface ContainerRow {
  unitStayId: number;
  unitNo: string;
  category?: string;
  isoCode?: string;
  physicalStatus?: string;
  customsStatus?: string;
  billingStatus?: string;
  releaseStatus?: string;
  activeHoldCount?: number;
}

export interface ContainerTableProps {
  rows: ContainerRow[];
  onSelect?: (row: ContainerRow) => void;
  selectedId?: number;
}

export function ContainerTable({ rows, onSelect, selectedId }: ContainerTableProps) {
  const cols: Col<ContainerRow>[] = [
    {
      key: 'unitNo',
      header: 'Container',
      render: (r) => (
        <UnitNo no={r.unitNo} category={r.category} to={`/units/${r.unitStayId}`} />
      ),
    },
    { key: 'isoCode', header: 'ISO Type' },
    {
      key: 'physicalStatus',
      header: 'Physical',
      render: (r) => <StatusPill value={r.physicalStatus} track="physical" />,
    },
    {
      key: 'customsStatus',
      header: 'Customs',
      render: (r) => <StatusPill value={r.customsStatus} track="customs" />,
    },
    {
      key: 'releaseStatus',
      header: 'Release',
      render: (r) => <StatusPill value={r.releaseStatus} track="release" />,
    },
  ];

  return (
    <DataTable
      cols={cols}
      rows={rows}
      rowKey={(r) => String(r.unitStayId)}
      onRow={onSelect}
      selected={selectedId ? String(selectedId) : undefined}
    />
  );
}

export default ContainerTable;
