import type { components } from './contract';

/** Any schema from the API contract (ng_icd_api.yaml), e.g. S<'UnitStay'>. */
export type S<K extends keyof components['schemas']> = components['schemas'][K];

/** Shape of every paged list response. */
export interface Page<T> { items: T[]; nextCursor: string | null }
