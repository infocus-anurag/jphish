import apiClient, { setAccessToken } from './api-client';
import {
  AuthUser,
  ChangePasswordRequest,
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  UpdateUserRequest,
  UserRole,
} from '@/types/auth.types';

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', body);
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

/** Boot-time: try to use the refresh cookie to get a fresh access token + user. */
export async function bootstrapSession(): Promise<AuthUser | null> {
  try {
    const { data } = await apiClient.post<LoginResponse>('/auth/refresh');
    setAccessToken(data.accessToken);
    return data.user;
  } catch {
    return null;
  }
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await apiClient.patch('/auth/me/password', body);
  setAccessToken(null);
}

export async function listUsers(): Promise<AuthUser[]> {
  const { data } = await apiClient.get<AuthUser[]>('/users');
  return data;
}

export async function createUser(
  body: CreateUserRequest,
): Promise<{ user: AuthUser; tempPassword?: string }> {
  const { data } = await apiClient.post<{ user: AuthUser; tempPassword?: string }>(
    '/users',
    body,
  );
  return data;
}

export async function updateUser(id: string, body: UpdateUserRequest): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>(`/users/${id}`, body);
  return data;
}

export async function setUserRole(id: string, role: UserRole): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>(`/users/${id}/role`, { role });
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
