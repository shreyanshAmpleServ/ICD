// Truly shared API Types for DCC NG ICD
import type { components } from '@/api/contract';

export type S<K extends keyof components['schemas']> = components['schemas'][K];

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  title?: string;
  detail?: string;
  status?: number;
  message?: string;
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;
