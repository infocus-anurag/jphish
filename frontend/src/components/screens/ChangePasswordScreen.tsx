'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { changePassword } from '@/lib/auth-api';
import { useAuthStore } from '@/store/auth.store';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(12, 'Min 12 chars')
      .max(128)
      .regex(/[a-z]/, 'Needs lowercase')
      .regex(/[A-Z]/, 'Needs uppercase')
      .regex(/\d/, 'Needs digit')
      .regex(/[^\w\s]/, 'Needs symbol'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'New password must differ from the current one',
  });

type Values = z.infer<typeof schema>;

export function ChangePasswordScreen(): JSX.Element {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);
  const mustChange = useAuthStore((s) => s.user?.mustChangePassword);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values): Promise<void> {
    setSubmitting(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password updated. Please sign in again.');
      clear();
      router.replace('/login');
    } catch (err) {
      toast.error(extract(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ padding: 20, maxWidth: 520 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
        Change password
      </h1>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 6 }}>
        {mustChange
          ? 'Your account requires a password change before continuing.'
          : 'Choose a strong password. All other sessions will be signed out.'}
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'grid', gap: 12, marginTop: 16 }}
      >
        <Field label="Current password" error={errors.currentPassword?.message}>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            {...register('currentPassword')}
          />
        </Field>
        <Field
          label="New password (12+ chars, mix of cases, digit, symbol)"
          error={errors.newPassword?.message}
        >
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
          />
        </Field>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            {...register('confirm')}
          />
        </Field>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </section>
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
    <label>
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

function extract(err: unknown): string {
  if (typeof err === 'object' && err && 'response' in err) {
    const m = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  }
  return 'Could not update password';
}
