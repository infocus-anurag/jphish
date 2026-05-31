// screens/templates.jsx — Email templates library + editor

function TemplatesScreen({ openWizard }) {
  const [view, setView] = React.useState('grid');
  const [open, setOpen] = React.useState(null);
  const [showAI, setShowAI] = React.useState(false);

  return (
    <>
      <PageHeader
        title="Email templates"
        sub="12 templates · 4 categories · 2 drafts"
        actions={
          <>
            <button className="btn" onClick={() => setShowAI(true)}><I.sparkles size={13} /> Generate with AI</button>
            <button className="btn primary"><I.plus size={13} /> New template</button>
          </>
        }
      />
      <div className="filters">
        <button className="filter-chip active">All categories</button>
        <button className="filter-chip">IT</button>
        <button className="filter-chip">Finance</button>
        <button className="filter-chip">HR</button>
        <button className="filter-chip">Executive</button>
        <span className="spacer" />
        <Segment value={view} options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]} onChange={setView} />
      </div>

      {view === 'grid' ? (
        <div className="page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {SEED_TEMPLATES.map(t => (
            <div key={t.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpen(t)}>
              <div style={{ height: 130, background: 'var(--bg-sunken)', borderBottom: '1px solid var(--line)', position: 'relative', overflow: 'hidden', padding: 12 }}>
                <div style={{ height: 8, width: '60%', background: 'var(--line-strong)', borderRadius: 2, marginBottom: 6 }} />
                <div style={{ height: 6, width: '90%', background: 'var(--line)', borderRadius: 2, marginBottom: 4 }} />
                <div style={{ height: 6, width: '78%', background: 'var(--line)', borderRadius: 2, marginBottom: 4 }} />
                <div style={{ height: 6, width: '85%', background: 'var(--line)', borderRadius: 2, marginBottom: 10 }} />
                <div style={{ height: 18, width: '38%', background: t.category === 'Finance' ? 'var(--danger)' : t.category === 'IT' ? 'var(--info)' : 'var(--fg)', borderRadius: 3 }} />
              </div>
              <div className="card-body" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Badge>{t.category}</Badge>
                  <Badge tone={t.difficulty >= 4 ? 'danger' : t.difficulty >= 3 ? 'warn' : 'info'}>L{t.difficulty}</Badge>
                  <span className="spacer" />
                  <span className="mono" style={{ fontSize: 11, color: t.ctr >= 50 ? 'var(--danger-fg)' : 'var(--fg-subtle)' }}>{t.ctr}% CTR</span>
                </div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>by {t.author} · used {t.usage}× · {t.lastUsed}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-elev)' }}>
          <table className="table">
            <thead><tr>
              <th>Template</th><th>Category</th><th>Difficulty</th><th className="right">Usage</th>
              <th className="right">CTR</th><th>Author</th><th>Last used</th><th></th>
            </tr></thead>
            <tbody>
              {SEED_TEMPLATES.map(t => (
                <tr key={t.id} onClick={() => setOpen(t)}>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td><Badge>{t.category}</Badge></td>
                  <td><Badge tone={t.difficulty >= 4 ? 'danger' : t.difficulty >= 3 ? 'warn' : 'info'}>L{t.difficulty}</Badge></td>
                  <td className="num right">{t.usage}</td>
                  <td className="num right">{t.ctr}%</td>
                  <td>{t.author}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t.lastUsed}</td>
                  <td><button className="btn ghost sm"><I.more size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <TemplateEditor template={open} onClose={() => setOpen(null)} />}
      {showAI && <Modal title="Generate template with AI" size="lg" onClose={() => setShowAI(false)}><AIGenerator update={() => {}} /></Modal>}
    </>
  );
}

