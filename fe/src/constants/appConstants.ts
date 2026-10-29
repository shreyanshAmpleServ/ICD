// Centralized Application Constants for DCC NG ICD

export const APP_CONFIG = {
  name: 'NG ICD',
  subtitle: 'DCC Logistics Suite',
  version: '2.0.0',
  defaultSite: 'DAR1',
  defaultCurrency: 'USD',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
} as const;

export const STORAGE_KEYS = {
  token: 'ngicd.token',
  site: 'ngicd.site',
  role: 'ngicd.role',
  phase: 'ngicd.phase',
  locale: 'ngicd.locale',
  theme: 'ngicd.theme',
} as const;

export const DATE_FORMATS = {
  display: 'yyyy-MM-dd HH:mm',
  dateOnly: 'yyyy-MM-dd',
  timeOnly: 'HH:mm:ss',
} as const;
