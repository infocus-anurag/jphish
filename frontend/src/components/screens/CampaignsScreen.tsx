'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I, type IconKey } from '@/components/ui/Icons';
import { Badge, Drawer, StatusBadge } from '@/components/ui/Primitives';
import { FunnelBars, type FunnelStep } from '@/components/ui/Charts';
import { Skeleton } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';
import { useUI } from '@/store/ui.store';
import { useCan } from '@/lib/rbac';
import {
  deleteCampaign,
  launchCampaign,
  listCampaigns,
  pauseCampaign,
  resumeCampaign,
  type CampaignView,
} from '@/lib/api/campaigns';
import { listEmailTemplates } from '@/lib/api/templates';
import { listSmtpProfiles } from '@/lib/api/smtp-profiles';
import { listLandingPages } from '@/lib/api/landing-pages';
import { listGroups } from '@/lib/api/groups';

type FilterId = 'all' | 'active' | 'review' | 'completed';

export function CampaignsScreen(): JSX.Element {
  const [filter, setFilter] = useState<FilterId>('all');
  const [openCamp, setOpenCamp] = useState<CampaignView | null>(null);
  const openWizard = useUI((s) => s.openWizard);
  const canCreate = useCan('campaign.create');

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => listCampaigns({ take: 200 }),
  });
  const all = data?.campaigns ?? [];

  const counts = useMemo(
    () => ({
      all: all.length,
      active: all.filter((c) => c.status === 'running' || c.status === 'scheduled').length,
      review: all.filter((c) => c.status === 'draft').length,
      completed: all.filter((c) => c.status === 'completed').length,
    }),
    [all],
  );

  const filtered = all.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'active') return c.status === 'running' || c.status === 'scheduled';
    if (filter === 'review') return c.status === 'draft';
    if (filter === 'completed') return c.status === 'completed';
    return true;
  });

  return (
    <>
      <PageHeader
        title="Campaigns"
        sub="Plan, approve, and monitor phishing simulations."
        actions={
          canCreate ? (
            <button type="button" className="btn primary" onClick={openWizard}>
              <I.plus size={13} /> New campaign
            </button>
          ) : null
        }
        tabs={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'active', label: 'Active', count: counts.active },
          { id: 'review', label: 'Drafts', count: counts.review },
          { id: 'completed', label: 'Completed', count: counts.completed },
        ]}
        activeTab={filter}
        onTab={(id) => setFilter(id as FilterId)}
      />

      {error && (
        <div style={{ padding: 16 }}>
          <Badge tone="danger">Failed to load campaigns</Badge>
        </div>
      )}

      <div style={{ background: 'var(--bg-elev)' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Owner</th>
              <th className="right">Sent</th>
              <th className="right">Open %</th>
              <th className="right">Click %</th>
              <th className="right">Submit %</th>
              <th className="right">Report %</th>
              <th>Start</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} style={{ color: 'var(--fg-subtle)' }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ color: 'var(--fg-subtle)' }}>
                  No campaigns to show.
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const s = c.statistics;
              return (
                <tr key={c.id} onClick={() => setOpenCamp(c)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>
                      template: <code className="mono">{c.templateId.slice(0, 8)}</code>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.ownerName}</td>
                  <td className="num right">{s.emailsSent.toLocaleString()}</td>
                  <td className="num right">{s.openRate.toFixed(1)}%</td>
                  <td className="num right">{s.clickRate.toFixed(1)}%</td>
                  <td
                    className="num right"
                    style={{ color: s.submissionRate > 10 ? 'var(--danger-fg)' : undefined }}
                  >
                    {s.submissionRate.toFixed(1)}%
                  </td>
                  <td className="num right" style={{ color: 'var(--ok-fg)' }}>
                    {s.reportRate.toFixed(1)}%
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                    {new Date(c.startDate).toLocaleDateString()}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn ghost sm">
                      <I.more size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openCamp && (
        <CampaignDetailDrawer
          camp={openCamp}
          onClose={() => setOpenCamp(null)}
        />
      )}
    </>
  );
}

