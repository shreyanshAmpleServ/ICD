import { api } from '@/api/client';

export const notificationsApi = {
  getNotificationTemplates: async () => {
    try {
      const res = await api.get<any>('/notification-templates');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  updateNotificationTemplate: async (id: number, data: any) => {
    return api.patch<any>(`/notification-templates/${id}`, data);
  },
  getNotificationRules: async () => {
    try {
      const res = await api.get<any>('/notification-rules');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  getPrintTemplates: async () => {
    try {
      const res = await api.get<any>('/print-templates');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
};
