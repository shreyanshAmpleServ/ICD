import { type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button, DataTable, Panel, useToast, type Col } from '@/ds/components';

interface LocalTableProps<T> {
  title: string;
  addLabel: string;
  rows: T[];
  rowKey: (r: T) => number;
  cols: Col<T>[];
  toolbar: ReactNode;
}

export function LocalTable<T>({ title, addLabel, rows, rowKey, cols, toolbar }: LocalTableProps<T>) {
  const toast = useToast();
  return (
    <Panel
      flush
      title={title}
      sub="Kept in NG ICD; edit freely"
      actions={
        <Button
          size="sm"
          icon={<Plus />}
          perm="masters.local.edit"
          onClick={() => toast(`${addLabel.replace('Add ', '')} added`.replace(/^./, (c) => c.toUpperCase()))}
        >
          {addLabel}
        </Button>
      }
    >
      {toolbar}
      <DataTable rows={rows} rowKey={rowKey} cols={cols} />
    </Panel>
  );
}
