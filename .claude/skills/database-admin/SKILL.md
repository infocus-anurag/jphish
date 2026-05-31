---
name: database-admin
description: >-
  Reference for the jphish/PhishGuard data layer. Use when querying or inspecting PostgreSQL or Redis,
  reading/changing the schema or TypeORM entities, writing migrations, debugging the Bull queue/Redis
  keys, or handling the sensitive captured-credential data. Includes the table-by-table schema map and
  copy-paste commands for this Windows box (where psql is NOT installed).
---

# Database & Redis — admin reference

PostgreSQL 15 + Redis 7. ORM is TypeORM 0.3.19. Entities auto-discovered via glob
`backend/src/**/*.entity{.ts,.js}`; all extend
[backend/src/common/base.entity.ts](../../../backend/src/common/base.entity.ts) (`id` uuid PK,
`createdAt`, `updatedAt`).

## Local runtime (this Windows machine)

- **Postgres**: runs as a **Windows service** on `localhost:5432`. Creds from `backend/.env`:
  user `jphish` / password `admin` / db `jphish`. (The `.env.example` defaults differ:
  `phishguard`/`changeme123`/`phishguard_db`.)
- **Redis**: runs in **Docker Desktop**, container `jphish-redis`, `localhost:6379`, no password. Started
  manually — if Bull jobs aren't processing, first confirm 6379 is up (`docker ps` / `netstat`).
- **`synchronize` is ON only when `NODE_ENV=development`** ([app.module.ts](../../../backend/src/app.module.ts)),
  so in dev TypeORM auto-creates/updates tables from entities. In prod use migrations.

## Querying Postgres — `psql` is NOT on PATH

Use a one-off Node script with the `pg` driver. **Drivers (`pg`, `ioredis`, `typeorm`, `bull`) are
hoisted to the ROOT `node_modules`**, not `backend/node_modules` — run from the repo root or `backend/`.

```bash
node -e "const {Client}=require('pg'); (async()=>{ \
  const c=new Client({host:'localhost',port:5432,user:'jphish',password:'admin',database:'jphish'}); \
  await c.connect(); \
  const r=await c.query('SELECT id,name,status FROM campaigns ORDER BY \"createdAt\" DESC LIMIT 10'); \
  console.table(r.rows); await c.end(); })().catch(e=>{console.error(e);process.exit(1)});"
```
Note column names created by TypeORM are camelCase → quote them in SQL (`"createdAt"`, `"trackingId"`).

## Inspecting Redis / the Bull queue

```bash
docker exec jphish-redis redis-cli KEYS 'bull:campaigns:*'
docker exec jphish-redis redis-cli HGETALL bull:campaigns:meta
docker exec jphish-redis redis-cli LLEN bull:campaigns:wait
```
- Single shared queue **`campaigns`**; job type `SEND_CAMPAIGN_EMAIL`; keys prefixed `bull:campaigns:`.
- **Stale global-pause trap:** historically a `bull:campaigns:meta-paused=1` key globally halted *all*
  processing. Pause is now per-campaign (status flip; processor skips non-`RUNNING`). If an old flag
  lingers and nothing processes:
  `docker exec jphish-redis redis-cli DEL bull:campaigns:meta-paused` then
  `... HSET bull:campaigns:meta paused 0`.

## Schema map (tables & key columns)

> Column lists below are the load-bearing fields; open the entity file for the exact, current set.
> `*` = jsonb. Composite PKs noted.

**Auth** ([backend/src/modules/auth/entities/](../../../backend/src/modules/auth/entities/))
- `users` — email (unique), firstName, lastName, passwordHash (bcrypt), role enum
  (`super_admin`/`admin`/`analyst`), isActive, failedLoginAttempts, lockedUntil, lastLoginAt/Ip,
  passwordChangedAt, mustChangePassword. 1→N refresh_tokens.
- `refresh_tokens` — tokenHash (SHA-256 digest, unique), userId FK, familyId, expiresAt, revokedAt,
  replacedById, userAgent, ip. Reuse of a revoked token revokes the whole `familyId`.
