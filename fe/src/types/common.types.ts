// Truly shared Common Types for DCC NG ICD
import type { ReactNode } from 'react';

export interface RouteDef {
  path: string;
  element: ReactNode;
  title?: string;
  permission?: string;
}

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

export type StatusVariant = 'ready' | 'pending' | 'review' | 'blocked' | 'muted' | 'danger' | 'info' | 'success';

export interface BaseEntity {
  id: string | number;
  createdAt?: string;
  updatedAt?: string;
}
