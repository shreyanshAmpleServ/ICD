import { type ReactNode, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  Col, DataTable, Empty, Panel, SearchInput
} from '@/ds/components';

export interface CommonTableProps<T> {
  cols: Col<T>[];
  rows: T[];
  rowKey: (item: T) => string | number;
  onRow?: (item: T) => void;
  selected?: string | number | null;
  dense?: boolean;
  foot?: ReactNode;

  // Search & Filtering
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (search: string) => void;
  toolbarFilters?: ReactNode;
  toolbarActions?: ReactNode;

  // Empty state
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: ReactNode;

  // Header / Summary stats
  itemLabel?: string;
}

/**
 * CommonTable is a centralized, production-grade reusable data table component.
 * It provides standard search bar, quick filter toolbar, item counter, row selection,
 * responsive scroll wrapper, and consistent empty states across all Cargo and Money screens.
 */
export function CommonTable<T>({
  cols,
  rows,
  rowKey,
  onRow,
  selected,
  dense,
  foot,
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  toolbarFilters,
  toolbarActions,
  emptyTitle = 'No records found',
  emptySubtitle = 'Try adjusting your search query or filters to find what you are looking for.',
  emptyAction,
  itemLabel = 'records'
}: CommonTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');
  const activeSearch = searchValue !== undefined ? searchValue : internalSearch;
  const handleSearchChange = onSearchChange ?? setInternalSearch;

  return (
    <Panel flush>
      {(onSearchChange || toolbarFilters || toolbarActions) && (
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
          {onSearchChange && (
            <div style={{ width: 280, maxWidth: '100%', position: 'relative' }}>
              <SearchInput
                icon={<Search size={15} />}
                value={activeSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
              {activeSearch && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--ink-3)',
                    padding: 2
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {toolbarFilters}

          <span className="spacer" />

          <div className="row" style={{ gap: 8 }}>
            <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>
              {rows.length} {itemLabel}
            </span>
            {toolbarActions}
          </div>
        </div>
      )}

      <DataTable
        cols={cols}
        rows={rows}
        rowKey={rowKey}
        onRow={onRow}
        selected={selected}
        dense={dense}
        foot={foot}
        empty={
          <Empty title={emptyTitle} action={emptyAction}>
            {emptySubtitle}
          </Empty>
        }
      />
    </Panel>
  );
}
