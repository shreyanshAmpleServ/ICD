import type { ReactNode } from 'react';
import { Page, PageHeader } from '@/ds/components';
import { MainLayout } from './MainLayout';

export function DashboardLayout({
  title,
  sub,
  actions,
  crumbs,
  ms,
  wide = false,
  children,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  crumbs?: [string, string?][];
  ms?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <MainLayout>
      <Page wide={wide}>
        {title && <PageHeader title={title} sub={sub} actions={actions} crumbs={crumbs} ms={ms} />}
        {children}
      </Page>
    </MainLayout>
  );
}
