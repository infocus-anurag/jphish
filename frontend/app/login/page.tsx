'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { login } from '@/lib/auth-api';
import { useAuthStore } from '@/store/auth.store';
import { AuthAside, EyeButton } from '@/components/auth/AuthChrome';
import '@/styles/auth.css';

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
  const next = search.get('next') ?? '/dashboard';
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

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
        toast.success(`Welcome back, ${result.user.firstName}`);
        router.replace(next);
      }
    } catch (err) {
      toast.error(parseError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth">
      <AuthAside />
      <div className="auth-main">
        <div className="auth-card">
          <div className="card-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="card-logo" src="/info-logo.png" alt="Infocus-IT" />
            <span className="card-brand-name">JPhish</span>
          </div>
          <h1>Sign in to your workspace</h1>
          <p className="sub">
            Use your work email and the password your administrator gave you.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <label className="auth-field">
              <span className="lbl">Work email</span>
              <div className="auth-input-wrap">
                <input
                  type="email"
                  autoComplete="username"
                  autoFocus
                  {...register('email')}
                  className={`auth-input${errors.email ? ' invalid' : ''}`}
                  placeholder="you@company.com"
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email ? <span className="auth-error" role="alert">{errors.email.message}</span> : null}
            </label>

            <label className="auth-field">
              <span className="lbl">
                Password
                <Link href="/forgot-password">Forgot password?</Link>
              </span>
              <div className="auth-input-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`auth-input has-toggle${errors.password ? ' invalid' : ''}`}
                  placeholder="Enter your password"
                  aria-invalid={!!errors.password}
                />
                <EyeButton shown={showPw} onToggle={() => setShowPw((v) => !v)} />
              </div>
              {errors.password ? <span className="auth-error" role="alert">{errors.password.message}</span> : null}
            </label>

            <button type="submit" className="auth-btn" disabled={submitting}>
              {submitting ? <><span className="auth-spinner" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="auth-foot">
            Protected with refresh-token rotation, server-side rate limiting, and account
            lockout after repeated failed attempts. Need an account?{' '}
            <span style={{ color: 'var(--a-slate)' }}>Ask your organization administrator.</span>
          </p>
        </div>
      </div>
    </main>
  );
}

function parseError(err: unknown): string {
  if (typeof err === 'object' && err && 'response' in err) {
    const r = (err as { response?: { data?: { message?: unknown }; status?: number } }).response;
    const m = r?.data?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && m.length > 0 && typeof m[0] === 'string') return m[0];
    if (r?.status === 429) return 'Too many attempts. Please wait a moment and try again.';
  }
  return 'Sign-in failed. Please try again.';
}
