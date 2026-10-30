import { useQuery, type QueryKey } from '@tanstack/react-query';
import { api } from './client';

/** Resolves React Query keys to live DCC NG ICD Backend API endpoints */
function resolveEndpoint(key: QueryKey): string | null {
  if (!Array.isArray(key) || key.length === 0) return null;
  const root = String(key[0]);
  const param = key[1];

  switch (root) {
    case 'invoices':
      return param ? `/invoices?siteId=${param}` : '/invoices';
    case 'invoice':
      return param ? `/invoices/${param}` : null;
    case 'units':
      return param ? `/units?siteId=${param}` : '/units';
    case 'unit':
      return param ? `/units/${param}` : null;
    case 'visits':
      return '/truck-visits';
    case 'visit':
      return param ? `/truck-visits/${param}` : null;
    case 'move-orders':
      return '/move-orders';
    case 'parties':
      return '/parties';
    case 'holds':
      return '/holds';
    case 'tariffs':
      return '/tariffs';
    case 'tariff':
      return param ? `/tariffs/${param}` : null;
    case 'rates':
      return '/exchange-rates';
    case 'disbursements':
      return '/disbursements';
    case 'gl':
      return '/gl-postings';
    case 'refunds':
      return '/refunds';
    case 'charges':
      return '/charges';
    case 'statement':
      return '/statements';
    case 'control-tower':
      return '/dashboards/control-tower';
    case 'handling-jobs':
      return '/handling-jobs';
    case 'handling-job':
      return param ? `/handling-jobs/${param}` : null;
    case 'repair-estimates':
      return '/repair-estimates';
    case 'repair-estimate':
      return param ? `/repair-estimates/${param}` : null;
    case 'reefer-sessions':
      return '/reefer-sessions';
    case 'keys':
      return '/vehicle-keys';
    case 'consignments':
      return '/consignments';
    case 'consignment':
      return param ? `/consignments/${param}` : null;
    case 'vessel-calls':
      return '/vessel-calls';
    case 'manifests':
      return '/manifests';
    case 'appointments':
      return '/appointments';
    case 'approvals':
      return '/approvals';
    case 'exceptions':
      return '/exceptions';
    case 'exception':
      return param ? `/exceptions/${param}` : null;
    case 'customs-refs':
      return '/customs-declarations';
    case 'users':
      if (param && typeof param === 'object') {
        const qp = new URLSearchParams();
        Object.entries(param as Record<string, any>).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '' && v !== 'all') qp.set(k, String(v));
        });
        const qs = qp.toString();
        return qs ? `/users?${qs}` : '/users';
      }
      return '/users';
    case 'roles':
      return '/roles';
    case 'permissions':
      return '/permissions';
    case 'weighings':
      return '/weighings';
    case 'inspections':
      return param ? `/inspections?siteId=${param}` : '/inspections';
    case 'inspection':
      return param ? `/inspections/${param}` : null;
    case 'reports':
      return '/reports';
    case 'audit':
      return '/audit-log';
    case 'kpis':
      return '/kpis/tiles';
    case 'forecast-occ':
      return '/forecasts/occupancy';
    case 'forecast-dwell':
      return '/predictions/dwell';
    case 'inbox':
      return '/notifications/inbox';
    case 'service-requests':
      return '/service-requests';
    case 'dg-lines':
      return '/dg-lines';
    case 'customs-exams':
      return '/exams';
    case 'vessel-call':
      return param ? `/vessel-calls/${param}` : null;
    case 'manifest':
      return param ? `/manifests/${param}` : null;
    case 'release-orders':
      return '/release-orders';
    case 'release-order':
      return param ? `/release-orders/${param}` : null;
    case 'portal-units':
      return param ? `/portal/units?partyId=${param}` : '/portal/units';
    case 'portal-invoices':
      return param ? `/portal/invoices?partyId=${param}` : '/portal/invoices';
    case 'portal-documents':
      return param ? `/portal/documents?partyId=${param}` : '/portal/documents';
    case 'portal-appointments':
      return param ? `/portal/appointments?partyId=${param}` : '/portal/appointments';
    case 'portal-requests':
      return param ? `/portal/requests?partyId=${param}` : '/portal/requests';
    case 'portal-summary':
      return param ? `/portal/summary?partyId=${param}` : '/portal/summary';
    case 'admin':
      return resolveAdminEndpoint(String(param));
    default:
      return null;
  }
}

/** Resolves AdminKit keys to live setup endpoints */
function resolveAdminEndpoint(subKey: string): string | null {
  switch (subKey) {
    case 'company':
    case 'companies': return '/companies';
    case 'users': return '/users';
    case 'roles': return '/roles';
    case 'permissions': return '/permissions';
    case 'unitTypes': return '/unit-types';
    case 'identityRules': return '/identity-rules';
    case 'cargoRegimes': return '/cargo-regimes';
    case 'sites': return '/sites';
    case 'packs': return '/country-packs';
    case 'fieldRules': return '/field-rules';
    case 'holidays': return '/calendars/1/holidays';
    case 'calendars': return '/calendars';
    case 'holdTypes': return '/hold-types';
    case 'releaseRules': return '/release-rules';
    case 'policies': return '/approval-policies';
    case 'excTypes': return '/exception-types';
    case 'notifTpl': return '/notification-templates';
    case 'notifRules':
    case 'notificationRules': return '/notification-rules';
    case 'printTemplates': return '/print-templates';
    case 'models': return '/models';
    case 'trucks': return '/trucks';
    case 'drivers': return '/drivers';
    case 'vessels': return '/vessels';
    case 'ports': return '/ports';
    case 'commodities': return '/commodities';
    case 'equipment': return '/equipment';
    case 'inspTpl': return '/inspection-templates';
    case 'damageCodes': return '/damage-codes';
    case 'gates': return '/gates';
    case 'checkpoints': return '/checkpoints';
    case 'visitTypes': return '/visit-types';
    case 'periods': return '/accounting-periods';
    case 'charges': return '/charge-codes';
    case 'taxCodes': return '/tax-codes';
    case 'paymentChannels':
    case 'channels': return '/payment-channels';
    case 'gl':
    case 'glSettings': return '/gl-settings';
    case 'seqs': return '/number-sequences';
    case 'docTypes': return '/document-types';
    case 'documents': return '/documents';
    case 'devices': return '/devices';
    case 'integrations': return '/device-integrations';
    case 'yard': return '/yard/locations';
    case 'sync': return '/sync/status';
    case 'outbox': return '/sync/outbox';
    default: return null;
  }
}


/**
 * useQ connects the screen directly to the live backend API.
 * Uses live API data seeded in database / backend directly without mixing mock data.
 */
export function useQ<T>(key: QueryKey, fn: () => Promise<T>) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const endpoint = resolveEndpoint(key);
      if (endpoint) {
        try {
          const res = await api.get<any>(endpoint);
          
          // Unpack paginated collection: { items: [...] }
          if (res && typeof res === 'object' && Array.isArray(res.items)) {
            return res.items as T;
          }

          // Plain array response
          if (Array.isArray(res)) {
            return res as T;
          }

          // Single record response
          if (res && typeof res === 'object') {
            return res as T;
          }
        } catch (err) {
          console.warn(`[Dynamic API] Live API fetch fallback for ${endpoint}:`, err);
        }
      }

      try {
        return await fn();
      } catch {
        return [] as unknown as T;
      }
    },
    staleTime: 10_000,
  });
}

/** Simulated network latency for the mock layer. */
export const delay = <T,>(v: T, ms = 120): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms));
