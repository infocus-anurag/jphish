'use client';

import { EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';

export function TenantsScreen(): JSX.Element {
  return (
    <>
      <PageHeader title="Tenants" sub="Cross-org platform view of the organizations you manage." />
      <div className="page" style={{ padding: 22 }}>
        <div className="card">
          <EmptyState
            icon="building"
            title="No tenants yet"
            message="When organizations are onboarded to the platform, they’ll appear here with their seats, risk posture, and health."
          />
        </div>
      </div>
    </>
  );
}
