# Landing page: competitor insight + real product-screenshot plan

Two things: (1) what the competitors do and what it means for us, (2) the concrete plan
for putting **real demo snaps** of our app into the landing page — including the swap-ready
scaffolding already shipped this pass.

---

## 1. Competitor research

Sources: knowbe4.com, hoxhunt.com, pistachioapp.com, aware.eccouncil.org (fetched 2026-07-07).

| Platform | Positioning | Real product UI on landing page? |
|---|---|---|
| **KnowBe4** | Incumbent scale — biggest library + reporting, now "Human + AI" | **Minimal** — abstract illustrations, a SmartRisk *diagram*, no dashboards/builder/report screenshots. Product gated behind "Get a Demo". Sells trust: "70,000+ orgs", logo wall, Gartner badges. |
| **Hoxhunt** | "#1 rated Human Risk Management" — gamified, AI-personalised behaviour change | **Strong** — every benefit paired with a real UI mockup: inbox phishing sim, admin-console vs. end-user module side-by-side, threat notification + incident log. **Phone-first device frames**, a Wistia video, hard stat band (20x, 90%, 75%). |
| **Pistachio** | Low-admin HRM native to Microsoft Entra ID, "under 10 min" setup | **Minimal** — animated integration orbit + animated counters, not literal dashboards. Sells effortlessness; ISO 27001 badge, transparent pricing. |
| **EC-Council "Aware/Beware"** | Multi-channel sims (email/SMS/vishing/WhatsApp) + LMS, brand authority | **None** — one datasheet thumbnail, text + lead form. Leans entirely on the EC-Council brand. |

### The strategic gap
Three of four incumbents **hide their product** behind diagrams, brand, and demo-gates. Only
Hoxhunt shows real UI — and it's the category leader. **Showing our actual interface is the
cheapest available competitive edge.** We can't out-logo KnowBe4; we can out-*show* all of them.

### Actionable insights (applied)
1. **Lead with real UI, not abstract art** — front-load a product section high on the page. ✅ added right after the hero.
2. **Signature screen = risk analytics dashboard** in a browser frame. ✅ primary frame.
3. **Show the campaign builder** as an easy guided flow (our Stepper/wizard). ✅ secondary frame.
4. **Phishing-email preview is the emotional hook** — show what the target receives, in a phone frame. ✅ split section + phone.
5. **Pair every claim with a screenshot** (Hoxhunt pattern) rather than text-only benefits. ✅ captions per frame; existing feature grid stays.
6. **Show both sides** — operator console *and* target experience. ✅ "Both sides of the simulation" split.
7. **At least one phone frame** for mobile-first credibility. ✅.
8. **A short looping GIF/video tour** raises perceived polish — *recommended next* (not yet added).
9. **A stat/capability band** of big numerals. ✅ added — but with **honest capability facts**, not fabricated outcome stats (repo rule §6). Swap to real outcome metrics once we have them.
10. **Lead the multi-tenant / super-admin story with a visual** — none of the four show this. ✅ super-admin frame.
11. **Risk scoring as colour-coded, chart-forward UI** — the category's shared language. ✅ reports/risk frame + funnel.
12. **Right-size trust** — no fake logo wall; keep "Book a demo" repeated, add a compliance badge row when real. Security section already covers RBAC/audit/SSO/GDPR.

---

## 2. What shipped this pass (scaffolding)

The landing now has, in `app/(marketing)/page.tsx`:
- A **capability band** (`.statband`) — 6 modules · 3 tracked signals · multi-tenant · minutes-to-launch (honest facts).
- A **"See it in action" showcase** — `src/components/marketing/ProductShowcase.tsx`:
  - Primary **browser frame** (16:10) → dashboard.
  - Three secondary browser frames → campaign builder, reports/risk, super-admin.
  - A **"both sides" split** with a **phone frame** → the phishing email as the target sees it.
- New scoped styles in `app/(marketing)/landing.css`; a **"Product"** nav link.

### Swap-ready — no code change to add real snaps
Each frame points at a file in `frontend/public/shots/`. Until a real PNG exists there, a
**wireframe "Screenshot preview"** skeleton shows and the `<img>` hides itself on error
(`onError`). Drop a real capture at the documented path and it appears. Files, sizes, and the
exact capture workflow are in **`frontend/public/shots/README.md`**.

| Frame | File | Route to capture |
|---|---|---|
| Dashboard (primary) | `shots/dashboard.png` | `/dashboard` |
| Campaign builder | `shots/campaign-wizard.png` | wizard modal |
| Reports & risk | `shots/reports.png` | `/reports` |
| Super-admin | `shots/super-admin.png` | `/tenants` |
| Phishing email (phone) | `shots/phish-email.png` | template `MailPreview` / rendered `.eml` |

### Capture workflow (unblocked — SWC build binary fixed this pass)
1. `next build` now works again (the corrupt `@next/swc-darwin-x64` binary was reinstalled).
2. Bring up the stack **with seed data** (`npm run dev` or `docker:up` + a demo tenant with
   campaigns that have sent/opened/clicked/submitted events — otherwise the screens show honest
   empty states that don't demo well).
3. Sign in (super-admin for `/tenants`), capture each route at a **fixed 1600×1000** viewport
   (phone at 720×1520). A minimal Playwright script is in the shots README.
4. Optimise (`pngquant`/`sharp`, < 300 KB), drop the PNGs into `public/shots/`, reload `/`.

### Recommended next (not yet done)
- A 15–30s **silent looping screen-capture** of building + launching a campaign (Hoxhunt's edge);
  self-host as an inlined/`public/` `.webm`/`.gif` in the primary frame.
- Replace the capability band's facts with **real outcome metrics** once campaigns have run
  (e.g. click-rate reduction over N campaigns) — keep them honest.
- A compliance **badge row** (SOC 2 / ISO 27001) when certifications are real.
