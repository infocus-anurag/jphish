'use client';

import { useEffect } from 'react';
import { useUI } from '@/store/ui.store';

export function KeyboardShortcuts(): null {
  const togglePalette = useUI((s) => s.togglePalette);
  const toggleNotif = useUI((s) => s.toggleNotif);

  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
      }
      if (e.key === 'Escape') {
        togglePalette(false);
        toggleNotif(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [togglePalette, toggleNotif]);

  return null;
}
