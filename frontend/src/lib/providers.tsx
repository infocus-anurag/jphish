'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeSync } from '@/components/shell/ThemeSync';
import { AuthGate } from '@/components/shell/AuthGate';

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      {/* AuthGate runs the refresh-cookie bootstrap on mount (flips the auth
          store off 'idle') and wires the global 401 -> /login handler. Without
          it mounted, the (app) layout is stuck on "Loading session…". */}
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}
