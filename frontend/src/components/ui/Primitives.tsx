'use client';

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { I } from './Icons';
import {
  avatarFor,
  initials,
  riskBucket,
  riskLabel,
  type ActionKind,
  type CampaignStatus,
} from '@/lib/ui-format';

export type Tone = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'accent';

export function Avatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}): JSX.Element {
  const cls = size === 'lg' ? 'avatar lg' : size === 'sm' ? 'avatar sm' : 'avatar';
  return (
    <div className={cls} style={{ background: avatarFor(name) }}>
      {initials(name)}
    </div>
  );
}

export function Badge({
  tone = 'default',
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}): JSX.Element {
  const cls = tone === 'default' ? 'badge' : `badge ${tone}`;
  return (
    <span className={cls}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function RiskMeter({
  score,
  showLabel = true,
}: {
  score: number;
  showLabel?: boolean;
}): JSX.Element {
  const b = riskBucket(score);
  const pct = Math.max(4, Math.min(100, score));
  return (
    <span className={`risk ${b}`}>
      <span className="risk-bar">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular">{score}</span>
      {showLabel && (
        <span style={{ color: 'var(--fg-subtle)' }}>· {riskLabel(score)}</span>
      )}
    </span>
  );
}

const STATUS_MAP: Record<string, { tone: Tone; label: string; dot: boolean }> = {
  running: { tone: 'ok', label: 'Running', dot: true },
  scheduled: { tone: 'info', label: 'Scheduled', dot: true },
  completed: { tone: 'default', label: 'Completed', dot: false },
  draft: { tone: 'default', label: 'Draft', dot: false },
  'awaiting-approval': { tone: 'warn', label: 'Approval', dot: true },
  paused: { tone: 'default', label: 'Paused', dot: false },
  archived: { tone: 'default', label: 'Archived', dot: false },
};

export function StatusBadge({
  status,
}: {
  status: CampaignStatus | string;
}): JSX.Element {
  const fallback = { tone: 'default' as Tone, label: status, dot: false };
  const { tone, label, dot } = STATUS_MAP[status] ?? fallback;
  return (
    <Badge tone={tone} dot={dot}>
      {label}
    </Badge>
  );
}

const ACTION_TONE: Record<ActionKind, Tone> = {
  submitted: 'danger',
  clicked: 'warn',
  opened: 'info',
  reported: 'ok',
  sent: 'default',
};

export function ActionBadge({ action }: { action: ActionKind }): JSX.Element {
  return <Badge tone={ACTION_TONE[action]}>{action}</Badge>;
}

export function Switch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    />
  );
}

export interface SegmentOption {
  value: string;
  label: ReactNode;
}

export function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<SegmentOption | string>;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <div className="segment">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        return (
          <button
            key={v}
            type="button"
            className={value === v ? 'on' : ''}
            onClick={() => onChange(v)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  size,
  footer,
}: {
  title: ReactNode;
  children: ReactNode;
  onClose: () => void;
  size?: 'lg';
  footer?: ReactNode;
}): JSX.Element {
  useEffect(() => {
    const fn = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={size === 'lg' ? 'modal lg' : 'modal'}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <span className="spacer" />
          <button
            type="button"
            className="topbar-action"
            onClick={onClose}
            aria-label="Close"
          >
            <I.x size={14} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({
  children,
  onClose,
  width = 540,
}: {
  children: ReactNode;
  onClose: () => void;
  width?: number;
}): JSX.Element {
  useEffect(() => {
    const fn = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer" style={{ width }}>
        {children}
      </div>
    </>
  );
}

export interface ToastMessage {
  kind: 'ok' | 'warn' | 'danger' | 'info';
  title: string;
  body?: string;
}

export function Toast({
  message,
  onClose,
  style,
}: {
  message: ToastMessage;
  onClose: () => void;
  style?: CSSProperties;
}): JSX.Element {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast-${message.kind}`} style={style}>
      <I.check size={14} />
      <div>
        <div style={{ fontWeight: 500, fontSize: 12.5 }}>{message.title}</div>
        {message.body && (
          <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>
            {message.body}
          </div>
        )}
      </div>
    </div>
  );
}
