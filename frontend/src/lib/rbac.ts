'use client';

import { UserRole } from '@/types/auth.types';
import { useAuthStore } from '@/store/auth.store';

export type Capability =
  | 'campaign.create'
  | 'campaign.approve'
  | 'campaign.pause'
  | 'campaign.delete'
  | 'template.create'
  | 'template.edit'
  | 'user.import'
  | 'user.create'
  | 'user.role.update'
  | 'user.delete'
  | 'adaptive.configure'
  | 'settings.view'
  | 'settings.edit'
  | 'tenants.view'
  | 'audit.view'
  | 'billing.view'
  | 'api.rotate';

const MATRIX: Record<UserRole, ReadonlySet<Capability>> = {
  [UserRole.SUPER_ADMIN]: new Set<Capability>([
    'campaign.create', 'campaign.approve', 'campaign.pause', 'campaign.delete',
    'template.create', 'template.edit',
    'user.import', 'user.create', 'user.role.update', 'user.delete',
    'adaptive.configure',
    'settings.view', 'settings.edit',
    'tenants.view', 'audit.view', 'billing.view', 'api.rotate',
  ]),
  [UserRole.ADMIN]: new Set<Capability>([
    'campaign.create', 'campaign.approve', 'campaign.pause', 'campaign.delete',
    'template.create', 'template.edit',
    'user.import', 'user.create',
    'adaptive.configure',
    'settings.view', 'settings.edit',
    'audit.view', 'billing.view', 'api.rotate',
  ]),
  [UserRole.ANALYST]: new Set<Capability>([
    'settings.view', 'audit.view',
  ]),
};

export function can(role: UserRole | undefined | null, cap: Capability): boolean {
  if (!role) return false;
  return MATRIX[role].has(cap);
}

export function useCan(cap: Capability): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return can(role ?? null, cap);
}

export function useCanAny(...caps: Capability[]): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return caps.some((c) => can(role ?? null, c));
}

export type RouteId =
  | 'dashboard'
  | 'campaigns'
  | 'adaptive'
  | 'alerts'
  | 'templates'
  | 'landing'
  | 'groups'
  | 'training'
  | 'domains'
  | 'users'
  | 'reports'
  | 'settings'
  | 'tenants';

export function isRouteAllowed(role: UserRole | undefined | null, route: RouteId): boolean {
  if (!role) return false;
  if (route === 'tenants') return role === UserRole.SUPER_ADMIN;
  if (route === 'users') return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
  if (route === 'settings') return can(role, 'settings.view');
  return true;
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN: return 'Super Admin';
    case UserRole.ADMIN: return 'Admin';
    case UserRole.ANALYST: return 'Analyst';
  }
}
