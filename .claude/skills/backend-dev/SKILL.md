---
name: backend-dev
description: >-
  Reference for the jphish/PhishGuard NestJS backend (backend/). Use when working on the admin API,
  the public phish-server, controllers/routes, services, TypeORM entities, JWT auth & RBAC guards,
  Bull job queue, the campaign email/tracking pipeline, DTOs/validation, or backend tests. Covers the
  module map, wiring state, conventions, and exact file paths so you don't have to re-traverse src/.
---

# Backend (NestJS 10) — developer reference

Workspace: `backend/`. Entry: [backend/src/main.ts](../../../backend/src/main.ts). Root module:
[backend/src/app.module.ts](../../../backend/src/app.module.ts). NestJS 10.3, TypeORM 0.3.19,
Postgres 15, Bull 4.11 (+Redis 7), passport-jwt, bcrypt, class-validator, @nestjs/swagger.

## Wiring state (fixed 2026-05-23 — was a stub, now fully wired)

- **`AppModule` imports all feature modules.** [app.module.ts](../../../backend/src/app.module.ts) now
  imports Health, Auth, Campaigns, Email, Groups, Landing, Reports, plus `ThrottlerModule.forRoot` and a
  global `{ provide: APP_GUARD, useClass: ThrottlerGuard }` (so the per-route `@Throttle` caps apply).
- **`AuthModule` is fully assembled.** [auth.module.ts](../../../backend/src/modules/auth/auth.module.ts)
  registers its controllers (Auth/Users/Audit), services (Auth/Users/Tokens/Audit), `JwtStrategy`,
  `AuthBootstrap`, and `TypeOrmModule.forFeature([User, RefreshToken, AuditLog])`; exports
  Passport+Jwt for the guards on feature controllers. (It was previously a near-empty stub.)
- **`main.ts` boots the phish-server too.** [main.ts](../../../backend/src/main.ts) adds
  `app.use(cookieParser())` (needed for the refresh cookie) and creates a **second**
  `NestFactory.create(PhishServerModule).listen(PHISH_PORT)`. `PhishServerModule` was made standalone via
  `ConfigModule.forRoot`.
- **Deps that had to be added** (the code imported them but package.json lacked them): `@nestjs/throttler`,
  `cookie-parser`, `@types/cookie-parser`, `pg-mem`. Also removed a duplicate Jest config (the inline
  `jest` key in package.json) — `backend/jest.config.js` is canonical (unit + e2e projects, `@/` mapper).
- Verified: `npm run build` clean, `npm test` = 15 suites / 106 tests pass. If you change wiring again,
  update this skill and [CLAUDE.md](../../../CLAUDE.md).

## main.ts bootstrap (what the running app actually does)

`NestFactory.create(AppModule)` then: `setGlobalPrefix('api')` + URI versioning default `'1'` (so all
routes are `/api/v1/...`) · CORS from `API_CORS_ORIGIN` (fallback `*`), `credentials: true` · global
`ValidationPipe({ whitelist, forbidNonWhitelisted, transform, enableImplicitConversion })` · Swagger at
`/swagger` (Bearer "JWT" auth) · listens on `PORT` (3001) / `HOST` (0.0.0.0). Note: helmet,
cookie-parser, throttler and the global auth guard are described in `SECURITY.md` and live in the auth
module wiring — confirm in `auth.module.ts` when touching security.

## Module map

| Module | Dir | Route prefix(es) | Wired? | Purpose |
|---|---|---|---|---|
| Health | `modules/health` | `/health` | ✅ | Liveness check |
| Auth | `modules/auth` | `/auth`, `/users`, `/audit-logs` | ✅ | Login/refresh/logout, JWT, users CRUD, roles, audit log, bootstrap super-admin |
| Campaigns | `modules/campaigns` | `/campaigns` | ✅ | Create/launch/pause/resume campaigns, recipients, funnel counters. Imports Groups + Landing modules |
| Email | `modules/email` | `/email-templates`, `/smtp-profiles`, `/t` | ✅ | Templates, SMTP profiles, EmailService (nodemailer), tracking service, **CampaignProcessor** (Bull) |
| Groups | `modules/groups` | `/groups` | ✅ | Target groups + members |
| Landing | `modules/landing` | `/landing-pages` | ✅ | Fake landing pages (slug, htmlContent, capture type, redirect) |
| Reports | `modules/reports` | `/reports` | ✅ | Dashboard + per-campaign analytics |
| Phish-server | `phish-server` | `/t/*`, `/p/*` | ✅ (2nd app) | Public tracking + landing render, separate app booted on `PHISH_PORT` |

