// screens/wizard.jsx — Multi-step campaign creation wizard

function WizardScreen({ onClose, onLaunch }) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    name: 'Q2 — Vendor Invoice Pretext',
    description: 'Test AP team awareness against vendor impersonation.',
    template: 't6',
    landing: 'invoice-portal-v2',
    group: 'Finance Dept',
    schedule: { start: 'May 06, 2026 09:00', end: 'May 11, 2026 17:00', stagger: 12 },
    capture: 'credentials',
    redirect: 'training',
    adaptive: false,
    sender: 'postmark-prod-2',
    fromName: 'Vendor Billing <billing@vend0r-pay.com>',
    subject: 'Invoice #INV-29481 past due',
  });
  const update = (k, v) => setData(d => ({ ...d, [k]: v }));

  const STEPS = [
    { id: 'basics', label: 'Basics', sub: 'Name and intent' },
    { id: 'template', label: 'Email template', sub: 'Pretext + content' },
    { id: 'landing', label: 'Landing page', sub: 'Capture & redirect' },
    { id: 'audience', label: 'Audience', sub: 'Group or adaptive' },
    { id: 'schedule', label: 'Schedule', sub: 'Send window + stagger' },
    { id: 'review', label: 'Review & submit', sub: 'Approval workflow' },
  ];

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal lg" style={{ width: 'min(1080px, 96vw)', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head">
          <div style={{ width: 22, height: 22, borderRadius: 5, display: 'grid', placeItems: 'center', background: 'var(--fg)', color: 'var(--bg)' }}>
            <I.plus size={12} />
          </div>
          <div className="modal-title">New campaign</div>
          <span className="spacer" />
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Step {step + 1} of {STEPS.length}</span>
          <button className="topbar-action" onClick={onClose}><I.x size={14} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', flex: 1, minHeight: 0 }}>
          <div className="wizard-rail">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`wizard-step ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`} onClick={() => i <= step && setStep(i)}>
                <div className="wizard-step-num">{i < step ? <I.check size={11} /> : i + 1}</div>
                <div>
                  <div className="wizard-step-label">{s.label}</div>
                  <div className="wizard-step-sub">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ overflow: 'auto', padding: '22px 28px 28px' }}>
            {step === 0 && <StepBasics data={data} update={update} />}
            {step === 1 && <StepTemplate data={data} update={update} />}
            {step === 2 && <StepLanding data={data} update={update} />}
            {step === 3 && <StepAudience data={data} update={update} />}
            {step === 4 && <StepSchedule data={data} update={update} />}
            {step === 5 && <StepReview data={data} />}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <span className="spacer" />
          {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}><I.chevL size={12} /> Back</button>}
          {step < STEPS.length - 1 ? (
            <button className="btn primary" onClick={() => setStep(step + 1)}>Next <I.chevR size={12} /></button>
          ) : (
            <button className="btn accent" onClick={onLaunch}><I.send size={12} /> Submit for approval</button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBasics({ data, update }) {
  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.005em' }}>Name your campaign</h2>
      <p style={{ marginTop: 4, color: 'var(--fg-muted)', fontSize: 12.5 }}>Internal name only — never seen by recipients.</p>
      <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
        <div>
          <label className="field-label">Campaign name</label>
          <input className="input" value={data.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Goal / hypothesis</label>
          <textarea className="input" value={data.description} onChange={(e) => update('description', e.target.value)} />
          <div className="field-help">Recorded in audit log. Visible to approvers.</div>
        </div>
        <div className="card" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-line)' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <I.shield size={16} style={{ color: 'var(--accent-soft-fg)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--accent-soft-fg)' }}>Compliance</div>
              <div style={{ fontSize: 12, color: 'var(--accent-soft-fg)', opacity: 0.85, marginTop: 2 }}>
                Campaigns require approval from a Security Lead before launch. No real passwords are stored — only submission events.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTemplate({ data, update }) {
  const [tab, setTab] = React.useState('library');
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Choose email template</h2>
      <p style={{ marginTop: 4, color: 'var(--fg-muted)', fontSize: 12.5 }}>Pick from your library or generate a new pretext with AI.</p>
      <div className="segment" style={{ marginTop: 14 }}>
        <button className={tab === 'library' ? 'on' : ''} onClick={() => setTab('library')}>Library</button>
        <button className={tab === 'ai' ? 'on' : ''} onClick={() => setTab('ai')}><I.sparkles size={11} /> AI generate</button>
        <button className={tab === 'html' ? 'on' : ''} onClick={() => setTab('html')}>Custom HTML</button>
      </div>
      {tab === 'library' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 16 }}>
          {SEED_TEMPLATES.slice(0, 8).map(t => (
            <div key={t.id}
              className="card"
              style={{ cursor: 'pointer', borderColor: data.template === t.id ? 'var(--accent)' : 'var(--line)', boxShadow: data.template === t.id ? '0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent)' : 'none' }}
              onClick={() => update('template', t.id)}>
              <div className="card-body" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Badge>{t.category}</Badge>
                  <Badge tone={t.difficulty >= 4 ? 'danger' : t.difficulty >= 3 ? 'warn' : 'info'}>L{t.difficulty}</Badge>
                  <span className="spacer" />
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }} className="mono">{t.ctr}% CTR</span>
                </div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>by {t.author} · used {t.usage}×</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'ai' && <AIGenerator update={update} />}
      {tab === 'html' && (
        <div style={{ marginTop: 16 }}>
          <textarea className="input code" rows={14} placeholder="<html>..." />
        </div>
      )}
    </div>
  );
}

