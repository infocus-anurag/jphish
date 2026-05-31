// app.jsx — wires everything together with theme + persona tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "persona": "admin",
  "dashboardVariant": "operational",
  "density": "regular",
  "showAI": true
}/*EDITMODE-END*/;

const PERSONAS = {
  super: { name: 'Asha Patel', initials: 'AP', role: 'Super Admin', org: 'JPhish Platform' },
  admin: { name: 'Renee Vasquez', initials: 'RV', role: 'Org Admin · Security Lead', org: 'Northbeam Labs' },
  analyst: { name: 'Marcus Chen', initials: 'MC', role: 'Security Analyst', org: 'Northbeam Labs' },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState('dashboard');
  const [showWizard, setShowWizard] = React.useState(false);
  const [showPalette, setShowPalette] = React.useState(false);
  const [showNotif, setShowNotif] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  // Theme + density on root
  React.useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.dataset.density = t.density;
  }, [t.theme, t.density]);

  // Cmd+K palette
  React.useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setShowPalette(s => !s); }
      if (e.key === 'Escape') { setShowPalette(false); setShowNotif(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const launchToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const ROUTE_LABEL = {
    dashboard: 'Dashboard',
    campaigns: 'Campaigns',
    adaptive: 'Adaptive engine',
    alerts: 'Alerts',
    templates: 'Email templates',
    landing: 'Landing pages',
    training: 'Training',
    domains: 'Domains & DNS',
    users: 'Users & groups',
    reports: 'Reports',
    settings: 'Settings',
  };

  const routeContent = (() => {
    switch (route) {
      case 'dashboard':
        return <DashboardScreen variant={t.dashboardVariant} setRoute={setRoute} openWizard={() => setShowWizard(true)} />;
      case 'campaigns':
        return <CampaignsScreen openWizard={() => setShowWizard(true)} />;
      case 'adaptive':
        return <AdaptiveScreen setRoute={setRoute} />;
      case 'templates':
        return <TemplatesScreen openWizard={() => setShowWizard(true)} />;
      case 'users':
        return <UsersScreen />;
      case 'landing':
      case 'domains':
        return <LandingScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'alerts':
        return <AlertsScreen />;
      case 'training':
        return <TrainingScreen />;
      case 'reports':
        return <ReportsScreen />;
      default:
        return <DashboardScreen variant={t.dashboardVariant} setRoute={setRoute} />;
    }
  })();

  const persona = PERSONAS[t.persona] || PERSONAS.admin;

  return (
    <div className="shell">
      <Sidebar route={route} setRoute={setRoute} persona={t.persona} personaInfo={persona} />
      <main className="main">
        <Topbar
          crumbs={[persona.org, ROUTE_LABEL[route] || 'Dashboard']}
          theme={t.theme}
          setTheme={(v) => setTweak('theme', v)}
          onNotif={() => setShowNotif(true)}
          onCreate={() => setShowWizard(true)}
          onSearch={() => setShowPalette(true)}
        />
        {t.persona !== 'admin' && (
          <div className={`persona-ribbon ${t.persona}`}>
            {t.persona === 'super' ? (
              <>
                <I.shield size={12} />
                <strong>Super Admin view</strong>
                <span className="muted">Platform-wide controls active. You're seeing data across all tenants.</span>
                <span className="spacer" />
                <button className="btn ghost sm" onClick={() => setTweak('persona', 'admin')}>Switch to Org Admin</button>
              </>
            ) : (
              <>
                <I.eye size={12} />
                <strong>Analyst view</strong>
                <span className="muted">Read-only. Campaign launch and configuration are disabled.</span>
                <span className="spacer" />
                <button className="btn ghost sm" onClick={() => setTweak('persona', 'admin')}>Switch to Org Admin</button>
              </>
            )}
          </div>
        )}
        <div className="main-body">{routeContent}</div>
      </main>

      {showWizard && (
        <WizardScreen
          onClose={() => setShowWizard(false)}
          onLaunch={() => {
            setShowWizard(false);
            launchToast({ kind: 'ok', title: 'Submitted for approval', body: 'Q2 Vendor Invoice Pretext sent to S. Nazari for review.' });
          }}
        />
      )}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} setRoute={setRoute} />}
      {showNotif && <NotifPanel onClose={() => setShowNotif(false)} setRoute={setRoute} />}

      {toast && (
        <div className={`toast toast-${toast.kind}`}>
          <I.check size={14} />
          <div>
            <div style={{ fontWeight: 500, fontSize: 12.5 }}>{toast.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>{toast.body}</div>
          </div>
        </div>
      )}

      <TweaksPanel>
        <TweakSection label="Persona" />
        <TweakRadio label="View as" value={t.persona}
          options={[{ value: 'super', label: 'Super' }, { value: 'admin', label: 'Admin' }, { value: 'analyst', label: 'Analyst' }]}
          onChange={(v) => setTweak('persona', v)} />
        <TweakSection label="Dashboard direction" />
        <TweakRadio label="Layout" value={t.dashboardVariant}
          options={[{ value: 'operational', label: 'Ops' }, { value: 'risk', label: 'Risk' }]}
          onChange={(v) => setTweak('dashboardVariant', v)} />
        <TweakSection label="Appearance" />
        <TweakRadio label="Theme" value={t.theme}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          onChange={(v) => setTweak('theme', v)} />
        <TweakRadio label="Density" value={t.density}
          options={[{ value: 'compact', label: 'Compact' }, { value: 'regular', label: 'Regular' }]}
          onChange={(v) => setTweak('density', v)} />
        <TweakToggle label="Show AI features" value={t.showAI} onChange={(v) => setTweak('showAI', v)} />
      </TweaksPanel>
    </div>
  );
}

