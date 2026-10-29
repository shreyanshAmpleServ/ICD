import { api } from '@/api/client';
import { notificationRules as seedRules, notificationTemplates as seedTpl, printTemplates as seedPrint } from '@/mock/admin';

export const notificationsApi = {
  getNotificationTemplates: async () => {
    try {
      const res = await api.get<any>('/notification-templates');
      return res?.items ?? (Array.isArray(res) ? res : seedTpl);
    } catch {
      return seedTpl;
    }
  },
  updateNotificationTemplate: async (id: number, data: any) => {
    return api.patch<any>(`/notification-templates/${id}`, data);
  },
  getNotificationRules: async () => {
    try {
      const res = await api.get<any>('/notification-rules');
      return res?.items ?? (Array.isArray(res) ? res : seedRules);
    } catch {
      return seedRules;
    }
  },
  getPrintTemplates: async () => {
    try {
      const res = await api.get<any>('/print-templates');
      return res?.items ?? (Array.isArray(res) ? res : seedPrint);
    } catch {
      return seedPrint;
    }
  },
};
