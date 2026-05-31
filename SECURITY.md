# Security Review Checklist

Scoped to the surfaces that exist today (auth + health). Items marked **(verified)** are exercised by the automated test suite; **(manual)** need to be re-checked on each release; **(blocked)** depend on features that haven't been built yet.

## Authentication

- [x] **(verified)** Passwords hashed with bcrypt (rounds=12 in prod, 4 in tests for speed).
- [x] **(verified)** Login is constant-time-ish — runs a bcrypt compare against a dummy hash when the user doesn't exist, preventing username enumeration via timing.
- [x] **(verified)** Login responses use a generic `Invalid email or password` message regardless of whether the user exists or the password was wrong.
- [x] **(verified)** Account lockout after `AUTH_MAX_FAILED_ATTEMPTS` (default 5) for `AUTH_LOCKOUT_MINUTES` (default 15). Correct password during lockout still returns 401.
- [x] **(verified)** Email is normalized to lowercase + trimmed before lookup.
- [x] **(verified)** Strong password policy enforced server-side: ≥12 chars, lowercase + uppercase + digit + symbol, no whitespace.
- [x] **(verified)** `PATCH /auth/me/password` rejects when new password equals current password.
- [x] **(manual)** Bootstrap super-admin is created with `mustChangePassword=true`; first login must redirect to the password-change route (UI route to be built).

## JWT + session lifecycle

- [x] **(verified)** Access token is HS256-signed with `JWT_ACCESS_SECRET` (`getOrThrow` — boot fails if unset).
- [x] **(verified)** Default access token TTL is 15 minutes (`JWT_ACCESS_EXPIRY`, configurable).
- [x] **(verified)** Token payload carries a `pwdAt` (unix seconds) claim — JWT strategy rejects tokens whose `pwdAt` doesn't match the user's current `passwordChangedAt`, so a password change invalidates every outstanding access token.
- [x] **(verified)** Refresh tokens are 48 random bytes (base64url, ~256 bits of entropy).
- [x] **(verified)** Only a SHA-256 digest of each refresh token is persisted — raw token values are never stored.
- [x] **(verified)** Refresh tokens are single-use: rotation marks the row revoked and links `replacedById` to the successor row.
- [x] **(verified)** Replaying a previously-rotated refresh token triggers family-wide revocation and an `auth.refresh.reuse_detected` audit entry — defense against stolen-cookie reuse.
- [x] **(verified)** Refresh cookie set with `httpOnly`, `sameSite: 'strict'`, `secure` flag (controlled by `COOKIE_SECURE`), and path scoped to `/api/v1/auth`.
- [x] **(verified)** Password change revokes every refresh token for the user.
- [x] **(verified)** User deactivation revokes every refresh token for the user.
- [x] **(verified)** Role change revokes every refresh token (forces re-auth with the new role in the new token).
- [x] **(manual)** Verify `JWT_ACCESS_SECRET` is rotated on a documented cadence and that prior tokens are accepted only for their natural lifetime.
- [ ] **(blocked)** Add a scheduled cron to call `TokensService.purgeExpired()` so the table doesn't grow without bound.

## Authorization (RBAC)

