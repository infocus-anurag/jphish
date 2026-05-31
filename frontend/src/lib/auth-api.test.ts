import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { API, defaultAdmin, resetMockState, state } from '../../test/msw/handlers';
import {
  bootstrapSession,
  changePassword,
  createUser,
  deleteUser,
  getMe,
  listUsers,
  login,
  logout,
  setUserRole,
  updateUser,
} from './auth-api';
import { getAccessToken, setAccessToken } from './api-client';
import { UserRole } from '@/types/auth.types';

describe('auth-api', () => {
  beforeEach(() => {
    setAccessToken(null);
    resetMockState();
  });

  it('login() stashes the access token in memory and returns the user', async () => {
    const res = await login({ email: defaultAdmin.email, password: 'whatever' });
    expect(res.user.email).toBe(defaultAdmin.email);
    expect(getAccessToken()).toBe('fake.jwt.access');
  });

  it('login() surfaces server-side 401 errors', async () => {
    state.loginShouldFail = true;
    state.loginErrorStatus = 401;
    state.loginErrorMessage = 'Invalid email or password';
    await expect(login({ email: 'x@y', password: 'z' })).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(getAccessToken()).toBeNull();
  });

  it('logout() clears the access token even when the request fails', async () => {
    setAccessToken('something');
    server.use(
      http.post(`${API}/auth/logout`, () => HttpResponse.error()),
    );
    // The try/finally re-throws the network error but the finally clause
    // must still have cleared the in-memory access token.
    await expect(logout()).rejects.toBeDefined();
    expect(getAccessToken()).toBeNull();
  });

  it('logout() clears the access token on a clean 204 response', async () => {
    setAccessToken('something');
    await logout();
    expect(getAccessToken()).toBeNull();
  });

  it('bootstrapSession() returns the user when the refresh cookie is valid', async () => {
    state.user = defaultAdmin;
    state.refreshShouldSucceed = true;
    const user = await bootstrapSession();
    expect(user?.email).toBe(defaultAdmin.email);
    expect(getAccessToken()).toBe('fake.jwt.access');
  });

  it('bootstrapSession() returns null on a missing/invalid refresh cookie', async () => {
    const user = await bootstrapSession();
    expect(user).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('changePassword() clears the in-memory access token after success', async () => {
    setAccessToken('access-before-change');
    server.use(
      http.patch(`${API}/auth/me/password`, () => new HttpResponse(null, { status: 204 })),
    );
    await changePassword({ currentPassword: 'old', newPassword: 'NewerPass1!Strong' });
    expect(getAccessToken()).toBeNull();
  });

  it('getMe() unwraps the user payload', async () => {
    server.use(
      http.get(`${API}/auth/me`, () => HttpResponse.json({ ...defaultAdmin })),
    );
    const me = await getMe();
    expect(me.email).toBe(defaultAdmin.email);
  });

  it('listUsers() returns the array as-is', async () => {
    server.use(
      http.get(`${API}/users`, () => HttpResponse.json([defaultAdmin, defaultAdmin])),
    );
    const rows = await listUsers();
    expect(rows).toHaveLength(2);
  });

  it('createUser() POSTs the body and returns { user, tempPassword }', async () => {
    let body: unknown = null;
    server.use(
      http.post(`${API}/users`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ user: defaultAdmin, tempPassword: 'Tmp1!abc' });
      }),
    );
    const res = await createUser({
      email: 'x@y',
      firstName: 'X',
      lastName: 'Y',
      role: UserRole.ANALYST,
    });
    expect(body).toMatchObject({ email: 'x@y', role: UserRole.ANALYST });
    expect(res.tempPassword).toBe('Tmp1!abc');
  });

  it('updateUser() PATCHes the user record', async () => {
    let url = '';
    server.use(
      http.patch(`${API}/users/:id`, ({ request }) => {
        url = request.url;
        return HttpResponse.json(defaultAdmin);
      }),
    );
    await updateUser('abc-id', { firstName: 'Renamed' });
    expect(url).toMatch(/\/users\/abc-id$/);
  });

  it('setUserRole() PATCHes /users/:id/role with the new role', async () => {
    let body: unknown = null;
    server.use(
      http.patch(`${API}/users/:id/role`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(defaultAdmin);
      }),
    );
    await setUserRole('abc-id', UserRole.ADMIN);
    expect(body).toEqual({ role: UserRole.ADMIN });
  });

  it('deleteUser() issues a DELETE and resolves on 204', async () => {
    let hit = false;
    server.use(
      http.delete(`${API}/users/:id`, () => {
        hit = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await deleteUser('abc-id');
    expect(hit).toBe(true);
  });
});
