import { api } from '@/api/client';
import { notifications, type Note } from '@/mock/cargo';

export const inboxApi = {
  getNotifications: async (): Promise<Note[]> => {
    try {
      const res = await api.get<any>('/notifications/inbox');
      const items = res?.items || (Array.isArray(res) ? res : null);
      return items && items.length > 0 ? items : notifications;
    } catch {
      return notifications;
    }
  },

  markRead: async (notificationId: number) => {
    try {
      return await api.post<any>(`/notifications/${notificationId}:read`, {});
    } catch {
      return await api.post<any>(`/me/inbox/${notificationId}/mark-read`, {});
    }
  },

  markAllRead: async () => {
    try {
      return await api.post<any>('/notifications:read-all', {});
    } catch {
      return await api.post<any>('/me/inbox/mark-all-read', {});
    }
  },
};
