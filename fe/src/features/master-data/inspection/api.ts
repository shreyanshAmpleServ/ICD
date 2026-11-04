import { api } from '@/api/client';

export interface CreateInspectionTemplateData {
  templateCode: string;
  templateName: string;
  category: 'CONTAINER' | 'VEHICLE';
  inspectionKind: 'GATE_IN' | 'GATE_OUT' | 'YARD';
  minPhotos?: number;
  versionNo?: number;
  items?: Array<{
    itemCode: string;
    itemName: string;
    area?: string;
    inputType?: string;
    isMandatory?: boolean;
    sortOrder?: number;
  }>;
}

export interface CreateDamageCodeData {
  damageCode: string;
  damageName: string;
  appliesTo: 'ALL' | 'CONTAINER' | 'VEHICLE' | 'ANY';
  severity?: 'MIN' | 'MOD' | 'MAJ';
  description?: string;
}

export const inspectionApi = {
  getInspectionTemplates: async () => {
    try {
      const res = await api.get<any>('/inspection-templates');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createInspectionTemplate: async (data: CreateInspectionTemplateData) => {
    return api.post<any>('/inspection-templates', data);
  },
  saveChecklist: async (data: any) => {
    return api.post<any>('/inspection-templates', data);
  },
  getDamageCodes: async () => {
    try {
      const res = await api.get<any>('/damage-codes');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createDamageCode: async (data: CreateDamageCodeData) => {
    return api.post<any>('/damage-codes', data);
  },
};
