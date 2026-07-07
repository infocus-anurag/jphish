'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ProductShowcase } from '@/components/marketing/ProductShowcase';

/* Small repeated marks kept as components so the markup stays readable. */
function Check(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  );
}
function DownArrow(): JSX.Element {
  return (
    <div className="connector">
      <svg viewBox="0 0 15 22" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path className="flowline" d="M7.5 1v14" />
        <path d="M3.5 12.5 7.5 17l4-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
function RightArrow(): JSX.Element {
  return (
    <div className="tarrow">
      <svg viewBox="0 0 30 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path className="flowline" d="M1 8h22" />
        <path d="M19 4l5 4-5 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const LOGO = '/info-logo.png';

export default function MarketingPage(): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  function toggleTheme(): void {
    const el = rootRef.current;
    if (!el) return;
    const attr = el.getAttribute('data-lp-theme');
    const isDark =
      attr === 'dark' ||
      (!attr && window.matchMedia('(prefers-color-scheme: dark)').matches);
    el.setAttribute('data-lp-theme', isDark ? 'light' : 'dark');
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const nav = root.querySelector('.nav');
    const onScroll = (): void => {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));
    let io: IntersectionObserver | null = null;
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
    } else {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            const sibs = Array.from(el.parentElement?.children ?? []).filter((c) =>
              c.classList.contains('reveal'),
            );
            el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 5) * 70}ms`;
            el.classList.add('in');
            io?.unobserve(el);
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      items.forEach((el) => io?.observe(el));
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      io?.disconnect();
    };
  }, []);

  return (
    <div className="lp" ref={rootRef} id="top">
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <a href="#top" className="brand" aria-label="Infocus-IT home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src={LOGO} alt="Infocus-IT" width={238} height={77} />
          </a>
          <nav className="nav-links">
            <a href="#product">Product</a>
            <a href="#features">Features</a>
            <a href="#platform">Platform</a>
            <a href="#pricing">Pricing</a>
            <a href="#security">Security</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="nav-right">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle color theme" type="button">
              <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4" /></svg>
              <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.2A8 8 0 0 1 9.8 4 8 8 0 1 0 20 14.2Z" /></svg>
            </button>
            <Link href="/login" className="nav-login">Login</Link>
            <Link href="/login" className="btn btn-primary">Start Simulation</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="hero">
        <div className="wrap hero-grid">
          <div className="reveal">
            <span className="hero-pill"><span className="tag">New</span> Multi-tenant campaign engine, now GA</span>
            <h1>Enterprise phishing simulations that build real security awareness</h1>
            <p className="lead">Create phishing campaigns, realistic landing pages, email templates, and automated user targeting — all from one multi-tenant platform.</p>
            <div className="hero-cta">
              <Link href="/login" className="btn btn-primary btn-lg">Start free trial
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              <a href="#contact" className="btn btn-ghost btn-lg">Book demo</a>
            </div>
            <div className="hero-trust">
              <span>Trusted by security teams at scale</span>
              <span className="dot" />
              <span className="tnum">SOC 2 aligned</span>
              <span className="dot" />
              <span className="tnum">99.9% delivery</span>
            </div>
          </div>

          {/* Pipeline visual */}
          <div className="pipe reveal" aria-label="Campaign workflow pipeline">
            <div className="pipe-head">
              <span className="dots"><i /><i /><i /></span>
              <span className="label">Campaign pipeline</span>
              <span className="live"><i /> Running</span>
            </div>
            <div className="flow">
              <div className="node">
                <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></span>
                <span className="txt"><b>Email Templates</b><span>Q3 Payroll Notice</span></span>
                <span className="meta">HTML</span>
              </div>
              <DownArrow />
              <div className="node">
                <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M4 7h16M4 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7M4 7l4-3h8l4 3" /><circle cx="12" cy="13" r="2.4" /></svg></span>
                <span className="txt"><b>Sending Profiles</b><span>mail.acme-corp.io</span></span>
                <span className="meta g">Verified</span>
              </div>
              <DownArrow />
              <div className="node">
                <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 14h6" /></svg></span>
                <span className="txt"><b>Landing Pages</b><span>SSO sign-in clone</span></span>
                <span className="meta">Cloned</span>
              </div>
              <DownArrow />
              <div className="node">
                <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5.6M18.5 19a5.5 5.5 0 0 0-3-4.9" /></svg></span>
                <span className="txt"><b>Targets &amp; Groups</b><span>Finance · 214 users</span></span>
                <span className="meta tnum">214</span>
              </div>
              <DownArrow />
              <div className="node">
                <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M5 3.5 20 12 5 20.5 8 12 5 3.5Z" strokeLinejoin="round" /><path d="M8 12h12" /></svg></span>
                <span className="txt"><b>Launch Campaign</b><span>Scheduled · 09:00 GMT</span></span>
                <span className="meta g">Sending</span>
              </div>
              <DownArrow />
              <div className="node">
                <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></span>
                <span className="txt"><b>Track Results</b><span>Opens · clicks · submits</span></span>
                <span className="meta tnum">62% open</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITY BAND */}
      <section className="statband">
        <div className="wrap statband-inner">
          <div className="st"><div className="n">6</div><div className="l">Integrated modules</div></div>
          <div className="st"><div className="n">3</div><div className="l">Signals tracked — open, click, submit</div></div>
          <div className="st"><div className="n">Multi&#8209;tenant</div><div className="l">Super-admin control plane</div></div>
          <div className="st"><div className="n">Minutes</div><div className="l">From template to launched campaign</div></div>
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <ProductShowcase />

      {/* FEATURES */}
      <section id="features">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Features</span>
            <h2>Everything you need to run a program, not just a test</h2>
            <p>Six connected modules take a simulation from a blank template to a board-ready risk score.</p>
          </div>
          <div className="feature-grid">
            <div className="fcard reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 17.5h7M17.5 14v7" /></svg></div>
              <h3>Campaign Builder</h3>
              <p>Compose the whole attack flow visually, then hand scheduling to the queue.</p>
              <ul>
                <li><Check />Drag-and-drop campaign flow</li>
                <li><Check />Campaign scheduling</li>
                <li><Check />Email personalization</li>
              </ul>
            </div>
            <div className="fcard reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></svg></div>
              <h3>Email Templates</h3>
              <p>Author pixel-accurate emails with a live editor and a reusable library.</p>
              <ul>
                <li><Check />HTML editor with live preview</li>
                <li><Check />Merge variables</li>
                <li><Check />Shared template library</li>
              </ul>
            </div>
            <div className="fcard reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M6.5 6.5h.01M9 6.5h.01M7 14h5" /></svg></div>
              <h3>Landing Pages</h3>
              <p>Clone a login screen or build one, then measure who submits credentials.</p>
              <ul>
                <li><Check />Login page builder</li>
                <li><Check />Brand customization</li>
                <li><Check />Credential-capture simulation</li>
              </ul>
            </div>
            <div className="fcard reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M4 7h16M4 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7M4 7l4-3h8l4 3" /><circle cx="12" cy="13" r="2.4" /></svg></div>
              <h3>Sending Profiles</h3>
              <p>Manage SMTP identities and domains with deliverability in view.</p>
              <ul>
                <li><Check />SMTP &amp; API profiles</li>
                <li><Check />Multiple sending domains</li>
                <li><Check />Reputation management</li>
              </ul>
            </div>
            <div className="fcard reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5.6M18.5 19a5.5 5.5 0 0 0-3-4.9" /></svg></div>
              <h3>Users &amp; Groups</h3>
              <p>Bring your directory in and slice it into the audiences you actually test.</p>
              <ul>
                <li><Check />Import via CSV</li>
                <li><Check />Department segmentation</li>
                <li><Check />Dynamic groups</li>
              </ul>
            </div>
            <div className="fcard reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></div>
              <h3>Analytics</h3>
              <p>Follow every interaction from open to submission and turn it into risk.</p>
              <ul>
                <li><Check />Open &amp; click rate</li>
                <li><Check />Credential submission</li>
                <li><Check />Per-user risk scoring</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" style={{ background: 'var(--wash)' }}>
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">How it works</span>
            <h2>From draft to report in one continuous flow</h2>
            <p>Every step feeds the next — no exports, no glue scripts, no context lost between tools.</p>
          </div>
          <div className="timeline-wrap reveal">
            <div className="timeline">
              <div className="tstep"><div className="tcard"><span className="num tnum">1</span><b>Create Template</b><span>Draft the email &amp; variables</span></div></div>
              <RightArrow />
              <div className="tstep"><div className="tcard"><span className="num tnum">2</span><b>Create Landing Page</b><span>Clone or build the target</span></div></div>
              <RightArrow />
              <div className="tstep"><div className="tcard"><span className="num tnum">3</span><b>Configure SMTP</b><span>Pick a sending profile</span></div></div>
              <RightArrow />
              <div className="tstep"><div className="tcard"><span className="num tnum">4</span><b>Select Users</b><span>Choose groups &amp; targets</span></div></div>
              <RightArrow />
              <div className="tstep"><div className="tcard"><span className="num tnum">5</span><b>Launch Campaign</b><span>Send now or schedule</span></div></div>
              <RightArrow />
              <div className="tstep"><div className="tcard"><span className="num tnum">6</span><b>Monitor Results</b><span>Live opens &amp; clicks</span></div></div>
              <RightArrow />
              <div className="tstep"><div className="tcard"><span className="num tnum">7</span><b>Export Reports</b><span>CSV &amp; board summary</span></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-TENANT */}
      <section id="platform">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Platform</span>
            <h2>Built multi-tenant from the first table</h2>
            <p>One control plane governs every tenant. Each tenant runs its own isolated program, branding, and data.</p>
          </div>
          <div className="tenant">
            <div className="super reveal">
              <div className="role">Super Admin</div>
              <h3>Global control plane</h3>
              <div className="caps">
                <span>Tenant management</span>
                <span>Plan management</span>
                <span>User access control</span>
                <span>Feature toggles</span>
                <span>Storage limits</span>
                <span>License allocation</span>
              </div>
            </div>
            <div className="tenant-branch reveal" aria-hidden="true">
              <svg viewBox="0 0 600 40" fill="none" stroke="currentColor" strokeWidth={2}><path d="M300 0v14M100 40V26a12 12 0 0 1 12-12h376a12 12 0 0 1 12 12v14M300 14v26" /></svg>
            </div>
            <div className="tenant-row">
              <div className="tcard2 reveal">
                <div className="th"><span className="av">A</span><div><b>Tenant A</b><span>Acme Financial</span></div><span className="badge">Active</span></div>
                <div className="assets"><span>Users</span><span>Campaigns</span><span>Templates</span><span>Reports</span><span>Branding</span></div>
              </div>
              <div className="tcard2 reveal">
                <div className="th"><span className="av">B</span><div><b>Tenant B</b><span>Northwind Health</span></div><span className="badge">Active</span></div>
                <div className="assets"><span>Users</span><span>Campaigns</span><span>Templates</span><span>Reports</span><span>Branding</span></div>
              </div>
              <div className="tcard2 reveal">
                <div className="th"><span className="av">C</span><div><b>Tenant C</b><span>Contoso Retail</span></div><span className="badge">Active</span></div>
                <div className="assets"><span>Users</span><span>Campaigns</span><span>Templates</span><span>Reports</span><span>Branding</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="why" style={{ background: 'var(--wash)' }}>
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Why teams choose us</span>
            <h2>Serious infrastructure, without the enterprise drag</h2>
          </div>
          <div className="why-grid">
            <div className="why reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M12 2 4 5v6c0 4.5 3.2 8.3 8 10 4.8-1.7 8-5.5 8-10V5l-8-3Z" /><path d="m8.8 11.8 2.3 2.3 4.3-4.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <h3>Enterprise Ready</h3>
              <p>RBAC, audit logs, SSO, and data controls that pass procurement review.</p>
            </div>
            <div className="why reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg></div>
              <h3>Multi-Tenant Architecture</h3>
              <p>Hard isolation between tenants — separate data, branding, and access.</p>
            </div>
            <div className="why reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></div>
              <h3>Realistic Simulations</h3>
              <p>Cloned landing pages and personalized emails that mirror real attacks.</p>
            </div>
            <div className="why reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" strokeLinejoin="round" /></svg></div>
              <h3>Fast Deployment</h3>
              <p>Launch a full campaign in minutes with a queue that scales with you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Pricing</span>
            <h2>Simple plans that grow with your program</h2>
            <p>Start free, scale to unlimited tenants. No per-seat surprises.</p>
          </div>
          <div className="price-grid">
            <div className="pcard reveal">
              <div className="plan">Starter</div>
              <div className="price"><span className="amt">$0</span><span className="per">/ mo</span></div>
              <p>For a single team testing the waters.</p>
              <ul>
                <li><Check />1 tenant · up to 100 users</li>
                <li><Check />Core templates &amp; landing pages</li>
                <li><Check />Basic analytics</li>
              </ul>
              <Link href="/login" className="btn btn-soft">Start free</Link>
            </div>
            <div className="pcard featured reveal">
              <div className="plan">Professional <span className="star">Popular</span></div>
              <div className="price"><span className="amt">$490</span><span className="per">/ mo</span></div>
              <p>For security teams running an ongoing program.</p>
              <ul>
                <li><Check />Up to 5 tenants · 5,000 users</li>
                <li><Check />Dynamic groups &amp; scheduling</li>
                <li><Check />Risk scoring &amp; CSV reports</li>
                <li><Check />SSO &amp; audit logs</li>
              </ul>
              <Link href="/login" className="btn btn-primary">Start free trial</Link>
            </div>
            <div className="pcard reveal">
              <div className="plan">Enterprise</div>
              <div className="price"><span className="amt">Custom</span></div>
              <p>For programs at organizational scale.</p>
              <ul>
                <li><Check />Unlimited tenants &amp; users</li>
                <li><Check />Feature toggles &amp; license control</li>
                <li><Check />Dedicated support &amp; SLA</li>
              </ul>
              <a href="#contact" className="btn btn-ghost">Contact sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="sec-section">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Security &amp; compliance</span>
            <h2>The controls your reviewers ask about first</h2>
          </div>
          <div className="sec-grid">
            <div className="sitem reveal">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /><path d="M12 12v3" strokeLinecap="round" /></svg></span>
              <div><b>Role-Based Access Control</b><span>Scope every action to a role, per tenant.</span></div>
            </div>
            <div className="sitem reveal">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M8 13h8M8 17h5" strokeLinecap="round" /></svg></span>
              <div><b>Audit Logs</b><span>Immutable trail of every admin change.</span></div>
            </div>
            <div className="sitem reveal">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" strokeLinecap="round" /></svg></span>
              <div><b>Secure Credential Storage</b><span>Captured data encrypted &amp; access-gated.</span></div>
            </div>
            <div className="sitem reveal">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><rect x="3" y="4" width="8" height="16" rx="1.5" /><rect x="13" y="4" width="8" height="16" rx="1.5" /></svg></span>
              <div><b>Tenant Isolation</b><span>No shared state or data across tenants.</span></div>
            </div>
            <div className="sitem reveal">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3Z" /></svg></span>
              <div><b>GDPR Ready</b><span>Data residency, retention &amp; erasure.</span></div>
            </div>
            <div className="sitem reveal">
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M15 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3M10 12H3m0 0 3-3m-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <div><b>SSO Support</b><span>SAML &amp; OIDC with your identity provider.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="contact" className="final">
        <div className="wrap">
          <div className="final-card reveal">
            <span className="eyebrow">Get started</span>
            <h2>Ready to test your organization&rsquo;s security awareness?</h2>
            <p>Spin up your first campaign today, or talk to us about a program built for your scale.</p>
            <div className="btns">
              <Link href="/login" className="btn btn-primary btn-lg">Start free trial</Link>
              <a href="mailto:sales@infocusit.in" className="btn btn-ghost btn-lg">Contact sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="brand-logo" src={LOGO} alt="Infocus-IT" width={238} height={77} />
              <p>Enterprise phishing simulation and security awareness training, from one multi-tenant platform.</p>
            </div>
            <div className="foot-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#platform">Platform</a>
              <a href="#pricing">Pricing</a>
              <a href="#workflow">How it works</a>
            </div>
            <div className="foot-col">
              <h4>Resources</h4>
              <a href="#">Documentation</a>
              <a href="#pricing">Pricing</a>
              <a href="#security">Security</a>
              <a href="#">Changelog</a>
            </div>
            <div className="foot-col">
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#security">Compliance</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
          <div className="foot-bottom">
            <p>© 2026 Infocus-IT. All rights reserved.</p>
            <div className="foot-social">
              <a href="#" aria-label="GitHub"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10.1 10.1 0 0 0 22 12.3C22 6.6 17.5 2 12 2Z" /></svg></a>
              <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.5h4V21H3V9.5Zm6 0h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21H17.6v-5.2c0-1.24-.02-2.83-1.72-2.83-1.72 0-1.98 1.35-1.98 2.74V21H9V9.5Z" /></svg></a>
              <a href="#" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3.1l-6.8 7.7L22 21h-6.3l-4.9-6.4L5.1 21H2l7.3-8.3L2 3h6.4l4.4 5.9L17.5 3Zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5Z" /></svg></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