function TemplateEditor({ template, onClose }) {
  const [tab, setTab] = React.useState('design');
  return (
    <Drawer onClose={onClose} width={780}>
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge>{template.category}</Badge>
        <Badge tone={template.difficulty >= 4 ? 'danger' : 'warn'}>L{template.difficulty}</Badge>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{template.name}</span>
        <span className="spacer" />
        <button className="btn"><I.copy size={12} /> Duplicate</button>
        <button className="btn primary"><I.check size={12} /> Save</button>
        <button className="topbar-action" onClick={onClose}><I.x size={14} /></button>
      </div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', padding: '0 22px' }}>
        {['design', 'preview', 'variables', 'history'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'design' && (
        <div style={{ padding: '16px 22px', display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="field-label">From name</label><input className="input" defaultValue="IT Helpdesk" /></div>
            <div><label className="field-label">From email</label><input className="input mono" defaultValue="it-help@northb3am.io" /></div>
          </div>
          <div><label className="field-label">Subject</label><input className="input" defaultValue="Your Workday password expires today" /></div>
          <div>
            <label className="field-label">Body (HTML)</label>
            <textarea className="input code" rows={10} defaultValue={`<p>Hi {{FirstName}},</p>\n<p>Your Workday password is expiring today. To avoid loss of access, please reset it before 5 PM.</p>\n<p><a href="{{URL}}">Reset your password</a></p>\n<p>— IT Helpdesk</p>`} />
          </div>
          <div className="card" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-line)' }}>
            <div className="card-body" style={{ padding: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <I.sparkles size={14} style={{ color: 'var(--accent-soft-fg)', marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent-soft-fg)' }}>AI suggestions</div>
                <div style={{ fontSize: 11.5, color: 'var(--accent-soft-fg)', opacity: 0.85, marginTop: 2 }}>Add a personalized urgency hook (e.g. last login location). <a href="#" style={{ color: 'inherit' }}>Apply →</a></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 'preview' && (
        <div style={{ padding: 22 }}>
          <div className="mail-preview">
            <div className="mail-head">
              <div className="mail-head-row"><span className="k">From</span><span className="mono">IT Helpdesk &lt;it-help@northb3am.io&gt;</span></div>
              <div className="mail-head-row"><span className="k">To</span><span className="mono">{`{{FirstName}} {{LastName}} <{{Email}}>`}</span></div>
              <div className="mail-head-row"><span className="k">Subject</span><strong>Your Workday password expires today</strong></div>
            </div>
            <div className="mail-body">
              <p>Hi {`{{FirstName}}`},</p>
              <p>Your Workday password is expiring today. To avoid loss of access, please reset it before 5 PM.</p>
              <p><a style={{ color: 'var(--accent)' }} href="#">Reset your password</a></p>
              <p style={{ color: 'var(--fg-subtle)' }}>— IT Helpdesk</p>
            </div>
          </div>
        </div>
      )}
      {tab === 'variables' && (
        <div style={{ padding: 22 }}>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr><th>Variable</th><th>Description</th><th>Example</th></tr></thead>
              <tbody>
                {[
                  ['{{FirstName}}', 'Recipient first name', 'Imani'],
                  ['{{LastName}}', 'Recipient last name', 'Okafor'],
                  ['{{Email}}', 'Recipient email', 'imani.okafor@northbeam.io'],
                  ['{{URL}}', 'Tracked phishing link', 'https://nb-id.co/r/9X2k'],
                  ['{{Department}}', 'Recipient department', 'Engineering'],
                  ['{{Manager}}', 'Recipient manager', 'Y. El-Amin'],
                ].map(([k, d, e]) => (
                  <tr key={k}><td className="mono">{k}</td><td>{d}</td><td className="mono" style={{ color: 'var(--fg-subtle)' }}>{e}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'history' && (
        <div style={{ padding: 22 }}>
          {[
            { v: 'v3', who: 'You', when: '2d ago', note: 'Tightened subject line, removed "URGENT"' },
            { v: 'v2', who: 'M. Chen', when: '3w ago', note: 'Added MFA reference' },
            { v: 'v1', who: 'JPhish', when: '8w ago', note: 'Initial pretext' },
          ].map((h, i) => (
            <div key={i} className="activity-row" style={{ borderBottom: i < 2 ? '1px solid var(--line)' : 'none', padding: '10px 0' }}>
              <Badge tone="info">{h.v}</Badge>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5 }}>{h.note}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{h.who} · {h.when}</div>
              </div>
              <button className="btn ghost sm">Restore</button>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

Object.assign(window, { TemplatesScreen });
