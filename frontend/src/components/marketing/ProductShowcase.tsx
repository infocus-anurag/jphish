'use client';

/**
 * "See it in action" — the product-screenshot section, informed by competitor
 * research: KnowBe4 / Pistachio / EC-Council hide their UI, only Hoxhunt shows
 * it (and leads the category). So we lead with real screenshots.
 *
 * SWAP-READY: each frame points at a file in /public/shots/. Until a real PNG
 * exists there, a wireframe skeleton shows and the <img> hides itself on error.
 * Drop a real capture at the documented path (see public/shots/README.md) and
 * it appears with no code change. Capture aspect ratios: browser = 16:10,
 * phone = 9:19.
 */

interface Shot {
  src: string;
  url: string;
  title: string;
  desc: string;
}

const PRIMARY: Shot = {
  src: '/shots/dashboard.png',
  url: 'app.infocusit.in/dashboard',
  title: 'Risk analytics dashboard',
  desc: 'Live open, click and submission rates with a conversion funnel and per-campaign risk — the screen incumbents only describe.',
};

const SECONDARY: Shot[] = [
  {
    src: '/shots/campaign-wizard.png',
    url: 'app.infocusit.in/campaigns/new',
    title: 'Campaign builder',
    desc: 'Template → landing → targets → launch, in one guided flow.',
  },
  {
    src: '/shots/reports.png',
    url: 'app.infocusit.in/reports',
    title: 'Reports & risk scoring',
    desc: 'Per-target timelines and colour-coded risk, exportable to CSV.',
  },
  {
    src: '/shots/super-admin.png',
    url: 'app.infocusit.in/tenants',
    title: 'Super-admin control plane',
    desc: 'Every tenant, plan and feature toggle from one overview.',
  },
];

const EMAIL_SHOT = '/shots/phish-email.png';

function hideOnError(e: React.SyntheticEvent<HTMLImageElement>): void {
  e.currentTarget.style.display = 'none';
}

function Skeleton(): JSX.Element {
  return (
    <div className="shot-skel" aria-hidden="true">
      <div className="sk-top" />
      <div className="sk-body">
        <div className="sk-side">
          <span /><span /><span /><span />
        </div>
        <div className="sk-main">
          <div className="sk-cards">
            <i /><i /><i /><i />
          </div>
          <div className="sk-chart" />
          <div className="sk-rows">
            <em /><em /><em /><em />
          </div>
        </div>
      </div>
      <span className="shot-tag">Screenshot preview</span>
    </div>
  );
}

function BrowserFrame({ shot, big }: { shot: Shot; big?: boolean }): JSX.Element {
  return (
    <figure className={`browser${big ? ' big' : ''}`}>
      <div className="browser-bar">
        <span className="b-dots"><i /><i /><i /></span>
        <span className="b-url">{shot.url}</span>
      </div>
      <div className="browser-body">
        <Skeleton />
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
                <div className="shot-skel phone-skel" aria-hidden="true">
                  <div className="sk-mail-head"><span /><span /></div>
                  <div className="sk-mail-body"><i /><i /><i /><i /><b /></div>
                  <span className="shot-tag">Email preview</span>
                </div>
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

function Tick(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  );
}
