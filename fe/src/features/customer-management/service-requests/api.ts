import { api } from '@/api/client';
import { serviceRequests } from '@/mock/insight';

export const serviceRequestsApi = {
  getServiceRequests: async () => {
    try {
      const res = await api.get<any[]>('/service-requests');
      return res && res.length > 0 ? res : serviceRequests;
    } catch {
      return serviceRequests;
    }
  },

  createServiceRequest: async (body: any) => {
    return api.post<any>('/service-requests', body);
  },

  respondToServiceRequest: async (id: number | string, data: any) => {
    return api.post<any>(`/service-requests/${id}/respond`, data);
  },
};
