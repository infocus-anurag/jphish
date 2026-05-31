'use client';

import { useState } from 'react';
import { I } from '@/components/ui/Icons';
import { Switch } from '@/components/ui/Primitives';
import { useSession } from '@/store/session.store';

/** Floating designer panel — theme/density switcher. */
export function TweaksPanel(): JSX.Element {
  const [open, setOpen] = useState(false);
  const theme = useSession((s) => s.theme);
  const setTheme = useSession((s) => s.setTheme);
  const density = useSession((s) => s.density);
  const setDensity = useSession((s) => s.setDensity);
  const dashboardVariant = useSession((s) => s.dashboardVariant);
  const setDashboardVariant = useSession((s) => s.setDashboardVariant);
  const showAI = useSession((s) => s.showAI);
  const setShowAI = useSession((s) => s.setShowAI);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="topbar-action"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 60,
          background: 'var(--bg-elev)',
          boxShadow: 'var(--shadow-pop)',
        }}
        aria-label="Tweaks"
        title="Tweaks"
      >
        <I.settings size={14} />
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 56,
            zIndex: 60,
            width: 240,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-pop)',
            padding: 12,
            display: 'grid',
            gap: 12,
          }}
        >
          <Section label="Dashboard">
            <Radio
              value={dashboardVariant}
              options={[
                { value: 'operational', label: 'Ops' },
                { value: 'risk', label: 'Risk' },
              ]}
              onChange={(v) =>
                setDashboardVariant(v as 'operational' | 'risk')
              }
            />
          </Section>
          <Section label="Theme">
            <Radio
              value={theme}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              onChange={(v) => setTheme(v as 'light' | 'dark')}
            />
          </Section>
          <Section label="Density">
            <Radio
              value={density}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'regular', label: 'Regular' },
              ]}
              onChange={(v) => setDensity(v as 'compact' | 'regular')}
            />
          </Section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>
              Show AI features
            </span>
            <Switch on={showAI} onChange={setShowAI} />
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: 'var(--fg-faint)',
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Radio({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <div className="segment" style={{ width: '100%' }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
