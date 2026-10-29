import { api } from '@/api/client';
import { fieldRules as seedRules, holidays as seedHol } from '@/mock/admin';

export const settingsApi = {
  getFieldRules: async () => {
    try {
      const res = await api.get<any>('/field-rules');
      return res?.items ?? (Array.isArray(res) ? res : seedRules);
    } catch {
      return seedRules;
    }
  },
  createFieldRule: async (data: any) => {
    return api.post<any>('/field-rules', data);
  },
  getCalendars: async () => {
    try {
      const res = await api.get<any>('/calendars');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  getHolidays: async (calendarId = 1) => {
    try {
      const res = await api.get<any>(`/calendars/${calendarId}/holidays`);
      return res?.items ?? (Array.isArray(res) ? res : seedHol);
    } catch {
      return seedHol;
    }
  },
  addHoliday: async (calendarId: number, data: any) => {
    return api.post<any>(`/calendars/${calendarId}/holidays`, data);
  },
  deleteHoliday: async (calendarId: number, holidayId: number) => {
    return api.delete<any>(`/calendars/${calendarId}/holidays/${holidayId}`);
  },
};
