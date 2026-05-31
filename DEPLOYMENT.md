# Deployment Checklist

A checklist for promoting Jphish to a non-dev environment (staging, production). Items in **Pre-deploy** must pass before cutting a release; **Cut-over** is the actual deploy; **Post-deploy** verifies the running system.

## Pre-deploy

### Code + tests

- [ ] Latest `main` is green in CI (backend job, frontend job, docker job).
- [ ] `npm run test:cov` (backend) passes at ≥ 80% statements / 70% branches.
- [ ] `npm run test:cov` (frontend) passes at ≥ 80% statements / 70% branches.
- [ ] `npm run type-check` (frontend) and `npx tsc --noEmit` (backend) pass with zero errors.
- [ ] No `console.log` / `console.error` debug statements committed (audit logger is fine).
- [ ] CHANGELOG entry written for this release.

### Configuration

- [ ] `.env` for the target environment exists and is **not** committed.
- [ ] `JWT_ACCESS_SECRET` is a fresh, ≥ 32-byte random value (`openssl rand -base64 48`).
- [ ] `DB_PASSWORD` is a fresh strong value, **not** the docker-compose default `changeme123`.
- [ ] `REDIS_PASSWORD` is set (required for Bull queues even though they aren't used yet).
- [ ] `BOOTSTRAP_SUPERADMIN_EMAIL` and `BOOTSTRAP_SUPERADMIN_PASSWORD` set (one-time seed; password is rotated on first login because `mustChangePassword=true`).
- [ ] `COOKIE_SECURE=true` (HTTPS-only refresh cookie).
- [ ] `COOKIE_DOMAIN` set to your apex domain (e.g., `.example.com`).
- [ ] `API_CORS_ORIGIN` set to the exact frontend origin (no trailing slash).
- [ ] `NEXT_PUBLIC_API_URL` matches the API origin reachable from the browser.
- [ ] `NODE_ENV=production` for both services.

### Infrastructure

- [ ] Postgres 15 instance provisioned (managed RDS / Cloud SQL recommended over the bundled container in prod).
- [ ] Postgres has nightly automated backups + verified restore drill in the last 90 days.
- [ ] Redis 7 instance provisioned with `REDIS_PASSWORD` set.
- [ ] Database-at-rest encryption enabled (volume-level or TDE).
- [ ] TLS certificate provisioned for the public hostname (Let's Encrypt or managed).
- [ ] nginx config updated to listen on `:443` with the cert chain + HTTP→HTTPS redirect on `:80`.
- [ ] DNS records pointed at the load balancer / nginx host.
- [ ] Container registry credentials configured (if using a registry).

### Security review

- [ ] `SECURITY.md` checklist re-reviewed for this release.
- [ ] `npm audit --audit-level=high --workspaces` either clean, or each finding documented + accepted.
- [ ] Penetration test / code review completed for any net-new code surface (not required if only test/doc changes shipped).
- [ ] No secrets in git: `git ls-files | grep -E '^\.env'` is empty.

## Cut-over

### Build

```bash
# From repo root
docker compose -f docker/docker-compose.yml build --no-cache
```

- [ ] Backend image built (`jphish-backend:<version>`).
- [ ] Frontend image built (`jphish-frontend:<version>`).
- [ ] Images tagged with the release version (not `:latest`).
- [ ] Images pushed to the registry.

### Database

- [ ] **Backup the existing DB** before any migration (`pg_dump`).
- [ ] Apply migrations: `npm run migration:run` (currently the migrations folder is empty — when migrations land, run them here).
- [ ] Verify the schema diff is what you expected (`\d users`, `\d refresh_tokens`, `\d audit_logs` in `psql`).

### Deploy

- [ ] Stop the previous version (or use rolling deploy if available).
- [ ] Bring the new version up: `docker compose -f docker/docker-compose.yml up -d`.
- [ ] Container health checks pass for all four services (postgres, redis, backend, frontend, nginx).

## Post-deploy verification

### Smoke tests (do these in order)

- [ ] `curl https://<host>/api/v1/health` returns `{"status":"ok","timestamp":"..."}`.
- [ ] `curl https://<host>/swagger` returns the Swagger UI HTML.
- [ ] Browser opens `https://<host>` and lands on `/login`.
- [ ] Login with the bootstrap super-admin succeeds.
- [ ] Login redirects to `/settings/password` because `mustChangePassword=true`.
- [ ] Changing the bootstrap password works; new password works on next login; old password no longer works.
- [ ] After password change, the refresh cookie is rotated and old sessions are invalidated.
- [ ] Visiting `/tenants` as an admin (non-super-admin) bounces to `/unauthorized`.
- [ ] Visiting `/users` as an analyst bounces to `/unauthorized`.
- [ ] Visiting any protected route while logged out bounces to `/login`.
- [ ] Hammer `/api/v1/auth/login` with bad creds 6 times — 6th attempt returns 429.

### Security spot-checks

- [ ] Refresh cookie has `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth` (inspect in DevTools).
- [ ] CORS preflight from an unrelated origin (e.g., `https://evil.example`) returns 403 / blocks.
- [ ] HTTP request to port 80 redirects to HTTPS.
- [ ] HSTS header present on HTTPS responses (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).
- [ ] Content-Security-Policy header present (helmet default in prod).
- [ ] Stack traces are NOT visible in error responses (NestJS hides them in prod by default).

### Observability

- [ ] Backend stdout logs are being captured (Docker logs, CloudWatch, etc.).
- [ ] Audit log writes are visible via `GET /api/v1/audit-logs` as an admin.
- [ ] An audit row was written for the post-deploy login(s).
- [ ] No unexpected error-level logs in the first 10 minutes.

## Rollback

If smoke tests fail:

1. Bring the previous image version back: `docker compose -f docker/docker-compose.yml up -d backend=jphish-backend:<previous>`.
2. If migrations were run forward, roll them back: `npm run migration:revert` (one migration per invocation).
3. If the migration is irreversible, restore from the pre-deploy `pg_dump`.
4. Open an incident ticket with the failed smoke-test output.

## Known gaps before this is "real" production

These are intentionally outside the auth surface and will land with their respective modules:

- The campaigns / templates / landing / tracking / reports / risk / email modules don't exist yet — Compose currently runs a backend that only exposes `/auth` and `/health`.
- Bull queues are wired into the module but no jobs are processed yet.
- Email delivery (nodemailer) is configured via env but has no consumer.
- The `migrations/` folder is empty; `synchronize` is on in dev only. Before prod, generate an initial migration and commit it.
- Nginx config (`docker/nginx.conf`) needs hardening for prod (rate limits at the edge, TLS, gzip).
- No metrics endpoint (Prometheus / OpenTelemetry).
- No structured logging (Pino / Winston with JSON output) — currently uses Nest's default logger.
