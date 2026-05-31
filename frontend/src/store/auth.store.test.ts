import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';
import { UserRole, type AuthUser } from '@/types/auth.types';

function fakeUser(role: UserRole = UserRole.ANALYST): AuthUser {
  return {
    id: 'u-1',
    email: 'u@test',
    firstName: 'A',
    lastName: 'B',
    role,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  };
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle' });
  });

  it('setUser(user) flips status to authenticated', () => {
    useAuthStore.getState().setUser(fakeUser());
    const s = useAuthStore.getState();
    expect(s.user).not.toBeNull();
    expect(s.status).toBe('authenticated');
  });

  it('setUser(null) clears identity and flips status to unauthenticated', () => {
    useAuthStore.getState().setUser(fakeUser());
    useAuthStore.getState().setUser(null);
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.status).toBe('unauthenticated');
  });

  it('clear() wipes the session', () => {
    useAuthStore.getState().setUser(fakeUser());
    useAuthStore.getState().clear();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('hasRole returns false when no user is signed in', () => {
    expect(useAuthStore.getState().hasRole(UserRole.ADMIN)).toBe(false);
  });

  it('hasRole supports multiple acceptable roles', () => {
    useAuthStore.getState().setUser(fakeUser(UserRole.ADMIN));
    const { hasRole } = useAuthStore.getState();
    expect(hasRole(UserRole.SUPER_ADMIN, UserRole.ADMIN)).toBe(true);
    expect(hasRole(UserRole.ANALYST)).toBe(false);
  });
});
