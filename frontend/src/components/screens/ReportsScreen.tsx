'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Primitives';
import { FunnelBars } from '@/components/ui/Charts';
import { getCampaignReport, getDashboardReport } from '@/lib/api/reports';
import { listCampaigns } from '@/lib/api/campaigns';

export function ReportsScreen(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dashboard = useQuery({ queryKey: ['reports', 'dashboard'], queryFn: getDashboardReport });
  const campaigns = useQuery({
    queryKey: ['campaigns', 'for-reports'],
    queryFn: () => listCampaigns({ take: 200 }),
  });
  const campaignReport = useQuery({
    queryKey: ['reports', 'campaign', selectedId],
    queryFn: () => (selectedId ? getCampaignReport(selectedId) : Promise.resolve(null)),
    enabled: !!selectedId,
  });

  return (
    <>
      <PageHeader
        title="Reports"
        sub="Platform-wide phishing simulation outcomes."
      />

      <div className="page" style={{ display: 'grid', gap: 16, padding: 22 }}>
        <section>
          <SectionHeading>Platform totals</SectionHeading>
          {dashboard.isLoading && <div style={{ color: 'var(--fg-subtle)' }}>Loading…</div>}
          {dashboard.error && <Badge tone="danger">Failed to load dashboard</Badge>}
          {dashboard.data && (
            <div
              className="stat-grid"
              style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}
            >
              <Stat label="Sent" value={dashboard.data.emails.sent} />
              <Stat
                label="Opened"
                value={dashboard.data.emails.opened}
                pct={dashboard.data.rates.openRate}
              />
              <Stat
                label="Clicked"
                value={dashboard.data.emails.clicked}
                pct={dashboard.data.rates.clickRate}
                color="var(--warn-fg)"
              />
              <Stat
                label="Submitted"
                value={dashboard.data.emails.submitted}
                pct={dashboard.data.rates.submitRate}
                color="var(--danger-fg)"
              />
              <Stat
                label="Reported"
                value={dashboard.data.emails.reported}
                pct={dashboard.data.rates.reportRate}
                color="var(--ok-fg)"
              />
            </div>
          )}
        </section>

        <section>
          <SectionHeading>Per-campaign report</SectionHeading>
          <select
            className="input"
            style={{ maxWidth: 420 }}
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
          >
            <option value="">— select a campaign —</option>
            {campaigns.data?.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.status}
              </option>
            ))}
          </select>

          {selectedId && campaignReport.isLoading && (
            <div style={{ marginTop: 10, color: 'var(--fg-subtle)' }}>Loading…</div>
          )}
          {selectedId && campaignReport.data && (
            <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
              <FunnelBars
                steps={[
                  { label: 'Sent', value: campaignReport.data.totals.sent, color: 'var(--fg-muted)' },
                  { label: 'Opened', value: campaignReport.data.totals.opened, color: 'var(--info)' },
                  { label: 'Clicked', value: campaignReport.data.totals.clicked, color: 'var(--warn)' },
                  { label: 'Submitted', value: campaignReport.data.totals.submitted, color: 'var(--danger)' },
                  { label: 'Reported', value: campaignReport.data.totals.reported, color: 'var(--ok)' },
                ]}
              />
              <div>
                <SectionHeading>Recent events</SectionHeading>
                <div className="card" style={{ padding: 0, maxHeight: 320, overflow: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Event</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignReport.data.timeline.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ color: 'var(--fg-subtle)' }}>
                            No events yet.
                          </td>
                        </tr>
                      )}
                      {campaignReport.data.timeline.map((e, i) => (
                        <tr key={i}>
                          <td className="mono" style={{ fontSize: 11 }}>
                            {new Date(e.ts).toLocaleString()}
                          </td>
                          <td>
                            <Badge tone={eventTone(e.type)}>{e.type}</Badge>
                          </td>
                          <td className="mono" style={{ fontSize: 11.5 }}>
                            {e.email}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <SectionHeading>
                  Captured submissions ({campaignReport.data.submissions.length})
                </SectionHeading>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--warn-fg)',
                    marginBottom: 8,
                  }}
                >
                  Sensitive — data targets typed into the phishing form, including passwords.
                </div>
                <div className="card" style={{ padding: 0, maxHeight: 360, overflow: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Target</th>
                        <th>Submitted data</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignReport.data.submissions.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ color: 'var(--fg-subtle)' }}>
                            No submissions captured yet.
                          </td>
                        </tr>
                      )}
                      {campaignReport.data.submissions.map((s, i) => (
                        <tr key={i}>
                          <td className="mono" style={{ fontSize: 11 }}>
                            {new Date(s.ts).toLocaleString()}
                          </td>
                          <td className="mono" style={{ fontSize: 11.5 }}>
                            {s.email}
                          </td>
                          <td>
                            <CapturedData data={s.data} />
                          </td>
                          <td className="mono" style={{ fontSize: 11 }}>
                            {s.ip ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct?: number;
  color?: string;
}): JSX.Element {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>
        {value.toLocaleString()}
      </div>
      {pct != null && (
        <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 4 }}>
          {pct.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function eventTone(t: string) {
  switch (t) {
    case 'open':
    case 'landing_view':
      return 'info' as const;
    case 'click':
      return 'warn' as const;
    case 'form_submission':
      return 'danger' as const;
    case 'reported':
      return 'ok' as const;
    default:
      return 'default' as const;
  }
}

function CapturedData({ data }: { data: Record<string, unknown> }): JSX.Element {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <span style={{ color: 'var(--fg-subtle)' }}>—</span>;
  }
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      {entries.map(([key, value]) => (
        <div key={key} className="mono" style={{ fontSize: 11.5 }}>
          <span style={{ color: 'var(--fg-subtle)' }}>{key}: </span>
          <span>{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
        margin: '6px 0 10px',
      }}
    >
      {children}
    </div>
  );
}
