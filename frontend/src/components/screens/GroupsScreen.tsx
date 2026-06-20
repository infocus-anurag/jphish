'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I } from '@/components/ui/Icons';
import { Badge, Drawer } from '@/components/ui/Primitives';
import { EmptyState, InlineLoading } from '@/components/ui/States';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCan } from '@/lib/rbac';
import { isValidEmail } from '@/lib/targets-import';
import { ImportTargetsModal } from '@/components/screens/ImportTargetsModal';
import {
  addGroupMembers,
  createGroup,
  deleteGroup,
  getGroup,
  listGroups,
  removeGroupMember,
  type GroupSummary,
} from '@/lib/api/groups';

export function GroupsScreen(): JSX.Element {
  const canCreate = useCan('campaign.create');
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: listGroups,
  });
  const groups: GroupSummary[] = data?.groups ?? [];

  const remove = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group deleted');
      setOpenId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  return (
    <>
      <PageHeader
        title="Target groups"
        sub="Reusable groups of targets you can attach to campaigns."
        actions={
          canCreate ? (
            <button type="button" className="btn primary" onClick={() => setShowForm(true)}>
              <I.plus size={13} /> New group
            </button>
          ) : null
        }
      />
      {error && (
        <div style={{ padding: 16 }}>
          <Badge tone="danger">Failed to load groups</Badge>
        </div>
      )}
      <div style={{ background: 'var(--bg-elev)' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Description</th>
              <th className="right">Members</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--fg-subtle)' }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && groups.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="users"
                    compact
                    title="No target groups yet"
                    message="Groups hold the people a campaign is sent to. Create one, then import targets from a CSV or paste them in."
                    action={
                      canCreate ? (
                        <button type="button" className="btn primary" onClick={() => setShowForm(true)}>
                          <I.plus size={13} /> New group
                        </button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            )}
            {groups.map((g) => (
              <tr key={g.id} onClick={() => setOpenId(g.id)} style={{ cursor: 'pointer' }}>
                <td>{g.name}</td>
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
                <td onClick={(e) => e.stopPropagation()}>
                  {canCreate && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => {
                        if (confirm(`Delete group "${g.name}"?`)) remove.mutate(g.id);
                      }}
                    >
                      <I.trash size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <GroupForm
          onDone={() => setShowForm(false)}
          onCreated={(id) => {
            setShowForm(false);
            setOpenId(id);
          }}
        />
      )}
      {openId && <GroupDetailDrawer id={openId} canEdit={canCreate} onClose={() => setOpenId(null)} />}
    </>
  );
}

function GroupDetailDrawer({
  id,
  canEdit,
  onClose,
}: {
  id: string;
  canEdit: boolean;
  onClose: () => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['groups', id],
    queryFn: () => getGroup(id),
  });
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');

  const removeMember = useMutation({
    mutationFn: (email: string) => removeGroupMember(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const members = data?.members ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.email, m.firstName, m.lastName, m.department, m.position]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [members, search]);

  return (
    <>
      <Drawer onClose={onClose} width={680}>
        <div style={{ padding: 22, display: 'grid', gap: 14 }}>
          {isLoading || !data ? (
            <InlineLoading label="Loading group…" />
          ) : (
            <>
              <div>
                <h2 style={{ margin: 0 }}>{data.name}</h2>
                {data.description && (
                  <div style={{ color: 'var(--fg-subtle)', fontSize: 12.5 }}>{data.description}</div>
                )}
              </div>

              {canEdit && (
                <div className="row" style={{ gap: 6 }}>
                  <button type="button" className="btn primary" onClick={() => setShowImport(true)}>
                    <I.upload size={13} /> Import targets
                  </button>
                </div>
              )}

              {canEdit && <QuickAddTarget groupId={id} existing={members} />}

              <div>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <div className="field-label" style={{ margin: 0 }}>
                    Members ({members.length})
                  </div>
                  {members.length > 6 && (
                    <input
                      className="input"
                      style={{ height: 26, maxWidth: 200 }}
                      placeholder="Search members…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  )}
                </div>

                {members.length === 0 ? (
                  <EmptyState
                    icon="users"
                    compact
                    title="No targets yet"
                    message="Import a CSV or paste a list to add the people this group will receive simulations."
                    action={
                      canEdit ? (
                        <button type="button" className="btn primary" onClick={() => setShowImport(true)}>
                          <I.upload size={13} /> Import targets
                        </button>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="card" style={{ padding: 0, maxHeight: 360, overflow: 'auto' }}>
                    <table className="table">
                      <tbody>
                        {filtered.map((m) => (
                          <tr key={m.email}>
                            <td className="mono" style={{ fontSize: 11.5 }}>
                              {m.email}
                            </td>
                            <td>{[m.firstName, m.lastName].filter(Boolean).join(' ') || '—'}</td>
                            <td style={{ color: 'var(--fg-subtle)', fontSize: 11.5 }}>
                              {[m.department, m.position].filter(Boolean).join(' · ') || ''}
                            </td>
                            {canEdit && (
                              <td className="right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="btn ghost sm"
                                  onClick={() => removeMember.mutate(m.email)}
                                >
                                  <I.x size={11} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ color: 'var(--fg-subtle)' }}>
                              No members match “{search}”.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Drawer>

      {showImport && data && (
        <ImportTargetsModal
          groupId={id}
          groupName={data.name}
          existingMembers={members}
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  );
}

function QuickAddTarget({
  groupId,
  existing,
}: {
  groupId: string;
  existing: Array<{ email: string }>;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', department: '', position: '' });

  const add = useMutation({
    mutationFn: () =>
      addGroupMembers(groupId, [
        {
          email: form.email.trim(),
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          department: form.department.trim() || undefined,
          position: form.position.trim() || undefined,
        } as any,
      ]),
    onSuccess: (r) => {
      if (r.added > 0) toast.success('Target added');
      else toast.info('That email is already in this group');
      setForm({ email: '', firstName: '', lastName: '', department: '', position: '' });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const emailOk = isValidEmail(form.email);
  const dup = existing.some((m) => m.email.toLowerCase() === form.email.trim().toLowerCase());

  return (
    <details className="card" style={{ padding: 0 }}>
      <summary
        style={{
          cursor: 'pointer',
          padding: '9px 12px',
          fontSize: 12.5,
          fontWeight: 500,
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <I.plus size={12} /> Add a single target
      </summary>
      <div style={{ padding: 12, paddingTop: 0, display: 'grid', gap: 8 }}>
        <div className="grid-2" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="email@company.com *"
            value={form.email}
            type="email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="grid-2" style={{ gap: 8 }}>
            <input
              className="input"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <input
              className="input"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
        </div>
        <div className="grid-2" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <input
            className="input"
            placeholder="Position"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11.5, color: dup ? 'var(--warn)' : 'var(--fg-subtle)' }}>
            {form.email && !emailOk
              ? 'Enter a valid email'
              : dup
                ? 'Already in this group'
                : ''}
          </span>
          <button
            type="button"
            className="btn primary sm"
            disabled={!emailOk || dup || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? 'Adding…' : 'Add target'}
          </button>
        </div>
      </div>
    </details>
  );
}

function GroupForm({
  onDone,
  onCreated,
}: {
  onDone: () => void;
  onCreated: (id: string) => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '' });

  const create = useMutation({
    mutationFn: createGroup,
    onSuccess: (g) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created — now add some targets');
      onCreated(g.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });

  return (
    <Drawer onClose={onDone} width={520}>
      <div style={{ padding: 22, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0 }}>New target group</h2>
        <div>
          <label className="field-label">Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Finance team"
            autoFocus
          />
        </div>
        <div>
          <label className="field-label">Description</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional — who's in this group / what it's for"
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn primary"
            disabled={create.isPending || !form.name.trim()}
            onClick={() =>
              create.mutate({
                name: form.name.trim(),
                description: form.description.trim() || undefined,
              })
            }
          >
            {create.isPending ? 'Saving…' : 'Create group'}
          </button>
          <button type="button" className="btn ghost" onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    </Drawer>
  );
}
