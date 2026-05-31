// screens/campaigns.jsx — campaigns list + detail drawer

function CampaignsScreen({ setRoute, openWizard }) {
  const [filter, setFilter] = React.useState('all');
  const [openCamp, setOpenCamp] = React.useState(null);

  const filtered = SEED_CAMPAIGNS.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'active') return c.status === 'running' || c.status === 'scheduled';
    if (filter === 'review') return c.status === 'awaiting-approval' || c.status === 'draft';
    if (filter === 'completed') return c.status === 'completed';
    return true;
  });

  return (
    <>
      <PageHeader
        title="Campaigns"
        sub="Plan, approve, and monitor phishing simulations."
        actions={
          <>
            <button className="btn"><I.download size={13} /> Export</button>
            <button className="btn primary" onClick={openWizard}><I.plus size={13} /> New campaign</button>
          </>
        }
        tabs={[
          { id: 'all', label: 'All', count: SEED_CAMPAIGNS.length },
          { id: 'active', label: 'Active', count: SEED_CAMPAIGNS.filter(c => c.status === 'running' || c.status === 'scheduled').length },
          { id: 'review', label: 'In review', count: SEED_CAMPAIGNS.filter(c => c.status === 'awaiting-approval' || c.status === 'draft').length },
          { id: 'completed', label: 'Completed', count: SEED_CAMPAIGNS.filter(c => c.status === 'completed').length },
        ]}
        activeTab={filter}
        onTab={setFilter}
      />
      <div className="filters">
        <button className="filter-chip active"><I.filter size={11} /> Status: any</button>
        <button className="filter-chip">Owner: any</button>
        <button className="filter-chip">Group: any</button>
        <button className="filter-chip">Adaptive: any</button>
        <button className="filter-chip"><I.plus size={11} /> Add filter</button>
        <span className="spacer" />
        <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{filtered.length} campaigns</span>
      </div>
      <div style={{ background: 'var(--bg-elev)' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 30 }}><input type="checkbox" /></th>
              <th>Campaign</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Target group</th>
              <th className="right">Sent</th>
              <th>Outcome</th>
              <th className="right">Click %</th>
              <th className="right">Submit %</th>
              <th className="right">Report %</th>
              <th>Start</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => setOpenCamp(c)}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    {c.adaptive && <Badge tone="accent"><I.sparkles size={9} /> Adaptive</Badge>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{c.template}</div>
                </td>
                <td><StatusBadge status={c.status} /></td>
                <td>{c.owner === 'You' ? <Badge tone="info">You</Badge> : c.owner === 'Auto' ? <Badge tone="accent">Auto</Badge> : c.owner}</td>
                <td><span style={{ fontSize: 12 }}>{c.group}</span></td>
                <td className="num right">{c.sent.toLocaleString()}</td>
                <td style={{ minWidth: 120 }}>
                  {c.sent > 0 ? (
                    <div className="bar split">
                      <span style={{ flex: c.reported, background: 'var(--ok)' }} />
                      <span style={{ flex: c.opened - c.clicked, background: 'var(--info)' }} />
                      <span style={{ flex: c.clicked - c.submitted, background: 'var(--warn)' }} />
                      <span style={{ flex: c.submitted, background: 'var(--danger)' }} />
                      <span style={{ flex: Math.max(0, c.sent - c.opened - c.reported), background: 'var(--bg-sunken)' }} />
                    </div>
                  ) : <span style={{ color: 'var(--fg-faint)' }}>—</span>}
                </td>
                <td className="num right">{c.sent > 0 ? `${((c.clicked / c.sent) * 100).toFixed(1)}%` : '—'}</td>
                <td className="num right" style={{ color: c.submitted / c.sent > 0.1 ? 'var(--danger-fg)' : '' }}>{c.sent > 0 ? `${((c.submitted / c.sent) * 100).toFixed(1)}%` : '—'}</td>
                <td className="num right" style={{ color: 'var(--ok-fg)' }}>{c.sent > 0 ? `${((c.reported / c.sent) * 100).toFixed(1)}%` : '—'}</td>
                <td><span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.start}</span></td>
                <td onClick={(e) => e.stopPropagation()}><button className="btn ghost sm"><I.more size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openCamp && <CampaignDetailDrawer camp={openCamp} onClose={() => setOpenCamp(null)} />}
    </>
  );
}

