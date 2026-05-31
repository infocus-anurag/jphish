---
name: devops
description: >-
  Reference for jphish/PhishGuard infrastructure & operations. Use when working with docker-compose,
  the Dockerfiles, nginx routing, the GitHub Actions CI pipeline, environment variables (.env), ports,
  build/run/deploy commands, or the Makefile/npm workspace scripts. Includes the full env-var table and
  the local-vs-docker runtime differences.
---

# DevOps / Infrastructure — reference

Monorepo via **npm workspaces** (`frontend`, `backend`). Node 20 (`.nvmrc`). `.npmrc` sets
`legacy-peer-deps=true` + long fetch timeouts. Prettier: single quotes, semicolons, width 100, 2-space.
`.editorconfig`: LF, 2-space (Makefile uses tabs).

## Ports & runtime topology

| Service | Port | Local (this box) | Docker compose |
|---|---|---|---|
| Frontend (Next) | 3000 | `npm run dev:frontend` | `phishguard-frontend` |
| Admin API (Nest) | 3001 | `npm run dev:backend`, routes `/api/v1/*`, Swagger `/swagger`, Bull dash `/bull` | `phishguard-backend` |
| Phish-server | 3002 | only if you boot `PhishServerModule` (see backend skill — **not booted by default**) | (same backend container) |
| Postgres | 5432 | **Windows service** (db `jphish`, user `jphish`, pass `admin`) | `phishguard-postgres` |
| Redis | 6379 | **Docker** container `jphish-redis` (manually started, no pass) | `phishguard-redis` |
| Nginx | 80 (/443) | n/a locally | `phishguard-nginx` |

> Two different Redis identities: compose defines `phishguard-redis`; on this dev machine the user runs a
> standalone `jphish-redis` container instead. Use whichever is actually running (`docker ps`).

## Run / build / test commands

Root ([package.json](../../../package.json)) — also mirrored as `Makefile` targets:
```
npm run dev            # concurrently backend + frontend
npm run dev:backend    # backend only        npm run dev:frontend   # frontend only
npm run build          # backend then frontend
npm run lint | format | test          # both workspaces
npm run docker:up | docker:down | docker:build | docker:logs   # docker/docker-compose.yml
```
Backend: `cd backend && npm run dev|build|test|test:e2e|test:cov|lint|migration:run`.
Frontend: `cd frontend && npm run dev|build|test|test:cov|type-check|lint`.
First-time env: `bash .env.setup.sh` (copies `*.env.example` → `backend/.env`, `frontend/.env.local`).

## Docker ([docker/](../../../docker/))

`docker-compose.yml` services: **postgres** (15-alpine, vol `postgres_data`, healthcheck `pg_isready`),
**redis** (7-alpine, vol `redis_data`, healthcheck `redis-cli ping`), **backend**
(`Dockerfile.backend`, `:3001`, depends on db+redis healthy, mounts `../backend/src` for hot reload,
healthcheck `curl /api/health`), **frontend** (`Dockerfile.frontend`, `:3000`, mounts `../frontend/src`
+ `../frontend/app`), **nginx** (`nginx:alpine`, `:80`/`:443`, mounts `nginx.conf` ro). One bridge net
`phishguard-network`. Both Dockerfiles are multi-stage (base→builder→runtime) on Node 20-alpine.

### nginx routing ([docker/nginx.conf](../../../docker/nginx.conf))
Upstreams `frontend:3000`, `backend:3001`. Location blocks: `/` → frontend (with WS upgrade headers) ·
`/api/` → backend `/api/` · `/bull/` → backend Bull dashboard · `/swagger/` → backend Swagger ·
`/health` → returns `200 healthy`. Listens `:80` only (no TLS configured in compose — a prod gap).
gzip on; client body max 20MB; basic security headers.

## CI ([.github/workflows/ci.yml](../../../.github/workflows/ci.yml))

Triggers: push to `main`, PRs to `main`. `cancel-in-progress`. Node 20. Jobs:
1. **backend** — `npm ci`, `tsc --noEmit`, `npm run test:cov` (uploads `backend/coverage`).
2. **frontend** — `npm ci`, `npm run type-check`, `npm run test:cov`, `npm run build`
   (env `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`), uploads `frontend/coverage`.
3. **docker** — needs backend+frontend; buildx-builds both images (`:ci` tags, GHA cache), no push.
4. **audit** — `npm audit --workspaces --include-workspace-root --audit-level=high` (non-blocking).

