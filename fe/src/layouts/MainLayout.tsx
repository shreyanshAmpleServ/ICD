import type { ReactNode } from 'react';
import { Shell } from '@/app/Shell';

export function MainLayout({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
