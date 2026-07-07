# Landing → Auth → Dashboard, Domain Routing & Tenant Plan

Status legend: ✅ implemented in this change · 🔷 designed here, needs build · ⚠️ decision needed

This document covers the four deliverables. Sections 1–2 describe what now ships in the
frontend and how to expose it on `jphish.infocusit.in`. Sections 3–4 are **design plans**
because the backend is currently **single-tenant with no self-service signup** — there is no
`tenants` table and no `tenant_id` on any entity (verified in `backend/src/modules/*`).

---

## What changed in this pass (frontend) ✅

| Area | Before | After |
|---|---|---|
| Logo | `JPhish` text + gradient glyph | `frontend/public/info-logo.png` (Infocus‑IT) in landing nav/footer, login, forgot‑password, and app sidebar. BMP→real PNG. |
| `/` (root) | Dashboard (auth‑gated) | **Public marketing landing** (`app/(marketing)/page.tsx`, scoped `landing.css`, own light/dark toggle) |
| Dashboard | `/` | **`/dashboard`** (`app/(app)/dashboard/page.tsx`) |
| Login | bare card | Split‑panel redesign matching the landing, logo, **show/hide password**, **Forgot password?** link |
| Forgot password | — | New `/forgot-password` page + `forgotPassword()` API helper (neutral confirmation, no account enumeration) |
| Auth gating | AuthGate bounced **every** signed‑out route to `/login` | `PUBLIC_PATHS = /, /login, /forgot-password, /reset-password` stay public; app routes still gated with `?next=` |

Files added: `app/(marketing)/{layout.tsx,page.tsx,landing.css}`, `app/forgot-password/page.tsx`,
`src/components/auth/AuthChrome.tsx`, `src/styles/auth.css`.
Files touched: `app/login/page.tsx`, `app/(app)/dashboard/page.tsx` (moved), `Sidebar.tsx`,
`Topbar.tsx`, `CommandPalette.tsx`, `AuthGate.tsx`, `unauthorized/page.tsx`, `lib/auth-api.ts`.

> Build note: `next build`/`next dev` currently fail on this machine due to a **corrupt
> `@next/swc-darwin-x64` native binary** (`load command content extends beyond end of file`) —
> unrelated to these changes. `tsc --noEmit` passes and all 15 auth/routing Vitest tests pass.
> Fix the SWC binary with `rm -rf node_modules/@next/swc-* && npm i` (needs registry access).

---

## Deliverable 1 — Landing ⇄ Login ⇄ Dashboard view mapping ✅

```
                 ┌───────────────────────────── PUBLIC (no auth) ─────────────────────────────┐
   Visitor ─────▶ /  (marketing landing)  ──"Start Simulation" / "Login" / "Start free trial"──▶ /login
                 │                                                    │                          │
                 └── /forgot-password ◀── "Forgot password?" ─────────┘                          │
                                                                                                 ▼
                                                             POST /api/v1/auth/login  (rate‑limited 5/min)
                                                                                                 │
                          mustChangePassword? ── yes ──▶ /settings/password ──┐                  │
                                                                              ▼                  ▼
                 ┌─────────────────────────── AUTHENTICATED (AppShell) ───────────────────────────┐
                 │ /dashboard  ·  /campaigns · /templates · /landing · /groups · /reports ·        │
                 │ /users · /users/admin · /settings · /tenants (super‑admin) · …                  │
                 └─────────────────────────────────────────────────────────────────────────────────┘
```

Route inventory after the change:

| Path | Access | Renders |
|---|---|---|
| `/` | Public | Marketing landing |
| `/login` | Public | Login (redirect target defaults to `/dashboard`, honors `?next=`) |
| `/forgot-password` | Public | Request reset link |
| `/reset-password` | Public | 🔷 **to build** — consume token, set new password |
| `/dashboard` | Auth | Dashboard screen |
| `/campaigns`,`/templates`,`/landing`,`/groups`,`/reports`,`/users`,`/settings`,… | Auth | Existing app screens (unchanged paths) |
| `/tenants` | Super‑admin | 🔷 currently an empty state — wire in Deliverable 4 |

Redirect rules (already wired): signed‑in user hitting `/login` → `next` (default `/dashboard`);
signed‑out user hitting an app route → `/login?next=<path>`; 401 from the API → clear session → `/login`.

---

## Deliverable 2 — Serving it on `jphish.infocusit.in` 🔷

Next.js already owns **all** routing (`/`, `/login`, `/dashboard`, …), so the domain only needs a
single reverse proxy to the frontend plus the API. No separate static site is required.

