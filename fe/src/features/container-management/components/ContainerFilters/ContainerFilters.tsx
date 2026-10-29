import { Search } from 'lucide-react';
import { SearchInput, Select } from '@/components/common';

export interface ContainerFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

export function ContainerFilters({
  query,
  onQueryChange,
  statusFilter,
  onStatusChange,
}: ContainerFiltersProps) {
  return (
    <div className="row" style={{ gap: 12, marginBottom: 16 }}>
      <SearchInput
        icon={<Search size={16} />}
        placeholder="Search container number..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        style={{ maxWidth: 320 }}
      />
      <Select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        options={[
          ['ALL', 'All Statuses'],
          ['YARD', 'In Yard'],
          ['GATE_IN', 'Gate In'],
          ['GATE_OUT', 'Gate Out'],
          ['CFS', 'CFS Operations'],
        ]}
        style={{ width: 180 }}
      />
    </div>
  );
}

export default ContainerFilters;

