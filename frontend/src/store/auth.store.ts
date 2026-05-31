import { create } from 'zustand';
import { AuthUser, UserRole } from '@/types/auth.types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** Set (or clear) the signed-in user; flips status accordingly. */
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  /** Wipe the session (used on logout / 401). */
  clear: () => void;
  /** True if a user is signed in and holds one of the given roles. */
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  user: null,
  setUser: (user) =>
    set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
  setStatus: (status) => set({ status }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
  hasRole: (...roles) => {
    const role = get().user?.role;
    return role != null && roles.includes(role);
  },
}));
