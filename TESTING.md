# Testing Jphish

This guide covers the automated test suites that ship today, the manual checklist for surfaces not yet under automation, and how the CI pipeline validates a PR end-to-end.

## What's actually tested today

The platform is at an early stage: only the **auth** and **health** modules are wired end-to-end (backend ↔ frontend). All other features visible in the UI (campaigns, templates, landing pages, reports, adaptive, training, tenants, etc.) are seed-data demos and have **no backend** yet. Tests reflect that scope — they cover what exists, and the missing flows are tracked in the manual checklist below as TODOs for when those modules land.

### Current numbers

| Surface  | Suites | Tests | Coverage (stmts) |
| -------- | -----: | ----: | ---------------: |
| Backend  |     14 |    94 |          ~98%    |
| Frontend |      7 |    57 |          ~95%    |

## Backend

NestJS + Jest + TypeORM, with an in-memory Postgres (`pg-mem`) for the e2e suite so no real DB is required.

### Layout

```
backend/
├── src/modules/auth/**/*.spec.ts    # unit tests (services, guards, decorators, serializer, enum)
├── src/modules/health/**/*.spec.ts  # health unit tests (today via e2e)
├── test/
│   ├── test-app.ts          # builds a Nest app backed by pg-mem
│   ├── test-helpers.ts      # seedUser(), login()
│   ├── health.e2e-spec.ts
│   ├── auth.e2e-spec.ts     # login, refresh rotation, reuse detection, logout, change-password
│   ├── users.e2e-spec.ts    # CRUD + RBAC enforcement
│   ├── audit.e2e-spec.ts    # admin-only audit listing
│   └── throttling.e2e-spec.ts # /auth/login 5/min rate limit
├── jest.config.js           # projects: { unit, e2e }
└── tsconfig.spec.json       # types: jest + node
```

### Commands

```bash
cd backend

npm test            # unit project only (fast)
npm run test:e2e    # e2e project only (boots pg-mem each suite)
npm run test:all    # both projects
npm run test:cov    # both projects + coverage, enforces 80%/70% thresholds
npm run test:watch  # unit project, watch mode
```

### Patterns to know

- **`createTestApp(opts)`** — returns `{ app, dataSource }`. The default config disables the `ThrottlerGuard` (since per-route `@Throttle({ limit: 5, ttl: 60000 })` on `/login` makes test scripting painful); pass `{ enableThrottle: true }` only when you specifically want to verify rate limiting (see `throttling.e2e-spec.ts`).
- **`seedUser(dataSource, overrides)`** — inserts a real user row with a bcrypt-hashed password (rounds=4 in tests). Returns `{ id, email, password, role }`.
- **`login(app, email, password)`** — issues a real `/auth/login` and returns `{ accessToken, refreshCookie }`.
- **Cleaning between tests** — pg-mem rejects `TRUNCATE` on FK-referenced tables; use raw `DELETE FROM` in child→parent order:
  ```ts
  await dataSource.query('DELETE FROM "audit_logs"');
  await dataSource.query('DELETE FROM "refresh_tokens"');
  await dataSource.query('DELETE FROM "users"');
  ```
- **pwdAt invalidation** — the JWT payload's `pwdAt` claim is unix-second precision. Tests that change a password and then re-check an old token must sleep ≥ 1.1s, otherwise both fall in the same second and the test will spuriously pass-as-allowed.

### What the suites cover

- **Auth service** — login (success, unknown user, inactive, wrong password, lockout after 3 fails, locked-account rejection), refresh (rotate, reuse detection → revoke family, inactive user, missing token), logout (cookie clear + revoke), change-password (rejects mismatch + identical, hashes + revokes all sessions).
- **Tokens service** — JWT signing with `pwdAt`, refresh issuance, rotation, reuse detection, expiry checks, parser for `s/m/h/d` durations.
- **Users service** — RBAC for create/update/setRole/delete, super-admin protection (only super-admins can mint/demote a super-admin), last-super-admin guard, self-mutation prevention, duplicate email → 409.
- **Audit service** — record swallows DB errors, list caps at 500, truncates `userAgent` to 255 chars.
- **Guards** — `RolesGuard` (allow/deny/no-user/missing-metadata), `JwtAuthGuard` `@Public` bypass.
- **Decorators** — `@Public`, `@Roles`, `@CurrentUser` metadata wiring.
- **Health** — `/api/v1/health` returns `{ status: ok, timestamp: ISO }`.
- **Rate limiting** — `/auth/login` returns 429 after the 5/min cap.

