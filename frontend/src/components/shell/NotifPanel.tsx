'use client';

import { I } from '@/components/ui/Icons';
import { Drawer } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/States';
import { useUI } from '@/store/ui.store';

export function NotifPanel(): JSX.Element | null {
  const show = useUI((s) => s.showNotif);
  const toggleNotif = useUI((s) => s.toggleNotif);

  if (!show) return null;
  const close = (): void => toggleNotif(false);

  return (
    <Drawer onClose={close} width={400}>
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <I.bell size={14} />
        <strong style={{ fontSize: 13 }}>Alerts &amp; activity</strong>
        <span className="spacer" />
        <button type="button" className="topbar-action" onClick={close} aria-label="Close">
          <I.x size={14} />
        </button>
      </div>
      <EmptyState
        icon="shieldCheck"
        title="You’re all caught up"
        message="New alerts and notable campaign activity will show up here."
      />
    </Drawer>
  );
}
