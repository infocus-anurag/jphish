# CLAUDE.md — jphish / PhishGuard AI

> **This file is the project mind-map.** It is auto-loaded every session. Skim it to gain
> whole-project awareness, then open the matching **skill** (under `.claude/skills/`) for the deep,
> file-level reference for whatever domain you're touching. The skills exist so you never have to
> re-traverse the tree to relearn the architecture.

---

## 1. What this is

A **phishing-simulation & awareness-training platform** (internal name `jphish`, product name
"PhishGuard AI"). Operators build email templates + fake landing pages, send simulated phishing
emails to target groups, and track who opens / clicks / submits credentials — then report on it.

**Monorepo** (npm workspaces): `frontend/` (Next.js 14) + `backend/` (NestJS 10) + `docker/` + `design/`.
Node 20 (`.nvmrc`). Root scripts orchestrate both workspaces (`npm run dev` runs both).

---

## 2. The mind-map (system topology)

```
                                  ┌─────────────────────────────────────────┐
                                  │  OPERATOR (admin/analyst, authenticated)  │
                                  └───────────────────┬───────────────────────┘
                                                      │ HTTPS
                              ┌───────────────────────▼────────────────────────┐
                              │  FRONTEND — Next.js 14 App Router  :3000         │
                              │  app/(app)/* screens · React Query · Zustand     │
                              │  axios api-client → NEXT_PUBLIC_API_URL          │
                              │  → .claude/skills/frontend-dev                   │
                              └───────────────────────┬──────────────────────────┘
                                                      │  /api/v1/*  (Bearer JWT + refresh cookie)
                              ┌───────────────────────▼──────────────────────────┐
                              │  ADMIN API — NestJS  :3001  (prefix /api, v1)     │
                              │  Modules: Health, Auth(+Users+Audit),             │
                              │  Campaigns, Email, Groups, Landing, Reports [WIRED]│
                              │  Per-route JwtAuthGuard/RolesGuard · ValidationPipe│
                              │  Global ThrottlerGuard · cookie-parser            │
                              │  → .claude/skills/backend-dev                     │
                              └───────┬───────────────────────────┬───────────────┘
                                      │                           │
                  enqueue SEND_CAMPAIGN_EMAIL                renders + sends
                                      │                           │
                  ┌───────────────────▼─────────┐     ┌───────────▼────────────┐
                  │  Redis  :6379  (Docker)      │     │  Nodemailer → SMTP      │
                  │  Bull queue "campaigns"      │     │  (Gmail / Ethereal /    │
                  │  CampaignProcessor consumes  │     │   file dev modes)       │
                  └──────────────────────────────┘     └────────────┬───────────┘
                                                                     │ email w/ tracking pixel
                                                                     │ + rewritten links
                  ┌──────────────────────────────────────────────────▼──────────┐
                  │  TARGET (victim's inbox / browser)                           │
                  └──────────────────────────────────┬───────────────────────────┘
                                                     │ opens pixel / clicks / submits form
                  ┌──────────────────────────────────▼───────────────────────────┐
                  │  PHISH-SERVER — NestJS  :3002  (PHISH_PORT)  [WIRED — 2nd app]│
                  │  PUBLIC surface only: /t/o /t/c /t/r tracking, /p/:slug landing│
                  │  Separate origin so admin cookies never reach the phish surface│
                  │  → .claude/skills/backend-dev (phish-server section)           │
                  └──────────────────────────────────┬───────────────────────────┘
                                                     │ writes events
                  ┌──────────────────────────────────▼───────────────────────────┐
                  │  PostgreSQL  :5432  (Windows service, db=jphish)              │
                  │  TypeORM entities · campaign_tracking_events (jsonb)          │
                  │  → .claude/skills/database-admin                              │
                  └───────────────────────────────────────────────────────────────┘

   Infra glue: docker-compose (postgres, redis, backend, frontend, nginx) · nginx reverse proxy
   · GitHub Actions CI (backend, frontend, docker, audit)  → .claude/skills/devops
```

**One-line data flow:** operator builds template + landing + group → launches campaign → API enqueues
one Bull job per recipient → `CampaignProcessor` renders, rewrites links to `/t/c/:id`, injects a
`/t/o/:id` pixel, sends via nodemailer → target interacts → phish-server records open/click/submission
in `campaign_tracking_events` → Reports screen reads it back.

---

## 3. State notes (read before assuming anything runs)

Three wiring bugs that used to live here were **fixed & verified on 2026-05-23** (backend builds + 106
tests pass; frontend type-checks + 57 tests pass). Recorded so the history is clear:

