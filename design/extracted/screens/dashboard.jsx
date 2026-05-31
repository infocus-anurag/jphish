// screens/dashboard.jsx — two dashboard variations: Operational vs. Risk-first

function DashboardScreen({ setRoute, variant, setVariant, persona }) {
  return (
    <>
      <PageHeader
        title="Dashboard"
        sub="Live view of phishing simulations across Northbeam Labs."
        actions={
          <>
            <div className="segment" style={{ marginRight: 8 }}>
              {['24h', '7d', '14d', '30d'].map(r => (
                <button key={r} className={r === '14d' ? 'on' : ''}>{r}</button>
              ))}
            </div>
            <button className="btn ghost"><I.refresh size={13} /> Refresh</button>
            <button className="btn"><I.download size={13} /> Export</button>
          </>
        }
        tabs={[
          { id: 'operational', label: 'Operational' },
          { id: 'risk', label: 'Risk-first' },
        ]}
        activeTab={variant}
        onTab={setVariant}
      />
      {variant === 'operational' ? <DashOperational setRoute={setRoute} /> : <DashRisk setRoute={setRoute} />}
    </>
  );
}

// ─── Variant A: Operational command center ───
function DashOperational({ setRoute }) {
  const totals = SEED_TIMESERIES.reduce((a, d) => ({
    sent: a.sent + d.sent, open: a.open + d.open, click: a.click + d.click, sub: a.sub + d.sub, rep: a.rep + d.rep,
  }), { sent: 0, open: 0, click: 0, sub: 0, rep: 0 });
  const stats = [
    { label: 'Emails sent', value: totals.sent.toLocaleString(), delta: '+12.4%', spark: SEED_TIMESERIES.map(d => d.sent), color: 'var(--fg-muted)' },
    { label: 'Open rate', value: `${((totals.open / totals.sent) * 100).toFixed(1)}`, unit: '%', delta: '+2.1pp', spark: SEED_TIMESERIES.map(d => d.open / d.sent), color: 'var(--info)' },
    { label: 'Click rate', value: `${((totals.click / totals.sent) * 100).toFixed(1)}`, unit: '%', delta: '−1.8pp', deltaDown: true, spark: SEED_TIMESERIES.map(d => d.click / d.sent), color: 'var(--warn)' },
    { label: 'Submission rate', value: `${((totals.sub / totals.sent) * 100).toFixed(2)}`, unit: '%', delta: '−0.4pp', deltaDown: true, spark: SEED_TIMESERIES.map(d => d.sub / d.sent), color: 'var(--danger)' },
    { label: 'Report rate', value: `${((totals.rep / totals.sent) * 100).toFixed(1)}`, unit: '%', delta: '+4.2pp', spark: SEED_TIMESERIES.map(d => d.rep / d.sent), color: 'var(--ok)' },
  ];

  return (
    <div className="page" style={{ display: 'grid', gap: 14 }}>
      {/* KPIs */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {stats.map((s, i) => (
          <div key={i} className="stat">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">
              {s.value}{s.unit && <span className="unit">{s.unit}</span>}
              <span className={`delta ${s.deltaDown ? 'down' : ''}`}>{s.delta}</span>
            </div>
            <div className="stat-spark"><Sparkline data={s.spark} color={s.color} height={26} /></div>
          </div>
        ))}
      </div>

      {/* Funnel chart + active campaigns */}
      <div className="page-grid grid-2-3">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Campaign funnel</div>
            <div className="card-sub">Last 14 days · all running campaigns</div>
            <div className="card-actions">
              <span className="live-pulse">LIVE</span>
              <button className="btn ghost sm"><I.more size={13} /></button>
            </div>
          </div>
          <div className="card-body">
            <FunnelChart data={SEED_TIMESERIES} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Active campaigns</div>
            <div className="card-actions"><button className="btn ghost sm" onClick={() => setRoute('campaigns')}>All <I.chevR size={11} /></button></div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {SEED_CAMPAIGNS.filter(c => c.status === 'running' || c.status === 'awaiting-approval').slice(0, 4).map(c => (
              <div key={c.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <StatusBadge status={c.status} />
                  {c.adaptive && <Badge tone="accent"><I.sparkles size={9} /> Adaptive</Badge>}
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.name}</span>
                </div>
                {c.sent > 0 ? (
                  <>
                    <div className="bar split" style={{ marginBottom: 5 }}>
                      <span style={{ flex: c.reported, background: 'var(--ok)' }} />
                      <span style={{ flex: c.opened - c.clicked, background: 'var(--info)' }} />
                      <span style={{ flex: c.clicked - c.submitted, background: 'var(--warn)' }} />
                      <span style={{ flex: c.submitted, background: 'var(--danger)' }} />
                      <span style={{ flex: Math.max(0, c.sent - c.opened - c.reported), background: 'var(--bg-sunken)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                      <span>{c.sent} sent</span>
                      <span style={{ color: 'var(--ok-fg)' }}>{c.reported} reported</span>
                      <span style={{ color: 'var(--warn-fg)' }}>{c.clicked} clicked</span>
                      <span style={{ color: 'var(--danger-fg)' }}>{c.submitted} submitted</span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>Awaiting approval · starts {c.start}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live event stream + dept breakdown */}
      <div className="page-grid grid-2-3">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Department breakdown</div>
            <div className="card-sub">Outcome split per group</div>
            <div className="card-actions"><button className="btn ghost sm"><I.sort size={13} /></button></div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th className="right">Users</th>
                  <th>Outcome split</th>
                  <th className="right">Submit %</th>
                  <th className="right">Report %</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {SEED_DEPTS.map(d => (
                  <tr key={d.name}>
                    <td><strong style={{ fontWeight: 500 }}>{d.name}</strong></td>
                    <td className="num right">{d.users}</td>
                    <td style={{ minWidth: 180 }}><DeptBar row={d} /></td>
                    <td className="num right">{((d.submit / d.sent) * 100).toFixed(1)}%</td>
                    <td className="num right" style={{ color: 'var(--ok-fg)' }}>{((d.report / d.sent) * 100).toFixed(1)}%</td>
                    <td><RiskMeter score={d.risk} showLabel={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Live event stream</div>
            <div className="card-actions"><span className="live-pulse">LIVE</span></div>
          </div>
          <div className="card-body" style={{ padding: 0, maxHeight: 380, overflow: 'auto' }}>
            {SEED_ACTIVITY.map((e, i) => (
              <div key={i} className="activity-row">
                <div className="activity-icon" style={{
                  background: e.action === 'submitted' ? 'var(--danger-soft)' :
                              e.action === 'clicked' ? 'var(--warn-soft)' :
                              e.action === 'reported' ? 'var(--ok-soft)' : 'var(--info-soft)',
                  color: e.action === 'submitted' ? 'var(--danger-fg)' :
                         e.action === 'clicked' ? 'var(--warn-fg)' :
                         e.action === 'reported' ? 'var(--ok-fg)' : 'var(--info-fg)',
                }}>
                  {e.action === 'submitted' && <I.flag size={11} />}
                  {e.action === 'clicked' && <I.click size={11} />}
                  {e.action === 'opened' && <I.eye size={11} />}
                  {e.action === 'reported' && <I.shieldCheck size={11} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                    <span className="mono" style={{ color: 'var(--fg)' }}>{e.user}</span>
                    {' '}<span style={{ color: 'var(--fg-muted)' }}>{e.action}</span>
                    {' on '}<span style={{ color: 'var(--fg)' }}>{e.target}</span>
                  </div>
                </div>
                <div className="activity-time">{e.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap + alerts */}
      <div className="page-grid grid-2-3">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Click activity heatmap</div>
            <div className="card-sub">14 days × 24 hours · UTC</div>
            <div className="card-actions"><button className="btn ghost sm"><I.calendar size={13} /></button></div>
          </div>
          <div className="card-body">
            <Heatmap data={SEED_HEAT} />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Alerts</div>
            <div className="card-actions"><button className="btn ghost sm" onClick={() => setRoute('alerts')}>All <I.chevR size={11} /></button></div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {SEED_ALERTS.map(a => (
              <div key={a.id} className="activity-row">
                <div className="activity-icon" style={{
                  background: a.sev === 'critical' ? 'var(--danger-soft)' : a.sev === 'high' ? 'var(--warn-soft)' : a.sev === 'warn' ? 'var(--warn-soft)' : 'var(--info-soft)',
                  color: a.sev === 'critical' ? 'var(--danger-fg)' : a.sev === 'high' ? 'var(--warn-fg)' : a.sev === 'warn' ? 'var(--warn-fg)' : 'var(--info-fg)',
                }}>
                  {a.sev === 'critical' ? <I.flame size={11} /> : <I.alerts size={11} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>{a.body}</div>
                </div>
                <div className="activity-time">{a.ago}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Variant B: Risk-first analyst view ───
function DashRisk({ setRoute }) {
  const ranked = [...SEED_USERS].sort((a, b) => b.risk - a.risk);
  return (
    <div className="page" style={{ display: 'grid', gap: 14 }}>
      {/* Hero risk row */}
      <div className="page-grid grid-3" style={{ gap: 14 }}>
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="card-head">
            <div className="card-title">Org risk score</div>
            <div className="card-sub">Composite · weighted</div>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Donut value={42} total={100} size={86} stroke={9} color="var(--warn)" />
            <div>
              <div style={{ fontSize: 28, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>42<span style={{ fontSize: 14, color: 'var(--fg-subtle)' }}>/100</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Badge tone="warn" dot>Watchful</Badge>
                <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>↓ 3.2 vs last week</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Risk distribution</div>
            <div className="card-sub">218 users · score 0–100</div>
          </div>
          <div className="card-body">
            <RiskHistogram data={SEED_RISK_DIST} height={86} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Awareness signal</div>
            <div className="card-sub">Reports vs. submissions</div>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Report:Submit ratio</div>
              <div style={{ fontSize: 24, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                4.7<span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>:1</span>
                <span className="delta" style={{ marginLeft: 8, fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 5px', borderRadius: 4, background: 'var(--ok-soft)', color: 'var(--ok-fg)' }}>+0.6</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 4 }}>Industry median: 1.8:1</div>
            </div>
            <Sparkline data={[2.1, 2.4, 2.8, 3.1, 3.4, 3.8, 4.1, 4.0, 4.3, 4.7]} color="var(--ok)" height={48} />
          </div>
        </div>
      </div>

      {/* High risk users + adaptive */}
      <div className="page-grid grid-2-3">
        <div className="card">
          <div className="card-head">
            <div className="card-title">High-risk users</div>
            <div className="card-sub">Ranked by composite risk score</div>
            <div className="card-actions">
              <Badge tone="accent"><I.sparkles size={10} /> Adaptive enrolled</Badge>
              <button className="btn ghost sm" onClick={() => setRoute('users')}>All <I.chevR size={11} /></button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Department</th>
                  <th>Last action</th>
                  <th>Trained</th>
                  <th>Risk score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 8).map(u => (
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
                    <td>{u.dept} · {u.role}</td>
                    <td><ActionBadge action={u.last} /></td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <div className="bar" style={{ width: 50 }}><span style={{ width: `${(u.trained / 7) * 100}%`, background: u.trained >= 5 ? 'var(--ok)' : u.trained >= 3 ? 'var(--warn)' : 'var(--danger)' }} /></div>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{u.trained}/7</span>
                      </div>
                    </td>
                    <td><RiskMeter score={u.risk} /></td>
                    <td><button className="btn ghost sm"><I.more size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(155deg, var(--accent-soft), var(--bg-elev) 60%)' }}>
          <div className="card-head" style={{ borderBottom: '1px solid var(--accent-line)' }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, display: 'grid', placeItems: 'center', background: 'var(--accent)', color: 'white' }}>
              <I.sparkles size={12} />
            </div>
            <div className="card-title">Adaptive engine</div>
            <div className="card-actions"><Badge tone="ok" dot>Active</Badge></div>
          </div>
          <div className="card-body">
            <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginBottom: 12 }}>
              Auto-targets users with risk ≥ 70, escalates difficulty, and assigns training on submission. <a href="#" onClick={(e) => { e.preventDefault(); setRoute('adaptive'); }} style={{ color: 'var(--accent-soft-fg)' }}>Configure →</a>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--fg-muted)' }}>In adaptive cohort</span>
                  <span className="mono">18 / 218</span>
                </div>
                <div className="bar"><span style={{ width: '8%', background: 'var(--accent)' }} /></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--fg-muted)' }}>Risk reduction (30d)</span>
                  <span className="mono" style={{ color: 'var(--ok-fg)' }}>−21.4%</span>
                </div>
                <div className="bar"><span style={{ width: '64%', background: 'var(--ok)' }} /></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--fg-muted)' }}>Training completion</span>
                  <span className="mono">73%</span>
                </div>
                <div className="bar"><span style={{ width: '73%' }} /></div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-elev)', borderRadius: 7, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Next adaptive run</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>in 2h 14m · 6 users queued</div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk by dept + top pretexts */}
      <div className="page-grid grid-2">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Risk by department</div>
            <div className="card-sub">Composite + trend</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 10 }}>
              {[...SEED_DEPTS].sort((a, b) => b.risk - a.risk).map(d => (
                <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 36px', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{d.name}</div>
                  <div style={{ position: 'relative', height: 18, background: 'var(--bg-sunken)', borderRadius: 4 }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${d.risk}%`,
                      background: d.risk >= 60 ? 'var(--danger)' : d.risk >= 30 ? 'var(--warn)' : 'var(--ok)',
                      borderRadius: 4,
                      display: 'flex', alignItems: 'center', paddingLeft: 8, color: 'white', fontSize: 10, fontFamily: 'var(--font-mono)',
                    }}>{d.risk}</div>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--fg-subtle)', textAlign: 'right' }}>{d.users}u</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Top-performing pretexts</div>
            <div className="card-sub">By click-through rate</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Template</th><th>Category</th><th className="right">CTR</th><th className="right">Sent</th></tr>
              </thead>
              <tbody>
                {[...SEED_TEMPLATES].sort((a, b) => b.ctr - a.ctr).slice(0, 6).map(t => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td><Badge>{t.category}</Badge></td>
                    <td className="num right" style={{ color: t.ctr >= 50 ? 'var(--danger-fg)' : t.ctr >= 30 ? 'var(--warn-fg)' : 'var(--fg-muted)' }}>{t.ctr}%</td>
                    <td className="num right">{t.usage * 32}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen });
