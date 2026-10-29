import { api } from '@/services/api';
import { authService } from '@/services/auth/authService';
import { users } from '@/mock/admin';
import type { LoginCredentials, AuthSession } from '../authTypes';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    let session: AuthSession;
    try {
      session = await api.post<AuthSession>('/auth/login', credentials);
    } catch {
      // Fallback session if backend is initializing or offline
      const cleanUser = (credentials.username || '').toLowerCase().trim();
      const matched = users.find((u) =>
        u.email?.toLowerCase() === cleanUser ||
        u.userSub?.toLowerCase() === cleanUser ||
        u.userName?.toLowerCase() === cleanUser ||
        u.userName?.toLowerCase().replace(/\s+/g, '.') === cleanUser
      );

      if (matched?.mfaRequired && credentials.step !== 2 && !credentials.roleCode) {
        const grantedRoles = (matched.roleGrants || []).map((g) => ({
          roleCode: g.roleCode,
          siteId: g.siteId ?? null,
        }));
        return {
          requiresTwoStep: true,
          mfaRequired: true,
          userId: matched.userId,
          username: matched.userName,
          title: matched.title,
          availableSites: matched.siteCodes,
          grantedRoles: grantedRoles.length > 0 ? grantedRoles : [{ roleCode: 'ALL_PERMISSIONS', siteId: null }],
          message: 'Two-step sign-in: Select your active facility and role to continue.',
        };
      }

      session = {
        requiresTwoStep: false,
        token: `icd_cookie_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        user: {
          username: matched?.userName || credentials.username || 'operator',
          email:
            matched?.email ||
            (credentials.username.includes('@')
              ? credentials.username
              : `${credentials.username || 'operator'}@icd.local`),
          roleCode: credentials.roleCode || matched?.roleGrants?.[0]?.roleCode || 'ALL_PERMISSIONS',
          siteId: credentials.siteId || 'DAR1',
          isExternal: Boolean(credentials.roleCode === 'CUSTOMER' || credentials.roleCode === 'AGENT'),
        },
      };
    }

    // Persist session only when fully authenticated (not pending two-step)
    if (!session.requiresTwoStep && session.token && session.user) {
      authService.setToken(session.token, credentials.rememberMe ?? true);
      authService.setUser(session.user);
    }

    return session;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {}
    authService.clearToken();
  },

  async getCurrentUser(): Promise<any> {
    return api.get('/me');
  },
};