## Frontend

Next.js 14 + React Testing Library + Vitest + MSW (for HTTP mocking).

### Layout

```
frontend/
├── src/lib/rbac.test.ts
├── src/lib/api-client.test.ts
├── src/lib/auth-api.test.ts
├── src/store/auth.store.test.ts
├── test/
│   ├── setup.ts               # global setup, MSW lifecycle, next/navigation + sonner mocks
│   ├── msw/server.ts          # setupServer()
│   ├── msw/handlers.ts        # default handlers + mutable `state` object
│   ├── AuthGate.test.tsx
│   ├── RouteGuard.test.tsx
│   └── LoginPage.test.tsx
├── vitest.config.ts
```

### Commands

```bash
cd frontend

npm test            # one-shot vitest run
npm run test:watch  # vitest in watch mode
npm run test:cov    # coverage + v8 thresholds
```

### Patterns to know

- **MSW mutable state** — `test/msw/handlers.ts` exports a mutable `state` object so tests can flip behavior (`state.loginShouldFail = true; state.loginErrorStatus = 429;`). Call `resetMockState()` in `beforeEach`.
- **Reset Zustand stores** between tests: `useAuthStore.setState({ user: null, status: 'idle' })`.
- **next/navigation is globally mocked** in `test/setup.ts`. The mock exports a stable `__mockRouter` you can spy on:
  ```ts
  const mockRouter = (navigation as unknown as { __mockRouter: { replace: ReturnType<typeof vi.fn> } }).__mockRouter;
  ```
- **JSX in tests** is compiled by `@vitejs/plugin-react` (rolldown/esbuild won't handle JSX with the project's `jsx: "preserve"` tsconfig).
- **Restore spies** between tests: tests in the same file that use `vi.spyOn(navigation, 'useSearchParams')` will bleed into later tests unless you call `vi.restoreAllMocks()` in `beforeEach`.

### What the suites cover

- **rbac** — capability matrix per role, route allow-list, `useCan` / `useCanAny` hooks via `renderHook`.
- **auth store** — `setUser`, `clear`, `hasRole` with multi-role acceptance.
- **api-client** — Bearer attachment, no-token behavior, 401 → single-flight refresh + retry, 401 with failed refresh → `onUnauthorized` callback, no refresh attempt on `/auth/login` itself.
- **auth-api** — `login`/`logout`/`bootstrapSession`/`changePassword`/`getMe`/`listUsers`/`createUser`/`updateUser`/`setUserRole`/`deleteUser`.
- **`<AuthGate>`** — refresh-on-mount success path, redirect on failure, no redirect when already on `/login`.
- **`<RouteGuard>`** — allows when role matches, redirects to `/unauthorized` when not, redirects to `/login` when unauthenticated, renders nothing while `status === 'idle'`.
- **`<LoginPage>`** — email/password validation, success → router.replace(next), `mustChangePassword` → `/settings/password`, server error toast, 429 friendly message, already-authed users redirect.

## Manual testing checklist

Items marked **(blocked)** depend on backend modules that haven't been built yet. Items marked **(automated)** are covered by the suites above; re-run them by hand only when smoke-testing a release.

### Auth (automated where noted)

- [x] Login with valid credentials succeeds (automated)
- [x] Wrong password returns generic error message (automated)
- [x] Account locks after 3 failed attempts (automated)
- [x] Locked account stays locked even with correct password (automated)
- [x] Refresh cookie set with `HttpOnly` + `SameSite=Strict` + path-scoped to `/api/v1/auth` (automated)
- [x] Refresh token rotation replaces old token on each use (automated)
- [x] Replaying a rotated refresh token revokes the whole family (automated)
- [x] Change password revokes all active sessions for that user (automated)
- [x] Access token issued before a password change is rejected (automated)
- [x] Bootstrap super-admin (`BOOTSTRAP_SUPERADMIN_EMAIL`) flagged `mustChangePassword=true`
- [ ] Bootstrap super-admin first-login flow forces redirect to `/settings/password` (UI exists; password page not yet built)

