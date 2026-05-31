import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../app/login/page';
import { useAuthStore } from '@/store/auth.store';
import { defaultAdmin, resetMockState, state } from './msw/handlers';
import * as navigation from 'next/navigation';

const mockRouter = (navigation as unknown as {
  __mockRouter: { replace: ReturnType<typeof vi.fn> };
}).__mockRouter;

describe('<LoginPage />', () => {
  beforeEach(() => {
    // Reset any spyOn() overrides bled in from earlier tests in this file.
    vi.restoreAllMocks();
    resetMockState();
    useAuthStore.setState({ user: null, status: 'unauthenticated' });
    mockRouter.replace.mockClear();
  });

  it('shows a validation error when the email is malformed', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/you@company/i), 'not-an-email');
    await user.type(screen.getByPlaceholderText(/••••/), 'whatever');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    // Should not have hit the API or attempted navigation.
    expect(useAuthStore.getState().user).toBeNull();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows a validation error when password is blank', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/you@company/i), 'admin@jphish.test');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('on success, stores the user and replaces the URL with the `next` target', async () => {
    vi.spyOn(navigation, 'useSearchParams').mockReturnValue(
      new URLSearchParams('?next=/campaigns') as unknown as ReturnType<typeof navigation.useSearchParams>,
    );
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/you@company/i), defaultAdmin.email);
    await user.type(screen.getByPlaceholderText(/••••/), 'correctpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(useAuthStore.getState().user?.email).toBe(defaultAdmin.email);
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/campaigns');
  });

  it('forces a password change when mustChangePassword=true', async () => {
    state.user = { ...defaultAdmin, mustChangePassword: true };
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/you@company/i), defaultAdmin.email);
    await user.type(screen.getByPlaceholderText(/••••/), 'whatever');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/settings/password');
    });
  });

  it('surfaces the server error message on a failed login', async () => {
    state.loginShouldFail = true;
    state.loginErrorStatus = 401;
    state.loginErrorMessage = 'Invalid email or password';
    const { toast } = await import('sonner');
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/you@company/i), defaultAdmin.email);
    await user.type(screen.getByPlaceholderText(/••••/), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid email or password');
    });
  });

  it('shows a friendly message when the server returns 429', async () => {
    // 429 must come back with no `message` field for the friendly fallback to fire.
    const { http, HttpResponse } = await import('msw');
    const { server } = await import('./msw/server');
    const { API } = await import('./msw/handlers');
    server.use(
      http.post(`${API}/auth/login`, () => new HttpResponse(null, { status: 429 })),
    );
    const { toast } = await import('sonner');
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/you@company/i), defaultAdmin.email);
    await user.type(screen.getByPlaceholderText(/••••/), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/too many/i));
    });
  });

  it('redirects to `/` if the user is already authenticated when the page mounts', async () => {
    useAuthStore.setState({ user: defaultAdmin, status: 'authenticated' });
    render(<LoginPage />);
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });
  });
});
