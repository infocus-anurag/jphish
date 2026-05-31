// screens/users.jsx — Users & groups + risk timeline drawer

function UsersScreen() {
  const [tab, setTab] = React.useState('users');
  const [open, setOpen] = React.useState(null);
  const [showImport, setShowImport] = React.useState(false);
  const [sortBy, setSortBy] = React.useState('risk');

  const users = [...SEED_USERS].sort((a, b) =>
    sortBy === 'risk' ? b.risk - a.risk :
    sortBy === 'name' ? a.name.localeCompare(b.name) :
    sortBy === 'dept' ? a.dept.localeCompare(b.dept) : 0
  );

  return (
    <>
      <PageHeader
        title="Users & groups"
        sub="218 users · 8 groups · 3 adaptive cohorts"
        actions={
          <>
            <button className="btn" onClick={() => setShowImport(true)}><I.upload size={13} /> Import CSV</button>
            <button className="btn primary"><I.plus size={13} /> New group</button>
          </>
        }
        tabs={[
          { id: 'users', label: 'Users', count: 218 },
          { id: 'groups', label: 'Groups', count: 8 },
          { id: 'cohorts', label: 'Adaptive cohorts', count: 3 },
        ]}
        activeTab={tab}
        onTab={setTab}
      />
      {tab === 'users' && (
        <>
          <div className="filters">
            <button className="filter-chip active">Risk: any</button>
            <button className="filter-chip">Department: any</button>
            <button className="filter-chip">Last action: any</button>
            <button className="filter-chip"><I.plus size={11} /> Add filter</button>
            <span className="spacer" />
            <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{users.length} of 218</span>
          </div>
          <div style={{ background: 'var(--bg-elev)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}><input type="checkbox" /></th>
                  <th onClick={() => setSortBy('name')} style={{ cursor: 'pointer' }}>User</th>
                  <th onClick={() => setSortBy('dept')} style={{ cursor: 'pointer' }}>Department</th>
                  <th>Role</th>
                  <th>Last action</th>
                  <th>Trained</th>
                  <th onClick={() => setSortBy('risk')} style={{ cursor: 'pointer' }}>Risk score</th>
                  <th>Cohort</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} onClick={() => setOpen(u)}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={u.name} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.dept}</td>
                    <td>{u.role}</td>
                    <td><ActionBadge action={u.last} /></td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <div className="bar" style={{ width: 50 }}><span style={{ width: `${(u.trained / 7) * 100}%`, background: u.trained >= 5 ? 'var(--ok)' : u.trained >= 3 ? 'var(--warn)' : 'var(--danger)' }} /></div>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{u.trained}/7</span>
                      </div>
                    </td>
                    <td><RiskMeter score={u.risk} /></td>
                    <td>{u.risk >= 70 ? <Badge tone="accent"><I.sparkles size={9} /> Adaptive</Badge> : <span style={{ color: 'var(--fg-faint)' }}>—</span>}</td>
                    <td onClick={(e) => e.stopPropagation()}><button className="btn ghost sm"><I.more size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === 'groups' && <GroupsList />}
      {tab === 'cohorts' && <CohortsList />}
      {open && <UserDetailDrawer user={open} onClose={() => setOpen(null)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </>
  );
}

function GroupsList() {
  const groups = [
    { name: 'All Employees', users: 218, kind: 'static', risk: 42 },
    { name: 'Finance Dept', users: 14, kind: 'auto · dept=Finance', risk: 76 },
    { name: 'Engineering', users: 64, kind: 'auto · dept=Engineering', risk: 22 },
    { name: 'Sales Team', users: 38, kind: 'auto · dept=Sales', risk: 58 },
    { name: 'New Hires Q2', users: 12, kind: 'auto · joined>=2026-04-01', risk: 47 },
    { name: 'EAs + Mgmt', users: 16, kind: 'static', risk: 38 },
    { name: 'AP Team', users: 6, kind: 'static', risk: 81 },
    { name: 'Helpdesk', users: 4, kind: 'auto · role contains "Helpdesk"', risk: 31 },
  ];
  return (
    <div style={{ background: 'var(--bg-elev)' }}>
      <table className="table">
        <thead><tr><th>Group</th><th>Membership</th><th className="right">Users</th><th>Avg risk</th><th></th></tr></thead>
        <tbody>
          {groups.map(g => (
            <tr key={g.name}>
              <td style={{ fontWeight: 500 }}>{g.name}</td>
              <td className="mono" style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{g.kind}</td>
              <td className="num right">{g.users}</td>
              <td><RiskMeter score={g.risk} showLabel={false} /></td>
              <td><button className="btn ghost sm"><I.more size={13} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CohortsList() {
  const cohorts = [
    { name: 'Risk ≥ 70', users: 18, criteria: 'composite risk score ≥ 70', refresh: 'daily', enrolled: '14 active campaigns' },
    { name: 'Repeat submitters', users: 6, criteria: 'submitted ≥ 2 in 30d', refresh: 'hourly', enrolled: '2 active campaigns' },
    { name: 'New hires (<60d)', users: 12, criteria: 'joined within 60 days', refresh: 'daily', enrolled: '1 active campaign' },
  ];
  return (
    <div className="page" style={{ display: 'grid', gap: 12 }}>
      {cohorts.map(c => (
        <div key={c.name} className="card">
          <div className="card-head">
            <Badge tone="accent"><I.sparkles size={9} /> Adaptive</Badge>
            <div className="card-title">{c.name}</div>
            <span className="card-sub">{c.users} users · {c.refresh} refresh</span>
            <div className="card-actions"><button className="btn ghost sm"><I.edit size={12} /> Edit</button></div>
          </div>
          <div className="card-body" style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Criteria</div>
              <div className="mono" style={{ fontSize: 12, marginTop: 2 }}>{c.criteria}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Enrollment</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>{c.enrolled}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UserDetailDrawer({ user, onClose }) {
  const events = [
    { d: 'Apr 30 · 12:42', action: 'submitted', target: 'AP Wire Transfer', delta: '+22' },
    { d: 'Apr 30 · 12:38', action: 'clicked', target: 'AP Wire Transfer', delta: '+8' },
    { d: 'Apr 28 · 09:12', action: 'opened', target: 'Workday Password Reset', delta: '+1' },
    { d: 'Apr 21 · 14:08', action: 'clicked', target: 'CEO Gift Card Pretext', delta: '+8' },
    { d: 'Apr 15 · 11:42', action: 'reported', target: 'Vendor Invoice', delta: '−4' },
    { d: 'Apr 12 · 10:14', action: 'submitted', target: 'DocuSign — Contract', delta: '+18' },
    { d: 'Apr 02 · 09:00', action: 'opened', target: 'Onboarding Baseline', delta: '+1' },
  ];
  return (
    <Drawer onClose={onClose} width={620}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Avatar name={user.name} size="lg" />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{user.name}</h2>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
            <span className="mono">{user.email}</span>
            <span>·</span>
            <span>{user.dept} · {user.role}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button className="btn"><I.send size={12} /> Assign training</button>
            <button className="btn"><I.flag size={12} /> Add to cohort</button>
            <button className="btn ghost"><I.mail size={12} /> Email</button>
          </div>
        </div>
        <button className="topbar-action" onClick={onClose}><I.x size={14} /></button>
      </div>

      <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card" style={{ background: 'var(--bg-sunken)', border: 'none' }}>
          <div className="card-body">
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Risk score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <div style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{user.risk}</div>
              <Badge tone={user.risk >= 70 ? 'danger' : user.risk >= 30 ? 'warn' : 'ok'}>{riskLabel(user.risk)}</Badge>
            </div>
            <div style={{ marginTop: 8 }}>
              <Sparkline data={[18, 22, 38, 42, 58, 67, 72, 84, user.risk]} color={user.risk >= 60 ? 'var(--danger)' : 'var(--warn)'} />
            </div>
          </div>
        </div>
        <div className="card" style={{ background: 'var(--bg-sunken)', border: 'none' }}>
          <div className="card-body">
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Training</div>
            <div style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{user.trained}<span style={{ fontSize: 14, color: 'var(--fg-subtle)' }}>/7</span></div>
            <div style={{ marginTop: 8 }}>
              <div className="bar"><span style={{ width: `${(user.trained / 7) * 100}%`, background: user.trained >= 5 ? 'var(--ok)' : 'var(--warn)' }} /></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 22px 28px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--fg-subtle)', margin: '6px 0 10px' }}>Event timeline</div>
        <div className="card" style={{ padding: 0 }}>
          {events.map((e, i) => (
            <div key={i} className="activity-row">
              <div className="activity-icon" style={{
                background: e.action === 'submitted' ? 'var(--danger-soft)' : e.action === 'clicked' ? 'var(--warn-soft)' : e.action === 'reported' ? 'var(--ok-soft)' : 'var(--info-soft)',
                color: e.action === 'submitted' ? 'var(--danger-fg)' : e.action === 'clicked' ? 'var(--warn-fg)' : e.action === 'reported' ? 'var(--ok-fg)' : 'var(--info-fg)',
              }}>
                {e.action === 'submitted' && <I.flag size={11} />}
                {e.action === 'clicked' && <I.click size={11} />}
                {e.action === 'opened' && <I.eye size={11} />}
                {e.action === 'reported' && <I.shieldCheck size={11} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12 }}><span style={{ fontWeight: 500 }}>{e.action}</span> on {e.target}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{e.d}</div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: e.delta.startsWith('−') ? 'var(--ok-fg)' : 'var(--danger-fg)' }}>{e.delta}</span>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

function ImportModal({ onClose }) {
  const [step, setStep] = React.useState(0);
  return (
    <Modal title="Import users" onClose={onClose} footer={
      <>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={() => step < 2 ? setStep(step + 1) : onClose()}>{step < 2 ? 'Next' : 'Import 142 users'}</button>
      </>
    }>
      {step === 0 && (
        <div style={{ border: '1.5px dashed var(--line-strong)', borderRadius: 10, padding: 36, textAlign: 'center' }}>
          <I.upload size={26} />
          <div style={{ marginTop: 10, fontWeight: 500 }}>Drop CSV file or click to browse</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 4 }}>Up to 50,000 rows · UTF-8 · supports email, name, department, role</div>
        </div>
      )}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 12.5, marginBottom: 10 }}>Map columns</div>
          <table className="table">
            <thead><tr><th>CSV column</th><th>JPhish field</th><th>Sample</th></tr></thead>
            <tbody>
              {[['email_address', 'Email', 'imani@…'], ['full_name', 'Name', 'Imani Okafor'], ['dept', 'Department', 'Engineering'], ['title', 'Role', 'Staff Eng']].map(([a, b, c]) => (
                <tr key={a}><td className="mono">{a}</td><td><Badge tone="info">{b}</Badge></td><td className="mono" style={{ color: 'var(--fg-subtle)' }}>{c}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {step === 2 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            {[['Total rows', '142'], ['New users', '128'], ['Updates', '14']].map(([k, v]) => (
              <div key={k} className="card" style={{ background: 'var(--bg-sunken)', border: 'none' }}>
                <div className="card-body" style={{ padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{k}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ background: 'var(--ok-soft)', border: 'none' }}>
            <div className="card-body" style={{ padding: 12, color: 'var(--ok-fg)', fontSize: 12 }}>
              <I.check size={13} style={{ verticalAlign: -2 }} /> No errors. Ready to import.
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

Object.assign(window, { UsersScreen });
