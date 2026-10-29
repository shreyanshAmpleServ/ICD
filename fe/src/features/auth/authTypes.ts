export interface LoginCredentials {
  username: string;
  password?: string;
  roleCode?: string;
  siteId?: string;
  rememberMe?: boolean;
  step?: number;
}

export interface AuthUser {
  userId?: number;
  username: string;
  email?: string;
  roleCode: string;
  siteId: string;
  isExternal: boolean;
}

export interface AuthSession {
  requiresTwoStep?: boolean;
  mfaRequired?: boolean;
  token?: string;
  user?: AuthUser;
  userId?: number;
  username?: string;
  title?: string;
  availableSites?: string[];
  grantedRoles?: Array<{ roleCode: string; siteId?: number | null }>;
  message?: string;
}
