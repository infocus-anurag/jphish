'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCreateUser,
  useDeleteUser,
  useSetRole,
  useUpdateUser,
  useUsersQuery,
} from '@/hooks/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { roleLabel } from '@/lib/rbac';
import { UserRole, type AuthUser } from '@/types/auth.types';

const createSchema = z.object({
  email: z.string().email().max(254),
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
  role: z.nativeEnum(UserRole),
  password: z
    .string()
    .min(12, 'Min 12 chars')
    .max(128)
    .regex(/[a-z]/, 'Needs lowercase')
    .regex(/[A-Z]/, 'Needs uppercase')
    .regex(/\d/, 'Needs digit')
    .regex(/[^\w\s]/, 'Needs symbol')
    .optional()
    .or(z.literal('')),
});
type CreateValues = z.infer<typeof createSchema>;

export function UsersAdminScreen(): JSX.Element {
  const me = useAuthStore((s) => s.user);
  const isSuper = me?.role === UserRole.SUPER_ADMIN;
  const canCreate = me?.role === UserRole.SUPER_ADMIN || me?.role === UserRole.ADMIN;

  const usersQ = useUsersQuery();
  const create = useCreateUser();
  const update = useUpdateUser();
  const setRole = useSetRole();
  const remove = useDeleteUser();

  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const list = usersQ.data ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q),
    );
  }, [usersQ.data, filter]);

  return (
    <section style={{ padding: 20 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
            User & role management
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
            Super admins manage roles and platform-wide membership. Admins can invite
            new admins and analysts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Search email, name…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 260 }}
          />
          {canCreate ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => setShowCreate((s) => !s)}
            >
              {showCreate ? 'Close' : 'New user'}
            </button>
          ) : null}
        </div>
      </header>

      {showCreate && canCreate ? (
        <CreateUserForm
          isSuper={isSuper}
          submitting={create.isPending}
          onSubmit={(values) =>
            create.mutateAsync({
              email: values.email,
              firstName: values.firstName,
              lastName: values.lastName,
              role: values.role,
              password: values.password || undefined,
            }).then(() => setShowCreate(false))
          }
        />
      ) : null}

      <div
        style={{
          background: 'var(--surface, #fff)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elev, #f8fafc)', textAlign: 'left' }}>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last login</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {usersQ.isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: 'var(--fg-muted)' }}>
                  Loading users…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: 'var(--fg-muted)' }}>
                  No users match.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <Row
                  key={u.id}
                  user={u}
                  isSelf={u.id === me?.id}
                  isSuper={isSuper}
                  onRoleChange={(role) => setRole.mutate({ id: u.id, role })}
                  onToggleActive={() =>
                    update.mutate({ id: u.id, body: { isActive: !u.isActive } })
                  }
                  onDelete={() => {
                    if (confirm(`Delete ${u.email}? This cannot be undone.`)) {
                      remove.mutate(u.id);
                    }
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children?: React.ReactNode }): JSX.Element {
  return (
    <th
      style={{
        padding: '10px 14px',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: 'var(--fg-muted)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {children}
    </th>
  );
}

function Row({
  user,
  isSelf,
  isSuper,
  onRoleChange,
  onToggleActive,
  onDelete,
}: {
  user: AuthUser;
  isSelf: boolean;
  isSuper: boolean;
  onRoleChange: (role: UserRole) => void;
  onToggleActive: () => void;
  onDelete: () => void;
}): JSX.Element {
  const cell: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: '1px solid var(--line)',
    fontSize: 13,
    verticalAlign: 'middle',
  };
  return (
    <tr>
      <td style={cell}>
        {user.firstName} {user.lastName}
      </td>
      <td style={cell}>{user.email}</td>
      <td style={cell}>
        {isSuper && !isSelf ? (
          <select
            className="input"
            value={user.role}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
          >
            <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.ANALYST}>Analyst</option>
          </select>
        ) : (
          <RoleBadge role={user.role} />
        )}
      </td>
      <td style={cell}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: user.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.18)',
            color: user.isActive ? '#047857' : '#475569',
          }}
        >
          {user.isActive ? 'Active' : 'Disabled'}
        </span>
      </td>
      <td style={cell}>
        {user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleString()
          : <span style={{ color: 'var(--fg-faint)' }}>never</span>}
      </td>
      <td style={cell}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={onToggleActive}
            disabled={isSelf}
            title={isSelf ? 'You cannot disable yourself' : ''}
          >
            {user.isActive ? 'Disable' : 'Enable'}
          </button>
          {isSuper ? (
            <button
              type="button"
              className="btn ghost sm"
              onClick={onDelete}
              disabled={isSelf}
              style={{ color: 'var(--danger, #b91c1c)' }}
            >
              Delete
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function RoleBadge({ role }: { role: UserRole }): JSX.Element {
  const palette: Record<UserRole, { bg: string; fg: string }> = {
    [UserRole.SUPER_ADMIN]: { bg: 'rgba(99,102,241,0.12)', fg: '#4338ca' },
    [UserRole.ADMIN]: { bg: 'rgba(14,165,233,0.12)', fg: '#0369a1' },
    [UserRole.ANALYST]: { bg: 'rgba(148,163,184,0.18)', fg: '#475569' },
  };
  const { bg, fg } = palette[role];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: fg,
      }}
    >
      {roleLabel(role)}
    </span>
  );
}

function CreateUserForm({
  isSuper,
  submitting,
  onSubmit,
}: {
  isSuper: boolean;
  submitting: boolean;
  onSubmit: (v: CreateValues) => Promise<unknown>;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: UserRole.ANALYST },
  });

  return (
    <form
      onSubmit={handleSubmit(async (v) => {
        await onSubmit(v);
        reset();
      })}
      style={{
        background: 'var(--surface, #fff)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}
    >
      <Field label="Email" error={errors.email?.message}>
        <input className="input" type="email" {...register('email')} />
      </Field>
      <Field label="First name" error={errors.firstName?.message}>
        <input className="input" {...register('firstName')} />
      </Field>
      <Field label="Last name" error={errors.lastName?.message}>
        <input className="input" {...register('lastName')} />
      </Field>
      <Field label="Role" error={errors.role?.message}>
        <select className="input" {...register('role')}>
          <option value={UserRole.ANALYST}>Analyst</option>
          <option value={UserRole.ADMIN}>Admin</option>
          {isSuper ? <option value={UserRole.SUPER_ADMIN}>Super Admin</option> : null}
        </select>
      </Field>
      <Field
        label="Password (leave blank → temp password)"
        error={errors.password?.message}
      >
        <input className="input" type="text" {...register('password')} placeholder="Optional" />
      </Field>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label style={{ display: 'block' }}>
      <span
        style={{
          display: 'block',
          fontSize: 11,
          color: 'var(--fg-muted)',
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {children}
      {error ? (
        <span style={{ fontSize: 11, color: 'var(--danger, #b91c1c)' }}>{error}</span>
      ) : null}
    </label>
  );
}
