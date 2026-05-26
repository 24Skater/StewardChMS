# Icon System Design

**Track:** 1 of 4 — Icon System
**Branch:** `feat/icon-system`
**Date:** 2026-05-26
**Status:** Approved

---

## Overview

Replace every emoji used as a UI element in StewardChMS with a professional SVG icon system. The system uses Lucide React for generic icons and four Claude-generated custom SVGs for church-specific concepts that Lucide does not cover. A single `<Icon>` component with a TypeScript-checked name union is the only public surface; no consumer imports individual icon components directly.

---

## Architecture

### New files

```text
frontend/src/lib/icons/
├── Icon.tsx          ← the one component all consumers use
├── registry.ts       ← IconName union + name → { outlined, filled } map
├── index.ts          ← re-exports Icon, IconName, and allIconNames
└── custom/
    ├── KidsCheckinIcon.tsx
    ├── MinistryIcon.tsx
    ├── WorshipIcon.tsx
    └── GivingIcon.tsx

frontend/src/components/ui/
└── EmptyState.tsx    ← new shared component using Icon at size 48
```

### Component API

```tsx
interface IconProps {
  name: IconName               // TypeScript union — compile-time checked
  size?: 12 | 14 | 16 | 18 | 20 | 24 | 32 | 48  // defaults to 18
  active?: boolean             // false = outlined, true = filled
  className?: string
  'aria-label'?: string        // omit for decorative; provide for semantic
}

export function Icon({ name, size = 18, active = false, className, 'aria-label': label }: IconProps)
```

**Filled behaviour:**

- Lucide icons: same icon component rendered with `fill="currentColor"` and `strokeWidth={0}`
- Custom SVGs: separate outlined and filled SVG path definitions per icon

### Size scale — context defaults

| px | Context |
| --- | --- |
| 12 | Status badges |
| 14 | Action buttons |
| 16 | Form prefixes |
| 18 (default) | Nav sidebar |
| 24 | Page headers, dashboard stat cards |
| 48 | Empty state illustrations |

---

## Icon Inventory

**46 total** — 42 Lucide + 4 custom SVGs.

### Custom SVGs (church-specific)

| IconName | Component | Description |
| --- | --- | --- |
| `"ministry"` | `MinistryIcon` | Concentric hexagon layers — structured org |
| `"kids-checkin"` | `KidsCheckinIcon` | Person silhouette + check circle overlay |
| `"worship"` | `WorshipIcon` | Raised-hands arch form |
| `"giving-hand"` | `GivingIcon` | Heart cradled in open hand |

Each custom component exports `{ outlined: FC, filled: FC }`.

### Lucide mappings

| IconName | Lucide component | Primary context |
| --- | --- | --- |
| `"dashboard"` | `LayoutDashboard` | Nav |
| `"members"` | `Users` | Nav, dashboard card, empty state |
| `"groups"` | `Globe` | Nav, dashboard card, empty state |
| `"events"` | `Calendar` | Nav, dashboard card, empty state |
| `"giving"` | `DollarSign` | Nav, dashboard card, empty state |
| `"messages"` | `MessageSquare` | Nav, empty state |
| `"reports"` | `BarChart2` | Nav, empty state |
| `"settings"` | `Settings` | Nav |
| `"add"` | `Plus` | Action buttons |
| `"edit"` | `Edit2` | Action buttons |
| `"delete"` | `Trash2` | Action buttons |
| `"search"` | `Search` | Action buttons |
| `"filter"` | `Filter` | Action buttons |
| `"download"` | `Download` | Action buttons |
| `"share"` | `Share2` | Action buttons |
| `"sort"` | `ArrowDownUp` | Action buttons |
| `"more"` | `MoreHorizontal` | Action buttons |
| `"external-link"` | `ExternalLink` | Action buttons |
| `"check"` | `Check` | Status badge |
| `"check-circle"` | `CheckCircle2` | Status badge |
| `"alert"` | `AlertTriangle` | Status badge |
| `"error"` | `XCircle` | Status badge |
| `"info"` | `Info` | Status badge |
| `"mail"` | `Mail` | Form prefix |
| `"lock"` | `Lock` | Form prefix |
| `"user"` | `User` | Form prefix |
| `"phone"` | `Phone` | Form prefix |
| `"location"` | `MapPin` | Form prefix |
| `"date"` | `CalendarDays` | Form prefix |
| `"close"` | `X` | Misc |
| `"back"` | `ChevronLeft` | Misc |
| `"refresh"` | `RefreshCw` | Misc |
| `"upload"` | `Upload` | Misc |
| `"copy"` | `Copy` | Misc |
| `"print"` | `Printer` | Misc |
| `"tag"` | `Tag` | Misc |
| `"star"` | `Star` | Misc |
| `"bell"` | `Bell` | Misc |
| `"logout"` | `LogOut` | Misc |
| `"eye"` | `Eye` | Misc |
| `"eye-off"` | `EyeOff` | Misc |

