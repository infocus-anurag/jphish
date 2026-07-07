'use client';

/**
 * "See it in action" — the product-screenshot section, informed by competitor
 * research: KnowBe4 / Pistachio / EC-Council hide their UI, only Hoxhunt shows
 * it (and leads the category). So we lead with the real product.
 *
 * Each frame renders a faithful, theme-aware HTML/CSS recreation of the actual
 * screen, populated with realistic demo data. SWAP-READY: an <img> pointing at
 * /public/shots/<name>.png sits on top and reveals a real capture the moment one
 * is dropped in (it hides itself on error, showing the CSS frame beneath). See
 * public/shots/README.md.
 */

import type { ReactNode } from 'react';

interface Shot {
  src: string;
  url: string;
  title: string;
  desc: string;
  mock: ReactNode;
}

const PRIMARY: Shot = {
  src: '/shots/dashboard.png',
  url: 'app.infocusit.in/dashboard',
  title: 'Risk analytics dashboard',
  desc: 'Live open, click and submission rates with a conversion funnel and per-campaign risk — the screen incumbents only describe.',
  mock: <DashboardMock />,
};

const SECONDARY: Shot[] = [
  {
    src: '/shots/campaign-wizard.png',
    url: 'app.infocusit.in/campaigns/new',
    title: 'Campaign builder',
    desc: 'Template → landing → targets → launch, in one guided flow.',
    mock: <WizardMock />,
  },
  {
    src: '/shots/reports.png',
    url: 'app.infocusit.in/reports',
    title: 'Reports & risk scoring',
    desc: 'Per-target timelines and colour-coded risk, exportable to CSV.',
    mock: <ReportsMock />,
  },
  {
    src: '/shots/super-admin.png',
    url: 'app.infocusit.in/tenants',
    title: 'Super-admin control plane',
    desc: 'Every tenant, plan and feature toggle from one overview.',
    mock: <TenantsMock />,
  },
];

const EMAIL_SHOT = '/shots/phish-email.png';

function hideOnError(e: React.SyntheticEvent<HTMLImageElement>): void {
  e.currentTarget.style.display = 'none';
}

function BrowserFrame({ shot, big }: { shot: Shot; big?: boolean }): JSX.Element {
  return (
    <figure className={`browser${big ? ' big' : ''}`}>
      <div className="browser-bar">
        <span className="b-dots"><i /><i /><i /></span>
        <span className="b-url">{shot.url}</span>
      </div>
      <div className="browser-body">
        {shot.mock}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shot.src} alt={shot.title} loading="lazy" onError={hideOnError} />
      </div>
    </figure>
  );
}

