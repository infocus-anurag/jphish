'use client';

import Link from 'next/link';

/** Left-hand brand panel shared by the login and forgot-password screens. */
export function AuthAside(): JSX.Element {
  return (
    <aside className="auth-aside">
      <Link href="/" aria-label="Infocus-IT home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="aside-logo" src="/info-logo.png" alt="Infocus-IT" />
      </Link>
      <div className="aside-copy">
        <h2>Enterprise phishing simulations that build real security awareness</h2>
        <p>
          Build campaigns, clone landing pages, target the right people, and turn every
          click into a measurable risk score — from one multi-tenant platform.
        </p>
        <ul className="aside-points">
          <li>
            <span className="tick"><Tick /></span>
            Role-based access, per tenant
          </li>
          <li>
            <span className="tick"><Tick /></span>
            Realistic templates &amp; landing pages
          </li>
          <li>
            <span className="tick"><Tick /></span>
            Live open, click &amp; submission tracking
          </li>
        </ul>
      </div>
      <div className="aside-foot">© 2026 Infocus-IT · Security Awareness Platform</div>
    </aside>
  );
}

function Tick(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  );
}

/** Password show/hide toggle button that sits inside an input wrapper. */
export function EyeButton({
  shown,
  onToggle,
}: {
  shown: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className="auth-eye"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      tabIndex={-1}
    >
      {shown ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8" />
          <path d="M9.4 5.2A9.7 9.7 0 0 1 12 5c5 0 9 4.5 9.5 6.4a12 12 0 0 1-2.3 3.4M6.2 6.6C3.9 8 2.4 10 2.5 11.4c.4 1.7 3 5.2 7 6.2" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
