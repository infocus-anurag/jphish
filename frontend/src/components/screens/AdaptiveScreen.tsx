'use client';

import { Badge } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';

export function AdaptiveScreen(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Adaptive engine"
        sub="Continuously target high-risk users, escalate difficulty, and auto-assign remediation."
        actions={<Badge tone="default">Inactive</Badge>}
      />
      <div className="page" style={{ padding: 22 }}>
        <div className="card">
          <EmptyState
            icon="adaptive"
            title="Adaptive engine isn’t active yet"
            message="Once enabled, the engine enrolls high-risk users, rotates templates, and assigns training automatically. Its cohorts, outcomes, and decision log will be tracked here."
          />
        </div>
      </div>
    </>
  );
}
