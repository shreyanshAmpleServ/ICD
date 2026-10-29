import { api } from '@/api/client';
import { notifications, type Note } from '@/mock/cargo';

export const inboxApi = {
  getNotifications: async (): Promise<Note[]> => {
    try {
      const res = await api.get<Note[]>('/me/inbox');
      return res && res.length > 0 ? res : notifications;
    } catch {
      return notifications;
    }
  },

  markRead: async (notificationId: number) => {
    return api.post<any>(`/me/inbox/${notificationId}/mark-read`, {});
  },

  markAllRead: async () => {
    return api.post<any>('/me/inbox/mark-all-read', {});
  },
};
