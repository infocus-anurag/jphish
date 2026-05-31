import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { RouteGuard } from '@/components/shell/RouteGuard';
import { useAuthStore } from '@/store/auth.store';
import { UserRole, type AuthUser } from '@/types/auth.types';
import * as navigation from 'next/navigation';

const mockRouter = (navigation as unknown as {
  __mockRouter: { replace: ReturnType<typeof vi.fn> };
}).__mockRouter;

function signedInAs(role: UserRole): void {
  const user: AuthUser = {
    id: 'u1',
    email: 'u@x',
    firstName: 'U',
    lastName: 'X',
    role,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  };
  useAuthStore.setState({ user, status: 'authenticated' });
}

describe('<RouteGuard />', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle' });
    mockRouter.replace.mockClear();
  });

  it('renders the children when the user is allowed for that route', () => {
    signedInAs(UserRole.SUPER_ADMIN);
    const { getByText } = render(
      <RouteGuard route="tenants">
        <div>tenant ui</div>
      </RouteGuard>,
    );
    expect(getByText('tenant ui')).toBeInTheDocument();
  });

  it('hides children and redirects to /unauthorized when role lacks access', async () => {
    signedInAs(UserRole.ANALYST);
    const { queryByText } = render(
      <RouteGuard route="tenants">
        <div>tenant ui</div>
      </RouteGuard>,
    );
    expect(queryByText('tenant ui')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized');
    });
  });

  it('redirects unauthenticated users to /login', async () => {
    useAuthStore.setState({ user: null, status: 'unauthenticated' });
    const { queryByText } = render(
      <RouteGuard route="dashboard">
        <div>private</div>
      </RouteGuard>,
    );
    expect(queryByText('private')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    });
  });

  it('renders nothing while status is still loading (idle)', () => {
    const { queryByText } = render(
      <RouteGuard route="dashboard">
        <div>private</div>
      </RouteGuard>,
    );
    expect(queryByText('private')).not.toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('admin can access /users but not /tenants', () => {
    signedInAs(UserRole.ADMIN);
    const usersResult = render(
      <RouteGuard route="users">
        <div>users-ui</div>
      </RouteGuard>,
    );
    expect(usersResult.getByText('users-ui')).toBeInTheDocument();
    usersResult.unmount();

    const tenantsResult = render(
      <RouteGuard route="tenants">
        <div>tenant-ui</div>
      </RouteGuard>,
    );
    expect(tenantsResult.queryByText('tenant-ui')).not.toBeInTheDocument();
  });
});