## Environment variables

**Backend** (`backend/.env`; template `backend/.env.example`):

| Var | Purpose / note |
|---|---|
| `NODE_ENV` | `development` turns on TypeORM `synchronize` + SQL logging |
| `PORT` / `HOST` | admin API (3001 / 0.0.0.0) |
| `DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME` | Postgres. Local: `localhost`/`jphish`/`admin`/`jphish`. Compose: host `postgres` |
| `REDIS_HOST REDIS_PORT REDIS_PASSWORD REDIS_DB` | Bull/Redis. Local host `localhost`, compose host `redis` |
| `JWT_ACCESS_SECRET JWT_REFRESH_SECRET` | sign tokens; ≥32 random bytes, **distinct**, required in prod |
| `JWT_ACCESS_EXPIRY JWT_REFRESH_EXPIRY` | e.g. `15m` / `7d` |
| `BCRYPT_ROUNDS` | 12 (4 in tests) |
| `AUTH_MAX_FAILED_ATTEMPTS AUTH_LOCKOUT_MINUTES` | account lockout |
| `COOKIE_SECURE COOKIE_DOMAIN` | refresh cookie; `true` + apex domain in prod |
| `BOOTSTRAP_SUPERADMIN_EMAIL BOOTSTRAP_SUPERADMIN_PASSWORD` | first-run super-admin seed (mustChangePassword) |
| `MAIL_HOST MAIL_PORT MAIL_USER MAIL_PASSWORD MAIL_FROM` | SMTP (Gmail needs 16-char App Password) |
| `MAIL_DEV_MODE` | `ethereal` (preview) / `file` (writes `backend/tmp/mail/*.eml`) / unset (real SMTP). Read at boot |
| `API_CORS_ORIGIN` | allowed frontend origin (fallback `*`) |
| `PHISH_PORT PHISH_HOST` | phish-server (3002 / 0.0.0.0) |
| `PUBLIC_LANDING_URL` | base URL embedded in emails for pixel/link tracking; must be publicly reachable for opens to count (localhost breaks Gmail proxy — use a tunnel) |
| `BULL_DASHBOARD_URL BULL_DASHBOARD_PASSWORD` | Bull dashboard path + auth |

> Note: the older `README.md` shows a single `JWT_SECRET`/`JWT_EXPIRY`; current code/`SECURITY.md` use the
> separate access/refresh secrets above. Trust `.env.example` + SECURITY.md.

**Frontend** (`frontend/.env.local`; template `frontend/.env.example`) — all `NEXT_PUBLIC_*` reach the browser:
`NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001/api/v1`), `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_PHISH_URL` (3002), `NEXT_PUBLIC_ENABLE_ANALYTICS`, `NEXT_PUBLIC_ENABLE_DEBUG`,
`NEXT_PUBLIC_AUTH_DOMAIN`, `NEXT_PUBLIC_JWT_EXPIRY`.

## Deploy (summary — see [DEPLOYMENT.md](../../../DEPLOYMENT.md))

Pre-flight: CI green + coverage ≥80%; real secrets set; `COOKIE_SECURE=true` + `COOKIE_DOMAIN`;
`API_CORS_ORIGIN` exact; `NODE_ENV=production`; managed Postgres + Redis (password) with backups; TLS
cert + nginx `:443` (current compose is `:80` only). Build images tagged by release (not `:latest`),
push, back up DB, run migrations, `docker compose up -d`, verify healthchecks, then smoke-test
(`/api/v1/health`, login → forced password change, RBAC bounces to `/unauthorized`, login throttling 429).
**Known gaps:** `migrations/` lags the entities (dev uses `synchronize`), nginx is `:80`-only (no TLS),
and there's no metrics/structured logging yet. (The module/phish-server wiring gaps were fixed 2026-05-23
— see backend skill.) Runtime deps `@nestjs/throttler` + `cookie-parser` are now in `backend/package.json`;
a global `ThrottlerGuard` enforces the rate limits.

## Other docs
[QUICKSTART.md](../../../QUICKSTART.md) (fastest path up) · [DEVELOPMENT.md](../../../DEVELOPMENT.md)
(code style/workflow) · [TESTING.md](../../../TESTING.md) (suites + manual checklist) ·
[SECURITY.md](../../../SECURITY.md) (auth/RBAC/hardening + gaps).
