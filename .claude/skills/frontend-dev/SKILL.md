---
name: frontend-dev
description: >-
  Reference for the jphish/PhishGuard Next.js 14 frontend (frontend/). Use when working on App Router
  pages, screen components, the React Query data layer / api modules, the axios client & auth flow,
  Zustand stores, RBAC hooks, the loading/empty/error screen pattern, Tailwind/design-token styling, or
  frontend (Vitest) tests. Maps every screen to its file and whether it's wired to a real API.
---

# Frontend (Next.js 14, App Router) — developer reference

Workspace: `frontend/`. Next 14.2 · React 18 · TypeScript 5.3 · React Query 5 (TanStack) · Zustand 4 ·
axios · React Hook Form + Zod · Tailwind 3.4 · next-themes · sonner (toasts) · lucide icons.
Path alias `@/*` → `frontend/src/*`. For visual/design tokens see the **design-principles** skill.

## Routing — App Router (`frontend/app/`)

Pages are thin: `app/(app)/<route>/page.tsx` mostly imports a screen from `src/components/screens/`.
The `(app)` group layout gates auth and renders the `AppShell` (sidebar + topbar + modal hosts).

| Route | Page file | Screen | Wired to API? |
|---|---|---|---|
| `/` (Dashboard) | `app/(app)/page.tsx` | `DashboardScreen` | ✅ `/reports/dashboard` + `/campaigns` |
| `/campaigns` | `app/(app)/campaigns/page.tsx` | `CampaignsScreen` | ✅ |
| `/templates` | `app/(app)/templates/page.tsx` | `TemplatesScreen` | ✅ |
| `/landing` | `app/(app)/landing/page.tsx` | `LandingScreen` | ✅ |
| `/groups` | `app/(app)/groups/page.tsx` | `GroupsScreen` | ✅ |
| `/reports` | `app/(app)/reports/page.tsx` | `ReportsScreen` | ✅ (incl. submissions[]) |
| `/users` (Targets) | `app/(app)/users/page.tsx` | `UsersScreen` | ✅ aggregates group members via `useQueries` |
| `/users/admin` | `app/(app)/users/admin/page.tsx` | `UsersAdminScreen` | ✅ users + roles |
| `/settings` | `app/(app)/settings/page.tsx` | `SettingsScreen` | ✅ Audit log tab (`/audit-logs`); other sub-tabs empty |
| `/settings/password` | `app/(app)/settings/password/page.tsx` | `ChangePasswordScreen` | ✅ |
| Wizard (campaign create) | modal via `WizardHost` | `WizardScreen` | ✅ create flow |
| `/adaptive` | `app/(app)/adaptive/page.tsx` | `AdaptiveScreen` | ⬚ empty state (no backend) |
| `/alerts` | `app/(app)/alerts/page.tsx` | `AlertsScreen` | ⬚ empty state |
| `/tenants` | `app/(app)/tenants/page.tsx` | `TenantsScreen` | ⬚ empty state (super-admin only) |
| `/training` | `app/(app)/training/page.tsx` | `TrainingScreen` | ⬚ empty state |
| `/login` | `app/login/page.tsx` | — | ✅ login form |
| `/unauthorized` | `app/unauthorized/page.tsx` | — | 403 fallback |

**⬚ Empty-state screens are intentional** (Adaptive, Alerts, Tenants, Training, Settings→
Domains/Security/Billing/API, NotifPanel): no backend exists, so they show an honest `EmptyState` —
do **not** fabricate data and do **not** hide the nav entry. To wire one later, replace its `EmptyState`
with the standard query pattern below.

## Component structure (`frontend/src/components/`)

- **`shell/`** — app chrome: `AppShell`, `Sidebar` (RBAC-filtered nav, dynamic `['campaigns']` badge),
  `Topbar`, `PageHeader` (title/sub/tabs/actions), `AuthGate` (session bootstrap on mount),
  `RouteGuard` (route auth+role), `AccountMenu`, `WizardHost`, `CommandPalette` (⌘K), `NotifPanel`,
  `ToastHost` (sonner), `KeyboardShortcuts`, `TweaksPanel` (dev), `ThemeSync`, `PersonaRibbon`.
- **`screens/`** — one component per route (table above).
- **`ui/`** — primitives: **`States.tsx`** (`EmptyState`, `ErrorState`, `Skeleton`, `SkeletonRows`,
  `SkeletonCards`, `InlineLoading`, `errorMessage()`), `Primitives.tsx` (Avatar, Badge, RiskMeter,
  StatusBadge, Drawer), `Icons.tsx`, `Charts.tsx` (Sparkline, FunnelBars — mostly hand-rolled SVG).

## Data layer

- **axios client:** [frontend/src/lib/api-client.ts](../../../frontend/src/lib/api-client.ts) — default
  export `apiClient` (`baseURL = NEXT_PUBLIC_API_URL || http://localhost:3001/api/v1`, `withCredentials`,
  30s timeout) + named `setAccessToken` / `getAccessToken` / `setUnauthorizedHandler`.
- **api modules** (`frontend/src/lib/api/`), each wraps an endpoint group and is the queryFn source:
  `campaigns.ts`, `templates.ts`, `landing-pages.ts`, `groups.ts`, `reports.ts`, `smtp-profiles.ts`,
  `audit.ts`. Auth/users live in [frontend/src/lib/auth-api.ts](../../../frontend/src/lib/auth-api.ts).
