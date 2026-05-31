import { http, HttpResponse } from 'msw';
import { UserRole } from '@/types/auth.types';

export const API = 'http://localhost:3001/api/v1';

export interface SeededUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export const defaultAdmin: SeededUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@jphish.test',
  firstName: 'Ada',
  lastName: 'Admin',
  role: UserRole.ADMIN,
  isActive: true,
  mustChangePassword: false,
  lastLoginAt: null,
  createdAt: new Date('2025-01-01').toISOString(),
};

// In-memory state mutated by tests via the exported `state` object.
export const state: {
  user: SeededUser | null;
  refreshShouldSucceed: boolean;
  loginShouldFail: boolean;
  loginErrorStatus: number;
  loginErrorMessage: string;
} = {
  user: null,
  refreshShouldSucceed: false,
  loginShouldFail: false,
  loginErrorStatus: 401,
  loginErrorMessage: 'Invalid email or password',
};

export function resetMockState(): void {
  state.user = null;
  state.refreshShouldSucceed = false;
  state.loginShouldFail = false;
  state.loginErrorStatus = 401;
  state.loginErrorMessage = 'Invalid email or password';
}

export const handlers = [
  http.post(`${API}/auth/login`, async () => {
    if (state.loginShouldFail) {
      return HttpResponse.json(
        { message: state.loginErrorMessage },
        { status: state.loginErrorStatus },
      );
    }
    const user = state.user ?? defaultAdmin;
    state.user = user;
    return HttpResponse.json({ accessToken: 'fake.jwt.access', user });
  }),

  http.post(`${API}/auth/refresh`, async () => {
    if (state.refreshShouldSucceed && state.user) {
      return HttpResponse.json({ accessToken: 'fake.jwt.access', user: state.user });
    }
    return HttpResponse.json({ message: 'No refresh token' }, { status: 401 });
  }),

  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}/auth/me`, () => {
    if (!state.user) return HttpResponse.json({ message: 'unauth' }, { status: 401 });
    return HttpResponse.json(state.user);
  }),

  http.get(`${API}/users`, () => {
    if (!state.user) return HttpResponse.json({ message: 'unauth' }, { status: 401 });
    return HttpResponse.json([state.user]);
  }),
];