export function ProductShowcase(): JSX.Element {
  return (
    <section id="product" className="showcase">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">See it in action</span>
          <h2>A transparent look inside the platform</h2>
          <p>No demo gate. The operator console, the campaign builder, and what the target actually receives — in one place.</p>
        </div>

        <div className="shots-primary reveal">
          <BrowserFrame shot={PRIMARY} big />
          <p className="shot-cap center">
            <b>{PRIMARY.title}.</b> <span>{PRIMARY.desc}</span>
          </p>
        </div>

        <div className="shots-grid">
          {SECONDARY.map((s) => (
            <div className="reveal" key={s.src}>
              <BrowserFrame shot={s} />
              <p className="shot-cap">
                <b>{s.title}.</b> <span>{s.desc}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Both sides of the loop — admin vs. the phish the target sees (Hoxhunt pattern) */}
        <div className="showcase-split reveal">
          <div className="split-copy">
            <span className="eyebrow">Both sides of the simulation</span>
            <h3>Show the exact phish your people receive</h3>
            <p>Personalised emails with a tracking pixel and rewritten links, rendered just as they land in the inbox — then measured the moment they open, click, or submit.</p>
            <ul className="split-points">
              <li><Tick /> Merge-variable personalisation per recipient</li>
              <li><Tick /> Invisible open pixel + rewritten click links</li>
              <li><Tick /> Cloned landing page captures the submission event</li>
            </ul>
          </div>
          <div className="split-visual">
            <div className="phone">
              <span className="phone-notch" />
              <div className="phone-body">
                <EmailMock />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={EMAIL_SHOT} alt="Simulated phishing email as the target receives it" loading="lazy" onError={hideOnError} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Product-frame mockups (realistic demo data) ─────────────────────────── */

function DashboardMock(): JSX.Element {
  return (
    <div className="mk mk-dash" aria-hidden="true">
      <div className="mk-top">
        <span className="mk-crumb">JPhish <em>›</em> Dashboard</span>
        <span className="mk-cta">+ New campaign</span>
      </div>
      <div className="mk-banner">Super Admin view · platform-wide controls active</div>
      <div className="mk-pad">
        <div className="mk-stats">
          <Tile label="Emails sent" value="18,420" sub="9 campaigns" />
          <Tile label="Open rate" value="61%" sub="11,236 opened" tone="ink" />
          <Tile label="Click rate" value="23%" sub="4,237 clicked" tone="warn" />
          <Tile label="Submission" value="6.8%" sub="1,253 submitted" tone="bad" />
          <Tile label="Report rate" value="38%" sub="6,999 reported" tone="good" />
        </div>
        <div className="mk-panel">
          <div className="mk-panel-h">Conversion funnel <span>Aggregated across all campaigns</span></div>
          <div className="mk-funnel">
            <FRow label="Sent" pct={100} kind="sent" val="18,420" />
            <FRow label="Opened" pct={61} kind="open" val="11,236" tag="61%" />
            <FRow label="Clicked" pct={23} kind="click" val="4,237" tag="23%" />
            <FRow label="Submitted" pct={6.8} kind="sub" val="1,253" tag="6.8%" />
            <FRow label="Reported" pct={38} kind="rep" val="6,999" tag="38%" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }): JSX.Element {
  return (
    <div className="mk-tile">
      <em>{label}</em>
      <b className={tone ? `t-${tone}` : ''}>{value}</b>
      <i>{sub}</i>
    </div>
  );
}

function FRow({ label, pct, kind, val, tag }: { label: string; pct: number; kind: string; val: string; tag?: string }): JSX.Element {
  return (
    <div className="mk-fr">
      <span className="mk-fl">{label}</span>
      <div className="mk-track">
        <div className={`mk-bar ${kind}`} style={{ width: `${Math.max(pct, 3)}%` }}>{val}</div>
      </div>
      <i className="mk-fp">{tag ?? '—'}</i>
    </div>
  );
}

function WizardMock(): JSX.Element {
  const steps = ['Basics', 'Template & sender', 'Landing page', 'Audience', 'Schedule', 'Review'];
  return (
    <div className="mk mk-wiz" aria-hidden="true">
      <div className="mk-wiz-head"><b>New campaign</b><span>Step 2 of 6</span></div>
      <div className="mk-wiz-body">
        <ol className="mk-steps">
          {steps.map((s, i) => (
            <li key={s} className={i === 0 ? 'done' : i === 1 ? 'active' : ''}>
              <span className="mk-dot">{i === 0 ? '✓' : i + 1}</span>{s}
            </li>
          ))}
        </ol>
        <div className="mk-wiz-main">
          <label>Email template</label>
          <div className="mk-field">Password Expiry Notice · Action required<em>▾</em></div>
          <label>Sending profile (SMTP)</label>
          <div className="mk-field focus">Microsoft 365 · IT Support<em>▾</em></div>
          <div className="mk-mailprev">
            <div className="mk-mp-h">
              <span><b>From</b> IT Support &lt;no-reply@it-support.northwind-trading.com&gt;</span>
              <span><b>Subject</b> Action required: your password expires today</span>
            </div>
            <div className="mk-mp-b">Hi Alex — our records show your password expires today. Reset it now via the secure portal to keep your access.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsMock(): JSX.Element {
  const events = [
    { t: '09:24:37', tag: 'open', label: 'open', e: 'j.rivera@northwind-trading.com' },
    { t: '09:21:02', tag: 'click', label: 'click', e: 's.okafor@northwind-trading.com' },
    { t: '09:18:44', tag: 'sub', label: 'form_submission', e: 'm.delacruz@northwind-trading.com' },
    { t: '09:12:10', tag: 'open', label: 'open', e: 'a.thompson@northwind-trading.com' },
  ];
  return (
    <div className="mk mk-rep" aria-hidden="true">
      <div className="mk-top">
        <span className="mk-crumb">JPhish <em>›</em> Reports</span>
        <span className="mk-live"><i />Live</span>
      </div>
      <div className="mk-pad">
        <div className="mk-mini">
          <span><em>Sent</em><b>18,420</b></span>
          <span><em>Opened</em><b className="t-ink">61%</b></span>
          <span><em>Clicked</em><b className="t-warn">23%</b></span>
          <span><em>Submitted</em><b className="t-bad">6.8%</b></span>
          <span><em>Reported</em><b className="t-good">38%</b></span>
        </div>
        <div className="mk-evhead">Events <em>Export CSV</em></div>
        <div className="mk-events">
          {events.map((ev) => (
            <div className="mk-ev" key={ev.t}>
              <span className="t">{ev.t}</span>
              <span className={`mk-tag ${ev.tag}`}>{ev.label}</span>
              <span className="e">{ev.e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TenantsMock(): JSX.Element {
  const rows = [
    { name: 'Northwind Trading Co.', slug: 'northwind', status: 'Active', plan: 'Enterprise' },
    { name: 'Acme Financial', slug: 'acme-financial', status: 'Active', plan: 'Professional' },
    { name: 'Globex Logistics', slug: 'globex', status: 'Trial', plan: 'Starter' },
    { name: 'Initech Systems', slug: 'initech', status: 'Suspended', plan: 'Professional' },
  ];
  return (
    <div className="mk mk-ten" aria-hidden="true">
      <div className="mk-top">
        <span className="mk-crumb">JPhish <em>›</em> Tenants</span>
        <span className="mk-cta">+ New tenant</span>
      </div>
      <div className="mk-pad">
        <div className="mk-thead"><span>Organization</span><span>Status</span><span>Plan</span></div>
        {rows.map((r) => (
          <div className="mk-trow" key={r.slug}>
            <span className="mk-org"><b>{r.name}</b><i>{r.slug}</i></span>
            <span><em className={`mk-pill ${r.status.toLowerCase()}`}>{r.status}</em></span>
            <span className="mk-plan">{r.plan}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailMock(): JSX.Element {
  return (
    <div className="mk mk-mail" aria-hidden="true">
      <div className="mk-mail-bar">Inbox</div>
      <div className="mk-mail-head">
        <div className="mk-mail-from"><span className="mk-ava">IT</span><span><b>IT Support</b><i>no-reply@it-support.northwind-trading.com</i></span></div>
        <div className="mk-mail-subj">Action required: your password expires today</div>
        <div className="mk-mail-meta">to alex.morgan@northwind-trading.com · 9:02 AM</div>
      </div>
      <div className="mk-mail-body">
        <p>Hi Alex,</p>
        <p>Our records show your network password <b>expires today</b>. To avoid losing access to email and shared drives, please verify your account and set a new password.</p>
        <span className="mk-mail-btn">Reset my password</span>
        <p className="mk-mail-sig">Thanks,<br />IT Support · Northwind Trading Co.</p>
      </div>
    </div>
  );
}

function Tick(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  );
}
