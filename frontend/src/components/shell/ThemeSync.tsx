'use client';

import { useEffect } from 'react';
import { useSession } from '@/store/session.store';

/** Mirror persisted theme + density onto <html data-theme/data-density>. */
export function ThemeSync(): null {
  const theme = useSession((s) => s.theme);
  const density = useSession((s) => s.density);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    el.dataset.density = density;
  }, [theme, density]);

  return null;
}
