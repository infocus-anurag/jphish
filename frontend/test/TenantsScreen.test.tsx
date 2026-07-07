import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from './msw/server';
import { API } from './msw/handlers';
import { TenantsScreen } from '@/components/screens/TenantsScreen';
import { useAuthStore } from '@/store/auth.store';
import { UserRole, type AuthUser } from '@/types/auth.types';

function signInAs(role: UserRole): void {
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

const sampleTenant = {
  id: 't-1',
  name: 'Acme Corporation',
  slug: 'acme-corp',
  contactEmail: 'admin@acme.example',
  timezone: 'UTC',
  logoUrl: null,
  status: 'active',
  planId: 'p-pro',
  featureOverrides: {},
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
};

const samplePlans = [
  { id: 'p-pro', tier: 'professional', name: 'Professional', description: null, maxUsers: 15, maxCampaigns: 50, maxTemplates: 100, maxLandingPages: 50, maxSendingProfiles: 5, emailQuota: 25000, storageQuota: 5120, defaultFeatures: [], isActive: true },
];

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TenantsScreen />
    </QueryClientProvider>,
  );
}

describe('<TenantsScreen />', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'idle' });
    server.use(
      http.get(`${API}/tenants`, () =>
        HttpResponse.json({ tenants: [sampleTenant], total: 1 }),
      ),
      http.get(`${API}/plans`, () => HttpResponse.json(samplePlans)),
    );
  });

  it('lists tenants with their status and plan for a super admin', async () => {
    signInAs(UserRole.SUPER_ADMIN);
    renderScreen();

    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('acme-corp')).toBeInTheDocument();
    // "Active" appears in the filter dropdown and as the row status badge.
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    await waitFor(() => expect(screen.getByText('Professional')).toBeInTheDocument());
    // Super admin sees the create affordance.
    expect(screen.getByRole('button', { name: 'New tenant' })).toBeInTheDocument();
  });

  it('hides the create button for non-super-admins', async () => {
    signInAs(UserRole.ADMIN);
    renderScreen();

    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New tenant' })).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no tenants', async () => {
    server.use(
      http.get(`${API}/tenants`, () => HttpResponse.json({ tenants: [], total: 0 })),
    );
    signInAs(UserRole.SUPER_ADMIN);
    renderScreen();

    expect(await screen.findByText('No tenants yet')).toBeInTheDocument();
  });
});