### Auth module (the wired, security-critical one)
[backend/src/modules/auth/](../../../backend/src/modules/auth/) — `AuthService`, `UsersService`,
`TokensService`, `AuditService`, plus a bootstrap that seeds a super-admin on first start from
`BOOTSTRAP_SUPERADMIN_EMAIL` / `BOOTSTRAP_SUPERADMIN_PASSWORD` (flagged `mustChangePassword`).
- **Roles** (`UserRole`): `SUPER_ADMIN` > `ADMIN` > `ANALYST`.
- **Guards** (`modules/auth/guards/`): `JwtAuthGuard` (global; skips routes marked `@Public()`),
  `RolesGuard` (enforces `@Roles(...)`).
- **Decorators** (`modules/auth/decorators/`): `@Public()`, `@Roles(...)`, `@CurrentUser()`.
- **Strategy**: `strategies/jwt.strategy.ts` extracts `Authorization: Bearer <token>`.
- **Token model** (see `SECURITY.md`): access JWT HS256, short TTL (`JWT_ACCESS_EXPIRY` ~15m), carries a
  `pwdAt` claim so a password change invalidates old tokens. Refresh = 48 random bytes, only the SHA-256
  digest stored, single-use rotation, **reuse detection revokes the whole token family**. Refresh cookie
  is HttpOnly, path `/api/v1/auth`. bcrypt rounds 12 (4 in tests). Account lockout after
  `AUTH_MAX_FAILED_ATTEMPTS`. Login is constant-time (always runs a bcrypt compare).
- **Audit**: every auth event + user mutation writes an `audit_logs` row (admin-only to read; capped).

### Phish-server (public attack surface) — isolated by design
[backend/src/phish-server/phish-server.module.ts](../../../backend/src/phish-server/phish-server.module.ts).
A **dedicated NestJS app** meant to run on its own `PHISH_PORT` (3002) so the admin origin never shares
cookies with the phish surface. It re-declares its own TypeORM root (loads *all* entities so relations
compile) and `forFeature([CampaignTrackingEvent, LandingPage, Campaign, CampaignRecipient])`. Reuses
`EmailTrackingService` + `LandingPageService`. Controllers:
- `controllers/public-tracking.controller.ts` — `GET /t/o/:trackingId` (open pixel),
  `GET /t/c/:trackingId?u=<base64url>` (click → redirect), `GET|POST /t/r/:trackingId` (reported).
- `controllers/public-landing.controller.ts` — `GET /p/:slug/:trackingId` (render landing, form action
  rewritten), `POST /p/:slug/:trackingId/submit` (capture form data).

## Email + tracking pipeline (the core feature)

Launch → email, in order:
1. `CampaignsService.launch()` ([modules/campaigns/services/](../../../backend/src/modules/campaigns/services/))
   enqueues one `SEND_CAMPAIGN_EMAIL` Bull job per recipient on the **`campaigns`** queue.
2. `CampaignProcessor` ([modules/email/processors/campaign.processor.ts](../../../backend/src/modules/email/processors/campaign.processor.ts))
   — `@Processor('campaigns')`. Skips if recipient status ≠ `PENDING` (idempotent) and if campaign
   status ≠ `RUNNING` (per-campaign pause). Renders template, **rewrites `href=` links** to
   `/t/c/:trackingId?u=<base64url(originalUrl)>`, **appends a 1×1 open pixel** `<img src=/t/o/:trackingId>`,
   adds headers `X-Campaign-ID` / `X-Tracking-ID` / `List-Unsubscribe`. On exhausted retries → marks
   recipient `BOUNCED`.
