import type { components } from './contract';

export type S<K extends keyof components['schemas']> = components['schemas'][K];
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}
export type Tone = 'go' | 'stop' | 'wait' | 'blue' | 'neutral';
