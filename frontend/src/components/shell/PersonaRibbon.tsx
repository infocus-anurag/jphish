'use client';

import { I } from '@/components/ui/Icons';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/auth.types';

export function PersonaRibbon(): JSX.Element | null {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || role === UserRole.ADMIN) return null;

  if (role === UserRole.SUPER_ADMIN) {
    return (
      <div className="persona-ribbon">
        <I.shield size={12} />
        <strong>Super Admin view</strong>
        <span className="muted">
          Platform-wide controls active. You can manage roles, tenants, and global settings.
        </span>
      </div>
    );
  }

  return (
    <div className="persona-ribbon warn">
      <I.eye size={12} />
      <strong>Analyst view</strong>
      <span className="muted">
        Read-only. Campaign launch, configuration, and user management are disabled.
      </span>
    </div>
  );
}