### Users / RBAC (automated)

- [x] Analyst can list users but not create/edit/delete (automated)
- [x] Admin can create + update users but cannot mint a super-admin (automated)
- [x] Admin cannot edit a super-admin (automated)
- [x] Only super-admin can change a user's role (automated)
- [x] Cannot change your own role (automated)
- [x] Cannot delete yourself (automated)
- [x] Cannot demote/delete the last remaining super-admin (automated)
- [x] Role change immediately revokes the affected user's sessions (automated)

### Audit log (automated)

- [x] Every login attempt (success + failure) writes a row (automated)
- [x] Logout, refresh success, refresh-reuse-detected, password change all write rows (automated)
- [x] User CRUD writes rows with `from`/`to` metadata for role changes (automated)
- [x] Audit failures never break the originating request (automated)
- [x] Analysts cannot read the audit log (403) (automated)

### Rate limiting (automated)

- [x] `/auth/login` returns 429 after 5 attempts/minute (automated)
- [x] `/auth/me/password` returns 429 after 5 attempts/minute (covered by the same Throttle decorator)

### Frontend behavior (automated where noted)

- [x] `<AuthGate>` bootstraps the session on app mount via the refresh cookie (automated)
- [x] Unauthenticated user is bounced to `/login` (automated)
- [x] `<RouteGuard route="tenants">` blocks admins (automated)
- [x] `<RouteGuard route="users">` blocks analysts (automated)
- [x] Login form validates email + non-empty password (automated)
- [x] Successful login honors `?next=` query param (automated)
- [x] `mustChangePassword` flag forces the password-change route (automated)
- [x] 429 from `/auth/login` shows a friendly "try again later" toast (automated)
- [ ] Dark / light theme toggle persists across reload (UI exists; not under automation yet)
- [ ] Sidebar collapses on small viewports (responsive design)
- [ ] Loading states render before data resolves
- [ ] Keyboard shortcut palette (Ctrl/Cmd+K) opens

### Blocked on future modules (not yet built)

- [ ] **(blocked)** Email template CRUD + variable substitution preview
- [ ] **(blocked)** Landing page CRUD + clone-an-existing-page flow
- [ ] **(blocked)** CSV user import with duplicate/format error handling
- [ ] **(blocked)** User-group CRUD
- [ ] **(blocked)** Campaign create → approve → launch workflow
- [ ] **(blocked)** Staggered queue-backed email sending (Bull)
- [ ] **(blocked)** Tracking pixel records open events
- [ ] **(blocked)** Click-tracking redirect records click events
- [ ] **(blocked)** Landing page form capture records submit events
- [ ] **(blocked)** "Report phishing" button records awareness event
- [ ] **(blocked)** Real-time campaign dashboard updates
- [ ] **(blocked)** CSV + PDF report export
- [ ] **(blocked)** Risk score calculation cron job
- [ ] **(blocked)** Risk dashboard with department filter
- [ ] **(blocked)** SMTP sending profile config + test send
- [ ] **(blocked)** SMTP error handling + retry policy
- [ ] **(blocked)** Adaptive training auto-assignment
- [ ] **(blocked)** Multi-tenant isolation

When those modules land, add their integration tests alongside the existing e2e suites and move the bullets from "blocked" to either "automated" or the explicit manual section.

## CI

`.github/workflows/ci.yml` runs four jobs per PR/push:

1. **backend** — `tsc --noEmit`, unit + e2e + coverage (thresholds enforced). Uploads `backend/coverage` as an artifact.
2. **frontend** — `tsc --noEmit`, vitest + coverage (thresholds enforced), `next build`. Uploads `frontend/coverage`.
3. **docker** — gated on backend + frontend; builds both images (cache-from/to GHA) without pushing.
4. **audit** — `npm audit --audit-level=high` (non-blocking) so high-severity transitive vulns surface in the PR view without blocking merges.

Concurrency is set to `cancel-in-progress: true` per ref, so pushing a new commit cancels the previous run.

## Coverage thresholds

| Metric     | Backend | Frontend |
| ---------- | ------: | -------: |
| Statements |     80% |      80% |
| Branches   |     70% |      70% |
| Functions  |     80% |      80% |
| Lines      |     80% |      80% |

A run below threshold fails the suite with a non-zero exit code so CI blocks merges.
