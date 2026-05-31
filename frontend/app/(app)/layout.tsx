'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { useAuthStore } from '@/store/auth.store';

export default function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const status = useAuthStore((s) => s.status);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const next = encodeURIComponent(pathname || '/');
      router.replace(`/login?next=${next}`);
    }
  }, [status, pathname, router]);

  useEffect(() => {
    if (
      status === 'authenticated' &&
      mustChangePassword &&
      pathname !== '/settings/password'
    ) {
      router.replace('/settings/password');
    }
  }, [status, mustChangePassword, pathname, router]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--fg-muted)',
          fontSize: 13,
        }}
      >
        Loading session…
      </div>
    );
  }

  if (status !== 'authenticated') return <></>;

  return <AppShell>{children}</AppShell>;
}