### 2.1 DNS
- `A  jphish.infocusit.in → <server-ip>` (app + API on one host).
- **Recommended:** a **separate** host for the public phish surface (tracking/landing on port
  `3002`), e.g. `A  links.infocusit.in → <server-ip>`. Keeping it off the admin origin is the whole
  point of the second app (admin refresh cookies must never reach the phish surface — see
  `CLAUDE.md` topology). Do **not** serve `/t/*` and `/p/*` from `jphish.infocusit.in`.

### 2.2 nginx (extends `docker/nginx.conf`, which already proxies `/`→frontend:3000, `/api/`→backend:3001)
```nginx
server {
    listen 443 ssl http2;
    server_name jphish.infocusit.in;
    ssl_certificate     /etc/letsencrypt/live/jphish.infocusit.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jphish.infocusit.in/privkey.pem;

    location /     { proxy_pass http://frontend; include /etc/nginx/proxy_ws.conf; }  # Next: / /login /dashboard …
    location /api/ { proxy_pass http://backend/api/; include /etc/nginx/proxy_common.conf; }
    # /bull/ dashboard optional, restrict by IP/basic-auth
}
server { listen 80; server_name jphish.infocusit.in; return 301 https://$host$request_uri; }

# Separate origin for the victim-facing phish server (port 3002)
server {
    listen 443 ssl http2;
    server_name links.infocusit.in;
    ssl_certificate /etc/letsencrypt/live/links.infocusit.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/links.infocusit.in/privkey.pem;
    location / { proxy_pass http://phish:3002; include /etc/nginx/proxy_common.conf; }
}
```
> On CloudPanel the container ports are mapped to `3100/3101/3102` (commit `8c58452`); point the
> upstreams at whatever host ports are published there. Add a `phish` upstream (`:3002`/`:3102`).

### 2.3 Environment (production)
| Var | Value | Why |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://jphish.infocusit.in/api/v1` | Frontend axios `baseURL` (build‑time) |
| `COOKIE_SECURE` | `true` | Refresh cookie over TLS only |
| `COOKIE_DOMAIN` | `jphish.infocusit.in` | Scope refresh cookie to admin origin (NOT a parent domain shared with `links.`) |
| `PHISH_BASE_URL` | `https://links.infocusit.in` | Tracking pixel + click links point at the phish origin |
| `CORS`/allowed origins | `https://jphish.infocusit.in` | Backend CORS |

### 2.4 Certificates
`certbot --nginx -d jphish.infocusit.in -d links.infocusit.in` (or a wildcard `*.infocusit.in` via
DNS‑01). Auto‑renew via the existing cron/systemd timer.

### 2.5 Deploy checklist
1. Build frontend with the prod `NEXT_PUBLIC_API_URL` baked in.
2. `docker compose up -d` (frontend, backend, phish, postgres, redis, nginx).
3. Verify: `/` = landing, `/login` = login, `/dashboard` = redirects to `/login` when signed out,
   `links.infocusit.in/t/o/<id>` = tracking pixel 200.

---

## Deliverable 3 — Login & Signup fit to a tenant architecture 🔷

**Current reality:** `users` has no `tenant_id`; roles are `super_admin | admin | analyst`
(`backend/src/modules/auth/enums/user-role.enum.ts`); users are created by an admin via
`POST /users` (no self‑service signup); there is **no** `/auth/forgot-password` endpoint yet.
The landing/UI already *market* multi‑tenancy — this section makes the data model match.

### 3.1 Data model
- **`tenants`** — `id, name, slug (unique), status(active|suspended|trial), plan, branding jsonb,
  limits jsonb (maxUsers, maxCampaigns, storageMb), features jsonb, created_at`.
- **Add `tenant_id` (FK, indexed, NOT NULL)** to: `users`, `campaigns`, `email_templates`,
  `landing_pages`, `groups`, `smtp_profiles`, `campaign_tracking_events`, `audit_logs`,
  `refresh_tokens`. Platform super‑admins have `tenant_id = NULL`.
- Uniqueness: change `users.email` unique → **unique per `(tenant_id, email)`** (or keep email
  globally unique — see 3.3).

### 3.2 Isolation enforcement (defense in depth)
- **`@CurrentTenant()` decorator** + `TenantGuard` reading `tenantId` from the JWT.
- A TypeORM query helper / subscriber that injects `where tenant_id = :tenantId` on every scoped
  repo call, so a missed filter can't leak cross‑tenant rows. Super‑admin bypasses with an explicit
  `X-Tenant-Id` (or platform scope).
- JWT payload gains `tenantId`; `JwtStrategy` loads the user and asserts the tenant is `active`.

### 3.3 Tenant resolution at login ⚠️
Pick one:
- **(A) Global‑unique email (recommended, least friction):** email → user row → `tenant_id`. Login
  form is unchanged. Simple, but a person can belong to only one tenant.
- **(B) Subdomain per tenant:** `acme.infocusit.in` sets tenant context before auth; email unique
  per tenant. Best isolation/branding, more DNS/nginx + cert wildcard work.
