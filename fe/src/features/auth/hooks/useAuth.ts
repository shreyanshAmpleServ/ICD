import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/app/session';
import { authService } from '@/services/auth';
import { authApi } from '../api/authApi';
import type { LoginCredentials, AuthSession } from '../authTypes';

export const AUTH_QUERY_KEYS = {
  me: ['auth', 'me'] as const,
};

/** TanStack Query Mutation for User Login */
export function useLoginMutation() {
  const queryClient = useQueryClient();
  const session = useSession();

  return useMutation<AuthSession, Error, LoginCredentials>({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      // Sync with session context only if login completed
      if (data.user) {
        if (data.user.roleCode) {
          session.setRoleCode(data.user.roleCode);
        }
        if (data.user.siteId) {
          const siteNumber =
            data.user.siteId === 'DAR1' ? 1 : data.user.siteId === 'DAR2' ? 2 : data.user.siteId === 'KBH1' ? 3 : 1;
          session.setSiteId(siteNumber);
        }
        // Invalidate queries so live user/tenant data refreshes
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
      }
    },
  });
}

/** TanStack Query Mutation for User Logout */
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<void, Error, void>({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Clear React Query cache completely on logout
      queryClient.clear();
      navigate('/login');
    },
  });
}

/** TanStack Query for Current User Details */
export function useCurrentUserQuery() {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.me,
    queryFn: () => authApi.getCurrentUser(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Unified Auth Hook */
export function useAuth() {
  const session = useSession();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const currentUserQuery = useCurrentUserQuery();

  return {
    ...session,
    isAuthenticated: authService.isAuthenticated(),
    token: authService.getToken(),
    user: authService.getUser() || {
      username: session.userName,
      roleCode: session.roleCode,
      siteId: session.site.siteCode,
      isExternal: session.isExternal,
    },
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    userData: currentUserQuery.data,
    isLoadingUser: currentUserQuery.isLoading,
  };
}
