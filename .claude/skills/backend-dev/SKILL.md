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
| Tenants | `modules/tenants` | `/tenants`, `/plans` | ✅ | Multi-tenancy authority: Tenant CRUD + lifecycle status, Plan catalog + per-tenant subscription/feature flags. See below |
| Phish-server | `phish-server` | `/t/*`, `/p/*` | ✅ (2nd app) | Public tracking + landing render, separate app booted on `PHISH_PORT` |

**2026-06 UX-pass endpoints (campaign setup flow):**
- `POST /email-templates/:id/test` — `EmailTemplateService.sendTest()` renders the template with sample
  vars and sends a real `[TEST]` email via a chosen `smtpProfileId` (no tracking pixel). Body:
  `{ testEmail, smtpProfileId, variables? }`. `EmailTemplateService` now injects `EmailService` +
  `SmtpProfileService` (`getEntity()` returns the *raw* profile incl. password for internal senders).
- `POST /smtp-profiles/test-connection` — verify raw creds without persisting (`testConnection(dto)`);
  the existing `POST /smtp-profiles/:id/test` now also sends a real test email to `testEmail`.
- `POST /landing-pages/clone` — `LandingCloneService.clone(url)` fetches a public page server-side and
  returns `{ html, title, sourceUrl }` with scripts/handlers stripped and asset URLs absolutized.
  **SSRF-hardened**: http/https only, manual redirect re-validation, private/reserved IP blocklist,
  3 MB / 10 s caps. Uses **cheerio**. Forms left intact (phish-server rewrites their action at serve).
- `POST /groups/:id/members` now returns `{ added, skipped }` and dedupes within the batch.

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

### Tenants module (multi-tenancy authority)
[backend/src/modules/tenants/](../../../backend/src/modules/tenants/) — the central authority for
multi-tenancy. `Tenant` entity (`tenants` table): `name`, unique `slug`, `contactEmail`, `timezone`
(IANA, default `UTC`), optional `logoUrl`, `status`, + BaseEntity timestamps.
- **Lifecycle** (`TenantStatus`): `PENDING` (default on create) · `TRIAL` · `ACTIVE` · `SUSPENDED` ·
  `EXPIRED` · `DISABLED` · `ARCHIVED` (terminal). Transitions are guarded by
  `TENANT_STATUS_TRANSITIONS` in `enums/tenant-status.enum.ts`; an illegal jump 400s.
- **Routes** (`/tenants`, SUPER_ADMIN to create/delete; ADMIN+ to read/update): `POST /` (create →
  PENDING), `GET /` (paginated, optional `?status=`), `GET /:id`, `PATCH /:id` (profile),
  `PATCH /:id/status` (lifecycle change, transition-validated), `DELETE /:id`. Slug is auto-derived
  from the name when omitted and uniqueness-enforced (numeric suffix on collision).
- **Scoping foundation**: [common/tenant-scoped.entity.ts](../../../backend/src/common/tenant-scoped.entity.ts)
  is `TenantScopedEntity extends BaseEntity` adding a `tenantId` uuid FK (`onDelete: CASCADE`) + index.
  New tenant-scoped feature entities should extend it and always filter queries by `tenantId`. Existing
  entities were NOT retrofitted (would need a data migration) — external integrations deferred.

**Subscription management** (added on top of Tenants; no billing yet):
- **Plan catalog** (`Plan` entity, `plans` table): `tier` (`PlanTier`: STARTER/PROFESSIONAL/ENTERPRISE/
  CUSTOM), `name`, limits `maxUsers`/`maxCampaigns`/`maxTemplates`/`maxLandingPages`/`maxSendingProfiles`/
  `emailQuota`/`storageQuota` (**-1 = unlimited**), `defaultFeatures` (jsonb `TenantFeature[]`), `isActive`.
  `PlansBootstrap` (`OnModuleInit`) seeds STARTER/PROFESSIONAL/ENTERPRISE idempotently; CUSTOM is
  operator-created and is the only tier allowed multiple rows. Routes `/plans` (ADMIN+ read,
  SUPER_ADMIN write; delete blocked while a tenant references it). `PlansService`.
- **Per-tenant subscription**: Tenant gained `planId` FK (`onDelete: SET NULL`) + `featureOverrides`
  jsonb (`Partial<Record<TenantFeature, boolean>>` — true force-enables, false force-disables, absent =
  inherit plan default). `TenantFeature` enum: campaigns, templates, landing_pages, sending_profiles,
  analytics, ai_features, api_access, custom_branding.
- **Helper methods** (`TenantSubscriptionService`): `getPlan(tenantId)`, `hasFeature(tenantId, feature)`
  (entitlement = override ?? plan default, lifecycle-agnostic), `canUseFeature(tenantId, feature)`
  (hasFeature **AND** status ∈ {ACTIVE, TRIAL} via `isUsableStatus`), plus `getEntitlements`,
  `assignPlan`, `setFeatureOverrides`. Pure resolution logic in `services/entitlements.ts`
  (`resolveFeature`/`buildEntitlements`) for testability.