- **(C) Tenant picker:** if an email maps to multiple tenants, show a chooser after password.

### 3.4 Signup flows
- **Org signup (self‑serve trial)** `POST /auth/signup` → create `tenant` (status `trial`) +
  first user (`admin` scoped to that tenant) → send email verification → on verify, `is_active=true`.
  Gate behind a platform feature flag so it can be disabled for enterprise‑only deployments.
  New `/signup` page (reuse `AuthChrome` + `auth.css`; add company name + name + email + password).
- **Invite within a tenant (replaces temp‑password model)** admin `POST /users` now emails an
  **invite link** (`invite_tokens` table) instead of returning a temp password; invitee sets their
  own password via `/accept-invite?token=…`. Keeps the existing admin‑creates‑user model but
  tenant‑scoped and friendlier.

### 3.5 Forgot / reset password (finishes the UI shipped this pass)
- **`POST /auth/forgot-password`** `{ email }` → always `204`; if the user exists, create a
  single‑use, 30‑min, hashed token in **`password_reset_tokens`** and email a link
  `https://jphish.infocusit.in/reset-password?token=…`. Rate‑limit like login (Throttler).
- **`POST /auth/reset-password`** `{ token, newPassword }` → validate/rotate, set password,
  revoke refresh tokens, mark token used. Audit the event.
- **Frontend:** `/forgot-password` ✅ done (calls `forgotPassword()`); build **`/reset-password`**
  page (already whitelisted as public in `AuthGate`).
- The frontend deliberately shows the same "check your inbox" message regardless of outcome →
  no account enumeration.

### 3.6 Roles across tenants
`super_admin` becomes **platform‑level** (cross‑tenant). Introduce a tenant‑level owner (reuse
`admin`) so "admin of tenant A" can't touch tenant B. `RolesGuard` unchanged; `TenantGuard` adds the
scope. Update `frontend/src/lib/rbac.ts` (`tenants` route already super‑admin‑only).

---

## Deliverable 4 — Tenant management & Super‑Admin plane 🔷

Super‑admin operates a **control plane above** all tenants (the landing's "Super Admin → Tenant
A/B/C" diagram). Wire the existing empty `/tenants` screen to a real module.

### 4.1 Backend — `modules/tenants`
| Endpoint | Role | Purpose |
|---|---|---|
| `GET /tenants` | super_admin | List tenants (status, plan, usage) |
| `POST /tenants` | super_admin | Create tenant + seed first admin |
| `GET /tenants/:id` | super_admin | Detail (users, usage, limits, features) |
| `PATCH /tenants/:id` | super_admin | Rename, change plan, update limits/branding |
| `PATCH /tenants/:id/status` | super_admin | Suspend / reactivate (blocks that tenant's logins) |
| `PATCH /tenants/:id/features` | super_admin | Toggle features (adaptive, SSO, API, storage tier) |
| `POST /tenants/:id/impersonate` | super_admin | Mint a scoped token to "enter" a tenant for support |

### 4.2 Super‑admin capabilities (map straight from the landing copy)
- **Tenant management** — CRUD + suspend/restore.
- **Plan management** — plan → default limits/features; usage vs. plan surfaced per tenant.
- **User access control** — see/reset any tenant's users; assign tenant admins.
- **Feature toggles** — `tenants.features` gates UI (`useCan` extended with feature checks) and API guards.
- **Storage limits & license allocation** — enforce `limits.maxUsers`, `storageMb`, seat counts in
  the create/import guards (`POST /users`, `POST /groups/:id/members`) → `402/403` with a clear message.

### 4.3 Frontend
- Replace the `/tenants` `EmptyState` with the standard wired pattern (`useQuery(['tenants'])` →
  `SkeletonRows` → `EmptyState` → `ErrorState` → table) from the frontend skill.
- Tenant detail drawer: plan selector, limit inputs, feature toggle switches, usage meters,
  "Enter tenant" (impersonate) button.
- New nav is already gated: `SUPER_GROUP` in `Sidebar.tsx` shows **Platform → Tenants** only for
  `persona === 'super'`.
- Tenant **branding** (logo, accent) feeds the app shell + phish landing pages per tenant.

### 4.4 Rollout order (safe migration from single‑tenant)
1. Create `tenants`; insert a **"Default"** tenant; backfill `tenant_id` on all existing rows to it.
2. Add `tenant_id` columns NULL → backfill → set NOT NULL; add composite indexes.
3. Add `tenantId` to JWT + `TenantGuard`/scoping (super‑admin bypass).
4. Ship `/tenants` admin module + screen.
5. Enable org signup + invites (feature‑flagged) and forgot/reset endpoints.
6. (Optional) move to subdomain‑per‑tenant if isolation/branding demands it.
