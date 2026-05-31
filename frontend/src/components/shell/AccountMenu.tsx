'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/components/ui/Icons';
import { useAuthStore } from '@/store/auth.store';
import { logout } from '@/lib/auth-api';
import { roleLabel } from '@/lib/rbac';

export function AccountMenu(): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) return <span aria-hidden />;

  const initials =
    `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U';

  async function onLogout(): Promise<void> {
    setOpen(false);
    await logout().catch(() => undefined);
    clear();
    router.replace('/login');
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="topbar-action"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        title={`${user.firstName} ${user.lastName} · ${roleLabel(user.role)}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 8px',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--accent, #4f46e5)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {initials}
        </span>
        <I.chev size={12} />
      </button>
      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            minWidth: 220,
            background: 'var(--bg-elev, #fff)',
            border: '1px solid var(--line, #e5e7eb)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-pop, 0 12px 30px -12px rgba(0,0,0,0.25))',
            padding: 8,
            zIndex: 80,
          }}
        >
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{user.email}</div>
            <div
              style={{
                fontSize: 10,
                marginTop: 4,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: 'var(--fg-faint)',
              }}
            >
              {roleLabel(user.role)}
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: 4 }} />
          <button
            role="menuitem"
            type="button"
            className="btn ghost sm"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => {
              setOpen(false);
              router.push('/settings');
            }}
          >
            Account & security
          </button>
          <button
            role="menuitem"
            type="button"
            className="btn ghost sm"
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger, #b91c1c)' }}
            onClick={onLogout}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