- [x] **(verified)** `JwtAuthGuard` is registered as `APP_GUARD`, so every route requires a valid token unless explicitly marked `@Public()`.
- [x] **(verified)** `RolesGuard` enforces `@Roles(...)` decorators; missing user → 403, role-not-in-set → 403.
- [x] **(verified)** Only super-admin can mint or modify a super-admin.
- [x] **(verified)** Cannot change your own role or delete yourself.
- [x] **(verified)** Last-super-admin protection: refuses to demote or delete the lone active super-admin.
- [x] **(verified)** Capability matrix in `frontend/src/lib/rbac.ts` mirrors backend enforcement for UI hiding (analyst can't see the create-user form, etc.). Server is the source of truth — UI hiding is a UX nicety, not a security boundary.

## Input validation

- [x] **(verified)** `ValidationPipe` registered globally with `whitelist: true` + `forbidNonWhitelisted: true` — unknown fields return 400.
- [x] **(verified)** All DTOs use `class-validator` decorators (`@IsEmail`, `@IsEnum`, `@MaxLength`, `@Matches`).
- [x] **(verified)** UUID path parameters validated with `ParseUUIDPipe` (`/users/:id`, `/users/:id/role`) — non-UUID returns 400.
- [x] **(verified)** Login DTO trims + lowercases email via `@Transform`.

## HTTP hardening

- [x] **(manual)** `helmet()` middleware installed: default CSP in prod, HSTS preload in prod, strict-origin referrer policy, `cross-origin-resource-policy: same-site`.
- [x] **(manual)** `cookie-parser` reads HttpOnly refresh cookie.
- [x] **(manual)** CORS limited to `API_CORS_ORIGIN`, `credentials: true`, methods + headers explicitly listed.
- [x] **(manual)** `app.set('trust proxy', 1)` so `req.ip` reflects the real client behind the nginx reverse proxy (used for lockout + audit IP tracking).
- [x] **(verified)** Global throttle: 60 req/min/IP. Per-route caps tighter where it matters:
  - `/auth/login` — 5/min
  - `/auth/refresh` — 30/min
  - `/auth/me/password` — 5/min

## Audit logging

- [x] **(verified)** Every login (success + each failure category + lockout), logout, refresh, refresh-reuse-detection, password change, and user-management mutation writes an audit row.
- [x] **(verified)** Audit write failures are swallowed — they cannot break the originating request — but are logged at error level.
- [x] **(verified)** Audit rows store actor id/email, target id, IP, user agent (truncated to 255), and structured `metadata` (JSONB).
- [x] **(verified)** `userAgent` is truncated to 255 chars on insert to fit the column.
- [x] **(verified)** Audit listing capped at 500 rows server-side regardless of `?limit=`.
- [x] **(verified)** Audit endpoint is admin/super-admin only — analysts get 403.
- [ ] **(blocked)** Append-only / tamper-evident chain (e.g., hash-link rows so a delete is detectable). Today rows are mutable in the DB; mitigated by RBAC.

## Frontend hardening

- [x] **(verified)** Access token kept in module-level memory only, never written to `localStorage` or `sessionStorage`, so an XSS payload can't lift it by reading storage.
- [x] **(verified)** Refresh cookie is HttpOnly — XSS can't read it.
- [x] **(verified)** `axios` configured with `withCredentials: true` so the refresh cookie is sent on `/auth/refresh`.
- [x] **(verified)** Single-flight refresh: parallel 401s share one in-flight refresh promise; one request retries, the rest follow.
- [x] **(verified)** Refresh is NOT attempted on `/auth/login`, `/auth/refresh`, or `/auth/logout` — would loop or hide errors.
- [x] **(verified)** On a failed refresh, the global `onUnauthorized` handler clears the auth store and routes to `/login`.
- [x] **(manual)** Next.js production build runs with React strict mode + standalone output.

## Secrets + config

- [x] **(manual)** `JWT_ACCESS_SECRET` loaded via `ConfigService.getOrThrow` — boot fails if unset (no silent default).
- [x] **(manual)** `.env` files are gitignored; example file lives at `backend/.env.example` (verify).
- [x] **(manual)** `BOOTSTRAP_SUPERADMIN_PASSWORD` documented as a one-time seed value; rotated immediately after first login because `mustChangePassword=true`.
- [ ] **(manual)** `DB_PASSWORD` and `JWT_ACCESS_SECRET` in `docker/docker-compose.yml` default to placeholder values — must be replaced in any non-dev deployment.
- [ ] **(manual)** Verify no `.env*` files are committed: `git ls-files | grep -E '^\.env'` returns empty.

## Dependency hygiene

- [x] **(manual)** `npm audit --audit-level=high` runs in CI (non-blocking, surfaces in PR view).
- [ ] **(manual)** Dependabot or Renovate configured to open PRs for security updates.
- [ ] **(manual)** Quarterly review of direct dependency major versions.

## Known gaps to address before production

- [ ] CSRF protection — currently relying on `SameSite=Strict` on the refresh cookie. If we ever loosen that (e.g., subdomain split), add a CSRF token to state-changing requests.
- [ ] TLS termination at nginx; HTTP requests must redirect to HTTPS. Current `docker/nginx.conf` only listens on port 80.
- [ ] Database-at-rest encryption (Postgres TDE or volume-level encryption).
- [ ] Encrypted backups of the `users`, `refresh_tokens`, and `audit_logs` tables.
- [ ] Centralized log aggregation (today: stdout only via Docker logs).
- [ ] Tracking URLs — when the campaign/tracking module ships, ensure they carry only an opaque token, never the target user's email/ID in plaintext.
- [ ] Tenant isolation — when multi-tenant ships, add a `tenant_id` column to every table and a global query filter to prevent cross-tenant reads.