function NotifPanel({ onClose, setRoute }) {
  const items = [
    { tone: 'danger', t: '12:42', title: 'Submission spike — AP Wire', body: '4 submissions in the last 8 minutes (3.2× baseline).', cta: 'View campaign', route: 'campaigns' },
    { tone: 'warn', t: '11:18', title: 'Adaptive enrolled M. Ribeiro', body: 'Risk crossed threshold (91). Auto-targeted in next run.', cta: 'View user', route: 'users' },
    { tone: 'warn', t: '10:04', title: 'DocuSign cert expires in 12d', body: 'Rotate the cert for docusign-portal.net or campaigns may fail.', cta: 'Open settings', route: 'settings' },
    { tone: 'info', t: '09:12', title: 'Q1 report ready', body: '218-user roll-up exported to PDF + CSV.', cta: 'Download', route: 'reports' },
  ];
  return (
    <Drawer onClose={onClose} width={400}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <I.bell size={14} />
        <strong style={{ fontSize: 13 }}>Alerts & activity</strong>
        <span className="spacer" />
        <button className="btn ghost sm">Mark all read</button>
        <button className="topbar-action" onClick={onClose}><I.x size={14} /></button>
      </div>
      <div style={{ padding: 8 }}>
        {items.map((it, i) => (
          <div key={i} className="alert-item" onClick={() => { setRoute(it.route); onClose(); }}>
            <div className={`alert-bullet tone-${it.tone}`} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong style={{ fontSize: 12.5 }}>{it.title}</strong>
                <span className="spacer" />
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>{it.t}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2 }}>{it.body}</div>
              <button className="btn ghost sm" style={{ marginTop: 8 }}>{it.cta} <I.chevR size={11} /></button>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

function AlertsScreen() {
  return (
    <>
      <PageHeader title="Alerts" sub="Real-time monitoring across campaigns, adaptive engine, and infrastructure." />
      <div className="page" style={{ display: 'grid', gap: 10 }}>
        {[
          { tone: 'danger', t: 'just now', title: 'Submission spike — AP Wire Transfer', body: '4 submissions in 8 minutes. Threshold: 2 / 10 min.', who: 'system' },
          { tone: 'warn', t: '12 min ago', title: 'Open rate below baseline — DocuSign Q2', body: '14.2% vs 38% baseline. Possible deliverability issue.', who: 'system' },
          { tone: 'warn', t: '38 min ago', title: 'Adaptive escalation — T. Kowalski', body: 'Submitted 3rd time. Escalated to L5 templates.', who: 'system' },
          { tone: 'info', t: '1h ago', title: 'Approval requested — CFO Wire Pretext v3', body: 'Awaiting review by S. Nazari (Security Lead).', who: 'r.vasquez@' },
        ].map((a, i) => (
          <div key={i} className="card">
            <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14 }}>
              <div className={`alert-bullet tone-${a.tone}`} style={{ marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{a.title}</strong>
                  <Badge tone={a.tone === 'danger' ? 'danger' : a.tone === 'warn' ? 'warn' : 'info'}>{a.tone}</Badge>
                  <span className="spacer" />
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{a.t} · {a.who}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{a.body}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button className="btn ghost sm">Investigate</button>
                  <button className="btn ghost sm">Snooze</button>
                  <button className="btn ghost sm">Dismiss</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TrainingScreen() {
  const modules = [
    { n: 'Spotting BEC: Wire Transfer Fraud', dur: '6 min', assigned: 18, completed: 11, kind: 'video' },
    { n: 'Password hygiene & MFA', dur: '4 min', assigned: 218, completed: 198, kind: 'interactive' },
    { n: 'Vendor impersonation 101', dur: '8 min', assigned: 14, completed: 9, kind: 'video' },
    { n: 'Reporting suspicious email', dur: '3 min', assigned: 218, completed: 184, kind: 'interactive' },
    { n: 'OAuth consent phishing', dur: '5 min', assigned: 64, completed: 22, kind: 'video' },
    { n: 'Deepfake voice & video', dur: '7 min', assigned: 38, completed: 4, kind: 'new' },
  ];
  return (
    <>
      <PageHeader title="Training library" sub="6 modules · 4 auto-assignment rules"
        actions={<><button className="btn"><I.plus size={13} /> New rule</button><button className="btn primary"><I.plus size={13} /> New module</button></>} />
      <div className="page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {modules.map(m => {
          const pct = Math.round((m.completed / m.assigned) * 100);
          return (
            <div key={m.n} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Badge tone={m.kind === 'new' ? 'accent' : 'info'}>{m.kind}</Badge>
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{m.dur}</span>
                  <span className="spacer" />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{pct}%</span>
                </div>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{m.n}</div>
                <div style={{ marginTop: 12 }}>
                  <div className="bar"><span style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--ok)' : pct >= 40 ? 'var(--warn)' : 'var(--danger)' }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6 }}>
                    <span>{m.completed} completed</span>
                    <span>{m.assigned - m.completed} pending</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ReportsScreen() {
  return (
    <>
      <PageHeader title="Reports" sub="Export campaign and risk data" actions={<><button className="btn"><I.download size={13} /> CSV</button><button className="btn primary"><I.download size={13} /> PDF</button></>} />
      <div className="page" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          { n: 'Q2 Executive summary', sub: 'High-level metrics · 12 pages · PDF', when: 'Generated 2h ago' },
          { n: 'Department risk roll-up', sub: 'Per-dept submission rates · CSV', when: 'Generated yesterday' },
          { n: 'Adaptive engine outcomes', sub: '30d cohort movement · CSV + PDF', when: 'Auto-generated weekly' },
          { n: 'Compliance audit', sub: 'GDPR / SOC2 evidence pack · PDF', when: 'Last run Apr 14' },
        ].map(r => (
          <div key={r.n} className="card">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 44, borderRadius: 4, background: 'var(--bg-sunken)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--fg-muted)' }}><I.download size={16} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{r.n}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>{r.sub}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 4 }}>{r.when}</div>
              </div>
              <button className="btn">Download</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
