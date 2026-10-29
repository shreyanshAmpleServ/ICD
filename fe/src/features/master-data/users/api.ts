import { api } from '@/api/client';
import { users as seedUsers, delegations as seedDelegations, type User } from '@/mock/admin';
import { ROLES, type Role } from '@/app/roles';

export interface UserQueryParams {
  q?: string;
  role?: string;
  roleCode?: string;
  siteId?: string | number;
  active?: boolean | string;
  isActive?: boolean | string;
}

export interface CreateUserData {
  fullName: string;
  userName?: string;
  email: string;
  title?: string;
  mobile?: string;
  phone?: string;
  preferredLanguage?: 'en' | 'sw';
  mfaRequired?: boolean;
  roleCode?: string;
  siteId?: string | number | null;
  validFrom?: string;
  validTo?: string;
  reason?: string;
}

export const usersApi = {
  getUsers: async (params?: UserQueryParams): Promise<User[]> => {
    try {
      const qp = new URLSearchParams();
      if (params?.q?.trim()) qp.set('q', params.q.trim());
      const role = params?.role || params?.roleCode;
      if (role && role !== 'all') qp.set('role', role);
      if (params?.siteId !== undefined && params?.siteId !== 'all') qp.set('siteId', String(params.siteId));
      const active = params?.active !== undefined ? params.active : params?.isActive;
      if (active !== undefined && active !== 'all') qp.set('active', String(active));

      const queryStr = qp.toString();
      const endpoint = queryStr ? `/users?${queryStr}` : '/users';
      const res = await api.get<any>(endpoint);
      return res?.items ?? (Array.isArray(res) ? res : seedUsers);
    } catch {
      return seedUsers;
    }
  },

  getUser: async (userId: number): Promise<User | null> => {
    try {
      return await api.get<User>(`/users/${userId}`);
    } catch {
      return null;
    }
  },

  createUser: async (data: CreateUserData): Promise<User> => {
    return api.post<User>('/users', data);
  },

  updateUser: async (userId: number, data: Partial<User>): Promise<User> => {
    return api.patch<User>(`/users/${userId}`, data);
  },

  grantRole: async (userId: number, grant: any) => {
    return api.post<any>(`/users/${userId}/roles`, grant);
  },

  revokeRole: async (userId: number, roleGrantIdOrCode: number | string) => {
    return api.delete<void>(`/users/${userId}/roles/${roleGrantIdOrCode}`);
  },

  deactivateUser: async (userId: number, reason: string) => {
    return api.post<any>(`/users/${userId}/deactivate`, { reason });
  },

  activateUser: async (userId: number) => {
    return api.post<any>(`/users/${userId}/activate`);
  },

  getRoles: async (): Promise<Role[]> => {
    try {
      const res = await api.get<any>('/roles');
      const list = res?.items ?? (Array.isArray(res) ? res : ROLES);
      return list.map((r: any) => ({
        code: r.code || r.roleCode,
        name: r.name || r.roleName,
        external: !!r.external,
        grants: r.grants || {},
      }));
    } catch {
      return ROLES;
    }
  },

  updateRolePermissions: async (roleIdOrCode: string | number, grants: any) => {
    return api.put<any>(`/roles/${roleIdOrCode}/permissions`, { grants });
  },

  getPermissions: async () => {
    try {
      const res = await api.get<any>('/permissions');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },

  getDelegations: async () => {
    try {
      const res = await api.get<any>('/delegations');
      return res?.items ?? (Array.isArray(res) ? res : seedDelegations);
    } catch {
      return seedDelegations;
    }
  },

  createDelegation: async (data: any) => {
    return api.post<any>('/delegations', data);
  },
};
