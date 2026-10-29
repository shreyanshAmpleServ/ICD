import { useQuery, type QueryKey } from '@tanstack/react-query';

/* Every screen reads data through useQ. Today the functions behind it are the
   mock modules in src/mock; in the build step they become typed calls to the
   API (openapi-fetch against ng_icd_api.yaml) with the same names and shapes,
   so screens do not change. */
export function useQ<T>(key: QueryKey, fn: () => Promise<T>) {
  return useQuery({ queryKey: key, queryFn: fn, staleTime: 30_000 });
}

/** Simulated network latency for the mock layer. */
export const delay = <T,>(v: T, ms = 120): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms));
