import type { ReactNode } from 'react';
import { Empty } from '@/ds/components';

export { Empty };

export function EmptyState({
  title = 'No records found',
  description = 'There are no items to display matching the current criteria.',
  action,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Empty title={title} action={action}>
      {description}
    </Empty>
  );
}
