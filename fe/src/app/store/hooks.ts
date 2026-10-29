import { useSession } from '@/app/session';

/** Custom hook for accessing application session and permissions state */
export function useAppSession() {
  return useSession();
}