function CampaignDetailDrawer({
  camp,
  onClose,
}: {
  camp: CampaignView;
  onClose: () => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const canPause = useCan('campaign.pause');
  const canDelete = useCan('campaign.delete');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  };

  const launch = useMutation({
    mutationFn: launchCampaign,
    onSuccess: (c) => {
      toast.success(`Launched "${c.name}"`);
      invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Launch failed'),
  });
  const pause = useMutation({
    mutationFn: pauseCampaign,
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Pause failed'),
  });
  const resume = useMutation({
    mutationFn: resumeCampaign,
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Resume failed'),
  });
  const remove = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      invalidate();
      toast.success('Campaign deleted');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  // Resolve the campaign's config IDs to human-readable names (shared cache).
  const templatesQ = useQuery({ queryKey: ['email-templates'], queryFn: listEmailTemplates });
  const profilesQ = useQuery({ queryKey: ['smtp-profiles'], queryFn: listSmtpProfiles });
  const landingsQ = useQuery({ queryKey: ['landing-pages'], queryFn: listLandingPages });
  const groupsQ = useQuery({ queryKey: ['groups'], queryFn: listGroups });

  const template = templatesQ.data?.[0]?.find((t) => t.id === camp.templateId);
  const profile = profilesQ.data?.[0]?.find((p) => p.id === camp.smtpProfileId);
  const landing = landingsQ.data?.items.find((p) => p.id === camp.landingPageId);
  const group = groupsQ.data?.groups.find((g) => g.id === camp.groupId);

  const s = camp.statistics;
  const steps: FunnelStep[] | null =
    s.emailsSent > 0
      ? [
          { label: 'Sent', value: s.emailsSent, color: 'var(--fg-muted)' },
          { label: 'Opened', value: s.emailsOpened, color: 'var(--info)' },
          { label: 'Clicked', value: s.emailsClicked, color: 'var(--warn)' },
          { label: 'Submitted', value: s.formsSubmitted, color: 'var(--danger)' },
          { label: 'Reported', value: s.emailsReported, color: 'var(--ok)' },
        ]
      : null;

  const fmtDate = (d: string | null): string =>
    d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <Drawer onClose={onClose} width={600}>
      <div
        style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <StatusBadge status={camp.status} />
        <span className="spacer" />
        <button
          type="button"
          className="topbar-action"
          onClick={onClose}
          aria-label="Close"
        >
          <I.x size={14} />
        </button>
      </div>
      <div style={{ padding: '16px 22px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {camp.name}
          </h2>
          {camp.isAdaptive && (
            <Badge tone="accent">
              <I.sparkles size={9} /> Adaptive
            </Badge>
          )}
        </div>
        {camp.description && (
          <div style={{ marginTop: 6, color: 'var(--fg-muted)', fontSize: 12.5, lineHeight: 1.5 }}>
            {camp.description}
          </div>
        )}

        <div className="detail-meta">
          <MetaItem icon="calendar" label="Start" value={fmtDate(camp.startDate)} />
          <MetaItem icon="calendar" label="End" value={fmtDate(camp.endDate)} />
          <MetaItem icon="user" label="Owner" value={camp.ownerName} />
          <MetaItem icon="users" label="Recipients" value={String(s.totalRecipients)} />
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
          {camp.status === 'draft' && (
            <button
              type="button"
              className="btn primary"
              disabled={launch.isPending}
              onClick={() => launch.mutate(camp.id)}
            >
              <I.send size={12} /> {launch.isPending ? 'Launching…' : 'Launch'}
            </button>
          )}
          {camp.status === 'running' && canPause && (
            <button
              type="button"
              className="btn"
              disabled={pause.isPending}
              onClick={() => pause.mutate(camp.id)}
            >
              <I.pause size={12} /> Pause
            </button>
          )}
          {camp.status === 'paused' && canPause && (
            <button
              type="button"
              className="btn"
              disabled={resume.isPending}
              onClick={() => resume.mutate(camp.id)}
            >
              <I.send size={12} /> Resume
            </button>
          )}
          <span className="spacer" />
          {camp.status === 'draft' && canDelete && (
            <button
              type="button"
              className="btn ghost danger"
              onClick={() => {
                if (confirm(`Delete draft campaign "${camp.name}"?`)) remove.mutate(camp.id);
              }}
            >
              <I.trash size={12} />
            </button>
          )}
        </div>
      </div>

      {steps && (
        <div style={{ padding: '0 22px 22px' }}>
          <SectionHeading>Conversion funnel</SectionHeading>
          <FunnelBars steps={steps} />
        </div>
      )}

      <div style={{ padding: '0 22px 24px' }}>
        <SectionHeading>Configuration</SectionHeading>
        <div className="config-list">
          <ConfigRow
            icon="templates"
            label="Email template"
            value={template?.name}
            sub={template?.subject}
            loading={templatesQ.isLoading}
            missing={!camp.templateId}
          />
          <ConfigRow
            icon="send"
            label="Sending profile"
            value={profile?.name}
            sub={profile?.fromEmail}
            loading={profilesQ.isLoading}
            missing={!camp.smtpProfileId}
          />
          <ConfigRow
            icon="landing"
            label="Landing page"
            value={landing?.name}
            sub={landing ? `/${landing.slug}` : undefined}
            loading={landingsQ.isLoading}
            missing={!camp.landingPageId}
            missingLabel="None — links use the original URL"
          />
          <ConfigRow
            icon="users"
            label="Target group"
            value={group?.name}
            sub={group ? `${group.memberCount} members` : undefined}
            loading={groupsQ.isLoading}
            missing={!camp.groupId}
          />
        </div>
      </div>
    </Drawer>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: IconKey;
  label: string;
  value: string;
}): JSX.Element {
  const Ic = I[icon];
  return (
    <div className="detail-meta-item">
      <span className="ico">
        <Ic size={14} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="lbl">{label}</span>
        <span className="val">{value}</span>
      </span>
    </div>
  );
}

function ConfigRow({
  icon,
  label,
  value,
  sub,
  loading,
  missing,
  missingLabel = 'Not set',
}: {
  icon: IconKey;
  label: string;
  value?: string;
  sub?: string;
  loading?: boolean;
  missing?: boolean;
  missingLabel?: string;
}): JSX.Element {
  const Ic = I[icon];
  return (
    <div className="config-row">
      <span className="ico">
        <Ic size={15} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="lbl">{label}</div>
        {missing ? (
          <div className="val" style={{ color: 'var(--fg-subtle)', fontWeight: 400 }}>
            {missingLabel}
          </div>
        ) : loading && !value ? (
          <Skeleton width={160} height={13} style={{ marginTop: 3 }} />
        ) : (
          <>
            <div className="val">{value ?? 'Unknown'}</div>
            {sub && <div className="sub">{sub}</div>}
          </>
        )}
      </div>
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
        margin: '6px 0 12px',
      }}
    >
      {children}
    </div>
  );
}
