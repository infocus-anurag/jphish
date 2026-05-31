'use client';

import { EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';

export function AlertsScreen(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Alerts"
        sub="Real-time monitoring across campaigns, adaptive engine, and infrastructure."
      />
      <div className="page" style={{ padding: 22 }}>
        <div className="card">
          <EmptyState
            icon="shieldCheck"
            title="No alerts"
            message="You’re all caught up. Submission spikes, deliverability drops, and other anomalies will surface here as they happen."
          />
        </div>
      </div>
    </>
  );
}
