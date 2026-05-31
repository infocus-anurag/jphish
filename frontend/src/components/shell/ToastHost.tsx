'use client';

import { Toast } from '@/components/ui/Primitives';
import { useUI } from '@/store/ui.store';

export function ToastHost(): JSX.Element | null {
  const toast = useUI((s) => s.toast);
  const clearToast = useUI((s) => s.clearToast);
  if (!toast) return null;
  return <Toast message={toast} onClose={clearToast} />;
}