---

## Migration Plan

### PR 1 — Foundation (`feat/icon-system`)

**Scope:** Create the icon module; migrate nav and dashboard.

Build order:

1. `custom/KidsCheckinIcon.tsx` — outlined + filled SVG paths
2. `custom/MinistryIcon.tsx` — outlined + filled SVG paths
3. `custom/WorshipIcon.tsx` — outlined + filled SVG paths
4. `custom/GivingIcon.tsx` — outlined + filled SVG paths
5. `registry.ts` — `IconName` union + registry map
6. `Icon.tsx` — single component
7. `index.ts` — re-exports
8. `EmptyState.tsx` — new shared UI component
9. `AppLayout.tsx` — `NavItem.icon: string` → `icon: IconName`; `<span>{item.icon}</span>` → `<Icon name={item.icon} active={isActive} />`
10. `DashboardPage.tsx` — 4 stat card emoji → `<Icon name="..." size={24} />`

### PR 2 — Sweep (`feat/icon-system`)

**Scope:** All remaining emoji removed.

| File | Change |
| --- | --- |
| `frontend/src/pages/giving/ThankYouPage.tsx` | Celebratory emoji removed; copy updated to professional phrasing |
| `frontend/src/pages/kids-checkin/CheckInPage.tsx` | Emoji replaced with `<Icon>` |
| `frontend/src/pages/kids-checkin/CheckInKiosk.tsx` | Emoji replaced with `<Icon>` |
| `frontend/src/pages/kids-checkin/ChildCard.tsx` | Emoji replaced with `<Icon>` |
| `frontend/src/pages/kids-checkin/GuardianSearch.tsx` | Emoji replaced with `<Icon>` |
| `frontend/src/pages/kids-checkin/PrintBadge.tsx` | Emoji replaced with `<Icon>` |
| `frontend/src/lib/api.ts` | Emoji stripped from error message strings |
| `backend/src/index.ts` | Startup log emoji replaced with plain text |
| `backend/prisma/seed.ts` | Seed log emoji replaced with plain text |

---

## Testing

### Test files

| File | Tool | Covers |
| --- | --- | --- |
| `frontend/src/lib/icons/Icon.test.tsx` | Vitest + @testing-library/react | Renders all 46 names; correct size attr; outlined/filled toggle; aria-hidden on decorative; aria-label on semantic; default size 18 |
| `frontend/src/lib/icons/registry.test.ts` | Vitest | Every `IconName` key present in registry; both variants are functions |
| `e2e/icon-sprite.spec.ts` | Playwright | Screenshot of all 46 icons at all sizes on light and dark background |
| `e2e/nav-icons.spec.ts` | Playwright | Nav screenshot inactive state; nav screenshot active state |
| `scripts/check-no-emoji.sh` | bash + grep | Fails CI if any Unicode emoji found in `*.ts` or `*.tsx` source files |

### Accessibility invariants

- Decorative icons (no `aria-label` prop): rendered with `aria-hidden="true"`
- Semantic icons (with `aria-label` prop): rendered with `role="img"` and the label

### PR merge gate

All of the following must be green before any merge on `feat/icon-system`:

1. `tsc --noEmit` — zero type errors (catches invalid `IconName` values)
2. `vitest run` — unit + registry tests pass
3. `playwright test` — visual snapshot baselines match
4. Accessibility assertions pass within unit tests
5. `scripts/check-no-emoji.sh` — exits 0

Playwright baseline screenshots are committed to `e2e/screenshots/` and updated only with an explicit `--update-snapshots` flag on intentional visual changes.

---

## Out of Scope

- Church branding / color theming (Track 2)
- Replacing the `steward-brand` npm package (separate task)
- Splitting `frontend/src/lib/api.ts` (noted in CLAUDE.md; separate track)
- Adding new icons beyond the 46 defined here
