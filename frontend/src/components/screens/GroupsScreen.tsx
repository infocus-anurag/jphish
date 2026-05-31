'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I } from '@/components/ui/Icons';
import { Badge, Drawer } from '@/components/ui/Primitives';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCan } from '@/lib/rbac';
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
            <button
              type="button"
              className="btn primary"
              onClick={() => setShowForm(true)}
            >
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
                <td colSpan={6} style={{ color: 'var(--fg-subtle)' }}>
                  No groups yet.
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

      {showForm && <GroupForm onDone={() => setShowForm(false)} />}
      {openId && <GroupDetailDrawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function GroupDetailDrawer({ id, onClose }: { id: string; onClose: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['groups', id],
    queryFn: () => getGroup(id),
  });
  const [csv, setCsv] = useState('');

  const add = useMutation({
    mutationFn: (members: Array<{ email: string; firstName?: string; lastName?: string }>) =>
      addGroupMembers(id, members as any),
    onSuccess: (r) => {
      toast.success(`${r.added} member(s) added`);
      setCsv('');
      queryClient.invalidateQueries({ queryKey: ['groups', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const removeMember = useMutation({
    mutationFn: (email: string) => removeGroupMember(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  function parseCsv(): Array<{ email: string; firstName?: string; lastName?: string }> {
    return csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [email, firstName, lastName] = line.split(/[,\t]/).map((s) => s.trim());
        return { email, firstName: firstName || undefined, lastName: lastName || undefined };
      })
      .filter((r) => r.email && /@/.test(r.email));
  }

  return (
    <Drawer onClose={onClose} width={640}>
      <div style={{ padding: 22, display: 'grid', gap: 14 }}>
        {isLoading || !data ? (
          <div>Loading…</div>
        ) : (
          <>
            <div>
              <h2 style={{ margin: 0 }}>{data.name}</h2>
              {data.description && (
                <div style={{ color: 'var(--fg-subtle)', fontSize: 12.5 }}>
                  {data.description}
                </div>
              )}
            </div>
            <div>
              <div className="field-label">Members ({data.members.length})</div>
              <div className="card" style={{ padding: 0, maxHeight: 280, overflow: 'auto' }}>
                <table className="table">
                  <tbody>
                    {data.members.map((m) => (
                      <tr key={m.email}>
                        <td className="mono" style={{ fontSize: 11.5 }}>
                          {m.email}
                        </td>
                        <td>
                          {[m.firstName, m.lastName].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td style={{ color: 'var(--fg-subtle)', fontSize: 11.5 }}>
                          {m.department || ''}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => removeMember.mutate(m.email)}
                          >
                            <I.x size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {data.members.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ color: 'var(--fg-subtle)' }}>
                          No members.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="field-label">Add members (paste CSV: email,firstName,lastName)</div>
              <textarea
                className="input mono"
                rows={6}
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                placeholder={'alice@example.com,Alice,Smith\nbob@example.com,Bob,Jones'}
              />
              <button
                type="button"
                className="btn primary"
                style={{ marginTop: 6 }}
                disabled={add.isPending}
                onClick={() => {
                  const list = parseCsv();
                  if (list.length === 0) {
                    toast.error('No valid rows to add');
                    return;
                  }
                  add.mutate(list);
                }}
              >
                {add.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

function GroupForm({ onDone }: { onDone: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '' });

  const create = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created');
      onDone();
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
          />
        </div>
        <div>
          <label className="field-label">Description</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn primary"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                name: form.name,
                description: form.description || undefined,
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
