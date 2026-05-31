'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isRouteAllowed, type RouteId } from '@/lib/rbac';
import { useAuthStore } from '@/store/auth.store';

export function RouteGuard({
  route,
  children,
}: {
  route: RouteId;
  children: React.ReactNode;
}): JSX.Element | null {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && !isRouteAllowed(role, route)) {
      router.replace('/unauthorized');
    }
  }, [status, role, route, router]);

  if (status !== 'authenticated') return null;
  if (!isRouteAllowed(role, route)) return null;
  return <>{children}</>;
}