3. `EmailService` ([modules/email/services/email.service.ts](../../../backend/src/modules/email/services/email.service.ts))
   builds the nodemailer transporter from `MAIL_DEV_MODE`: `ethereal` (preview URL logged), `file`
   (writes `.eml` to `backend/tmp/mail`), unset (real SMTP from the chosen `SmtpProfile`).
4. Target interacts → phish-server `EmailTrackingService` updates `CampaignRecipient` timestamps/status,
   increments `Campaign` counters, and writes a `campaign_tracking_events` row (metadata jsonb:
   userAgent, ip, linkUrl, **submittedData** for captured credentials).

For runtime gotchas (Redis must be up, stale global-pause key, opens undercount on localhost pixel,
report button can't notify sender) see the database-admin skill and the `jphish-email-pipeline` memory.

## Entities (TypeORM) — see database-admin skill for the full column-level map

All extend [backend/src/common/base.entity.ts](../../../backend/src/common/base.entity.ts) (`id` uuid PK,
`createdAt`, `updatedAt`). Entities are auto-discovered via glob `**/*.entity{.ts,.js}`. Key ones:
`User`, `RefreshToken`, `AuditLog` (auth) · `Campaign`, `CampaignRecipient`, `CampaignExecution`
(campaigns) · `EmailTemplate`, `SmtpProfile`, `CampaignTrackingEvent` (email) · `Group`, `GroupMember`
(groups) · `LandingPage` (landing). `synchronize` is **on only in development** (`app.module.ts`);
migrations live in `backend/src/database/migrations/`.

## Conventions

- **File layout per module:** `modules/<name>/{controllers,services,entities,dto,enums,serializers,processors}/`
  + `<name>.module.ts`. Names: `<thing>.controller.ts`, `<thing>.service.ts`, `<thing>.entity.ts`,
  `create-<thing>.dto.ts` / `update-<thing>.dto.ts`, `<thing>.enum.ts`.
- **DTOs + validation:** class-validator decorators; the global `ValidationPipe` strips unknown props
  and 400s on extras. Transform is on (`enableImplicitConversion`).
- **Errors:** throw Nest built-ins (`BadRequestException`, `UnauthorizedException`, `ForbiddenException`,
  `ConflictException`, `NotFoundException`). Sensitive fields stripped via serializers/`@Exclude()`.
- **New protected route:** put it under a controller, rely on the global `JwtAuthGuard`; add `@Roles(...)`
  for role limits or `@Public()` to open it; use `@CurrentUser()` for the actor.
- **Config:** `@nestjs/config` is global (`envFilePath: '.env'`); inject `ConfigService`. Env var list is
  in the devops skill.
- **Path alias:** `@/...` → `backend/src/...` (works in app + tests via tsconfig paths).

## Testing

- Config: [backend/jest.config.js](../../../backend/jest.config.js). Unit specs co-located
  `src/**/*.spec.ts`; e2e in `backend/test/*.e2e-spec.ts`.
- **e2e uses pg-mem** (in-memory Postgres) via `backend/test/test-app.ts` / `createTestApp()` — full
  HTTP→DB→JWT without external services. Cleanup uses `DELETE FROM` (pg-mem rejects `TRUNCATE`).
- Run: `cd backend && npm test` (unit), `npm run test:cov` (enforces 80% lines/stmts/fns, 70% branches),
  `npm run test:e2e`. Type-check: `npx tsc --noEmit`.

## Commands

```
cd backend
npm run dev          # nest start --watch  (port 3001)
npm run build        # nest build → dist/
npm test             # jest unit
npm run test:e2e     # jest e2e (pg-mem)
npm run lint         # eslint --fix
npm run migration:run / migration:revert / migration:generate
```
Remember the `backend/backend` nested-dir trap — use absolute paths or `cd` once from repo root.
