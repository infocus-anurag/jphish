'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/components/ui/Icons';
import { useUI } from '@/store/ui.store';

interface PaletteItem {
  kind: 'route' | 'action' | 'campaign' | 'user';
  label: string;
  href?: string;
  action?: () => void;
}

export function CommandPalette(): JSX.Element | null {
  const show = useUI((s) => s.showPalette);
  const togglePalette = useUI((s) => s.togglePalette);
  const openWizard = useUI((s) => s.openWizard);
  const router = useRouter();
  const [q, setQ] = useState('');

  if (!show) return null;

  const close = (): void => {
    setQ('');
    togglePalette(false);
  };

  const items: PaletteItem[] = [
    { kind: 'route', label: 'Go to Dashboard', href: '/' },
    { kind: 'route', label: 'Go to Campaigns', href: '/campaigns' },
    { kind: 'route', label: 'Go to Adaptive engine', href: '/adaptive' },
    { kind: 'route', label: 'Go to Email templates', href: '/templates' },
    { kind: 'route', label: 'Go to Landing pages', href: '/landing' },
    { kind: 'route', label: 'Go to Users & groups', href: '/users' },
    { kind: 'route', label: 'Go to Reports', href: '/reports' },
    { kind: 'route', label: 'Go to Settings', href: '/settings' },
    {
      kind: 'action',
      label: 'Create new campaign',
      action: () => openWizard(),
    },
  ];

  const filtered = q
    ? items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
    : items;

  const choose = (it: PaletteItem): void => {
    if (it.action) it.action();
    if (it.href) router.push(it.href);
    close();
  };

  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal" style={{ width: 520, maxWidth: '92vw' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <I.search size={14} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--fg)',
            }}
          />
          <kbd
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '1px 5px',
              background: 'var(--bg-sunken)',
              borderRadius: 3,
              color: 'var(--fg-subtle)',
            }}
          >
            esc
          </kbd>
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto', padding: 6 }}>
          {filtered.map((it, i) => (
            <div
              key={i}
              className="dropdown-item"
              style={{ padding: '8px 10px' }}
              onClick={() => choose(it)}
            >
              <span style={{ width: 14, color: 'var(--fg-subtle)' }}>
                {it.kind === 'route' && <I.arrowUpRight size={12} />}
                {it.kind === 'action' && <I.bolt size={12} />}
                {it.kind === 'campaign' && <I.campaigns size={12} />}
                {it.kind === 'user' && <I.user size={12} />}
              </span>
              <span>{it.label}</span>
              <span className="spacer" />
              <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>
                {it.kind}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'var(--fg-subtle)',
                fontSize: 12,
              }}
            >
              No matches
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
