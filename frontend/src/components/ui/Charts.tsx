'use client';

import { useState } from 'react';

// Chart-local data shapes (presentation only).
export interface ChartDay {
  day: number;
  sent: number;
  open: number;
  click: number;
  sub: number;
  rep: number;
}
export interface ChartDept {
  name: string;
  users: number;
  sent: number;
  click: number;
  submit: number;
  report: number;
  risk: number;
}
export interface ChartHeatCell {
  d: number;
  h: number;
  v: number;
}

export function Sparkline({
  data,
  height = 28,
  color = 'var(--accent)',
  fill = true,
  smooth = true,
}: {
  data: number[];
  height?: number;
  color?: string;
  fill?: boolean;
  smooth?: boolean;
}): JSX.Element | null {
  const w = 100;
  const h = height;
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts: Array<[number, number]> = data.map((v, i) => [
    (i / Math.max(1, data.length - 1)) * w,
    h - ((v - min) / range) * (h - 4) - 2,
  ]);
  const path = smooth
    ? pts.reduce((acc, [x, y], i) => {
        if (i === 0) return `M${x},${y}`;
        const prev = pts[i - 1]!;
        const px = prev[0];
        const py = prev[1];
        const cx = (px + x) / 2;
        return `${acc} Q${px},${py} ${cx},${(py + y) / 2} T${x},${y}`;
      }, '')
    : 'M' + pts.map((p) => p.join(',')).join(' L');
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg
      className="spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ height, width: '100%' }}
    >
      {fill && <path d={area} fill={color} opacity="0.10" />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface FunnelSeries {
  key: keyof Omit<ChartDay, 'day'>;
  label: string;
  color: string;
  fillOp: number;
}

const FUNNEL_SERIES: FunnelSeries[] = [
  { key: 'sent', label: 'Sent', color: 'var(--fg-faint)', fillOp: 0.1 },
  { key: 'open', label: 'Opened', color: 'var(--info)', fillOp: 0.14 },
  { key: 'click', label: 'Clicked', color: 'var(--warn)', fillOp: 0.18 },
  { key: 'sub', label: 'Submitted', color: 'var(--danger)', fillOp: 0.22 },
  { key: 'rep', label: 'Reported', color: 'var(--ok)', fillOp: 0.18 },
];

export function FunnelChart({
  data,
  height = 220,
}: {
  data: ChartDay[];
  height?: number;
}): JSX.Element {
  const w = 700;
  const h = height;
  const pad = { l: 28, r: 12, t: 12, b: 22 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...data.map((d) => d.sent));
  const xs = (i: number): number =>
    pad.l + (i / Math.max(1, data.length - 1)) * innerW;
  const ys = (v: number): number => pad.t + innerH - (v / max) * innerH;

  const [hov, setHov] = useState<number | null>(null);

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={pad.t + innerH * (1 - g)}
              y2={pad.t + innerH * (1 - g)}
              stroke="var(--line)"
              strokeDasharray="2 3"
            />
            <text
              x={pad.l - 6}
              y={pad.t + innerH * (1 - g) + 3}
              fontSize="9"
              textAnchor="end"
              fill="var(--fg-subtle)"
              fontFamily="var(--font-mono)"
            >
              {Math.round(max * g)}
            </text>
          </g>
        ))}
        {FUNNEL_SERIES.map((s) => {
          const pts = data.map((d, i) => [xs(i), ys(d[s.key])] as const);
          const path = 'M' + pts.map((p) => p.join(',')).join(' L');
          const area = `${path} L${pad.l + innerW},${pad.t + innerH} L${pad.l},${pad.t + innerH} Z`;
          return (
            <g key={s.key}>
              <path d={area} fill={s.color} opacity={s.fillOp} />
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
        {data.map(
          (_, i) =>
            i % 2 === 0 && (
              <text
                key={i}
                x={xs(i)}
                y={h - 6}
                fontSize="9"
                textAnchor="middle"
                fill="var(--fg-subtle)"
                fontFamily="var(--font-mono)"
              >
                {`d${i + 1}`}
              </text>
            ),
        )}
        {data.map((_, i) => (
          <rect
            key={i}
            x={xs(i) - innerW / data.length / 2}
            y={pad.t}
            width={innerW / data.length}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          />
        ))}
        {hov !== null && (
          <line
            x1={xs(hov)}
            x2={xs(hov)}
            y1={pad.t}
            y2={pad.t + innerH}
            stroke="var(--fg)"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        )}
        {hov !== null &&
          FUNNEL_SERIES.map((s) => (
            <circle
              key={s.key}
              cx={xs(hov)}
              cy={ys(data[hov]![s.key])}
              r="3"
              fill="var(--bg-elev)"
              stroke={s.color}
              strokeWidth="1.5"
            />
          ))}
      </svg>
      {hov !== null && (
        <div
          style={{
            position: 'absolute',
            left: `calc(${(xs(hov) / w) * 100}% + 12px)`,
            top: 8,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 7,
            padding: '8px 10px',
            fontSize: 11,
            boxShadow: 'var(--shadow-pop)',
            minWidth: 130,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg-subtle)',
              marginBottom: 4,
            }}
          >
            Day {hov + 1}
          </div>
          {FUNNEL_SERIES.map((s) => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '1px 0',
              }}
            >
              <span style={{ color: s.color }}>
                ● <span style={{ color: 'var(--fg)' }}>{s.label}</span>
              </span>
              <span className="mono tabular">{data[hov]![s.key]}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 11 }}>
        {FUNNEL_SERIES.map((s) => (
          <span
            key={s.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--fg-muted)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: s.color,
              }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DeptBar({ row }: { row: ChartDept }): JSX.Element {
  const noAction = Math.max(0, row.sent - row.click - row.submit - row.report);
  const total = row.click + row.submit + row.report + noAction || 1;
  const segs = [
    { label: 'Submitted', v: row.submit, color: 'var(--danger)' },
    { label: 'Clicked', v: row.click, color: 'var(--warn)' },
    { label: 'Reported', v: row.report, color: 'var(--ok)' },
    { label: 'No action', v: noAction, color: 'var(--bg-sunken)' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        background: 'var(--bg-sunken)',
      }}
    >
      {segs.map((s, i) => (
        <div
          key={i}
          style={{ flex: s.v / total, background: s.color }}
          title={`${s.label}: ${s.v}`}
        />
      ))}
    </div>
  );
}

export function RiskHistogram({
  data,
  height = 100,
}: {
  data: Array<{ bucket: string; count: number; label: string }>;
  height?: number;
}): JSX.Element {
  const max = Math.max(...data.map((d) => d.count));
  const colors = [
    'var(--ok)',
    'var(--info)',
    'var(--warn)',
    'var(--danger)',
    'var(--danger)',
  ];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        height,
      }}
    >
      {data.map((d, i) => (
        <div
          key={d.bucket}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <div className="mono tabular" style={{ fontSize: 10, color: 'var(--fg)' }}>
            {d.count}
          </div>
          <div
            style={{
              width: '100%',
              height: (d.count / max) * (height - 36),
              background: colors[i],
              borderRadius: '3px 3px 0 0',
              opacity: 0.85,
            }}
          />
          <div
            className="mono"
            style={{ fontSize: 9, color: 'var(--fg-subtle)' }}
          >
            {d.bucket}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Heatmap({
  data,
  days = 14,
  hours = 24,
}: {
  data: ChartHeatCell[];
  days?: number;
  hours?: number;
}): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 4 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${days}, 1fr)`,
          fontSize: 9,
          color: 'var(--fg-subtle)',
          fontFamily: 'var(--font-mono)',
          textAlign: 'right',
          paddingRight: 4,
        }}
      >
        {Array.from({ length: days }, (_, d) => (
          <div key={d} style={{ alignSelf: 'center' }}>
            {d % 2 === 0 ? `${days - d}d` : ''}
          </div>
        ))}
      </div>
      <div>
        <div
          className="heat-grid"
          style={{
            gridTemplateColumns: `repeat(${hours}, 1fr)`,
            gridTemplateRows: `repeat(${days}, 1fr)`,
          }}
        >
          {data.map((c, i) => {
            const op = c.v;
            return (
              <div
                key={i}
                className="heat-cell"
                style={{
                  background:
                    op > 0.05
                      ? `color-mix(in oklch, var(--accent) ${op * 100}%, var(--bg-sunken))`
                      : 'var(--bg-sunken)',
                }}
                title={`d-${days - c.d}, ${String(c.h).padStart(2, '0')}:00 — ${Math.round(c.v * 100)}%`}
              />
            );
          })}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginTop: 4,
            fontSize: 9,
            color: 'var(--fg-subtle)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {Array.from({ length: hours / 4 }, (_, i) => (
            <div key={i} style={{ flex: 4, textAlign: 'left' }}>
              {String(i * 4).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Donut({
  value,
  total,
  size = 60,
  stroke = 7,
  color = 'var(--accent)',
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  color?: string;
}): JSX.Element {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-sunken)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${c * pct} ${c}`}
          strokeDashoffset={c * 0.25}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray .6s' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: size > 80 ? 14 : 11,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}

export interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

export function FunnelBars({ steps }: { steps: FunnelStep[] }): JSX.Element {
  const max = Math.max(...steps.map((s) => s.value)) || 1;
  // Conversion is measured against the top of the funnel (the first step), so
  // under-counted opens can never produce "Infinity%" or > 100% noise.
  const top = steps[0]?.value ?? 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {steps.map((s, i) => {
        const pct = Math.min(100, (s.value / max) * 100);
        const conv = top > 0 ? (s.value / top) * 100 : 0;
        return (
          <div
            key={s.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 100px',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{s.label}</div>
            <div
              style={{
                height: 22,
                background: 'var(--bg-sunken)',
                borderRadius: 4,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  background: s.color,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'white',
                  fontWeight: 500,
                }}
              >
                {s.value}
              </div>
            </div>
            <div
              className="mono tabular"
              title={i > 0 ? `${s.value} of ${top} (${conv.toFixed(1)}% of sent)` : undefined}
              style={{
                fontSize: 11,
                color: 'var(--fg-subtle)',
                textAlign: 'right',
              }}
            >
              {i === 0 ? '—' : top > 0 ? `${conv.toFixed(1)}%` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
