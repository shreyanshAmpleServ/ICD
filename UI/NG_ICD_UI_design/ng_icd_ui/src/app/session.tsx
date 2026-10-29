import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ROLES, type Grant } from './roles';

/* Demo session. In the real app this comes from GET /me (sites, roles and the
   effective permission grants per site). Here a role switcher lets the team see
   how every screen trims itself to a role, and a phase switch shows which
   screens arrive in Phase 2. */

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
  roleCode: string; setRoleCode(r: string): void;
  site: DemoSite; setSiteId(id: number): void;
  phase: Phase; setPhase(p: Phase): void;
  theme: Theme; setTheme(t: Theme): void;
  lang: Lang; setLang(l: Lang): void;
  offline: boolean; setOffline(o: boolean): void;
  userName: string;
  /** Effective grant for a permission code, or null. */
  grant(code: string): Grant | null;
  /** True when the user holds at least `level` on the permission. */
  can(code: string | null | undefined, level?: Grant): boolean;
  isExternal: boolean;
}

const Ctx = createContext<Session | null>(null);

function read<T>(k: string, d: T): T {
  try { const v = localStorage.getItem('ngicd.' + k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
}
function write(k: string, v: unknown) { try { localStorage.setItem('ngicd.' + k, JSON.stringify(v)); } catch { /* private mode */ } }

export function SessionProvider({ children }: { children: ReactNode }) {
  const [roleCode, setRoleCode] = useState<string>(() => read('role', ALL_ROLE));
  const [siteId, setSiteId] = useState<number>(() => read('site', 1));
  const [phase, setPhase] = useState<Phase>(() => read('phase', 2));
  const [theme, setTheme] = useState<Theme>(() => read('theme', 'system'));
  const [lang, setLang] = useState<Lang>(() => read('lang', 'en'));
  const [offline, setOffline] = useState(false);

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
    const role = ROLES.find((r) => r.code === roleCode);
    const grant = (code: string): Grant | null => {
      if (!role) return 'APPR'; // "All permissions" demo user
      return role.grants[code] ?? null;
    };
    return {
      roleCode, setRoleCode, phase, setPhase, theme, setTheme, lang, setLang, offline, setOffline,
      site: SITES.find((s) => s.siteId === siteId) ?? SITES[0], setSiteId,
      userName: role ? 'Neema Mushi' : 'Ashok (all permissions)',
      grant,
      can: (code, level = 'VIEW') => {
        if (!code) return true;
        const g = grant(code);
        return !!g && RANK[g] >= RANK[level];
      },
      isExternal: !!role?.external,
    };
  }, [roleCode, siteId, phase, theme, lang, offline]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}
