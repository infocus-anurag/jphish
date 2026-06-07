# Deploying PhishGuard AI to Railway

This is the "Vercel-like" path for this stack. Railway gives you Git-push deploys, one-click
managed Postgres + Redis, and persistent containers (which you need — Bull workers and the
phish-server can't run on serverless).

## What gets deployed

| Railway service | From | Public? | Notes |
|---|---|---|---|
| **backend** | `docker/Dockerfile.backend` | Yes — **two domains** | One process boots BOTH the admin API (`:3001`) and the public phish-server (`:3002`). The Bull worker (`CampaignProcessor`) also runs inside this process — no separate worker service needed. |
| **frontend** | `docker/Dockerfile.frontend` | Yes | Next.js 14 (`next start`). |
| **Postgres** | Railway plugin | internal | Managed, with backups. |
| **Redis** | Railway plugin | internal | Backs the Bull "campaigns" queue. |

> The backend listening on two ports is why it needs **two domains on one service** (see Step 5).
> The admin and phish surfaces are deliberately separate origins so admin cookies never reach the
> phish surface.

---

## Step 0 — Prerequisites

- Push this repo to GitHub (Railway deploys from a GitHub repo).
- A Railway account (railway.app). The free trial works; campaigns + Redis will want the Hobby plan.
- Files already added to the repo for you: `railway.backend.json`, `railway.frontend.json`, and
  build-arg support in `docker/Dockerfile.frontend`.

---

## Step 1 — Create the project + datastores

1. New Project → **Deploy from GitHub repo** → pick this repo.
2. In the project canvas: **+ New → Database → Add PostgreSQL**.
3. **+ New → Database → Add Redis**.

Railway names them `Postgres` and `Redis`. You'll reference their variables below.

---

## Step 2 — Backend service

1. **+ New → GitHub Repo** (same repo) → this creates a service. Rename it **backend**.
2. Service → **Settings → Config-as-code**: set the path to `railway.backend.json`.
   (This points Railway at `docker/Dockerfile.backend` and the `/api/v1/health` healthcheck.)
3. Add the **Variables** below (Step 4).

## Step 3 — Frontend service

1. **+ New → GitHub Repo** (same repo) again → rename it **frontend**.
2. **Settings → Config-as-code**: set the path to `railway.frontend.json`.
3. Add the frontend **Variables** below.

---

## Step 4 — Environment variables

### Backend variables

Use Railway **reference variables** for the datastore connection so you never copy passwords by hand,
and so you connect over Railway's **private network** (no SSL needed — the app sets `ssl: false`).
In the backend service → Variables → "Raw editor", paste and adjust:

```
NODE_ENV=production

# Postgres — reference the Postgres plugin's PRIVATE host (no public egress, no SSL needed)
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}

# Redis — reference the Redis plugin
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
REDIS_DB=0

# Ports — keep these fixed so the two domains can target them (Step 5)
PORT=3001
HOST=0.0.0.0
PHISH_PORT=3002
PHISH_HOST=0.0.0.0

# Auth secrets — generate distinct 32+ byte random strings (openssl rand -hex 32)
JWT_ACCESS_SECRET=<random 32+ bytes>
JWT_REFRESH_SECRET=<different random 32+ bytes>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12
AUTH_MAX_FAILED_ATTEMPTS=5
AUTH_LOCKOUT_MINUTES=15

# First-run super-admin (you log in with this, then it forces a password change)
BOOTSTRAP_SUPERADMIN_EMAIL=you@yourdomain.com
BOOTSTRAP_SUPERADMIN_PASSWORD=<a strong temporary password>

# Cookies (cross-site between the frontend + API domains)
COOKIE_SECURE=true
# Leave COOKIE_DOMAIN unset unless frontend + API share one apex domain (see "Custom domains").

# CORS — must be the EXACT frontend origin (fill in after Step 5)
API_CORS_ORIGIN=https://<frontend-domain>

# Public base URL used inside emails for the tracking pixel + rewritten links.
# This MUST be the phish-server's public domain (fill in after Step 5).
PUBLIC_LANDING_URL=https://<phish-domain>

# Mail — IMPORTANT: Railway BLOCKS outbound SMTP (ports 25/465/587) on Free,
# Trial and Hobby plans, so smtp.gmail.com:587 just times out. Send over
# Mailgun's HTTPS REST API instead (port 443, never blocked):
MAIL_PROVIDER=mailgun
MAILGUN_API_KEY=<your mailgun private API key>
MAILGUN_DOMAIN=<your verified domain, e.g. mg.yourdomain.com>
MAILGUN_API_HOST=api.mailgun.net   # or api.eu.mailgun.net for EU accounts
MAIL_FROM=noreply@mg.yourdomain.com  # must be on MAILGUN_DOMAIN
MAIL_DEV_MODE=
# The From address actually used is the SMTP profile's fromEmail/fromName (set
# in the UI) — make sure that profile's From is on your Mailgun domain too.
#
# Alternative (only if you upgrade to Railway Pro, which unblocks SMTP): leave
# MAIL_PROVIDER empty and use real SMTP via the per-profile credentials:
#   MAIL_HOST=smtp.gmail.com  MAIL_PORT=587  MAIL_USER=...  MAIL_PASSWORD=<app password>

# Bull dashboard
BULL_DASHBOARD_URL=/bull
BULL_DASHBOARD_PASSWORD=<a password>
```

> `API_CORS_ORIGIN` and `PUBLIC_LANDING_URL` reference domains you don't know until Step 5 — set
> placeholders now, come back and fix them, then redeploy.

### Frontend variables

These are baked at **build time** (Next.js inlines `NEXT_PUBLIC_*`), and the Dockerfile now reads
them as build args. Set them as normal service variables — Railway passes them to the build:

```
NEXT_PUBLIC_API_URL=https://<backend-admin-domain>/api/v1
NEXT_PUBLIC_APP_URL=https://<frontend-domain>
NEXT_PUBLIC_PHISH_URL=https://<phish-domain>
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=false
```

> Because these are build-time, **changing them requires a redeploy** of the frontend, not just a
> restart.

---

## Step 5 — Domains (the two-port trick)

Railway lets one service expose multiple domains, each pointing at a different container port.

**Backend service → Settings → Networking → Generate Domain** twice:

1. Domain A → **target port 3001** → this is your **admin API** domain.
2. Domain B → **target port 3002** → this is your **phish-server** domain.

**Frontend service → Generate Domain** (target port 3000).

Now fill in the placeholders from Step 4:

- `API_CORS_ORIGIN` (backend) = the **frontend** domain.
- `PUBLIC_LANDING_URL` (backend) = the **phish (port 3002)** domain.
- `NEXT_PUBLIC_API_URL` (frontend) = the **admin (port 3001)** domain + `/api/v1`.
- `NEXT_PUBLIC_PHISH_URL` (frontend) = the **phish (port 3002)** domain.
- `NEXT_PUBLIC_APP_URL` (frontend) = the **frontend** domain.

Redeploy both services after editing.

---

## Step 6 — Create the database schema (IMPORTANT — read this)

TypeORM `synchronize` is off in production and `migrationsRun` is `false`
([backend/src/app.module.ts](backend/src/app.module.ts#L42-L43)) — but the code gives you a dedicated
first-boot switch: `synchronize` turns on if **`DB_SYNCHRONIZE=true`** *or* `NODE_ENV=development`.
So a fresh **production** Postgres starts with **no tables** until you flip that switch once.

Easiest one-time fix — let TypeORM build the schema from the entities once, without leaving production
mode:

1. On the **backend** service, set **`DB_SYNCHRONIZE=true`** and redeploy.
   On boot, `synchronize` creates the full schema and the bootstrap super-admin is seeded.
2. Check the deploy logs for the startup banner and no DB errors. Optionally log in once.
3. **Remove `DB_SYNCHRONIZE`** (or set it to `false`) and redeploy. Schema is now frozen; tables persist.

> The DB connection uses `ssl: false` regardless of env, which is exactly right when `DB_HOST` is the
> Railway **private** host from Step 4 (`${{Postgres.PGHOST}}`). Don't point it at a public Postgres
> URL — that would need SSL the app isn't configured for.

Longer-term (optional, cleaner): generate complete migrations from the entities and switch the deploy
to `npm run migration:run` instead of relying on `synchronize`.

---

## Step 7 — Verify

- `https://<admin-domain>/api/v1/health` → `{ "status": "ok", ... }`.
- `https://<frontend-domain>` → app loads (not stuck on "Loading session…").
- Log in with the bootstrap super-admin → it forces a password change.
- Build a template + landing + group, launch a small campaign to your own address → check the email
  arrives, the tracking pixel marks an **open**, and clicking marks a **click** in Reports.
  (Opens only count if `PUBLIC_LANDING_URL` is publicly reachable — it is, on Railway.)

---

## Gotchas specific to this app

- **One backend process, two ports** — don't split it into two services; `main.ts` always boots both
  apps. Use the two-domain setup in Step 5.
- **Schema creation** — Step 6 is the #1 thing people miss. Production mode = no auto-tables.
- **Cross-site cookies** — frontend and API are different domains, so the refresh cookie is
  `SameSite=None; Secure` (that's why `COOKIE_SECURE=true`). If login "works but doesn't persist",
  this is usually the cause. Cleanest fix is custom domains under one apex (below).
- **Outbound SMTP is blocked** on Free/Trial/Hobby — a saved Gmail/SMTP profile will fail its "Test"
  with `Connection timeout`. Use `MAIL_PROVIDER=mailgun` (above) so mail goes over HTTPS, or upgrade to
  Pro (which unblocks SMTP) and redeploy.
- **Frontend env is build-time** — redeploy frontend after changing any `NEXT_PUBLIC_*`.
- **Redis must be reachable** — the backend opens a Redis connection at boot for Bull; if Redis vars
  are wrong the service crash-loops.

## Custom domains (recommended for production)

Put everything under one apex, e.g.:

- `app.yourdomain.com` → frontend
- `api.yourdomain.com` → backend port 3001
- `links.yourdomain.com` → backend port 3002 (phish)

Then set `COOKIE_DOMAIN=.yourdomain.com` on the backend so the refresh cookie is first-party across
subdomains, and update the `API_CORS_ORIGIN` / `NEXT_PUBLIC_*` / `PUBLIC_LANDING_URL` values to the
custom domains. Add each domain in the respective service's Networking tab and point your DNS CNAMEs
at the Railway targets.

---

## Cost sketch

Hobby plan ($5/mo + usage). Two small always-on containers (backend, frontend) + Postgres + Redis
typically lands in the low-tens-of-dollars/month range depending on traffic and how much the worker
runs. Scale the backend up if you send large campaigns.