- `audit_logs` — action enum, actorId, actorEmail, targetId, ip, userAgent, metadata*. Read = admin only.

**Campaigns** ([backend/src/modules/campaigns/entities/](../../../backend/src/modules/campaigns/entities/))
- `campaigns` — name (unique), description, status enum
  (`draft`/`scheduled`/`running`/`paused`/`completed`/`archived`), templateId, ownerId, smtpProfileId,
  landingPageId, groupId, isAdaptive, startDate/endDate, launchedAt/completedAt, and **denormalized
  counters** totalRecipients/emailsSent/emailsOpened/emailsClicked/formsSubmitted/bouncedEmails
  (incremented by the tracking service).
- `campaign_recipients` — **composite PK (campaignId, email)**; firstName, lastName, department, groupId,
  status enum (`pending`→`sent`→`opened`→`clicked`→`submitted`/`bounced`/`reported`), **trackingId
  (unique)** — the token the phish-server matches on; openedAt/clickedAt/submittedAt/reportedAt/sentAt.
- `campaign_executions` — id uuid PK, campaignId, recipientEmail, action enum, timestamp, metadata*
  (older execution-history table; superseded by tracking events).

**Email** ([backend/src/modules/email/entities/](../../../backend/src/modules/email/entities/))
- `email_templates` — name (unique), subject, htmlContent, textContent, type enum, variables (placeholder
  names), isActive, createdById.
- `smtp_profiles` — name (unique), host, port, secure, user, **password (plaintext column — sensitive)**,
  fromEmail, fromName, isActive, lastTestedAt, testSuccessful, testError. Gmail needs host
  `smtp.gmail.com`, port 587, secure=false, and a 16-char **App Password**.
- `campaign_tracking_events` — **composite PK (campaignId, recipientEmail, eventId)**; eventType enum
  (`open`/`click`/`form_submission`/`reported`/`landing_view`), trackingId, timestamp, **metadata\***
  (`userAgent`, `ip`, `linkUrl`, and **`submittedData` = captured form values incl. passwords**).

**Groups** ([backend/src/modules/groups/entities/](../../../backend/src/modules/groups/entities/))
- `groups` — name (unique), description, isActive, createdById. 1→N members.
- `group_members` — **composite PK (groupId, email)**; firstName, lastName, department, position, addedAt.

**Landing** ([backend/src/modules/landing/entities/](../../../backend/src/modules/landing/entities/))
- `landing_pages` — name (unique), slug (unique, used in `/p/:slug/:trackingId`), htmlContent,
  captureType enum (`none`/`credentials`/`credentials_otp`/`custom`), redirectUrl, isActive, createdById.

## 🔒 Sensitive data

- `campaign_tracking_events.metadata.submittedData` stores **plaintext captured credentials** (phishing
  capture). `smtp_profiles.password` is plaintext. `users.passwordHash` is bcrypt (safe). Treat the first
  two as secrets: never log, paste, or export them; redact in any report you produce.

## Migrations

- Folder: [backend/src/database/migrations/](../../../backend/src/database/migrations/) — currently one:
  `1686667200000-CreateCampaignsSchema.ts`. CLI data source:
  [backend/src/database/data-source.ts](../../../backend/src/database/data-source.ts).
- Commands (from `backend/`): `npm run migration:generate -- --name <Name>` · `npm run migration:run`
  · `npm run migration:revert`. `migrationsRun` is `false` at boot — run migrations explicitly.
- Because dev relies on `synchronize`, the migrations set lags the entities. Before a real deploy,
  generate a migration that captures the full current schema (see DEPLOYMENT.md known gaps).

## Common debugging checks

- Emails not sending? Order: Redis up → campaign actually `RUNNING` → no stale global-pause key →
  `MAIL_DEV_MODE` value → SMTP profile valid. (Full pipeline in the backend-dev skill + `jphish-email-pipeline` memory.)
- Opens reading 0 with a real inbox: the open pixel points at `PUBLIC_LANDING_URL`; if that's `localhost`,
  Gmail's image proxy can't reach it. Clicks/submissions still work (they open in the target's browser).
