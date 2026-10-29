// Centralized React Query Keys for DCC NG ICD

export const QUERY_KEYS = {
  invoices: {
    all: ['invoices'] as const,
    list: (siteId?: string) => ['invoices', siteId] as const,
    detail: (id: string | number) => ['invoice', id] as const,
  },
  units: {
    all: ['units'] as const,
    list: (siteId?: string) => ['units', siteId] as const,
    detail: (id: string | number) => ['unit', id] as const,
  },
  visits: {
    all: ['visits'] as const,
    detail: (id: string | number) => ['visit', id] as const,
  },
  consignments: {
    all: ['consignments'] as const,
    detail: (id: string | number) => ['consignment', id] as const,
  },
  vesselCalls: {
    all: ['vessel-calls'] as const,
  },
  manifests: {
    all: ['manifests'] as const,
  },
  customs: {
    all: ['customs-declarations'] as const,
  },
  holds: {
    all: ['holds'] as const,
  },
  releases: {
    all: ['releases'] as const,
    detail: (id: string | number) => ['release', id] as const,
  },
  tariffs: {
    all: ['tariffs'] as const,
    detail: (id: string | number) => ['tariff', id] as const,
  },
  parties: {
    all: ['parties'] as const,
  },
  dashboard: {
    controlTower: ['control-tower'] as const,
    kpis: ['kpis'] as const,
  },
} as const;
