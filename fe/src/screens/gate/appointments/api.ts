import { api } from '@/api/client';

function unwrapList<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export const appointmentsApi = {
  getAppointments: async () => {
    const res = await api.get<any>('/appointments');
    return unwrapList(res);
  },

  createAppointment: async (body: any) => {
    return api.post<any>('/appointments', body);
  },

  updateAppointmentStatus: async (id: number | string, status: string) => {
    return api.patch<any>(`/appointments/${id}/status`, { status });
  },
};
