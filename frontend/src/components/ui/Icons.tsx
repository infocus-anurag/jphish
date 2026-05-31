import type { CSSProperties, ReactNode } from 'react';

export interface IconProps {
  size?: number;
  stroke?: number;
  fill?: string;
  style?: CSSProperties;
  className?: string;
}

interface BaseProps extends IconProps {
  d?: string;
  children?: ReactNode;
  viewBox?: string;
}

function Base({
  d,
  size = 14,
  stroke = 1.6,
  fill = 'none',
  children,
  viewBox = '0 0 24 24',
  style,
  className,
}: BaseProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const I = {
  dashboard: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </Base>
  ),
  campaigns: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M3 8l9 5 9-5-9-5-9 5z" />
      <path d="M3 13l9 5 9-5" />
      <path d="M3 18l9 5 9-5" />
    </Base>
  ),
  templates: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </Base>
  ),
  users: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" />
      <circle cx="17" cy="6" r="3" />
      <path d="M22 17c0-2.5-2-4-4-4" />
    </Base>
  ),
  adaptive: (p: IconProps): JSX.Element => (
    <Base {...p} d="M3 12h4l2-7 4 14 2-7h6" />
  ),
  alerts: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
      <path d="M10 21a2 2 0 004 0" />
    </Base>
  ),
  landing: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 8h18" />
      <circle cx="6" cy="6" r="0.5" />
      <circle cx="8" cy="6" r="0.5" />
    </Base>
  ),
  domains: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 010 18" />
      <path d="M12 3a14 14 0 000 18" />
    </Base>
  ),
  training: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M7 10v5c0 2 3 3 5 3s5-1 5-3v-5" />
    </Base>
  ),
  reports: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M4 20V8" />
      <path d="M10 20V4" />
      <path d="M16 20v-9" />
      <path d="M22 20H2" />
    </Base>
  ),
  settings: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1.1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1.1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
    </Base>
  ),
  search: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Base>
  ),
  plus: (p: IconProps): JSX.Element => <Base {...p} d="M12 5v14M5 12h14" />,
  chev: (p: IconProps): JSX.Element => <Base {...p} d="M6 9l6 6 6-6" />,
  chevR: (p: IconProps): JSX.Element => <Base {...p} d="M9 6l6 6-6 6" />,
  chevL: (p: IconProps): JSX.Element => <Base {...p} d="M15 6l-6 6 6 6" />,
  more: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </Base>
  ),
  download: (p: IconProps): JSX.Element => (
    <Base {...p} d="M12 3v12M5 12l7 7 7-7M3 21h18" />
  ),
  filter: (p: IconProps): JSX.Element => (
    <Base {...p} d="M3 5h18M6 12h12M10 19h4" />
  ),
  sort: (p: IconProps): JSX.Element => (
    <Base {...p} d="M3 6h13M3 12h9M3 18h5M17 4v16l4-4M17 20l4-4" />
  ),
  bell: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
      <path d="M10 21a2 2 0 004 0" />
    </Base>
  ),
  mail: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </Base>
  ),
  click: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M9 9l5 12 2-5 5-2-12-5z" />
      <path d="M3 3l3 3M3 9h4M9 3v4" />
    </Base>
  ),
  shield: (p: IconProps): JSX.Element => (
    <Base
      {...p}
      d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"
    />
  ),
  shieldCheck: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </Base>
  ),
  flag: (p: IconProps): JSX.Element => (
    <Base {...p} d="M5 21V4M5 4h12l-2 4 2 4H5" />
  ),
  check: (p: IconProps): JSX.Element => <Base {...p} d="M5 12l5 5L20 7" />,
  x: (p: IconProps): JSX.Element => <Base {...p} d="M5 5l14 14M19 5L5 19" />,
  copy: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
    </Base>
  ),
  edit: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M4 20h4l11-11-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </Base>
  ),
  trash: (p: IconProps): JSX.Element => (
    <Base {...p} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  ),
  eye: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  ),
  upload: (p: IconProps): JSX.Element => (
    <Base {...p} d="M12 21V9M5 12l7-7 7 7M3 3h18" />
  ),
  refresh: (p: IconProps): JSX.Element => (
    <Base
      {...p}
      d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5"
    />
  ),
  user: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M3 21c0-4 4-7 9-7s9 3 9 7" />
    </Base>
  ),
  sparkles: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
      <path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
    </Base>
  ),
  bolt: (p: IconProps): JSX.Element => (
    <Base {...p} d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  ),
  link: (p: IconProps): JSX.Element => (
    <Base
      {...p}
      d="M10 14l4-4M14 6l1.5-1.5a4.5 4.5 0 016.5 6.5L20 13M10 18l-1.5 1.5a4.5 4.5 0 01-6.5-6.5L4 11"
    />
  ),
  globe: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </Base>
  ),
  calendar: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </Base>
  ),
  clock: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Base>
  ),
  layers: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5M3 18l9 5 9-5" />
    </Base>
  ),
  arrowUpRight: (p: IconProps): JSX.Element => (
    <Base {...p} d="M7 17L17 7M9 7h8v8" />
  ),
  arrowDownRight: (p: IconProps): JSX.Element => (
    <Base {...p} d="M7 7l10 10M9 17h8V9" />
  ),
  brain: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <path d="M8 4a3 3 0 014 0 3 3 0 014 0v2a3 3 0 011 5 3 3 0 01-1 5v2a3 3 0 01-4 0 3 3 0 01-4 0v-2a3 3 0 01-1-5 3 3 0 011-5V4z" />
      <path d="M12 4v16" />
    </Base>
  ),
  pause: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </Base>
  ),
  play: (p: IconProps): JSX.Element => <Base {...p} d="M6 4l14 8-14 8z" />,
  send: (p: IconProps): JSX.Element => (
    <Base {...p} d="M3 11l18-8-7 18-3-8-8-2z" />
  ),
  building: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <rect x="4" y="3" width="16" height="18" />
      <path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2" />
    </Base>
  ),
  briefcase: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" />
    </Base>
  ),
  code: (p: IconProps): JSX.Element => (
    <Base {...p} d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16" />
  ),
  external: (p: IconProps): JSX.Element => (
    <Base
      {...p}
      d="M14 5h5v5M19 5L10 14M19 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h5"
    />
  ),
  history: (p: IconProps): JSX.Element => (
    <Base
      {...p}
      d="M3 12a9 9 0 109-9c-2.5 0-4.7 1-6.4 2.6L3 8M3 3v5h5M12 8v4l3 2"
    />
  ),
  flame: (p: IconProps): JSX.Element => (
    <Base
      {...p}
      d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1-1-2-1-3 4 2 4 6 4 7a6 6 0 11-12 0c0-3 2-5 3-7 2-3 3-4 3-6z"
    />
  ),
  sun: (p: IconProps): JSX.Element => (
    <Base {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </Base>
  ),
  moon: (p: IconProps): JSX.Element => (
    <Base {...p} d="M21 13A9 9 0 1111 3a7 7 0 0010 10z" />
  ),
} as const;

export type IconKey = keyof typeof I;
