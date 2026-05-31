'use client';

import type { ReactNode } from 'react';
import { I, type IconKey } from './Icons';

/**
 * Centered empty state for "no data yet" surfaces. Keep copy action-oriented:
 * say what's missing and offer the next step.
 */
export function EmptyState({
  icon = 'layers',
  title,
  message,
  action,
  compact = false,
}: {
  icon?: IconKey;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}): JSX.Element {
  const Ic = I[icon];
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <div className="empty-state-icon" aria-hidden>
        <Ic size={compact ? 18 : 22} />
      </div>
      <div className="empty-state-title">{title}</div>
      {message && <div className="empty-state-msg">{message}</div>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

/** Error state with optional retry. */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn’t load this. Please try again.',
  onRetry,
  compact = false,
}: {
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
  compact?: boolean;
}): JSX.Element {
  return (
    <div className={`empty-state error ${compact ? 'compact' : ''}`}>
      <div className="empty-state-icon danger" aria-hidden>
        <I.alerts size={compact ? 18 : 22} />
      </div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-msg">{message}</div>
      {onRetry && (
        <div className="empty-state-action">
          <button type="button" className="btn" onClick={onRetry}>
            <I.refresh size={13} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

/** A single shimmering placeholder block. */
export function Skeleton({
  width,
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}): JSX.Element {
  return (
    <span
      className="skeleton"
      style={{ width: width ?? '100%', height, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}

/** Placeholder rows for a table body while data loads. */
export function SkeletonRows({
  rows = 5,
  cols,
}: {
  rows?: number;
  cols: number;
}): JSX.Element {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="skeleton-row">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <Skeleton width={c === 0 ? '70%' : '45%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Placeholder card grid (used by card-based screens). */
export function SkeletonCards({ count = 6 }: { count?: number }): JSX.Element {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 16 }}>
          <Skeleton width={64} height={18} radius={5} />
          <Skeleton width="80%" height={14} style={{ marginTop: 12 }} />
          <Skeleton width="55%" height={12} style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={6} radius={3} style={{ marginTop: 16 }} />
        </div>
      ))}
    </>
  );
}

/** Inline "Loading…" text for small surfaces. */
export function InlineLoading({ label = 'Loading…' }: { label?: string }): JSX.Element {
  return (
    <span className="inline-loading">
      <span className="spinner" aria-hidden /> {label}
    </span>
  );
}

/** Extract a human message from an axios-ish error. */
export function errorMessage(err: unknown, fallback = 'Request failed'): string {
  if (typeof err === 'object' && err && 'response' in err) {
    const m = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
