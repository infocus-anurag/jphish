import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { AuthGate } from '@/components/shell/AuthGate';
import { useAuthStore } from '@/store/auth.store';
import { defaultAdmin, resetMockState, state } from './msw/handlers';
import * as navigation from 'next/navigation';
import { setAccessToken } from '@/lib/api-client';

const mockRouter = (navigation as unknown as { __mockRouter: { replace: ReturnType<typeof vi.fn> } }).__mockRouter;

describe('<AuthGate />', () => {
  beforeEach(() => {
    resetMockState();
    setAccessToken(null);
    useAuthStore.setState({ user: null, status: 'idle' });
    mockRouter.replace.mockClear();
  });

  it('marks status=authenticated when refresh succeeds at mount', async () => {
    state.user = defaultAdmin;
    state.refreshShouldSucceed = true;
    await act(async () => {
      render(
        <AuthGate>
          <div>app</div>
        </AuthGate>,
      );
    });
    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('authenticated');
    });
    expect(useAuthStore.getState().user?.email).toBe(defaultAdmin.email);
  });

  it('redirects to /login when the refresh attempt fails and we are not already on /login', async () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/dashboard');
    await act(async () => {
      render(
        <AuthGate>
          <div>app</div>
        </AuthGate>,
      );
    });
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    });
  });

  it('does not redirect when the unauthenticated user is already on /login', async () => {
    vi.spyOn(navigation, 'usePathname').mockReturnValue('/login');
    await act(async () => {
      render(
        <AuthGate>
          <div>login screen</div>
        </AuthGate>,
      );
    });
    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/login');
  });
});
