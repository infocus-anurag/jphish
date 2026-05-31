'use client';

import { create } from 'zustand';
import type { ToastMessage } from '@/components/ui/Primitives';

interface UIState {
  showWizard: boolean;
  showPalette: boolean;
  showNotif: boolean;
  toast: ToastMessage | null;
  openWizard: () => void;
  closeWizard: () => void;
  togglePalette: (next?: boolean) => void;
  toggleNotif: (next?: boolean) => void;
  pushToast: (t: ToastMessage) => void;
  clearToast: () => void;
}

export const useUI = create<UIState>((set) => ({
  showWizard: false,
  showPalette: false,
  showNotif: false,
  toast: null,
  openWizard: () => set({ showWizard: true }),
  closeWizard: () => set({ showWizard: false }),
  togglePalette: (next) =>
    set((s) => ({ showPalette: next ?? !s.showPalette })),
  toggleNotif: (next) => set((s) => ({ showNotif: next ?? !s.showNotif })),
  pushToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));