- **React Query:** provider in [frontend/src/lib/providers.tsx](../../../frontend/src/lib/providers.tsx)
  (`staleTime: 30_000`, `refetchOnWindowFocus: false`). Query keys are simple arrays:
  `['campaigns']`, `['reports','dashboard']`, `['email-templates']`, `['smtp-profiles']`, etc. After a
  mutation, `queryClient.invalidateQueries({ queryKey: [...] })`.

### Auth token model (memory-resident — fixed 2026-05-23)
The access token lives **in memory only** (never localStorage), set via `setAccessToken`. The refresh
token is an HttpOnly cookie sent automatically (`withCredentials`). On a 401 the response interceptor does
a **single-flight** `POST /auth/refresh` and replays the original request once; if refresh fails it clears
the token and calls the handler set by `setUnauthorizedHandler` (the app wires this in `AuthGate` →
`store.clear()` + redirect to `/login`). Auth-flow endpoints (`/auth/login|refresh|logout`) are excluded
from the refresh-retry. The supporting types (`types/auth.types.ts`: `UserRole` super_admin/admin/analyst,
`AuthUser`, `LoginResponse`, …) and the Zustand `auth.store.ts` (`status`/`setUser`/`setStatus`/`clear`/
`hasRole`) match this contract. Verified by `api-client.test.ts` + `auth-api.test.ts`.

### Auth flow (intended)
`login()` → POST `/auth/login`, store token via `setAccessToken`. `AuthGate` on mount calls
`bootstrapSession()` → POST `/auth/refresh` (refresh cookie) → sets token + user in store, else clears.
`logout()` → POST `/auth/logout` + clear token. `(app)` layout/`RouteGuard` redirect to `/login` when
unauthenticated and to `/unauthorized` when the role lacks route access.

## State & hooks

- **Zustand stores** (`frontend/src/store/`): `auth.store.ts` (user + auth status),
  `session.store.ts` (persisted UI prefs: theme, density; `usePersona()`/`usePersonaInfo()` derived from
  role), `ui.store.ts` (ephemeral: wizard open, command palette, notif panel, toast).
- **Hooks** (`frontend/src/hooks/`): `useHealth.ts`, `useUsers.ts`.
- **Format helpers** [frontend/src/lib/ui-format.ts](../../../frontend/src/lib/ui-format.ts):
  `avatarFor`, `initials`, `riskBucket`, `riskLabel`, plus shared type unions. (The old
  `src/lib/seed-data.ts` fake-data layer was deleted; its pure helpers moved here.)
- **RBAC** [frontend/src/lib/rbac.ts](../../../frontend/src/lib/rbac.ts): capability matrix per role
  (`SUPER_ADMIN`/`ADMIN`/`ANALYST`); `can(role, cap)`, `useCan(cap)`, `useCanAny(...)`,
  `isRouteAllowed(role, route)`. Sidebar hides disallowed nav; action buttons gate on `useCan()`.
  `tenants` → super-admin only; `users` → admin/super-admin; rest → all three roles.

## The wired-screen pattern (copy this for new screens)

```tsx
'use client';
export function ThingScreen(): JSX.Element {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['things'],
    queryFn: () => listThings(),     // from src/lib/api/things.ts
  });

  return (
    <>
      <PageHeader title="Things" sub="…" />
      {isLoading ? <SkeletonRows rows={6} cols={4} />
        : error ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        : !data?.length ? <EmptyState title="No things yet" message="Create one to get started." />
        : <table className="table">{/* … */}</table>}
    </>
  );
}
```
Mutations: `useMutation({ mutationFn, onSuccess: () => { queryClient.invalidateQueries(...); toast.success(...) } })`.

## Conventions

- All screen/shell components are `'use client'`. `page.tsx` files are server components that just import
  a screen. Root `app/layout.tsx` mounts `AppProviders` (React Query + theme).
- Components `PascalCase.tsx`; api fns `camelCase` verb-noun (`listCampaigns`, `createCampaign`); store
  hooks `useAuthStore`/`useSession`/`useUI`. Styling is via design-token CSS classes from
  `src/styles/globals.css` (`.card`, `.btn`, `.table`, `.badge`, `.empty-state`, …) — see design skill.
- Forms: React Hook Form + Zod resolver. Toasts: `sonner`. Dates: `date-fns`.

## Config & testing

- [frontend/next.config.js](../../../frontend/next.config.js) (strict mode; prod console removal),
  [frontend/tsconfig.json](../../../frontend/tsconfig.json) (`@/*` alias),
  [frontend/tailwind.config.ts](../../../frontend/tailwind.config.ts) (darkMode `class`, tokens map to CSS vars).
- **Vitest** [frontend/vitest.config.ts](../../../frontend/vitest.config.ts): jsdom/happy-dom,
  `test/setup.ts` (jest-dom, **MSW** mocks in `test/msw/`, mocks `next/navigation`, `matchMedia`, sonner).
  Coverage gate 80% lines/stmts/fns, 70% branches.
- Run: `cd frontend && npm run dev` (port 3000) · `npm test` (vitest run) · `npm run test:cov` ·
  `npm run type-check` · `npm run build`.
