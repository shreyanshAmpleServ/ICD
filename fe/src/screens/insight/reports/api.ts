import { api } from '@/api/client';
import { reports, reportPreview, type Report } from '@/mock/insight';
import { delay } from '@/api/query';

export const reportsApi = {
  getReports: async () => {
    try {
      const res = await api.get<any[]>('/reports');
      return res && res.length > 0 ? res : reports;
    } catch {
      return delay(reports);
    }
  },

  runPreview: (report: Report, partyId?: number) => {
    return reportPreview(report, partyId);
  },

  runReport: async (reportCode: string, params: any) => {
    return api.post<any>(`/reports/${reportCode}/run`, params);
  },

  exportReport: async (reportCode: string, format: string, params: any) => {
    return api.post<any>(`/reports/${reportCode}/export`, { format, ...params });
  },

  saveReport: async (data: any) => {
    return api.post<any>('/reports/saved', data);
  },
};
