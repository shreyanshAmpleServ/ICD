import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ROLES, type Grant, type Role } from './roles';
import { api } from '@/api/client';
import { authService } from '@/services/auth';

export const ALL_ROLE = '__ALL__';
const RANK: Record<Grant, number> = { VIEW: 1, REQ: 2, DO: 3, APPR: 4 };

export interface DemoSite { siteId: number; siteCode: string; siteName: string; facilities: string[] }
export const SITES: DemoSite[] = [
  { siteId: 1, siteCode: 'DAR1', siteName: 'Dar es Salaam main yard', facilities: ['ICD', 'CFS', 'EMPTY_DEPOT'] },
  { siteId: 2, siteCode: 'DAR2', siteName: 'Dar es Salaam vehicle yard', facilities: ['ICDV'] },
  { siteId: 3, siteCode: 'KBH1', siteName: 'Kibaha warehouse', facilities: ['WAREHOUSE', 'CFS'] },
];

type Phase = 1 | 2;
type Theme = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'sw';

interface Session {
  roleCode: string;
  setRoleCode(r: string): void;
  site: DemoSite;
  setSiteId(id: number): void;
  sites: DemoSite[];
  roles: Role[];
  phase: Phase;
  setPhase(p: Phase): void;
  theme: Theme;
  setTheme(t: Theme): void;
  lang: Lang;
  setLang(l: Lang): void;
  offline: boolean;
  setOffline(o: boolean): void;
  userName: string;
  userEmail?: string;
  /** Effective grant for a permission code, or null. */
  grant(code: string): Grant | null;
  /** True when the user holds at least `level` on the permission. */
  can(code: string | null | undefined, level?: Grant): boolean;
  isExternal: boolean;
  refetchSession(): void;
}

const Ctx = createContext<Session | null>(null);

function read<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem('ngicd.' + k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem('ngicd.' + k, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [roleCode, setRoleCodeState] = useState<string>(() => {
    const active = authService.getActiveRole();
    return active && active !== '__ALL__' ? active : read('role', ALL_ROLE);
  });

  const [siteId, setSiteIdState] = useState<number>(() => {
    const active = authService.getActiveSite();
    if (active === 'DAR2' || active === '2') return 2;
    if (active === 'KBH1' || active === '3') return 3;
    return read('site', 1);
  });

  const [phase, setPhase] = useState<Phase>(() => read('phase', 2));
  const [theme, setTheme] = useState<Theme>(() => read('theme', 'system'));
  const [lang, setLang] = useState<Lang>(() => read('lang', 'en'));
  const [offline, setOffline] = useState(false);

  // Dynamic lists from backend
  const [dynamicSites, setDynamicSites] = useState<DemoSite[]>(SITES);
  const [dynamicRoles, setDynamicRoles] = useState<Role[]>(ROLES);
  const [userName, setUserName] = useState<string>(() => authService.getUser()?.username || 'Ashok Kumar');
  const [userEmail, setUserEmail] = useState<string | undefined>(() => authService.getUser()?.email);

  const fetchSessionData = () => {
    // 1. Fetch live sites from backend
    api
      .get<any>('/sites')
      .then((res) => {
        const list = res?.items ?? (Array.isArray(res) ? res : null);
        if (list && Array.isArray(list) && list.length > 0) {
          setDynamicSites(
            list.map((s: any) => ({
              siteId: Number(s.siteId),
              siteCode: String(s.siteCode),
              siteName: String(s.siteName),
              facilities: Array.isArray(s.facilities) ? s.facilities : ['ICD'],
            }))
          );
        }
      })
      .catch(() => {});

    // 2. Fetch live roles from backend
    api
      .get<any>('/roles')
      .then((res) => {
        const list = res?.items ?? (Array.isArray(res) ? res : null);
        if (list && Array.isArray(list) && list.length > 0) {
          setDynamicRoles(
            list.map((r: any) => ({
              code: r.code || r.roleCode,
              name: r.name || r.roleName,
              external: !!r.external,
              grants: r.grants || {},
            }))
          );
        }
      })
      .catch(() => {});

    // 3. Fetch logged in session from /me
    api
      .get<any>('/me')
      .then((res) => {
        if (res?.name || res?.user?.userName) {
          const name = res.name || res.user?.userName;
          const email = res.email || res.user?.email;
          setUserName(name);
          setUserEmail(email);

          // If role returned and not explicitly customized, sync it
          if (res.user?.roleCode && roleCode === ALL_ROLE) {
            setRoleCodeState(res.user.roleCode);
            authService.setActiveRole(res.user.roleCode);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  const setRoleCode = (r: string) => {
    setRoleCodeState(r);
    authService.setActiveRole(r);
  };

  const setSiteId = (id: number) => {
    setSiteIdState(id);
    const matched = dynamicSites.find((s) => s.siteId === id) || SITES.find((s) => s.siteId === id);
    if (matched) {
      authService.setActiveSite(matched.siteCode);
      api.post('/session/switch-site', { siteCode: matched.siteCode }).catch(() => {});
    }
  };

  useEffect(() => write('role', roleCode), [roleCode]);
  useEffect(() => write('site', siteId), [siteId]);
  useEffect(() => write('phase', phase), [phase]);
  useEffect(() => write('lang', lang), [lang]);
  useEffect(() => {
    write('theme', theme);
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const value = useMemo<Session>(() => {
    const role = dynamicRoles.find((r) => r.code === roleCode);
    const grant = (code: string): Grant | null => {
      if (!role || roleCode === ALL_ROLE) return 'APPR'; // "All permissions"
      return role.grants[code] ?? null;
    };
    const currentSite = dynamicSites.find((s) => s.siteId === siteId) ?? dynamicSites[0] ?? SITES[0];

    return {
      roleCode,
      setRoleCode,
      phase,
      setPhase,
      theme,
      setTheme,
      lang,
      setLang,
      offline,
      setOffline,
      sites: dynamicSites,
      roles: dynamicRoles,
      site: currentSite,
      setSiteId,
      userName: userName || (role ? 'Neema Mushi' : 'Ashok Kumar'),
      userEmail,
      grant,
      can: (code, level = 'VIEW') => {
        if (!code) return true;
        const g = grant(code);
        return !!g && RANK[g] >= RANK[level];
      },
      isExternal: !!role?.external,
      refetchSession: fetchSessionData,
    };
  }, [roleCode, siteId, phase, theme, lang, offline, dynamicSites, dynamicRoles, userName, userEmail]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}
