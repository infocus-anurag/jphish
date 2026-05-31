'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { bootstrapSession } from '@/lib/auth-api';
import { useAuthStore } from '@/store/auth.store';

/**
 * On mount, attempt a refresh-cookie bootstrap so a returning user lands
 * back in the app without re-typing creds. Also wires the global 401
 * handler so any expired-session 401 from `apiClient` punts the user to /login.
 */
export function AuthGate({ children }: { children: React.ReactNode }): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const status = useAuthStore((s) => s.status);
  const ran = useRef(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      useAuthStore.getState().clear();
      router.replace('/login');
    });
  }, [router]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    setStatus('loading');
    bootstrapSession()
      .then((user) => setUser(user))
      .catch(() => setUser(null));
  }, [setStatus, setUser]);

  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/login') {
      router.replace('/login');
    }
  }, [status, pathname, router]);

  return <>{children}</>;
}