function CampaignDetailDrawer({ camp, onClose }) {
  const steps = camp.sent > 0 ? [
    { label: 'Sent', value: camp.sent, color: 'var(--fg-muted)' },
    { label: 'Opened', value: camp.opened, color: 'var(--info)' },
    { label: 'Clicked', value: camp.clicked, color: 'var(--warn)' },
    { label: 'Submitted', value: camp.submitted, color: 'var(--danger)' },
    { label: 'Reported', value: camp.reported, color: 'var(--ok)' },
  ] : null;
  return (
    <Drawer onClose={onClose} width={600}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusBadge status={camp.status} />
        {camp.adaptive && <Badge tone="accent"><I.sparkles size={9} /> Adaptive</Badge>}
        <span className="spacer" />
        <button className="topbar-action" onClick={onClose}><I.x size={14} /></button>
      </div>
      <div style={{ padding: '14px 22px 18px' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{camp.name}</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--fg-muted)' }}>
          <span><I.calendar size={11} style={{ verticalAlign: -1 }} /> Started {camp.start}</span>
          <span><I.user size={11} style={{ verticalAlign: -1 }} /> {camp.owner}</span>
          <span><I.users size={11} style={{ verticalAlign: -1 }} /> {camp.group}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {camp.status === 'running' ? (
            <button className="btn"><I.pause size={12} /> Pause</button>
          ) : camp.status === 'awaiting-approval' ? (
            <button className="btn accent"><I.check size={12} /> Approve & launch</button>
          ) : camp.status === 'draft' ? (
            <button className="btn primary"><I.send size={12} /> Send for approval</button>
          ) : null}
          <button className="btn"><I.copy size={12} /> Duplicate</button>
          <button className="btn ghost"><I.edit size={12} /> Edit</button>
          <button className="btn ghost"><I.download size={12} /></button>
          <span className="spacer" />
          <button className="btn ghost danger"><I.trash size={12} /></button>
        </div>
      </div>

      {steps && (
        <div style={{ padding: '0 22px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--fg-subtle)', margin: '6px 0 12px' }}>Conversion funnel</div>
          <FunnelBars steps={steps} />
        </div>
      )}

      <div style={{ padding: '0 22px 22px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--fg-subtle)', margin: '6px 0 12px' }}>Configuration</div>
        <div className="card" style={{ background: 'var(--bg-sunken)', border: 'none' }}>
          <table className="table" style={{ background: 'transparent' }}>
            <tbody>
              <tr><td style={{ color: 'var(--fg-subtle)', width: '40%' }}>Email template</td><td>{camp.template}</td></tr>
              <tr><td style={{ color: 'var(--fg-subtle)' }}>Sending profile</td><td className="mono">postmark-prod-2 · TLS 1.3</td></tr>
              <tr><td style={{ color: 'var(--fg-subtle)' }}>Landing page</td><td>workday-reset-v3 (cloned)</td></tr>
              <tr><td style={{ color: 'var(--fg-subtle)' }}>Schedule</td><td>{camp.start} → +5 days · staggered (12/min)</td></tr>
              <tr><td style={{ color: 'var(--fg-subtle)' }}>Capture form</td><td><Badge tone="warn">credentials only · hashed</Badge></td></tr>
              <tr><td style={{ color: 'var(--fg-subtle)' }}>Post-submit</td><td>Auto-redirect to training: <em>Spotting Wire Fraud</em></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: '0 22px 28px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--fg-subtle)', margin: '6px 0 12px' }}>Recent activity</div>
        <div className="card" style={{ padding: 0 }}>
          {SEED_ACTIVITY.slice(0, 6).map((e, i) => (
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
                <div style={{ fontSize: 12 }}>
                  <span className="mono">{e.user}</span> <span className="muted">{e.action}</span>
                </div>
              </div>
              <div className="activity-time">{e.t}</div>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

Object.assign(window, { CampaignsScreen });
