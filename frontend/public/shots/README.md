# Landing-page product screenshots

The marketing landing (`/`, `app/(marketing)`) renders framed product screenshots
in `src/components/marketing/ProductShowcase.tsx`. Each frame points at a file
here. **Until a real file exists, a wireframe "Screenshot preview" placeholder
shows and the `<img>` hides itself** — so dropping a real capture at the exact
path below makes it appear with **no code change**.

## Files to capture (exact filenames)

| File | Screen to capture | Route | Frame | Target size |
|---|---|---|---|---|
| `dashboard.png` | Dashboard (funnel + stats + top campaigns) | `/dashboard` | Browser 16:10 | 1600×1000 |
| `campaign-wizard.png` | Campaign create wizard (a middle step) | Wizard modal (`/campaigns` → New) | Browser 16:10 | 1600×1000 |
| `reports.png` | Reports (events + submissions + risk) | `/reports` | Browser 16:10 | 1600×1000 |
| `super-admin.png` | Tenants / super-admin overview | `/tenants` | Browser 16:10 | 1600×1000 |
| `phish-email.png` | The simulated phishing email preview | Template editor `MailPreview`, or a rendered `.eml` | Phone 9:19 | 720×1520 |

Frames use `object-fit: cover; object-position: top center`, so capture a little
extra at the bottom rather than the top. Keep the app in **light theme** for a
crisp look (the landing itself is theme-aware; the screenshots are static).

## How to capture (the stack now builds — SWC binary fixed 2026-07-07)

1. **Bring up the stack with demo data** so the screens aren't empty:
   - Postgres + Redis running (`npm run docker:up` or local services).
   - `npm run dev` (frontend :3000 + backend :3001) — or `docker:up` for the full stack.
   - Seed a demo tenant: a few campaigns with sent/opened/clicked/submitted events
     (otherwise Dashboard/Reports show honest empty states, which don't demo well).
2. **Sign in** as an admin/super-admin (super-admin to capture `/tenants`).
3. **Capture at a fixed viewport** for consistent framing. Headless option:
   ```bash
   # one-time: npm i -D playwright && npx playwright install chromium
   node scripts/capture-shots.mjs      # see snippet below
   ```
   Or manually: set the browser to 1600×1000 (device toolbar), hide scrollbars,
   screenshot each route; for the email use 720×1520.
4. **Optimise** before committing (`pngquant --quality 65-85` or `sharp`), aim < 300 KB each.
5. Drop the PNGs here with the exact names above and reload `/` — done.

### Minimal Playwright capture snippet (`scripts/capture-shots.mjs`)
```js
import { chromium } from 'playwright';
const shots = [
  ['/dashboard', 'dashboard.png', 1600, 1000],
  ['/reports',   'reports.png',   1600, 1000],
  ['/tenants',   'super-admin.png',1600, 1000],
];
const base = process.env.APP_URL ?? 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
const p = await ctx.newPage();
// TODO: log in once here (fill /login, submit) so cookies carry to each page.
for (const [route, file] of shots) {
  await p.goto(base + route, { waitUntil: 'networkidle' });
  await p.screenshot({ path: `frontend/public/shots/${file}` });
}
await b.close();
```

> Do not commit fabricated/mocked data as if it were real product output — capture
> from a genuine seeded run (repo convention, CLAUDE.md §6).
