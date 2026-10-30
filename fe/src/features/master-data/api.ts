import { api } from '@/api/client';

export const adminApi = {
  // 1. Company & Sites
  getCompany: async (id = 1) => {
    try {
      const res = await api.get<any>(`/companies/${id}`);
      return res || null;
    } catch { return []; }
  },
  updateCompany: async (id: number, data: any) => {
    return api.patch<any>(`/companies/${id}`, data);
  },
  getSites: async () => {
    try {
      const res = await api.get<any>('/sites');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createSite: async (data: any) => {
    return api.post<any>('/sites', data);
  },
  updateSite: async (id: string | number, data: any) => {
    return api.patch<any>(`/sites/${id}`, data);
  },
  getPacks: async () => {
    try {
      const res = await api.get<any>('/country-packs');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },

  // 2. Yard Designer
  getYardLocations: async (siteId?: number) => {
    try {
      const url = siteId ? `/yard/locations?siteId=${siteId}` : '/yard/locations';
      const res = await api.get<any>(url);
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  createYardLocation: async (data: any) => {
    return api.post<any>('/yard/locations', data);
  },
  updateYardLocation: async (id: number, data: any) => {
    return api.patch<any>(`/yard/locations/${id}`, data);
  },

  // 3. Gates & Visit Types
  getGates: async () => {
    try {
      const res = await api.get<any>('/gates');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createGate: async (data: any) => {
    return api.post<any>('/gates', data);
  },
  updateGate: async (id: number, data: any) => {
    return api.patch<any>(`/gates/${id}`, data);
  },
  getCheckpoints: async () => {
    try {
      const res = await api.get<any>('/checkpoints');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  updateCheckpoint: async (id: number, data: any) => {
    return api.patch<any>(`/checkpoints/${id}`, data);
  },
  getVisitTypes: async () => {
    try {
      const res = await api.get<any>('/visit-types');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  updateVisitType: async (id: number, data: any) => {
    return api.patch<any>(`/visit-types/${id}`, data);
  },

  // 4. Unit Types & Checks
  getUnitTypes: async () => {
    try {
      const res = await api.get<any>('/unit-types');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createUnitType: async (data: any) => {
    return api.post<any>('/unit-types', data);
  },
  updateUnitType: async (code: string, data: any) => {
    return api.patch<any>(`/unit-types/${code}`, data);
  },
  getIdentityRules: async () => {
    try {
      const res = await api.get<any>('/identity-rules');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  getCargoRegimes: async () => {
    try {
      const res = await api.get<any>('/cargo-regimes');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },

  // 5. Trucks, Drivers, Vessels & Masters
  getMasters: async () => {
    try {
      const [t, d, v, p, c, eq] = await Promise.all([
        api.get<any>('/trucks').catch(() => ({ items: [] })),
        api.get<any>('/drivers').catch(() => ({ items: [] })),
        api.get<any>('/vessels').catch(() => ({ items: [] })),
        api.get<any>('/ports').catch(() => ({ items: [] })),
        api.get<any>('/commodities').catch(() => ({ items: [] })),
        api.get<any>('/equipment').catch(() => ({ items: [] })),
      ]);
      return { trucks: t?.items ?? (Array.isArray(t) ? t : []), drivers: d?.items ?? (Array.isArray(d) ? d : []), vessels: v?.items ?? (Array.isArray(v) ? v : []), ports: p?.items ?? (Array.isArray(p) ? p : []), commodities: c?.items ?? (Array.isArray(c) ? c : []), equipment: eq?.items ?? (Array.isArray(eq) ? eq : []) };
    } catch { return { trucks: [], drivers: [], vessels: [], ports: [], commodities: [], equipment: [] }; }
  },
  createTruck: async (data: any) => api.post<any>('/trucks', data),
  updateTruck: async (id: number, data: any) => api.patch<any>(`/trucks/${id}`, data),
  createDriver: async (data: any) => api.post<any>('/drivers', data),
  updateDriver: async (id: number, data: any) => api.patch<any>(`/drivers/${id}`, data),
  createVessel: async (data: any) => api.post<any>('/vessels', data),
  updateVessel: async (id: number, data: any) => api.patch<any>(`/vessels/${id}`, data),

  // 6. Users & Roles
  getUsers: async () => {
    try {
      const res = await api.get<any>('/users');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createUser: async (data: any) => {
    return api.post<any>('/users', data);
  },
  updateUser: async (id: number, data: any) => {
    return api.patch<any>(`/users/${id}`, data);
  },
  getRoles: async () => {
    try {
      const res = await api.get<any>('/roles');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  getPermissions: async () => {
    try {
      const res = await api.get<any>('/permissions');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  grantRole: async (userId: number, data: any) => {
    return api.post<any>(`/users/${userId}/roles`, data);
  },
  deactivateUser: async (userId: number, reason?: string) => {
    return api.patch<any>(`/users/${userId}`, { isActive: false, reason });
  },

  // 7. Holds, Release & Approvals
  getRules: async () => {
    try {
      const [h, r, p, e] = await Promise.all([
        api.get<any>('/hold-types').catch(() => ({ items: [] })),
        api.get<any>('/release-rules').catch(() => ({ items: [] })),
        api.get<any>('/approval-policies').catch(() => ({ items: [] })),
        api.get<any>('/exception-types').catch(() => ({ items: [] })),
      ]);
      return { holds: h?.items ?? (Array.isArray(h) ? h : []), rules: r?.items ?? (Array.isArray(r) ? r : []), policies: p?.items ?? (Array.isArray(p) ? p : []), exceptions: e?.items ?? (Array.isArray(e) ? e : []) };
    } catch { return { holds: [], rules: [], policies: [], exceptions: [] }; }
  },
  createHoldType: async (data: any) => api.post<any>('/hold-types', data),
  updateReleaseRule: async (id: number, data: any) => api.patch<any>(`/release-rules/${id}`, data),
  updateApprovalPolicy: async (id: number, data: any) => api.patch<any>(`/approval-policies/${id}`, data),
  updateExceptionType: async (id: number, data: any) => api.patch<any>(`/exception-types/${id}`, data),

  // 8. Inspection Checklists & Damage Codes
  getChecklists: async () => {
    try {
      const res = await api.get<any>('/inspection-templates');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
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
  createDamageCode: async (data: any) => {
    return api.post<any>('/damage-codes', data);
  },

  // 9. Finance Setup
  getFinanceSetup: async () => {
    try {
      const [per, chg, tax, pay, gl] = await Promise.all([
        api.get<any>('/accounting-periods').catch(() => ({ items: [] })),
        api.get<any>('/charge-codes').catch(() => ({ items: [] })),
        api.get<any>('/tax-codes').catch(() => ({ items: [] })),
        api.get<any>('/payment-channels').catch(() => ({ items: [] })),
        api.get<any>('/gl-settings').catch(() => ({ items: [] })),
      ]);
      return { periods: per?.items ?? (Array.isArray(per) ? per : []), charges: chg?.items ?? (Array.isArray(chg) ? chg : []), taxCodes: tax?.items ?? (Array.isArray(tax) ? tax : []), paymentChannels: pay?.items ?? (Array.isArray(pay) ? pay : []), glSettings: gl?.items ?? (Array.isArray(gl) ? gl : []) };
    } catch { return { periods: [], charges: [], taxCodes: [], paymentChannels: [], glSettings: [] }; }
  },
  closePeriod: async (key: string, reason?: string) => {
    return api.post<any>(`/accounting-periods/${key}:close`, { reason });
  },
  updateCharge: async (id: number, data: any) => {
    return api.patch<any>(`/charge-codes/${id}`, data);
  },

  // 10. Notifications & Printing
  getNotifications: async () => {
    try {
      const [tpl, rules, print] = await Promise.all([
        api.get<any>('/notification-templates').catch(() => ({ items: [] })),
        api.get<any>('/notification-rules').catch(() => ({ items: [] })),
        api.get<any>('/print-templates').catch(() => ({ items: [] })),
      ]);
      return { templates: tpl?.items ?? (Array.isArray(tpl) ? tpl : []), rules: rules?.items ?? (Array.isArray(rules) ? rules : []), printTemplates: print?.items ?? (Array.isArray(print) ? print : []) };
    } catch { return { templates: [], rules: [], printTemplates: [] }; }
  },
  updateNotificationTemplate: async (id: number, data: any) => {
    return api.patch<any>(`/notification-templates/${id}`, data);
  },

  // 11. Documents & Sequences
  getNumberSequences: async () => {
    try {
      const res = await api.get<any>('/number-sequences');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  updateNumberSequence: async (id: number, data: any) => {
    return api.patch<any>(`/number-sequences/${id}`, data);
  },
  getDocumentTypes: async () => {
    try {
      const res = await api.get<any>('/document-types');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createDocumentType: async (data: any) => {
    return api.post<any>('/document-types', data);
  },
  updateDocumentType: async (id: number, data: any) => {
    return api.patch<any>(`/document-types/${id}`, data);
  },

  // 12. Devices & Integrations
  getDevices: async () => {
    try {
      const res = await api.get<any>('/devices');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  registerDevice: async (data: any) => {
    return api.post<any>('/devices', data);
  },
  revokeDevice: async (id: number, reason?: string) => {
    return api.post<any>(`/devices/${id}:revoke`, { reason });
  },
  getIntegrations: async () => {
    try {
      const res = await api.get<any>('/device-integrations');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },

  // 13. Sync & Outbox
  getSyncStatus: async () => {
    try {
      const res = await api.get<any>('/sync/status');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  getOutbox: async () => {
    try {
      const res = await api.get<any>('/sync/outbox');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  runSync: async (entityName: string) => {
    return api.post<any>(`/sync/${entityName}:run`, {});
  },

  // 14. Prediction Models
  getModels: async () => {
    try {
      const res = await api.get<any>('/models');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  activateModel: async (modelVersionId: number, reason?: string) => {
    return api.post<any>(`/models/${modelVersionId}:activate`, { reason });
  },

  // 15. Field Rules & Calendars
  getFieldRules: async () => {
    try {
      const res = await api.get<any>('/field-rules');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
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
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  addHoliday: async (calendarId: number, data: any) => {
    return api.post<any>(`/calendars/${calendarId}/holidays`, data);
  },
  deleteHoliday: async (calendarId: number, holidayId: number) => {
    return api.delete<any>(`/calendars/${calendarId}/holidays/${holidayId}`);
  },
};
