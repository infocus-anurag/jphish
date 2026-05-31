import { beforeEach, describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { can, isRouteAllowed, roleLabel, useCan, useCanAny } from './rbac';
import { UserRole, type AuthUser } from '@/types/auth.types';
import { useAuthStore } from '@/store/auth.store';

function signIn(role: UserRole): void {
  const user: AuthUser = {
    id: 'u',
    email: 'u@x',
    firstName: 'U',
    lastName: 'X',
    role,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  };
  useAuthStore.setState({ user, status: 'authenticated' });
}

describe('rbac.can', () => {
  it('super-admin gets every capability in the matrix', () => {
    for (const cap of [
      'campaign.create',
      'campaign.approve',
      'user.role.update',
      'tenants.view',
      'api.rotate',
    ] as const) {
      expect(can(UserRole.SUPER_ADMIN, cap)).toBe(true);
    }
  });

  it('admin can run campaigns but cannot manage tenants or rotate roles', () => {
    expect(can(UserRole.ADMIN, 'campaign.create')).toBe(true);
    expect(can(UserRole.ADMIN, 'campaign.approve')).toBe(true);
    expect(can(UserRole.ADMIN, 'tenants.view')).toBe(false);
    expect(can(UserRole.ADMIN, 'user.role.update')).toBe(false);
    expect(can(UserRole.ADMIN, 'user.delete')).toBe(false);
  });

  it('analyst can only view settings and audit (read-only operator)', () => {
    expect(can(UserRole.ANALYST, 'settings.view')).toBe(true);
    expect(can(UserRole.ANALYST, 'audit.view')).toBe(true);
    expect(can(UserRole.ANALYST, 'campaign.create')).toBe(false);
    expect(can(UserRole.ANALYST, 'user.create')).toBe(false);
  });

  it('no role → no capability', () => {
    expect(can(null, 'settings.view')).toBe(false);
    expect(can(undefined, 'audit.view')).toBe(false);
  });
});

describe('rbac.isRouteAllowed', () => {
  it.each([
    [UserRole.SUPER_ADMIN, 'tenants', true],
    [UserRole.ADMIN, 'tenants', false],
    [UserRole.ANALYST, 'tenants', false],
    [UserRole.ADMIN, 'users', true],
    [UserRole.ANALYST, 'users', false],
    [UserRole.ANALYST, 'settings', true], // analyst has settings.view
    [UserRole.ANALYST, 'dashboard', true], // generic routes default to allow
  ] as const)('role=%s route=%s → %s', (role, route, expected) => {
    expect(isRouteAllowed(role, route)).toBe(expected);
  });

  it('returns false for a missing role on any route', () => {
    expect(isRouteAllowed(null, 'dashboard')).toBe(false);
  });
});

describe('rbac.roleLabel', () => {
  it.each([
    [UserRole.SUPER_ADMIN, 'Super Admin'],
    [UserRole.ADMIN, 'Admin'],
    [UserRole.ANALYST, 'Analyst'],
  ])('%s → %s', (role, label) => {
    expect(roleLabel(role)).toBe(label);
  });
});

describe('rbac hooks', () => {
  beforeEach(() => useAuthStore.setState({ user: null, status: 'idle' }));

  it('useCan reflects the current user role', () => {
    signIn(UserRole.ADMIN);
    const { result } = renderHook(() => useCan('campaign.create'));
    expect(result.current).toBe(true);
  });

  it('useCan returns false when no user is signed in', () => {
    const { result } = renderHook(() => useCan('campaign.create'));
    expect(result.current).toBe(false);
  });

  it('useCanAny returns true if ANY supplied capability is granted', () => {
    signIn(UserRole.ANALYST);
    const { result } = renderHook(() => useCanAny('campaign.create', 'audit.view'));
    expect(result.current).toBe(true);
  });

  it('useCanAny returns false when none of the listed caps are granted', () => {
    signIn(UserRole.ANALYST);
    const { result } = renderHook(() => useCanAny('campaign.create', 'user.delete'));
    expect(result.current).toBe(false);
  });
});
