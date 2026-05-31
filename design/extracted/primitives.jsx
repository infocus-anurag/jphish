// primitives.jsx — small reusable UI atoms

// ─── Icons (line, 16px viewBox=24) ───
const Icon = ({ d, size = 14, stroke = 1.6, fill = 'none', children, viewBox = '0 0 24 24', style }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d ? <path d={d} /> : children}
  </svg>
);
const I = {
  dashboard: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></Icon>,
  campaigns: (p) => <Icon {...p}><path d="M3 8l9 5 9-5-9-5-9 5z" /><path d="M3 13l9 5 9-5" /><path d="M3 18l9 5 9-5" /></Icon>,
  templates: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></Icon>,
  users: (p) => <Icon {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" /><circle cx="17" cy="6" r="3" /><path d="M22 17c0-2.5-2-4-4-4" /></Icon>,
  adaptive: (p) => <Icon {...p}><path d="M3 12h4l2-7 4 14 2-7h6" /></Icon>,
  alerts: (p) => <Icon {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 004 0" /></Icon>,
  landing: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 8h18" /><circle cx="6" cy="6" r="0.5" /><circle cx="8" cy="6" r="0.5" /></Icon>,
  domains: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 010 18" /><path d="M12 3a14 14 0 000 18" /></Icon>,
  training: (p) => <Icon {...p}><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M7 10v5c0 2 3 3 5 3s5-1 5-3v-5" /></Icon>,
  reports: (p) => <Icon {...p}><path d="M4 20V8" /><path d="M10 20V4" /><path d="M16 20v-9" /><path d="M22 20H2" /></Icon>,
  settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1.1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1.1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" /></Icon>,
  search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>,
  plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>,
  chev: (p) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>,
  chevR: (p) => <Icon {...p}><path d="M9 6l6 6-6 6" /></Icon>,
  chevL: (p) => <Icon {...p}><path d="M15 6l-6 6 6 6" /></Icon>,
  more: (p) => <Icon {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Icon>,
  download: (p) => <Icon {...p}><path d="M12 3v12M5 12l7 7 7-7M3 21h18" /></Icon>,
  filter: (p) => <Icon {...p}><path d="M3 5h18M6 12h12M10 19h4" /></Icon>,
  sort: (p) => <Icon {...p}><path d="M3 6h13M3 12h9M3 18h5M17 4v16l4-4M17 20l4-4" /></Icon>,
  bell: (p) => <Icon {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 004 0" /></Icon>,
  mail: (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 7 9-7" /></Icon>,
  click: (p) => <Icon {...p}><path d="M9 9l5 12 2-5 5-2-12-5z" /><path d="M3 3l3 3M3 9h4M9 3v4" /></Icon>,
  shield: (p) => <Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></Icon>,
  shieldCheck: (p) => <Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></Icon>,
  flag: (p) => <Icon {...p}><path d="M5 21V4M5 4h12l-2 4 2 4H5" /></Icon>,
  check: (p) => <Icon {...p}><path d="M5 12l5 5L20 7" /></Icon>,
  x: (p) => <Icon {...p}><path d="M5 5l14 14M19 5L5 19" /></Icon>,
  copy: (p) => <Icon {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></Icon>,
  edit: (p) => <Icon {...p}><path d="M4 20h4l11-11-4-4L4 16v4z" /><path d="M14 6l4 4" /></Icon>,
  trash: (p) => <Icon {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Icon>,
  eye: (p) => <Icon {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Icon>,
  upload: (p) => <Icon {...p}><path d="M12 21V9M5 12l7-7 7 7M3 3h18" /></Icon>,
  refresh: (p) => <Icon {...p}><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" /></Icon>,
  user: (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M3 21c0-4 4-7 9-7s9 3 9 7" /></Icon>,
  sparkles: (p) => <Icon {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" /><path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" /></Icon>,
  bolt: (p) => <Icon {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></Icon>,
  link: (p) => <Icon {...p}><path d="M10 14l4-4M14 6l1.5-1.5a4.5 4.5 0 016.5 6.5L20 13M10 18l-1.5 1.5a4.5 4.5 0 01-6.5-6.5L4 11" /></Icon>,
  globe: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></Icon>,
  calendar: (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></Icon>,
  clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>,
  layers: (p) => <Icon {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5M3 18l9 5 9-5" /></Icon>,
  arrowUpRight: (p) => <Icon {...p}><path d="M7 17L17 7M9 7h8v8" /></Icon>,
  arrowDownRight: (p) => <Icon {...p}><path d="M7 7l10 10M9 17h8V9" /></Icon>,
  commandKey: (p) => <Icon {...p}><path d="M9 6a3 3 0 11-3 3v6a3 3 0 113-3h6a3 3 0 113 3 3 3 0 11-3-3V9a3 3 0 11-3 3" /></Icon>,
  brain: (p) => <Icon {...p}><path d="M8 4a3 3 0 014 0 3 3 0 014 0v2a3 3 0 011 5 3 3 0 01-1 5v2a3 3 0 01-4 0 3 3 0 01-4 0v-2a3 3 0 01-1-5 3 3 0 011-5V4z" /><path d="M12 4v16" /></Icon>,
  pause: (p) => <Icon {...p}><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></Icon>,
  play: (p) => <Icon {...p}><path d="M6 4l14 8-14 8z" /></Icon>,
  send: (p) => <Icon {...p}><path d="M3 11l18-8-7 18-3-8-8-2z" /></Icon>,
  building: (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" /><path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2" /></Icon>,
  briefcase: (p) => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" /></Icon>,
  code: (p) => <Icon {...p}><path d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16" /></Icon>,
  external: (p) => <Icon {...p}><path d="M14 5h5v5M19 5L10 14M19 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h5" /></Icon>,
  history: (p) => <Icon {...p}><path d="M3 12a9 9 0 109-9c-2.5 0-4.7 1-6.4 2.6L3 8M3 3v5h5M12 8v4l3 2" /></Icon>,
  flame: (p) => <Icon {...p}><path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1-1-2-1-3 4 2 4 6 4 7a6 6 0 11-12 0c0-3 2-5 3-7 2-3 3-4 3-6z" /></Icon>,
  cmd: (p) => <Icon {...p}><path d="M9 6a3 3 0 11-3 3v6a3 3 0 113-3h6a3 3 0 113 3 3 3 0 11-3-3V9a3 3 0 11-3 3" /></Icon>,
  sun: (p) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></Icon>,
  moon: (p) => <Icon {...p}><path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z" /></Icon>,
};

// Avatar
function Avatar({ name, size = 'md', src }) {
  const cls = size === 'lg' ? 'avatar lg' : size === 'sm' ? 'avatar sm' : 'avatar';
  return (
    <div className={cls} style={{ background: avatarFor(name) }}>
      {initials(name)}
    </div>
  );
}

// Badge
function Badge({ tone = 'default', children, dot = false }) {
  const cls = tone === 'default' ? 'badge' : `badge ${tone}`;
  return (
    <span className={cls}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

// Risk meter
function RiskMeter({ score, showLabel = true }) {
  const b = riskBucket(score);
  const pct = Math.max(4, Math.min(100, score));
  return (
    <span className={`risk ${b}`}>
      <span className="risk-bar"><span style={{ width: `${pct}%` }} /></span>
      <span className="tabular">{score}</span>
      {showLabel && <span style={{ color: 'var(--fg-subtle)' }}>· {riskLabel(score)}</span>}
    </span>
  );
}

// Status badge for campaigns
function StatusBadge({ status }) {
  const map = {
    running: { tone: 'ok', label: 'Running', dot: true },
    scheduled: { tone: 'info', label: 'Scheduled', dot: true },
    completed: { tone: 'default', label: 'Completed', dot: false },
    draft: { tone: 'default', label: 'Draft', dot: false },
    'awaiting-approval': { tone: 'warn', label: 'Approval', dot: true },
    paused: { tone: 'default', label: 'Paused', dot: false },
  };
  const { tone, label, dot } = map[status] || { tone: 'default', label: status };
  return <Badge tone={tone} dot={dot}>{label}</Badge>;
}

// Action label badge
function ActionBadge({ action }) {
  const map = {
    submitted: 'danger', clicked: 'warn', opened: 'info', reported: 'ok', sent: 'default',
  };
  return <Badge tone={map[action] || 'default'}>{action}</Badge>;
}

// Switch
function Switch({ on, onChange }) {
  return <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />;
}

// Segmented
function Segment({ value, options, onChange }) {
  return (
    <div className="segment">
      {options.map(o => (
        <button key={o.value || o} className={value === (o.value || o) ? 'on' : ''} onClick={() => onChange(o.value || o)}>{o.label || o}</button>
      ))}
    </div>
  );
}

// Modal
function Modal({ title, children, onClose, size, footer }) {
  React.useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={size === 'lg' ? 'modal lg' : 'modal'}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <span className="spacer" />
          <button className="topbar-action" onClick={onClose}><I.x size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Drawer (right side panel)
function Drawer({ children, onClose, width = 540 }) {
  React.useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer" style={{ width }}>{children}</div>
    </>
  );
}

// Toast
function Toast({ children, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 2400);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="toast">
      <I.check size={14} />
      {children}
    </div>
  );
}

Object.assign(window, {
  I, Icon, Avatar, Badge, RiskMeter, StatusBadge, ActionBadge, Switch, Segment, Modal, Drawer, Toast,
});
