import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import apiClient, {
  getAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from './api-client';

describe('apiClient', () => {
  beforeEach(() => {
    setAccessToken(null);
    setUnauthorizedHandler(() => undefined);
  });

  it('attaches Authorization: Bearer when an access token is set', async () => {
    setAccessToken('the-access-token');
    let seen: string | null = null;
    server.use(
      http.get(`${API}/audit-logs`, ({ request }) => {
        seen = request.headers.get('authorization');
        return HttpResponse.json([]);
      }),
    );
    await apiClient.get('/audit-logs');
    expect(seen).toBe('Bearer the-access-token');
  });

  it('does not send Authorization header when token is null', async () => {
    let seen: string | null | undefined = undefined;
    server.use(
      http.get(`${API}/audit-logs`, ({ request }) => {
        seen = request.headers.get('authorization');
        return HttpResponse.json([]);
      }),
    );
    await apiClient.get('/audit-logs');
    expect(seen).toBeNull();
  });

  it('on 401 refreshes the access token and retries the original request', async () => {
    setAccessToken('expired');
    let calls = 0;
    server.use(
      http.get(`${API}/audit-logs`, ({ request }) => {
        calls += 1;
        const auth = request.headers.get('authorization');
        if (auth === 'Bearer expired') {
          return HttpResponse.json({ message: 'expired' }, { status: 401 });
        }
        if (auth === 'Bearer fresh-token') {
          return HttpResponse.json([{ id: 'log-1' }]);
        }
        return HttpResponse.json({ message: 'no auth' }, { status: 401 });
      }),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ accessToken: 'fresh-token' }),
      ),
    );

    const res = await apiClient.get('/audit-logs');
    expect(res.status).toBe(200);
    expect(res.data).toEqual([{ id: 'log-1' }]);
    expect(calls).toBe(2);
    expect(getAccessToken()).toBe('fresh-token');
  });

  it('on 401 with a failed refresh, calls onUnauthorized and rejects', async () => {
    setAccessToken('expired');
    let unauthorized = false;
    setUnauthorizedHandler(() => {
      unauthorized = true;
    });
    server.use(
      http.get(`${API}/audit-logs`, () =>
        HttpResponse.json({ message: 'expired' }, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ message: 'no refresh' }, { status: 401 }),
      ),
    );
    await expect(apiClient.get('/audit-logs')).rejects.toBeDefined();
    expect(unauthorized).toBe(true);
    expect(getAccessToken()).toBeNull();
  });

  it('does NOT attempt to refresh when the failing request was /auth/login itself', async () => {
    let refreshHits = 0;
    server.use(
      http.post(`${API}/auth/refresh`, () => {
        refreshHits += 1;
        return HttpResponse.json({ accessToken: 'unused' });
      }),
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ message: 'bad creds' }, { status: 401 }),
      ),
    );
    await expect(apiClient.post('/auth/login', { email: 'x', password: 'y' })).rejects.toBeDefined();
    expect(refreshHits).toBe(0);
  });
});
