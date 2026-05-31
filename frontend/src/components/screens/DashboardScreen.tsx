'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { I } from '@/components/ui/Icons';
import { Badge, StatusBadge } from '@/components/ui/Primitives';
import { FunnelBars, type FunnelStep } from '@/components/ui/Charts';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonRows,
} from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';
import { useUI } from '@/store/ui.store';
import { useCan } from '@/lib/rbac';
import { getDashboardReport } from '@/lib/api/reports';
import { listCampaigns, type CampaignView } from '@/lib/api/campaigns';

const ACTIVE_STATUSES = new Set(['running', 'scheduled', 'paused']);

export function DashboardScreen(): JSX.Element {
  const router = useRouter();
  const openWizard = useUI((s) => s.openWizard);
  const canCreate = useCan('campaign.create');

  const dashboard = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: getDashboardReport,
  });
  const campaigns = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => listCampaigns({ take: 200 }),
  });

  const refetch = (): void => {
    void dashboard.refetch();
    void campaigns.refetch();
  };

  const campList: CampaignView[] = useMemo(
    () => campaigns.data?.campaigns ?? [],
    [campaigns.data],
  );
  const active = useMemo(
    () => campList.filter((c) => ACTIVE_STATUSES.has(c.status)),
    [campList],
  );
  const topByClicks = useMemo(
    () =>
      [...campList]
        .filter((c) => c.statistics.emailsSent > 0)
        .sort((a, b) => b.statistics.clickRate - a.statistics.clickRate)
        .slice(0, 6),
    [campList],
  );

  const refreshing = dashboard.isFetching || campaigns.isFetching;

  const d = dashboard.data;
  const e = d?.emails;
  const r = d?.rates;
  const loading = dashboard.isLoading;
  const hasEmailActivity = !!e && e.sent > 0;

  const stats = [
    { label: 'Emails sent', value: e ? e.sent.toLocaleString() : '—', sub: d ? `${d.campaigns.total} campaigns` : '' },
    { label: 'Open rate', value: r ? `${r.openRate}%` : '—', sub: e ? `${e.opened.toLocaleString()} opened` : '' },
    { label: 'Click rate', value: r ? `${r.clickRate}%` : '—', sub: e ? `${e.clicked.toLocaleString()} clicked` : '', tone: 'var(--warn-fg)' },
    { label: 'Submission rate', value: r ? `${r.submitRate}%` : '—', sub: e ? `${e.submitted.toLocaleString()} submitted` : '', tone: 'var(--danger-fg)' },
    { label: 'Report rate', value: r ? `${r.reportRate}%` : '—', sub: e ? `${e.reported.toLocaleString()} reported` : '', tone: 'var(--ok-fg)' },
  ];

  const funnelSteps: FunnelStep[] | null = hasEmailActivity
    ? [
        { label: 'Sent', value: e!.sent, color: 'var(--fg-muted)' },
        { label: 'Opened', value: e!.opened, color: 'var(--info)' },
        { label: 'Clicked', value: e!.clicked, color: 'var(--warn)' },
        { label: 'Submitted', value: e!.submitted, color: 'var(--danger)' },
        { label: 'Reported', value: e!.reported, color: 'var(--ok)' },
      ]
    : null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        sub="Live view of your phishing simulations."
        actions={
          <button
            type="button"
            className="btn ghost"
            onClick={refetch}
            disabled={refreshing}
          >
            <I.refresh size={13} /> {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {dashboard.isError ? (
        <div className="page" style={{ padding: 22 }}>
          <ErrorState onRetry={refetch} message="We couldn’t load the dashboard summary." />
        </div>
      ) : (
        <div className="page" style={{ display: 'grid', gap: 14 }}>
          {/* Headline stats */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {stats.map((s, i) => (
              <div key={i} className="stat">
                <div className="stat-label">{s.label}</div>
                {loading ? (
                  <Skeleton width="60%" height={24} style={{ marginTop: 6 }} />
                ) : (
                  <div className="stat-value" style={s.tone ? { color: s.tone } : undefined}>
                    {s.value}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 4, minHeight: 14 }}>
                  {loading ? <Skeleton width="40%" height={11} /> : s.sub}
                </div>
              </div>
            ))}
          </div>

          <div className="page-grid grid-2-3">
            {/* Conversion funnel */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Conversion funnel</div>
                <div className="card-sub">Aggregated across all campaigns</div>
              </div>
              <div className="card-body">
                {loading ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} height={22} radius={4} />
                    ))}
                  </div>
                ) : funnelSteps ? (
                  <FunnelBars steps={funnelSteps} />
                ) : (
                  <EmptyState
                    icon="campaigns"
                    compact
                    title="No email activity yet"
                    message="Launch a campaign to start seeing opens, clicks, and submissions here."
                    action={
                      canCreate ? (
                        <button type="button" className="btn primary" onClick={openWizard}>
                          <I.plus size={13} /> New campaign
                        </button>
                      ) : undefined
                    }
                  />
                )}
              </div>
            </div>

            {/* Active campaigns */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Active campaigns</div>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => router.push('/campaigns')}
                  >
                    All <I.chevR size={11} />
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {campaigns.isLoading ? (
                  <div style={{ padding: 14, display: 'grid', gap: 12 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i}>
                        <Skeleton width="60%" height={13} />
                        <Skeleton height={6} radius={3} style={{ marginTop: 8 }} />
                      </div>
                    ))}
                  </div>
                ) : campaigns.isError ? (
                  <ErrorState compact message="Couldn’t load campaigns." onRetry={refetch} />
                ) : active.length === 0 ? (
                  <EmptyState
                    icon="campaigns"
                    compact
                    title="No active campaigns"
                    message="Running and scheduled campaigns will appear here."
                    action={
                      canCreate ? (
                        <button type="button" className="btn" onClick={openWizard}>
                          <I.plus size={13} /> New campaign
                        </button>
                      ) : undefined
                    }
                  />
                ) : (
                  active.slice(0, 5).map((c) => <ActiveCampaignRow key={c.id} camp={c} />)
                )}
              </div>
            </div>
          </div>

          {/* Top campaigns by click rate */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Top campaigns by click rate</div>
              <div className="card-sub">Campaigns that have sent at least one email</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th className="right">Sent</th>
                    <th className="right">Open %</th>
                    <th className="right">Click %</th>
                    <th className="right">Submit %</th>
                    <th className="right">Report %</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.isLoading ? (
                    <SkeletonRows rows={5} cols={7} />
                  ) : topByClicks.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="table-empty">
                          No campaign results yet. Metrics appear once a campaign has sent emails.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    topByClicks.map((c) => {
                      const s = c.statistics;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => router.push('/campaigns')}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ fontWeight: 500 }}>{c.name}</td>
                          <td>
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="num right">{s.emailsSent.toLocaleString()}</td>
                          <td className="num right">{s.openRate.toFixed(1)}%</td>
                          <td className="num right" style={{ color: 'var(--warn-fg)' }}>
                            {s.clickRate.toFixed(1)}%
                          </td>
                          <td
                            className="num right"
                            style={{ color: s.submissionRate > 10 ? 'var(--danger-fg)' : undefined }}
                          >
                            {s.submissionRate.toFixed(1)}%
                          </td>
                          <td className="num right" style={{ color: 'var(--ok-fg)' }}>
                            {s.reportRate.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActiveCampaignRow({ camp }: { camp: CampaignView }): JSX.Element {
  const s = camp.statistics;
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <StatusBadge status={camp.status} />
        {camp.isAdaptive && (
          <Badge tone="accent">
            <I.sparkles size={9} /> Adaptive
          </Badge>
        )}
        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{camp.name}</span>
      </div>
      {s.emailsSent > 0 ? (
        <>
          <div className="bar split" style={{ marginBottom: 5 }}>
            <span style={{ flex: s.emailsReported, background: 'var(--ok)' }} />
            <span style={{ flex: Math.max(0, s.emailsOpened - s.emailsClicked), background: 'var(--info)' }} />
            <span style={{ flex: Math.max(0, s.emailsClicked - s.formsSubmitted), background: 'var(--warn)' }} />
            <span style={{ flex: s.formsSubmitted, background: 'var(--danger)' }} />
            <span
              style={{
                flex: Math.max(0, s.emailsSent - s.emailsOpened - s.emailsReported),
                background: 'var(--bg-sunken)',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--fg-subtle)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>{s.emailsSent} sent</span>
            <span style={{ color: 'var(--ok-fg)' }}>{s.emailsReported} reported</span>
            <span style={{ color: 'var(--warn-fg)' }}>{s.emailsClicked} clicked</span>
            <span style={{ color: 'var(--danger-fg)' }}>{s.formsSubmitted} submitted</span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
          Starts {new Date(camp.startDate).toLocaleDateString()} · no emails sent yet
        </div>
      )}
    </div>
  );
}
