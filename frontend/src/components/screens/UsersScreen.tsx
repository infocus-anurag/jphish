'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueries, useQuery } from '@tanstack/react-query';
import { I } from '@/components/ui/Icons';
import { Avatar, Badge, Drawer } from '@/components/ui/Primitives';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCan } from '@/lib/rbac';
import {
  getGroup,
  listGroups,
  type GroupDetail,
  type GroupSummary,
} from '@/lib/api/groups';

type Tab = 'targets' | 'groups';
type SortKey = 'name' | 'dept';

interface Target {
  email: string;
  name: string;
  dept: string | null;
  position: string | null;
  groups: string[];
}

export function UsersScreen(): JSX.Element {
  const router = useRouter();
  const canManage = useCan('campaign.create');
  const [tab, setTab] = useState<Tab>('targets');
  const [open, setOpen] = useState<Target | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('name');

  const groupsQuery = useQuery({ queryKey: ['groups'], queryFn: listGroups });
  const groups: GroupSummary[] = groupsQuery.data?.groups ?? [];

  // Fan out to each group's detail to assemble the unique set of targets.
  const detailQueries = useQueries({
    queries: groups.map((g) => ({
      queryKey: ['groups', g.id],
      queryFn: () => getGroup(g.id),
      staleTime: 60_000,
    })),
  });

  const detailsLoading = detailQueries.some((q) => q.isLoading);
  const details = detailQueries
    .map((q) => q.data)
    .filter((d): d is GroupDetail => !!d);

  const targets = useMemo(() => {
    const map = new Map<string, Target>();
    for (const g of details) {
      for (const m of g.members) {
        const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
        const existing = map.get(m.email);
        if (existing) {
          existing.groups.push(g.name);
          existing.dept = existing.dept ?? m.department;
          existing.position = existing.position ?? m.position;
        } else {
          map.set(m.email, {
            email: m.email,
            name,
            dept: m.department,
            position: m.position,
            groups: [g.name],
          });
        }
      }
    }
    const list = [...map.values()];
    list.sort((a, b) =>
      sortBy === 'dept'
        ? (a.dept ?? '').localeCompare(b.dept ?? '') || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    );
    return list;
  }, [details, sortBy]);

  const targetsLoading = groupsQuery.isLoading || detailsLoading;

  return (
    <>
      <PageHeader
        title="Users & groups"
        sub="People targeted by your phishing simulations, grouped for campaigns."
        actions={
          canManage ? (
            <button type="button" className="btn primary" onClick={() => router.push('/groups')}>
              <I.users size={13} /> Manage groups
            </button>
          ) : null
        }
        tabs={[
          { id: 'targets', label: 'Targets', count: targets.length },
          { id: 'groups', label: 'Groups', count: groups.length },
        ]}
        activeTab={tab}
        onTab={(id) => setTab(id as Tab)}
      />

      {tab === 'targets' && (
        <div style={{ background: 'var(--bg-elev)' }}>
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => setSortBy('name')} style={{ cursor: 'pointer' }}>
                  Target
                </th>
                <th onClick={() => setSortBy('dept')} style={{ cursor: 'pointer' }}>
                  Department
                </th>
                <th>Position</th>
                <th>Groups</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {targetsLoading ? (
                <SkeletonRows rows={6} cols={5} />
              ) : groupsQuery.isError ? (
                <tr>
                  <td colSpan={5}>
                    <ErrorState
                      compact
                      message="Couldn’t load targets."
                      onRetry={() => groupsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : targets.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon="users"
                      title="No targets yet"
                      message="Targets are the people in your groups. Create a group and add members to start running simulations against them."
                      action={
                        canManage ? (
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() => router.push('/groups')}
                          >
                            <I.plus size={13} /> Create a group
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                targets.map((t) => (
                  <tr key={t.email} onClick={() => setOpen(t)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={t.name} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{t.name}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                            {t.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{t.dept || <span style={{ color: 'var(--fg-faint)' }}>—</span>}</td>
                    <td>{t.position || <span style={{ color: 'var(--fg-faint)' }}>—</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {t.groups.slice(0, 2).map((g) => (
                          <Badge key={g} tone="info">
                            {g}
                          </Badge>
                        ))}
                        {t.groups.length > 2 && (
                          <Badge tone="default">+{t.groups.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <button type="button" className="btn ghost sm" onClick={() => setOpen(t)}>
                        <I.chevR size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'groups' && (
        <GroupsList
          groups={groups}
          loading={groupsQuery.isLoading}
          error={groupsQuery.isError}
          onRetry={() => groupsQuery.refetch()}
          canManage={canManage}
          onManage={() => router.push('/groups')}
        />
      )}

      {open && <TargetDrawer target={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function GroupsList({
  groups,
  loading,
  error,
  onRetry,
  canManage,
  onManage,
}: {
  groups: GroupSummary[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  canManage: boolean;
  onManage: () => void;
}): JSX.Element {
  return (
    <div style={{ background: 'var(--bg-elev)' }}>
      <table className="table">
        <thead>
          <tr>
            <th>Group</th>
            <th>Description</th>
            <th className="right">Members</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows rows={5} cols={5} />
          ) : error ? (
            <tr>
              <td colSpan={5}>
                <ErrorState compact message="Couldn’t load groups." onRetry={onRetry} />
              </td>
            </tr>
          ) : groups.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState
                  icon="users"
                  title="No groups yet"
                  message="Groups bundle targets so you can launch a campaign at them in one go."
                  action={
                    canManage ? (
                      <button type="button" className="btn primary" onClick={onManage}>
                        <I.plus size={13} /> Create a group
                      </button>
                    ) : undefined
                  }
                />
              </td>
            </tr>
          ) : (
            groups.map((g) => (
              <tr key={g.id} onClick={onManage} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: 500 }}>{g.name}</td>
                <td style={{ color: 'var(--fg-subtle)' }}>{g.description ?? '—'}</td>
                <td className="num right">{g.memberCount}</td>
                <td>
                  {g.isActive ? (
                    <Badge tone="ok" dot>
                      active
                    </Badge>
                  ) : (
                    <Badge tone="default">inactive</Badge>
                  )}
                </td>
                <td className="mono" style={{ fontSize: 11.5 }}>
                  {new Date(g.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TargetDrawer({ target, onClose }: { target: Target; onClose: () => void }): JSX.Element {
  return (
    <Drawer onClose={onClose} width={520}>
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <Avatar name={target.name} size="lg" />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{target.name}</h2>
          <div className="mono" style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
            {target.email}
          </div>
          {(target.dept || target.position) && (
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
              {[target.dept, target.position].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <button type="button" className="topbar-action" onClick={onClose} aria-label="Close">
          <I.x size={14} />
        </button>
      </div>

      <div style={{ padding: 22 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
            marginBottom: 10,
          }}
        >
          Group membership ({target.groups.length})
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {target.groups.map((g) => (
            <Badge key={g} tone="info">
              {g}
            </Badge>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
