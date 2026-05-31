import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Axios instance for the admin API.
 *
 * Auth model (matches the backend SECURITY contract):
 * - The access token lives in memory only (never localStorage) and is attached
 *   as `Authorization: Bearer …` per request.
 * - The refresh token is an HttpOnly cookie, so `withCredentials` is on and the
 *   browser sends it automatically to /auth/refresh.
 * - On a 401 we attempt a single-flight refresh and replay the original request
 *   once; if refresh fails we drop the token and notify the app.
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  withCredentials: true,
  timeout: 30000,
});

// --- in-memory access token -------------------------------------------------

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// --- unauthorized handler (set by the app to redirect to /login) ------------

let onUnauthorized: () => void = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

// --- interceptors -----------------------------------------------------------

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/** Don't try to refresh when the failing call IS an auth-flow endpoint. */
function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

// Single-flight: concurrent 401s share one refresh round-trip.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<{ accessToken: string }>('/auth/refresh')
      .then((res) => {
        const token = res.data?.accessToken ?? null;
        setAccessToken(token);
        return token;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
      onUnauthorized();
    }

    return Promise.reject(error);
  },
);

export default apiClient;
