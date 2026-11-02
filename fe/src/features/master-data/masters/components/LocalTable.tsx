import { type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button, DataTable, Panel, type Col } from '@/ds/components';

interface LocalTableProps<T> {
  title: string;
  addLabel: string;
  rows: T[];
  rowKey: (r: T) => number;
  cols: Col<T>[];
  toolbar: ReactNode;
  onAdd?: () => void;
  onRow?: (item: T) => void;
}

export function LocalTable<T>({ title, addLabel, rows, rowKey, cols, toolbar, onAdd, onRow }: LocalTableProps<T>) {
  return (
    <Panel
      flush
      title={title}
      sub="Master data from ICD database; add or edit freely"
      actions={
        onAdd && (
          <Button
            size="sm"
            icon={<Plus />}
            perm="masters.local.edit"
            onClick={onAdd}
          >
            {addLabel}
          </Button>
        )
      }
    >
      {toolbar}
      <DataTable rows={rows} rowKey={rowKey} cols={cols} onRow={onRow} />
    </Panel>
  );
}