1. ✅ **All backend modules are now wired.** [`backend/src/app.module.ts`](backend/src/app.module.ts)
   imports Health, Auth, **Campaigns, Email, Groups, Landing, Reports**, plus `ThrottlerModule` and a
   global `ThrottlerGuard`. `AuthModule` itself (previously a stub) now registers its controllers,
   services, `JwtStrategy`, `AuthBootstrap`, and entities.
2. ✅ **The phish-server (:3002) now boots.** [`backend/src/main.ts`](backend/src/main.ts) creates a
   **second** `NestFactory.create(PhishServerModule)` on `PHISH_PORT`, and adds `cookie-parser` to the
   admin app so the refresh-cookie flow works.
3. ✅ **Frontend HTTP client fixed.** [`frontend/src/lib/api-client.ts`](frontend/src/lib/api-client.ts)
   is now the **memory-resident** access-token model: `setAccessToken`/`getAccessToken`,
   `withCredentials`, single-flight refresh, `setUnauthorizedHandler` → `/login`. Supporting glue was
   brought to the same contract: `types/auth.types.ts` (correct `UserRole` + missing types) and
   `store/auth.store.ts` (status/setUser/clear/hasRole).
   - Deps added to make the above build: `@nestjs/throttler`, `cookie-parser`, `@types/cookie-parser`,
     `pg-mem`. Removed a duplicate Jest config (kept `backend/jest.config.js`).
4. ✅ **`AuthModule` now exports `AuditService`.** [`backend/src/modules/auth/auth.module.ts`](backend/src/modules/auth/auth.module.ts)
   added `AuditService` to `exports` (was only `PassportModule`, `JwtModule`). Without it the app
   crashed at boot — `EmailModule`/`CampaignsModule` import `AuthModule` and their services
   (`SmtpProfileService`, `EmailTemplateService`, `CampaignsService`) inject `AuditService`.
5. ✅ **`AuthGate` is now mounted.** [`frontend/src/lib/providers.tsx`](frontend/src/lib/providers.tsx)
   wraps `children` in [`<AuthGate>`](frontend/src/components/shell/AuthGate.tsx). The component
   existed and was tested but was never rendered in the tree, so the auth store was stuck on
   `status: 'idle'` and the `(app)` layout showed "Loading session…" forever (blank app). AuthGate
   runs the refresh-cookie bootstrap on mount and wires the global 401 → `/login` handler.

⚠️ **Still true — many frontend screens are honest empty states**, not bugs: Adaptive, Alerts, Tenants,
Training, Settings→Domains/Security/Billing/API, NotifPanel. They have no backend by design. To wire one
later, replace its `EmptyState` with the standard query pattern (frontend skill).

⚠️ **Running the stack needs Redis up** (Bull) and Postgres reachable — the admin app boots both a DB
pool and a Redis connection, and now also a second app on `:3002`. If `npm run dev` fails at boot, check
those first (database-admin skill).

If you change wiring again, **update this file and the relevant skill** so the map stays true.

---

## 4. Skill index — where the deep reference lives

| Domain | Skill (open for detail) | Covers |
|---|---|---|
| Backend / API | [.claude/skills/backend-dev/SKILL.md](.claude/skills/backend-dev/SKILL.md) | NestJS module map, controllers/routes, entities, auth + RBAC, Bull jobs, email pipeline, phish-server, conventions, testing |
| Frontend / UI | [.claude/skills/frontend-dev/SKILL.md](.claude/skills/frontend-dev/SKILL.md) | App Router routes, screen components, React Query data layer, Zustand stores, RBAC hooks, the wired-screen pattern, testing |
| Database | [.claude/skills/database-admin/SKILL.md](.claude/skills/database-admin/SKILL.md) | Schema/entity reference, how to query Postgres (no psql) & Redis, migrations, Bull/Redis keys, sensitive data |
| DevOps / Infra | [.claude/skills/devops/SKILL.md](.claude/skills/devops/SKILL.md) | docker-compose, Dockerfiles, nginx routing, CI jobs, every env var, ports, run/build/deploy commands |
| Design system | [.claude/skills/design-principles/SKILL.md](.claude/skills/design-principles/SKILL.md) | Design tokens & theming, UI primitives, loading/empty/error states, layout, naming, the `design/` prototypes |

> Skills auto-load when their description matches the work. You can also read them directly.

---

## 5. Fast facts (the things you look up constantly)

