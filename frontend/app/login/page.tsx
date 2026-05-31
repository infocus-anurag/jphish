'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { login } from '@/lib/auth-api';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  email: z.string().email('Enter a valid email').max(254),
  password: z.string().min(1, 'Password is required').max(128),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage(): JSX.Element {
  // useSearchParams must sit under a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm(): JSX.Element {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/';
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (status === 'authenticated') router.replace(next);
  }, [status, router, next]);

  async function onSubmit(values: FormValues): Promise<void> {
    setSubmitting(true);
    try {
      const result = await login(values);
      setUser(result.user);
      if (result.user.mustChangePassword) {
        toast.warning('Please change your password before continuing.');
        router.replace('/settings/password');
      } else {
        toast.success(`Welcome, ${result.user.firstName}`);
        router.replace(next);
      }
    } catch (err) {
      const msg = parseError(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        color: 'var(--fg)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 28,
          boxShadow: '0 12px 40px -24px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div
            aria-hidden
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(140deg, #4f46e5, #06b6d4)',
            }}
          />
          <div>
            <div style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>JPhish</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              Phishing Simulation Platform
            </div>
          </div>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 4px' }}>Sign in</h1>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 0, marginBottom: 18 }}>
          Use your work email and the password your administrator gave you.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Work email" error={errors.email?.message}>
            <input
              type="email"
              autoComplete="username"
              autoFocus
              {...register('email')}
              className="input"
              placeholder="you@company.com"
            />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <input
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="input"
              placeholder="••••••••••••"
            />
          </Field>
          <button
            type="submit"
            className="btn primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: 11, color: 'var(--fg-muted)' }}>
          Sessions are protected with refresh-token rotation, server-side rate limiting,
          and account lockout after repeated failed attempts.
        </p>
      </div>
    </main>
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
    <label style={{ display: 'block', marginBottom: 12 }}>
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
        <span
          role="alert"
          style={{ display: 'block', fontSize: 11, color: 'var(--danger, #b91c1c)', marginTop: 4 }}
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

function parseError(err: unknown): string {
  if (typeof err === 'object' && err && 'response' in err) {
    const r = (err as { response?: { data?: { message?: unknown } } }).response;
    const m = r?.data?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && m.length > 0 && typeof m[0] === 'string') return m[0];
    if (r && (r as { status?: number }).status === 429) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
  }
  return 'Sign-in failed. Please try again.';
}
