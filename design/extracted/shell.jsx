// shell.jsx — sidebar + topbar + persona ribbon

const NAV_GROUPS = [
  {
    label: 'Operate',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'campaigns', label: 'Campaigns', icon: 'campaigns', count: 4 },
      { id: 'adaptive', label: 'Adaptive engine', icon: 'adaptive', dot: true },
      { id: 'alerts', label: 'Alerts', icon: 'alerts', count: 3 },
    ],
  },
  {
    label: 'Library',
    items: [
      { id: 'templates', label: 'Email templates', icon: 'templates' },
      { id: 'landing', label: 'Landing pages', icon: 'landing' },
      { id: 'training', label: 'Training', icon: 'training' },
      { id: 'domains', label: 'Domains & DNS', icon: 'domains' },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'users', label: 'Users & groups', icon: 'users' },
      { id: 'reports', label: 'Reports', icon: 'reports' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

function Sidebar({ route, setRoute, persona }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo"><JPhishMark size={12} /></div>
        <div className="sidebar-brand-name">JPhish</div>
        <div className="sidebar-brand-meta">v3.4</div>
      </div>
      <div className="sidebar-org">
        <button className="sidebar-org-btn">
          <div className="sidebar-org-avatar">NB</div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-org-name">Northbeam Labs</div>
            <div className="sidebar-org-meta">Enterprise · 218 seats</div>
          </div>
          <I.chev size={13} className="sidebar-org-chev" />
        </button>
      </div>
      <nav className="sidebar-nav">
        {NAV_GROUPS.map(g => (
          <React.Fragment key={g.label}>
            <div className="nav-section-label">{g.label}</div>
            {g.items.map(it => {
              const Ic = I[it.icon];
              return (
                <button key={it.id} className={`nav-item ${route === it.id ? 'active' : ''}`} onClick={() => setRoute(it.id)}>
                  <span className="nav-item-icon"><Ic size={14} /></span>
                  <span>{it.label}</span>
                  {it.count != null && <span className="nav-item-count">{it.count}</span>}
                  {it.dot && <span className="nav-item-dot" />}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="sidebar-foot-avatar">RV</div>
        <div style={{ minWidth: 0 }}>
          <div className="sidebar-foot-name">Renee Vasquez</div>
          <div className="sidebar-foot-role">{persona === 'super' ? 'Super Admin' : persona === 'analyst' ? 'Analyst' : 'Org Admin'}</div>
        </div>
        <button className="sidebar-foot-action"><I.chev size={13} /></button>
      </div>
    </aside>
  );
}

function JPhishMark({ size = 14 }) {
  // Original mark: hooked filament inside a chamfered shield
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 4h14v9c0 4-3.5 7-7 7s-7-3-7-7V4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 8c0 2 2 3 3 3s3-1 3-3M12 11v4M10 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Topbar({ crumbs, theme, setTheme, onNotif, onCreate, onSearch }) {
  return (
    <div className="topbar">
      <div className="topbar-crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep"><I.chevR size={12} /></span>}
            <span className={`crumb ${i === crumbs.length - 1 ? 'last' : ''}`}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <span className="spacer" />
      <button className="topbar-search" onClick={onSearch}>
        <I.search size={13} />
        <span>Search campaigns, users…</span>
        <kbd>⌘K</kbd>
      </button>
      <button className="topbar-action" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
        {theme === 'dark' ? <I.sun size={14} /> : <I.moon size={14} />}
      </button>
      <button className="topbar-action" onClick={onNotif} title="Alerts">
        <I.bell size={14} />
        <span className="dot" />
      </button>
      <button className="btn primary" onClick={onCreate}>
        <I.plus size={13} /> New campaign
      </button>
    </div>
  );
}

function PageHeader({ title, sub, actions, tabs, activeTab, onTab }) {
  return (
    <div className="page-head">
      <div className="page-head-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {sub && <p className="page-sub">{sub}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {tabs && (
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => onTab(t.id)}>
              {t.label}
              {t.count != null && <span className="tab-count">{t.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommandPalette({ onClose, setRoute }) {
  const [q, setQ] = React.useState('');
  const items = [
    { kind: 'route', label: 'Go to Dashboard', route: 'dashboard' },
    { kind: 'route', label: 'Go to Campaigns', route: 'campaigns' },
    { kind: 'route', label: 'Go to Adaptive engine', route: 'adaptive' },
    { kind: 'route', label: 'Go to Templates', route: 'templates' },
    { kind: 'route', label: 'Go to Users & groups', route: 'users' },
    { kind: 'action', label: 'Create new campaign', route: 'wizard' },
    { kind: 'action', label: 'Generate template with AI', route: 'templates' },
    { kind: 'campaign', label: 'AP Wire Transfer — Finance Pilot', route: 'campaigns' },
    { kind: 'campaign', label: 'Workday Password Reset', route: 'campaigns' },
    { kind: 'user', label: 'Mateus Ribeiro · risk 91', route: 'users' },
    { kind: 'user', label: 'Theo Kowalski · risk 84', route: 'users' },
  ];
  const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 520, maxWidth: '92vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
          <I.search size={14} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--fg)' }} />
          <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', background: 'var(--bg-sunken)', borderRadius: 3, color: 'var(--fg-subtle)' }}>esc</kbd>
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto', padding: 6 }}>
          {filtered.map((it, i) => (
            <div key={i} className="dropdown-item" style={{ padding: '8px 10px' }}
              onClick={() => { if (it.route) setRoute(it.route); onClose(); }}>
              <span style={{ width: 14, color: 'var(--fg-subtle)' }}>
                {it.kind === 'route' && <I.arrowUpRight size={12} />}
                {it.kind === 'action' && <I.bolt size={12} />}
                {it.kind === 'campaign' && <I.campaigns size={12} />}
                {it.kind === 'user' && <I.user size={12} />}
              </span>
              <span>{it.label}</span>
              <span className="spacer" />
              <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>{it.kind}</span>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>No matches</div>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, PageHeader, JPhishMark, CommandPalette });
