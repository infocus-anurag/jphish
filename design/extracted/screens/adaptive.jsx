// screens/adaptive.jsx — Adaptive engine flagship screen

function AdaptiveScreen({ setRoute }) {
  const [enabled, setEnabled] = React.useState(true);
  const [threshold, setThreshold] = React.useState(70);
  const [escalate, setEscalate] = React.useState(true);
  const [autoTrain, setAutoTrain] = React.useState(true);

  const cohort = SEED_USERS.filter(u => u.risk >= threshold);

  return (
    <>
      <PageHeader
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* <span style={{ width: 26, height: 26, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'var(--accent)', color: 'white' }}><I.sparkles size={13} /></span> */}
          Adaptive engine
        </span>}
        sub="Continuously target high-risk users, escalate difficulty, and auto-assign remediation."
        actions={
          <>
            <Badge tone={enabled ? 'ok' : 'default'} dot={enabled}>{enabled ? 'Active' : 'Paused'}</Badge>
            <button className="btn ghost"><I.history size={13} /> Run history</button>
            <button className="btn primary"><I.bolt size={13} /> Run now</button>
          </>
        }
      />

      <div className="page" style={{ display: 'grid', gap: 14 }}>
        {/* Hero panel */}
        <div className="card" style={{ background: 'linear-gradient(155deg, var(--accent-soft), var(--bg-elev) 65%)', borderColor: 'var(--accent-line)' }}>
          <div className="card-body" style={{ padding: 22, display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 28, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent-soft-fg)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Last 30 days</div>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 6 }}>−21.4% risk reduction</div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 6, maxWidth: 380 }}>
                Adaptive ran 14 micro-campaigns against 18 high-risk users. 12 users dropped below the threshold; the remaining 6 are in remediation.
              </div>
              <div style={{ marginTop: 10 }}><Sparkline data={[100, 96, 91, 88, 84, 79, 81, 76, 72, 68, 64, 62, 60, 58, 54, 52, 51, 49, 47, 44, 42, 40, 39, 37, 35, 32, 30, 28, 26, 78.6]} color="var(--accent)" height={42} /></div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Currently in cohort</div>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 6 }}>{cohort.length} <span style={{ fontSize: 14, color: 'var(--fg-subtle)' }}>/ 218 users</span></div>
              <div style={{ marginTop: 12 }}>
                <div className="avatar-stack">
                  {cohort.slice(0, 8).map(u => <Avatar key={u.id} name={u.name} />)}
                  {cohort.length > 8 && <div className="avatar" style={{ background: 'var(--bg-sunken)', color: 'var(--fg-muted)' }}>+{cohort.length - 8}</div>}
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Next run</div>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>02:14:38</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 4 }}>6 users queued · 3 templates rotating</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button className="btn"><I.pause size={12} /> Pause</button>
                <button className="btn primary"><I.play size={12} /> Run now</button>
              </div>
            </div>
          </div>
        </div>

        {/* Config + cohort */}
        <div className="page-grid grid-2-3">
          <div className="card">
            <div className="card-head"><div className="card-title">Configuration</div><div className="card-sub">Rules that drive enrollment</div></div>
            <div className="card-body" style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>Adaptive engine</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>Master switch for autonomous targeting</div>
                </div>
                <Switch on={enabled} onChange={setEnabled} />
              </div>
              <div>
                <label className="field-label">Enrollment threshold (risk score)</label>
                <input type="range" min="40" max="95" value={threshold} onChange={(e) => setThreshold(+e.target.value)} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                  <span>40 · broad</span><span style={{ color: 'var(--fg)' }}>≥ {threshold} · {cohort.length} users</span><span>95 · narrow</span>
                </div>
              </div>
              <div>
                <label className="field-label">Templates eligible for rotation</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {SEED_TEMPLATES.slice(0, 6).map(t => (
                    <span key={t.id} className="filter-chip active">{t.name} <I.x size={10} className="x" /></span>
                  ))}
                  <button className="filter-chip"><I.plus size={11} /> Add</button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>Escalate difficulty</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>+1 difficulty per failed simulation, capped at L5</div>
                </div>
                <Switch on={escalate} onChange={setEscalate} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>Auto-assign training</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>On submission, enroll user in matched module</div>
                </div>
                <Switch on={autoTrain} onChange={setAutoTrain} />
              </div>
              <div>
                <label className="field-label">Cooldown between sends</label>
                <Segment value="3d" options={['24h', '3d', '7d', '14d']} onChange={() => {}} />
                <div className="field-help">Prevents fatigue. Adaptive will not contact a user more than once per cooldown window.</div>
              </div>
              <div>
                <label className="field-label">Quiet hours</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input mono" defaultValue="20:00" style={{ width: 80 }} />
                  <span style={{ color: 'var(--fg-subtle)' }}>→</span>
                  <input className="input mono" defaultValue="07:00" style={{ width: 80 }} />
                  <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>local time per recipient</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cohort + outcomes */}
          <div className="col" style={{ gap: 14 }}>
            <div className="card">
              <div className="card-head"><div className="card-title">Cohort outcomes (30d)</div></div>
              <div className="card-body">
                <FunnelBars steps={[
                  { label: 'Enrolled', value: 47, color: 'var(--fg-muted)' },
                  { label: 'Sent', value: 142, color: 'var(--info)' },
                  { label: 'Clicked', value: 28, color: 'var(--warn)' },
                  { label: 'Submitted', value: 9, color: 'var(--danger)' },
                  { label: 'Trained', value: 38, color: 'var(--ok)' },
                  { label: 'Graduated', value: 12, color: 'var(--accent)' },
                ]} />
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div className="card-title">Decisions log</div><div className="card-sub">Recent autonomous actions</div></div>
              <div className="card-body" style={{ padding: 0, maxHeight: 220, overflow: 'auto' }}>
                {[
                  { t: '12:42', who: 'M. Ribeiro', what: 'risk →91 · enrolled in BEC remediation' },
                  { t: '12:30', who: 'T. Kowalski', what: 'submitted AP Wire · escalated to L5 templates' },
                  { t: '11:18', who: 'D. Reddy', what: 'cooldown ended · queued for next run' },
                  { t: '10:04', who: 'J. Lindqvist', what: 'escalated L4 → L5 (3rd submission)' },
                  { t: '09:48', who: 'C. Aubert', what: 'risk 56 → 47 · removed from cohort' },
                  { t: '08:30', who: 'H. Marchetti', what: 'enrolled · risk crossed 70 threshold' },
                ].map((e, i) => (
                  <div key={i} className="activity-row" style={{ padding: '8px 14px' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--fg-subtle)', minWidth: 36 }}>{e.t}</span>
                    <div style={{ flex: 1, fontSize: 12 }}>
                      <strong style={{ fontWeight: 500 }}>{e.who}</strong> <span className="muted">{e.what}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cohort table */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Current cohort</div>
            <div className="card-sub">Users at risk score ≥ {threshold}</div>
            <div className="card-actions"><button className="btn ghost sm"><I.download size={12} /> Export</button></div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead><tr>
                <th>User</th><th>Department</th><th>Risk</th><th>Last sim</th>
                <th>Difficulty</th><th>Next send</th><th>Status</th>
              </tr></thead>
              <tbody>
                {cohort.map(u => (
                  <tr key={u.id}>
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
                    <td><RiskMeter score={u.risk} showLabel={false} /></td>
                    <td><ActionBadge action={u.last} /></td>
                    <td><Badge tone={u.risk >= 80 ? 'danger' : 'warn'}>L{Math.min(5, Math.ceil(u.risk / 20))}</Badge></td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>in {Math.ceil(Math.random() * 5)}d</td>
                    <td>{u.last === 'submitted' ? <Badge tone="danger">In remediation</Badge> : u.trained < 3 ? <Badge tone="warn">Training pending</Badge> : <Badge tone="info">Active</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { AdaptiveScreen });
