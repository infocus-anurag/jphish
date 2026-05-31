'use client';

import { EmptyState } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';

export function TrainingScreen(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Training library"
        sub="Remediation modules and auto-assignment rules for users who fall for simulations."
      />
      <div className="page" style={{ padding: 22 }}>
        <div className="card">
          <EmptyState
            icon="training"
            title="No training modules yet"
            message="Training modules and the rules that auto-assign them on a failed simulation will appear here once they’re added."
          />
        </div>
      </div>
    </>
  );
}
