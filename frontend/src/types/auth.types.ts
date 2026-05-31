// Mirrors the backend auth contract: UserRole enum (super_admin/admin/analyst)
// and the UserView shape returned by /auth/login, /auth/refresh, /auth/me.

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ANALYST = 'analyst',
}

/** The serialized user the API returns (backend `UserView`). */
export interface AuthUser {
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

/** Back-compat alias — older imports referenced `User`. */
export type User = AuthUser;

export interface LoginRequest {
  email: string;
  password: string;
}

/** /auth/login and /auth/refresh both return this. */
export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** Optional; if omitted the API generates a temp password (mustChangePassword=true). */
  password?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}
