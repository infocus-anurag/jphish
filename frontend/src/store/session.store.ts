'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './auth.store';
import { roleLabel } from '@/lib/rbac';
import { UserRole } from '@/types/auth.types';

export type Persona = 'super' | 'admin' | 'analyst';
export type Theme = 'light' | 'dark';
export type Density = 'compact' | 'regular';
export type DashboardVariant = 'operational' | 'risk';

export interface PersonaInfo {
  name: string;
  initials: string;
  role: string;
  org: string;
}

interface SessionState {
  /** UI-only theme/density/etc. preferences. Identity comes from useAuthStore. */
  theme: Theme;
  density: Density;
  dashboardVariant: DashboardVariant;
  showAI: boolean;
  setTheme: (t: Theme) => void;
  setDensity: (d: Density) => void;
  setDashboardVariant: (v: DashboardVariant) => void;
  setShowAI: (v: boolean) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      theme: 'light',
      density: 'regular',
      dashboardVariant: 'operational',
      showAI: true,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setDashboardVariant: (dashboardVariant) => set({ dashboardVariant }),
      setShowAI: (showAI) => set({ showAI }),
    }),
    { name: 'jphish-session' },
  ),
);

export function rolePersona(role: UserRole | undefined): Persona {
  if (role === UserRole.SUPER_ADMIN) return 'super';
  if (role === UserRole.ANALYST) return 'analyst';
  return 'admin';
}

export function usePersona(): Persona {
  const role = useAuthStore((s) => s.user?.role);
  return rolePersona(role);
}

export function usePersonaInfo(): PersonaInfo {
  const user = useAuthStore((s) => s.user);
  if (!user) return { name: 'Guest', initials: 'G', role: '—', org: 'JPhish' };
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U';
  return {
    name: `${user.firstName} ${user.lastName}`.trim(),
    initials,
    role: roleLabel(user.role),
    org: 'JPhish',
  };
}
