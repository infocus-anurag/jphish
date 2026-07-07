'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { forgotPassword } from '@/lib/auth-api';
import { AuthAside } from '@/components/auth/AuthChrome';
import '@/styles/auth.css';

const schema = z.object({
  email: z.string().email('Enter a valid email').max(254),
});
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage(): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues): Promise<void> {
    setSubmitting(true);
    try {
      await forgotPassword(values.email);
      setSentTo(values.email);
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

          {sentTo ? (
            <div className="auth-confirm">
              <span className="check-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5 9 17.5 20 6.5" />
                </svg>
              </span>
              <h1>Check your inbox</h1>
              <p className="sub">
                If an account exists for <span className="sent-to">{sentTo}</span>, we&rsquo;ve sent a
                link to reset your password. It expires in 30 minutes.
              </p>
              <button
                type="button"
                className="auth-btn secondary"
                onClick={() => setSentTo(null)}
              >
                Use a different email
              </button>
              <Link href="/login" className="auth-back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1>Reset your password</h1>
              <p className="sub">
                Enter the work email tied to your account and we&rsquo;ll send you a secure
                link to choose a new password.
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

                <button type="submit" className="auth-btn" disabled={submitting}>
                  {submitting ? <><span className="auth-spinner" /> Sending link…</> : 'Send reset link'}
                </button>
              </form>

              <Link href="/login" className="auth-back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                Back to sign in
              </Link>
              <p className="auth-foot" style={{ marginTop: 16 }}>
                Still stuck? Contact your organization administrator to have your access reset.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