- **Routes** (`/tenants/:id`, ADMIN+): `GET subscription` (entitlements = plan limits + effective
  feature map + `usable`), `PUT plan` (assign), `PATCH features` (merge overrides, `null` clears),
  `GET features/:feature` (→ `{ hasFeature, canUseFeature }`).
**Usage tracking + quotas** (`UsageService`, `TenantUsage` entity `tenant_usage`, one row/tenant, lazily
created). `UsageMetric` enum (users, campaigns, templates, landing_pages, sending_profiles, emails_sent,
storage) maps each to a counter column + the matching `Plan` limit via `USAGE_METRIC_CONFIG` (storage in
**MB** to match `Plan.storageQuota`). Reusable helpers: `canCreateResource(tenantId, metric, amount?)`
→ `QuotaCheck{allowed,used,limit,remaining,unlimited}`, `incrementUsage(…, {enforce?})` (the choke point
that blocks over-quota creation when `enforce`), `decrementUsage` (floored at 0, for deletes),
`getUsageSummary` (per-metric used/limit/remaining/exceeded). `assertCanCreateResource` throws
`ForbiddenException`. Routes: `GET /tenants/:id/usage`, `GET /tenants/:id/usage/:metric/can-create`.

**Status-based access control** (centralized, not scattered conditionals):
- `TenantCapability` enum (LOGIN/READ/WRITE/LAUNCH_CAMPAIGN) + `TENANT_STATUS_CAPABILITIES` matrix is the
  single source of truth: PENDING→none · TRIAL/ACTIVE→all · SUSPENDED/EXPIRED→login+read · DISABLED/
  ARCHIVED→none. Pure policy fns in `access/platform-access.policy.ts` (`tenantCan`, `canLogin`,
  `accessDenialReason`).
- Reusable guards (`guards/`): `TenantAccessGuard` (enforces `@RequireCapability(...)`),
  `QuotaGuard` (enforces `@EnforceQuota(metric)`). Both resolve the acting tenant via
  `TenantContextService.loadTenant(req)` (order: `req.user.tenantId` → `x-tenant-id` header →
  `params.tenantId`, cached on the request). Decorators in `decorators/tenant-access.decorators.ts`.
  Guards are opt-in per route (no-metadata routes pass through), exported from `TenantsModule`.
- **NOW WIRED END-TO-END** (2026-07-07): the tenant system is bolted into the live app.
  - `User` has a nullable `tenant_id` column (null = platform-level, e.g. the bootstrap super-admin,
    which bypasses all tenant gating). Feature entities `Campaign`, `EmailTemplate`, `LandingPage`,
    `SmtpProfile` each gained a nullable `tenant_id`, set from the creator's tenant on create.
  - **Login gate**: `AuthService.login()` calls `assertTenantMayLogin` → `canLogin(tenant.status)` after
    the password check; a tenant that can't log in (PENDING/DISABLED/ARCHIVED) is refused + audited
    (`auth.login.denied`). AuthModule registers the `Tenant` repo via `forFeature` (NOT by importing
    TenantsModule — that would cycle, since TenantsModule imports AuthModule).
  - **Guards applied**: campaigns / email-templates / smtp-profiles / landing-pages controllers add
    `@UseGuards(…, TenantAccessGuard, QuotaGuard)`; writes carry `@RequireCapability(WRITE)`, creates add
    `@EnforceQuota(<metric>)`, campaign launch/resume carry `@RequireCapability(LAUNCH_CAMPAIGN)`. Those
    feature modules `import TenantsModule` to get the guards + `UsageService`.
  - **Usage counted**: each create calls `usage.assertCanCreateResource` + `incrementUsage`; each delete
    calls `decrementUsage`; `CampaignProcessor` bumps `EMAILS_SENT` per send. All no-op when the actor
    has no tenant. Guards + service both enforce (belt-and-suspenders; races are low-stakes here).
  - `TenantContextService.resolve(req)` returns `{tenantId, tenant}`; guards treat `tenantId === null`
    as a platform request (allow-through) and a dangling id (tenant not found) as a 403.
  - A default ACTIVE tenant (slug `default`, Enterprise plan) is seeded by `TenantsBootstrap`.
  - **Still not tenant-scoped**: Groups (not a metered resource) and the USERS metric is tracked but not
    auto-incremented on user creation (would need AuthModule→TenantsModule, a cycle). Query-level tenant
    isolation on list endpoints is also still open — creates are scoped, reads aren't filtered yet.
- Unit-tested: `tenants.service.spec.ts` (15), `entitlements.spec.ts` (9),
  `tenant-subscription.service.spec.ts` (16), `usage.service.spec.ts` (16),
  `platform-access.policy.spec.ts` (8), `tenant-access.guard.spec.ts` (10), plus AuthService login-gate
  tests. `test/boot-smoke.e2e-spec.ts` boots the whole feature-module DI graph on pg-mem to catch cycles
  / missing providers. Full suite: **202 tests green**.

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