- **Ports:** frontend `3000` · admin API `3001` (prefix `/api`, URI version `v1` → `/api/v1/...`) ·
  phish-server `3002` · Postgres `5432` · Redis `6379`.
- **Local runtime (this Windows box):** Postgres = **Windows service**. Redis = **Docker** container
  `jphish-redis`. DB creds (`backend/.env`): user `jphish` / pass `admin` / db `jphish`. Redis no password.
- **`psql` is NOT on PATH.** Query Postgres with a one-off `node -e` script using `pg` (drivers are
  hoisted to the **root** `node_modules`, not `backend/node_modules`). Inspect Redis via
  `docker exec jphish-redis redis-cli ...`. Details in the database-admin skill.
- **Path gotcha:** there is a nested `backend/backend` dir. From repo root, `cd backend` once is correct;
  twice lands wrong. Prefer absolute paths.
- **Run it:** `npm run dev` (both) · `npm run dev:backend` · `npm run dev:frontend` · `npm run docker:up`
  (full stack incl. nginx). `Makefile` mirrors these.
- **Test it:** backend `cd backend && npm test` (Jest + pg-mem) / `npm run test:e2e`. Frontend
  `cd frontend && npm test` (Vitest + MSW). Coverage gate 80% lines / 70% branches both sides.
- **Tech:** Next 14 · React 18 · React Query 5 · Zustand 4 · Tailwind 3.4 · axios — vs — NestJS 10 ·
  TypeORM 0.3 · Postgres 15 · Bull 4 · Redis 7 · nodemailer · bcrypt · passport-jwt · class-validator.
- **Mail dev modes** (`MAIL_DEV_MODE` in `backend/.env`): `ethereal` (fake preview inbox), `file`
  (writes `.eml` to `backend/tmp/mail`), empty (real SMTP). Read at boot → restart after changing.
- **Mail provider** (`MAIL_PROVIDER`): empty = per-profile SMTP (default); `mailgun` = send over
  Mailgun's HTTPS REST API (`MAILGUN_API_KEY` / `MAILGUN_DOMAIN` / `MAILGUN_API_HOST`) instead of SMTP —
  needed where outbound SMTP is blocked (e.g. Railway Free/Hobby, where `smtp.gmail.com:587` times out).
  All transports route through the one choke point `EmailService.createTransporter()`; `MAIL_DEV_MODE`
  still wins when set.

---

## 6. Conventions (apply everywhere)

- **TypeScript strict**; explicit return types on exported fns; `kebab-case.ts` filenames, `PascalCase`
  classes/components, `camelCase` fns, `UPPER_SNAKE` consts.
- **Backend module layout:** `modules/<name>/{controllers,services,entities,dto,enums}/` + `<name>.module.ts`.
  DTOs validated by `class-validator`; global `ValidationPipe` (whitelist + transform).
- **Frontend:** screen components live in `src/components/screens/`, pages in `app/(app)/<route>/page.tsx`
  just import a screen. Path alias `@/*` → `src/*`. Wired screens follow the
  **useQuery → SkeletonRows (loading) → EmptyState (empty) → ErrorState (error)** pattern (see frontend skill).
- **Formatting:** Prettier (single quotes, semicolons, width 100, 2-space). `.editorconfig` enforces LF.
- **Git:** branches `feature/ bugfix/ hotfix/ docs/ refactor/`; commit `[TYPE] description`.
- **Don't fabricate data** in the UI — if there's no backend, show an `EmptyState` (see warning #4).

---

## 7. Repo map (top level)

```
jphish/
├─ CLAUDE.md            ← you are here (mind-map + index)
├─ .claude/skills/      ← domain reference skills (backend-dev, frontend-dev, database-admin, devops, design-principles)
├─ frontend/            ← Next.js 14 (app/ routes, src/components|lib|store|hooks|types|styles)
├─ backend/             ← NestJS 10 (src/modules/*, src/phish-server, src/common, src/database)
├─ docker/              ← docker-compose.yml, Dockerfile.backend, Dockerfile.frontend, nginx.conf
├─ design/             ← original design prototypes (extracted/*.jsx, styles.css) — source of the design system
├─ .github/workflows/   ← ci.yml (backend, frontend, docker, audit)
├─ Makefile, package.json (workspaces), .env.setup.sh
└─ README.md DEPLOYMENT.md DEVELOPMENT.md QUICKSTART.md TESTING.md SECURITY.md
```
> Note: `README.md` documents an aspirational structure (e.g. a standalone `users` module, `common/`
> with guards/filters) that doesn't fully match the code. The skills describe the **actual** code; when
> they disagree with README, trust the skills.
