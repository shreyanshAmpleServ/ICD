import { StatusPill } from '@/ds/components';

export interface StatusCellProps {
  value: string | null | undefined;
  track?: 'physical' | 'customs' | 'billing' | 'release' | 'generic';
}

/** Standardized Status Badge cell */
export function StatusCell({
  value,
  track = 'generic'
}: StatusCellProps) {
  return <StatusPill value={value} track={track} />;
}