function AIGenerator({ update }) {
  const [scenario, setScenario] = React.useState('Finance');
  const [tone, setTone] = React.useState('Urgent');
  const [difficulty, setDifficulty] = React.useState(4);
  const [generated, setGenerated] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      setGenerated({
        subject: 'ACTION REQUIRED: Wire transfer pending your approval — INV-29481',
        from: 'Accounts Payable <ap-billing@northb3am-corp.com>',
        body: `Hi {{FirstName}},\n\nA wire of $48,219.40 to Veridian Logistics has been queued and is awaiting your approval before our 4PM cutoff today.\n\nWithout approval, the vendor relationship may be flagged. Please review:\n\n[ Approve transfer → ]\n\nThis is the third reminder. The payment will auto-cancel at 16:00 EST.\n\nThanks,\nAP Team`,
      });
      setLoading(false);
    }, 1100);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginTop: 16 }}>
      <div className="card">
        <div className="card-head">
          <div style={{ width: 22, height: 22, borderRadius: 5, display: 'grid', placeItems: 'center', background: 'var(--accent)', color: 'white' }}>
            <I.sparkles size={12} />
          </div>
          <div className="card-title">AI pretext generator</div>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="field-label">Scenario</label>
            <Segment value={scenario} options={['HR', 'IT', 'Finance', 'Legal', 'Sales']} onChange={setScenario} />
          </div>
          <div>
            <label className="field-label">Tone</label>
            <Segment value={tone} options={['Urgent', 'Routine', 'Authoritative', 'Casual']} onChange={setTone} />
          </div>
          <div>
            <label className="field-label">Difficulty</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min="1" max="5" value={difficulty} onChange={(e) => setDifficulty(+e.target.value)} style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 12 }}>L{difficulty}</span>
            </div>
            <div className="field-help">{difficulty <= 2 ? 'Obvious — typos, wrong tone' : difficulty === 3 ? 'Standard — believable pretext' : difficulty === 4 ? 'Targeted — uses internal context' : 'Spear — fully tailored to recipient'}</div>
          </div>
          <div>
            <label className="field-label">Constraints</label>
            <textarea className="input" rows={3} placeholder="e.g. mention Veridian Logistics, $48,219.40, 4PM cutoff" defaultValue="Mention Veridian Logistics, $48,219.40, 4PM cutoff." />
          </div>
          <button className="btn accent" onClick={generate} disabled={loading}>
            {loading ? <><span className="live-pulse" style={{ color: 'white' }} /> Generating…</> : <><I.sparkles size={12} /> Generate template</>}
          </button>
        </div>
      </div>
      <div>
        <label className="field-label">Preview</label>
        {generated ? (
          <div className="mail-preview">
            <div className="mail-head">
              <div className="mail-head-row"><span className="k">From</span><span className="mono">{generated.from}</span></div>
              <div className="mail-head-row"><span className="k">To</span><span className="mono">{`{{FirstName}} {{LastName}} <{{Email}}>`}</span></div>
              <div className="mail-head-row"><span className="k">Subject</span><strong>{generated.subject}</strong></div>
            </div>
            <div className="mail-body" style={{ whiteSpace: 'pre-wrap', fontSize: 12.5 }}>{generated.body}</div>
          </div>
        ) : (
          <div style={{ height: 360, border: '1px dashed var(--line-strong)', borderRadius: 10, display: 'grid', placeItems: 'center', color: 'var(--fg-subtle)', fontSize: 12.5 }}>
            <div style={{ textAlign: 'center' }}>
              <I.sparkles size={20} />
              <div style={{ marginTop: 8 }}>Generate to preview</div>
            </div>
          </div>
        )}
        {generated && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button className="btn"><I.refresh size={12} /> Regenerate</button>
            <button className="btn"><I.edit size={12} /> Edit</button>
            <button className="btn primary"><I.check size={12} /> Use this template</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepLanding({ data, update }) {
  const pages = [
    { id: 'workday-reset-v3', name: 'Workday — Password reset', preview: 'pwd' },
    { id: 'invoice-portal-v2', name: 'Invoice payment portal', preview: 'inv' },
    { id: 'docusign-signin', name: 'DocuSign sign-in', preview: 'doc' },
    { id: 'office365-quota', name: 'Office 365 — Quota full', preview: 'o365' },
  ];
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Landing page</h2>
      <p style={{ marginTop: 4, color: 'var(--fg-muted)', fontSize: 12.5 }}>Where users land after clicking the link.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 14 }}>
        {pages.map(p => (
          <div key={p.id} className="card" style={{ cursor: 'pointer', borderColor: data.landing === p.id ? 'var(--accent)' : 'var(--line)', boxShadow: data.landing === p.id ? '0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent)' : 'none' }} onClick={() => update('landing', p.id)}>
            <div style={{ height: 110, background: 'var(--bg-sunken)', borderBottom: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}>
              <FakePagePreview kind={p.preview} />
            </div>
            <div className="card-body" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontWeight: 500, fontSize: 12.5 }}>{p.name}</strong>
              <span className="spacer" />
              <Badge tone="ok"><I.shieldCheck size={9} /> HTTPS</Badge>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-head"><div className="card-title">Capture & redirect</div></div>
        <div className="card-body" style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="field-label">What to capture</label>
            <Segment value={data.capture} options={[{ value: 'none', label: 'Nothing (click only)' }, { value: 'credentials', label: 'Credentials (hashed)' }, { value: 'data', label: 'Form data' }]} onChange={(v) => update('capture', v)} />
            <div className="field-help">Real passwords are <strong>never</strong> stored. Submissions are recorded as events with hashed digests.</div>
          </div>
          <div>
            <label className="field-label">After submission</label>
            <Segment value={data.redirect} options={[{ value: 'gotcha', label: 'Show "Gotcha" page' }, { value: 'training', label: 'Auto-assign training' }, { value: 'redirect', label: 'Redirect to real site' }]} onChange={(v) => update('redirect', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FakePagePreview({ kind }) {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 8, transform: 'scale(0.85)', transformOrigin: 'top left', width: '118%', height: '118%' }}>
      <div style={{ height: 14, background: 'var(--line-strong)', borderRadius: 2, marginBottom: 6, width: '40%' }} />
      <div style={{ height: 8, background: 'var(--line)', borderRadius: 2, marginBottom: 4, width: '70%' }} />
      <div style={{ height: 8, background: 'var(--line)', borderRadius: 2, marginBottom: 10, width: '55%' }} />
      <div style={{ height: 22, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 4, marginBottom: 4 }} />
      <div style={{ height: 22, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 4, marginBottom: 6 }} />
      <div style={{ height: 22, background: kind === 'inv' ? 'var(--danger)' : kind === 'pwd' ? 'var(--info)' : 'var(--fg)', borderRadius: 4, width: '40%' }} />
    </div>
  );
}

function StepAudience({ data, update }) {
  const groups = [
    { id: 'all', name: 'All Employees', users: 218 },
    { id: 'finance', name: 'Finance Dept', users: 14 },
    { id: 'eng', name: 'Engineering', users: 64 },
    { id: 'risk70', name: 'Adaptive: Risk ≥ 70', users: 18, adaptive: true },
    { id: 'newhire', name: 'New Hires Q2', users: 12 },
  ];
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Audience</h2>
      <p style={{ marginTop: 4, color: 'var(--fg-muted)', fontSize: 12.5 }}>Pick a static group or hand off to the adaptive engine.</p>
      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        {groups.map(g => (
          <div key={g.id} className="card" style={{ cursor: 'pointer', borderColor: data.group === g.name ? 'var(--accent)' : 'var(--line)' }} onClick={() => { update('group', g.name); update('adaptive', !!g.adaptive); }}>
            <div className="card-body" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="radio" checked={data.group === g.name} readOnly />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {g.name}
                  {g.adaptive && <Badge tone="accent"><I.sparkles size={9} /> Adaptive</Badge>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>{g.users} users · {g.adaptive ? 'auto-refreshed daily' : 'static membership'}</div>
              </div>
              <button className="btn ghost sm">Preview</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepSchedule({ data, update }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Schedule</h2>
      <p style={{ marginTop: 4, color: 'var(--fg-muted)', fontSize: 12.5 }}>Stagger sends to mimic real-world traffic and avoid detection.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
        <div><label className="field-label">Start</label><input className="input" defaultValue={data.schedule.start} /></div>
        <div><label className="field-label">End</label><input className="input" defaultValue={data.schedule.end} /></div>
      </div>
      <div style={{ marginTop: 14 }}>
        <label className="field-label">Stagger rate (emails/min)</label>
        <input type="range" min="1" max="60" defaultValue={data.schedule.stagger} style={{ width: '100%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
          <span>1/min · stealth</span><span>{data.schedule.stagger}/min</span><span>60/min · burst</span>
        </div>
      </div>
      <div className="card" style={{ marginTop: 18, background: 'var(--bg-sunken)', border: 'none' }}>
        <div className="card-body" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
          <I.clock size={18} style={{ color: 'var(--fg-muted)' }} />
          <div style={{ fontSize: 12.5 }}>
            <strong style={{ fontWeight: 500 }}>14 recipients × 12/min</strong>
            <div style={{ color: 'var(--fg-subtle)' }}>Estimated send window: ~1 min 10 sec. First open expected within 4 min.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepReview({ data }) {
  const tpl = SEED_TEMPLATES.find(t => t.id === data.template);
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Review & submit for approval</h2>
      <p style={{ marginTop: 4, color: 'var(--fg-muted)', fontSize: 12.5 }}>The campaign will be sent to a Security Lead for approval before launch.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Summary</div></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <tbody>
                <tr><td style={{ width: '38%', color: 'var(--fg-subtle)' }}>Name</td><td><strong style={{ fontWeight: 500 }}>{data.name}</strong></td></tr>
                <tr><td style={{ color: 'var(--fg-subtle)' }}>Template</td><td>{tpl?.name}</td></tr>
                <tr><td style={{ color: 'var(--fg-subtle)' }}>Landing page</td><td>{data.landing}</td></tr>
                <tr><td style={{ color: 'var(--fg-subtle)' }}>Audience</td><td>{data.group}</td></tr>
                <tr><td style={{ color: 'var(--fg-subtle)' }}>Sender</td><td className="mono">{data.fromName}</td></tr>
                <tr><td style={{ color: 'var(--fg-subtle)' }}>Schedule</td><td>{data.schedule.start} → {data.schedule.end}</td></tr>
                <tr><td style={{ color: 'var(--fg-subtle)' }}>Capture</td><td><Badge tone="warn">{data.capture}</Badge></td></tr>
                <tr><td style={{ color: 'var(--fg-subtle)' }}>Approver</td><td>S. Nazari (Security Lead)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Email preview</div></div>
          <div className="card-body" style={{ padding: 12 }}>
            <div className="mail-preview" style={{ fontSize: 12 }}>
              <div className="mail-head">
                <div className="mail-head-row"><span className="k">From</span><span className="mono">{data.fromName}</span></div>
                <div className="mail-head-row"><span className="k">Subject</span><strong>{data.subject}</strong></div>
              </div>
              <div className="mail-body" style={{ fontSize: 12 }}>
                <p>Hi {`{{FirstName}}`},</p>
                <p>A wire of $48,219.40 to Veridian Logistics has been queued and is awaiting your approval before our 4PM cutoff.</p>
                <p style={{ color: 'var(--accent)', textDecoration: 'underline' }}>[ Approve transfer → ]</p>
                <p style={{ color: 'var(--fg-subtle)' }}>AP Team</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WizardScreen });
