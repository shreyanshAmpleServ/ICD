import type { ReactNode } from 'react';
import { Banner, Button } from '@/ds/components';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <Banner
      tone="stop"
      title={title}
      action={onRetry ? <Button size="sm" onClick={onRetry}>Retry</Button> : undefined}
    >
      {message || 'An error occurred while loading this data. Please try again.'}
    </Banner>
  );
}
