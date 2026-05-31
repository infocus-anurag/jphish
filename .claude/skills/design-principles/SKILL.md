---
name: design-principles
description: >-
  The jphish/PhishGuard design system & UI principles. Use when building or restyling any frontend UI —
  choosing colors/spacing/typography, using design tokens & CSS variables, theming (light/dark),
  applying the component class vocabulary (.card/.btn/.table/.badge/.empty-state…), the loading/empty/
  error doctrine, layout/density, or matching the original design prototypes in design/.
---

# Design principles & design system

The system is **token-first**: a fixed set of CSS custom properties defined for light + dark themes,
consumed by hand-written semantic classes. Tailwind is present but the app leans on these tokens/classes,
not utility soup. Source of truth: [frontend/src/styles/globals.css](../../../frontend/src/styles/globals.css)
(runtime) — mirrored from the original prototype [design/extracted/styles.css](../../../design/extracted/styles.css).

## Core principles

1. **Token-driven, never hard-coded.** Use `var(--…)` (or the semantic class) for every color, radius,
   shadow, font. Never paste a hex/oklch literal into a component. This is what makes theming free.
2. **Calm, neutral, professional.** Cool-slate neutrals + a single cool-blue accent; semantic colors
   (danger/warn/ok/info) are reserved for status, not decoration. It's a security tool — restrained, dense,
   legible. Serious by default.
3. **Honesty over fake polish.** If there's no data/backend, show a real `EmptyState` — never fabricate
   numbers, fake dots, or placeholder charts. (This is a hard project rule; see frontend skill.)
4. **One way to do each thing.** Reuse the primitives in `src/components/ui/` and the class vocabulary
   below instead of inventing new variants. Consistency > novelty.
5. **Both themes, always.** Anything you add must look right in light **and** dark — only tokens swap, no
   JS color math.

## Design tokens (the vocabulary)

Defined under `:root` (light) and `[data-theme="dark"]`. Theme is toggled by setting `data-theme` on
`<html>` (via `next-themes` / `ThemeSync`).

- **Surfaces:** `--bg` (app), `--bg-elev` (cards/popovers), `--bg-sunken`, `--bg-hover`, `--bg-active`.
- **Text:** `--fg`, `--fg-muted`, `--fg-subtle`, `--fg-faint` (decreasing emphasis).
- **Lines:** `--line`, `--line-strong` (borders/dividers).
- **Accent (cool blue, oklch):** `--accent`, `--accent-fg`, `--accent-soft`, `--accent-soft-fg`,
  `--accent-line`. Use for primary actions, active nav, focus.
- **Semantic (each has base / `-soft` bg / `-fg`):** `--danger` (red ~25°), `--warn` (amber ~75°),
  `--ok` (green ~155°), `--info` (blue ~230°). Map to status only.
- **Radius:** `--radius-sm` 5 · `--radius` 7 · `--radius-md` 10 · `--radius-lg` 14 px.
- **Shadows:** `--shadow-sm`, `--shadow`, `--shadow-pop` (popover/elevated).
- **Type:** `--font-sans` Geist · `--font-mono` Geist Mono · `--font-serif` Instrument Serif.

## Class vocabulary (semantic classes in globals.css)

Prefer these over ad-hoc Tailwind. They already consume the tokens and theme correctly.

- **Layout:** `.app` (grid: ~232px sidebar + 1fr main), `.sidebar` + `.sidebar-brand`/`.sidebar-nav`/
  `.nav-item`(`.active`), `.topbar` + `.topbar-crumbs`/`.topbar-search`, `.main` + `.main-body`.
- **Page:** `.page-head`, `.page-title`, `.page-sub`, `.tabs`/`.tab`(`.active`) — usually via the
  `PageHeader` component.
- **Surfaces:** `.card` + `.card-head`/`.card-body`; `.modal` + head/body/foot; `.drawer`.
- **Controls:** `.btn` (+ `.primary`/`.accent`/`.ghost`/`.danger`, sizes `.sm`/`.lg`), `.input`,
  `.field-label`, `.field-help`.
- **Data:** `.table` (`th`/`td`), `.stat` + `.stat-label`/`.stat-value`, `.badge` (+ `.ok`/`.warn`/
  `.danger`), `.avatar` (+ `.sm`/`.lg`).
- **States:** `.empty-state` (+ `-icon`/`-title`), `.skeleton`/`.skeleton-row`, `.toast`.

## Loading / empty / error doctrine

Every async view resolves to exactly one of four states, via the primitives in
[frontend/src/components/ui/States.tsx](../../../frontend/src/components/ui/States.tsx):
**loading** → `<SkeletonRows/>` / `<SkeletonCards/>` / `<InlineLoading/>` · **error** → `<ErrorState
onRetry/>` (message via `errorMessage(err)`) · **empty** → `<EmptyState title message/>` · **data** → the
real table/cards. (The full code pattern is in the **frontend-dev** skill.) Don't show a spinner where a
skeleton fits; don't show blank where an empty state belongs.

## Reusable primitives ([frontend/src/components/ui/](../../../frontend/src/components/ui/))

- `Primitives.tsx` — `Avatar` (deterministic gradient via `avatarFor`/`initials` from `ui-format.ts`),
  `Badge`, `StatusBadge`, `RiskMeter` (uses `riskBucket`/`riskLabel`), `Drawer`.
- `Icons.tsx` — the icon set (lucide-based). `Charts.tsx` — `Sparkline`, `FunnelBars`, etc. (hand-rolled
  SVG; Recharts is available but rarely used). Build new visuals here, not inline in screens.

## Density, motion, a11y

- **Dense but breathable** — small radii, tight spacing, generous use of `--fg-muted`/`--fg-subtle` for
  hierarchy. A `density` preference exists in `session.store.ts`.
- **Motion is subtle** (`tailwindcss-animate`); skeletons shimmer, panels/drawers slide. No gratuitous
  animation.
- **Accessibility:** maintain contrast in both themes (tokens are tuned for it), real focus states (accent
  ring), semantic HTML, label every input (`.field-label`).

## Original prototypes ([design/extracted/](../../../design/extracted/))

The product's visual language was prototyped as standalone JSX before implementation. Use these as the
canonical reference for layout/interaction when building or restyling a screen:
`shell.jsx`, `primitives.jsx`, `charts.jsx`, `design-canvas.jsx`, `styles.css`, plus per-screen mocks in
`design/extracted/screens/` (`dashboard.jsx`, `campaigns.jsx`, `templates.jsx`, `landing.jsx`,
`users.jsx`, `wizard.jsx`, `settings.jsx`, `adaptive.jsx`) and the rendered `JPhish.html`. When a built
screen and its prototype diverge, the prototype shows intended design; the live tokens/classes show how to
implement it.
