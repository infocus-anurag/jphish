// screens/landing.jsx, settings.jsx — secondary screens

function LandingScreen() {
  const pages = [
    { id: 'workday-reset-v3', name: 'Workday — Password reset', kind: 'cloned', uses: 14, captures: 'creds', https: true },
    { id: 'invoice-portal-v2', name: 'Invoice payment portal', kind: 'AI', uses: 8, captures: 'creds', https: true },
    { id: 'docusign-signin', name: 'DocuSign sign-in', kind: 'cloned', uses: 6, captures: 'creds+OTP', https: true },
    { id: 'office365-quota', name: 'Office 365 — Quota full', kind: 'cloned', uses: 11, captures: 'creds', https: true },
    { id: 'gotcha-default', name: 'Gotcha — default', kind: 'system', uses: 38, captures: 'none', https: true },
    { id: 'training-redirect', name: 'Training redirect', kind: 'system', uses: 24, captures: 'none', https: true },
  ];
  return (
    <>
      <PageHeader
        title="Landing pages"
        sub="Edit, clone, or generate landing pages with AI. All pages serve over HTTPS."
        actions={
          <>
            <button className="btn"><I.globe size={13} /> Clone real site</button>
            <button className="btn"><I.sparkles size={13} /> Generate with AI</button>
            <button className="btn primary"><I.plus size={13} /> New page</button>
          </>
        }
      />
      <div className="page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {pages.map(p => (
          <div key={p.id} className="card" style={{ cursor: 'pointer' }}>
            <div style={{ height: 140, background: 'var(--bg-sunken)', borderBottom: '1px solid var(--line)', position: 'relative', overflow: 'hidden', padding: 10 }}>
              <div style={{ height: 6, width: '50%', background: 'var(--line-strong)', borderRadius: 2, marginBottom: 6 }} />
              <div style={{ height: 4, width: '80%', background: 'var(--line)', borderRadius: 2, marginBottom: 4 }} />
              <div style={{ height: 4, width: '70%', background: 'var(--line)', borderRadius: 2, marginBottom: 8 }} />
              <div style={{ height: 16, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 4 }} />
              <div style={{ height: 16, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 6 }} />
              <div style={{ height: 16, background: p.id.includes('invoice') ? 'var(--danger)' : p.id.includes('workday') ? 'var(--info)' : 'var(--fg)', borderRadius: 3, width: '40%' }} />
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Badge tone={p.kind === 'AI' ? 'accent' : p.kind === 'system' ? 'info' : 'default'}>{p.kind === 'AI' ? <><I.sparkles size={9} /> AI</> : p.kind}</Badge>
                <Badge tone="ok"><I.shieldCheck size={9} /> HTTPS</Badge>
                <span className="spacer" />
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{p.uses}×</span>
              </div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>captures: {p.captures}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SettingsScreen() {
  const [section, setSection] = React.useState('smtp');
  return (
    <>
      <PageHeader title="Settings" sub="SMTP, domains, security, billing" />
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100% - 100px)' }}>
        <aside style={{ borderRight: '1px solid var(--line)', padding: 16, background: 'var(--bg-elev)' }}>
          {[
            { id: 'smtp', label: 'SMTP & sending', icon: 'send' },
            { id: 'domains', label: 'Domains & DNS', icon: 'domains' },
            { id: 'security', label: 'Security & SSO', icon: 'shield' },
            { id: 'audit', label: 'Audit logs', icon: 'history' },
            { id: 'billing', label: 'Billing', icon: 'briefcase' },
            { id: 'api', label: 'API & webhooks', icon: 'code' },
          ].map(it => {
            const Ic = I[it.icon];
            return (
              <button key={it.id} className={`nav-item ${section === it.id ? 'active' : ''}`} onClick={() => setSection(it.id)}>
                <span className="nav-item-icon"><Ic size={14} /></span>
                <span>{it.label}</span>
              </button>
            );
          })}
        </aside>
        <div className="page" style={{ padding: 24 }}>
          {section === 'smtp' && <SmtpSettings />}
          {section === 'domains' && <DomainsSettings />}
          {section === 'security' && <SecuritySettings />}
          {section === 'audit' && <AuditLog />}
          {section === 'billing' && <BillingSettings />}
          {section === 'api' && <ApiSettings />}
        </div>
      </div>
    </>
  );
}

function SmtpSettings() {
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Sending profiles</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Profile</th><th>Provider</th><th>From</th><th>TLS</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[
              { n: 'postmark-prod-2', p: 'Postmark', from: 'no-reply@nb-mail.io', tls: '1.3', ok: true },
              { n: 'sendgrid-staging', p: 'SendGrid', from: 'simulate@nb-test.io', tls: '1.2', ok: true },
              { n: 'aws-ses-us-east', p: 'AWS SES', from: 'phish@nb-secops.com', tls: '1.3', ok: true },
              { n: 'gmail-relay-legacy', p: 'Gmail', from: 'admin@…', tls: '1.2', ok: false },
            ].map(s => (
              <tr key={s.n}>
                <td className="mono">{s.n}</td>
                <td>{s.p}</td>
                <td className="mono" style={{ fontSize: 11.5 }}>{s.from}</td>
                <td><Badge tone="ok">{s.tls}</Badge></td>
                <td>{s.ok ? <Badge tone="ok" dot>Healthy</Badge> : <Badge tone="danger" dot>Auth failing</Badge>}</td>
                <td><button className="btn ghost sm">Test</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn" style={{ width: 'fit-content' }}><I.plus size={12} /> Add sending profile</button>
    </div>
  );
}

function DomainsSettings() {
  const domains = [
    { d: 'nb-id.co', kind: 'tracking', dkim: true, spf: true, dmarc: true, exp: '187d' },
    { d: 'workd4y-secure.com', kind: 'spoofed', dkim: true, spf: true, dmarc: false, exp: '92d' },
    { d: 'vend0r-pay.com', kind: 'spoofed', dkim: true, spf: true, dmarc: true, exp: '241d' },
    { d: 'docusign-portal.net', kind: 'spoofed', dkim: false, spf: true, dmarc: false, exp: '12d' },
  ];
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 880 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Domains & DNS simulator</h2>
      <p style={{ marginTop: -8, color: 'var(--fg-muted)', fontSize: 12.5 }}>Manage phishing domains. JPhish auto-generates DNS records and rotates them.</p>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Domain</th><th>Kind</th><th>DKIM</th><th>SPF</th><th>DMARC</th><th>Cert expires</th><th></th></tr></thead>
          <tbody>
            {domains.map(d => (
              <tr key={d.d}>
                <td className="mono">{d.d}</td>
                <td><Badge tone={d.kind === 'spoofed' ? 'warn' : 'info'}>{d.kind}</Badge></td>
                <td>{d.dkim ? <I.check size={13} style={{ color: 'var(--ok-fg)' }} /> : <I.x size={13} style={{ color: 'var(--danger-fg)' }} />}</td>
                <td>{d.spf ? <I.check size={13} style={{ color: 'var(--ok-fg)' }} /> : <I.x size={13} style={{ color: 'var(--danger-fg)' }} />}</td>
                <td>{d.dmarc ? <I.check size={13} style={{ color: 'var(--ok-fg)' }} /> : <I.x size={13} style={{ color: 'var(--danger-fg)' }} />}</td>
                <td className="mono" style={{ fontSize: 11.5, color: parseInt(d.exp) < 30 ? 'var(--danger-fg)' : 'var(--fg-subtle)' }}>{d.exp}</td>
                <td><button className="btn ghost sm"><I.more size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Security & access</h2>
      <div className="card">
        <div className="card-body" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div><div style={{ fontWeight: 500, fontSize: 12.5 }}>SAML SSO</div><div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>Okta · 218 active sessions</div></div>
            <Switch on onChange={() => {}} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div><div style={{ fontWeight: 500, fontSize: 12.5 }}>Enforce MFA for admins</div><div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>WebAuthn or TOTP required</div></div>
            <Switch on onChange={() => {}} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div><div style={{ fontWeight: 500, fontSize: 12.5 }}>Encrypt sensitive data at rest</div><div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>AES-256 · KMS rotation every 90d</div></div>
            <Switch on onChange={() => {}} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div><div style={{ fontWeight: 500, fontSize: 12.5 }}>Campaign approval required</div><div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>Approver: Security Lead</div></div>
            <Switch on onChange={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditLog() {
  const rows = [
    { t: '12:42:08', who: 'system', what: 'campaign.event', detail: 'submitted · u14 · AP Wire' },
    { t: '12:30:14', who: 'r.vasquez@', what: 'campaign.approve', detail: 'AP Wire Transfer' },
    { t: '12:14:09', who: 'r.vasquez@', what: 'campaign.create', detail: 'Q2 Vendor Invoice' },
    { t: '11:48:22', who: 'system', what: 'adaptive.enroll', detail: 'm.ribeiro@ · risk 91' },
    { t: '11:02:11', who: 's.nazari@', what: 'user.role.update', detail: 'p.bhatt@ · analyst → admin' },
    { t: '10:14:48', who: 'r.vasquez@', what: 'template.create', detail: 'CFO Urgent Wire v2' },
    { t: '09:33:01', who: 'system', what: 'smtp.rotate', detail: 'postmark-prod-2 · rotated keys' },
    { t: '09:12:55', who: 'm.chen@', what: 'login.sso.success', detail: 'okta · IP 10.0.4.18' },
  ];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Audit log</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="mono" style={{ fontSize: 11 }}>{r.t}</td>
                <td><Badge tone={r.who === 'system' ? 'info' : 'default'}>{r.who}</Badge></td>
                <td className="mono" style={{ fontSize: 11.5 }}>{r.what}</td>
                <td>{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingSettings() {
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Billing</h2>
      <div className="card">
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Badge tone="accent">Enterprise</Badge>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>Northbeam Labs · 218 seats</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>Renews May 14, 2027 · annual · $14,820</div>
          </div>
          <button className="btn">Manage</button>
        </div>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { l: 'Emails this period', v: '12,481', d: 'of 25,000' },
          { l: 'Active campaigns', v: '4', d: 'unlimited' },
          { l: 'AI generations', v: '184', d: 'of 500' },
        ].map(s => (
          <div key={s.l} className="stat">
            <div className="stat-label">{s.l}</div>
            <div className="stat-value">{s.v}</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 4 }}>{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiSettings() {
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>API & webhooks</h2>
      <div className="card">
        <div className="card-body" style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="field-label">API key</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input mono" readOnly value="jph_sk_live_8f2a91••••••••••••••" style={{ flex: 1 }} />
              <button className="btn"><I.copy size={12} /> Copy</button>
              <button className="btn"><I.refresh size={12} /> Rotate</button>
            </div>
          </div>
          <div>
            <label className="field-label">Webhook URL</label>
            <input className="input mono" defaultValue="https://api.northbeam.io/secops/jphish/events" />
            <div className="field-help">Subscribed events: <code className="mono">campaign.event.*</code>, <code className="mono">adaptive.decision</code>, <code className="mono">alert.*</code></div>
          </div>
          <div>
            <div className="field-label">Example payload</div>
            <pre className="code-block">{`{
  "event": "campaign.event.submitted",
  "campaign_id": "c2",
  "user": { "email": "***@northbeam.io", "risk": 91 },
  "ts": "2026-05-03T12:42:08Z"
}`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LandingScreen, SettingsScreen });
