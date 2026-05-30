# Kiosk Light/Dark Theme Toggle — Design Spec

**Date:** 2026-05-30
**Status:** Approved

---

## Overview

Both kiosk pages — the Schedule/TV Kiosk (`/kiosk/:token`) and the Kids Check-In Kiosk (`/kids-checkin/kiosk`) — gain a light/dark mode toggle. Each kiosk displays a small sun/moon icon button fixed to the bottom-right corner. The preference persists in `localStorage` and defaults to dark.

---

## Architecture

### `useKioskTheme` hook

**File:** `frontend/src/hooks/useKioskTheme.ts`

- Reads from and writes to `localStorage` under the key `kiosk-theme`
- Default value: `'dark'` (preserves the current look on first visit)
- Returns `{ isDark: boolean, toggle: () => void }`
- No dependency on the app's `ThemeContext` or `ThemeProvider` — fully self-contained

```ts
// Interface
function useKioskTheme(): { isDark: boolean; toggle: () => void }
```

### Dark class scoping

Each kiosk page applies the `dark` CSS class to its outermost `<div>` — not to `<html>`. Because `steward-tokens.css` defines all `--st-*` variable overrides on `.dark` (not `html.dark`), the variables cascade correctly to any descendant when `.dark` is on any ancestor element. Tailwind's `dark:` variants also respond to a `.dark` ancestor, not exclusively `<html>`, so both approaches work correctly with this scoping strategy.

This keeps the kiosk theme completely isolated from the main app's theme, even when opened in the same browser session.

---

## Toggle Button

A small circular icon button, fixed to the bottom-right corner of the kiosk viewport.

- **Position:** `fixed bottom-4 right-4` (fixed to the viewport — correct for full-screen kiosk tabs)
- **Size:** 36×36px
- **Shape:** Circle (`rounded-full`)
- **Dark mode style:** `bg-gray-800 border border-gray-600 text-gray-200`
- **Light mode style:** `bg-gray-100 border border-gray-300 text-gray-700`
- **Icon:** `Moon` from lucide-react when in dark mode (click → go light); `Sun` from lucide-react when in light mode (click → go dark). Import directly from `lucide-react` — do not add to the icon registry, as these are kiosk-only.
- **Kids Check-In variant:** Semi-transparent / frosted glass over the gradient background (`bg-white/20 backdrop-blur-sm border border-white/30 text-white`)

---

## Schedule Kiosk Changes

**File:** `frontend/src/pages/schedules/ScheduleKioskPage.tsx`

All hardcoded dark Tailwind classes are replaced with explicit dark/light pairs using the `dark:` prefix on the root div's descendant elements.

| Current (hardcoded dark) | Replacement |
| --- | --- |
| `bg-gray-950` | `dark:bg-gray-950 bg-white` |
| `text-white` | `dark:text-white text-gray-900` |
| `border-gray-800` | `dark:border-gray-800 border-gray-200` |
| `bg-gray-900/60` | `dark:bg-gray-900/60 bg-gray-50` |
| `text-gray-500` | `dark:text-gray-500 text-gray-400` |
| `text-gray-700` | `dark:text-gray-700 text-gray-400` |
| `bg-gray-900/40` (empty cells) | `dark:bg-gray-900/40 bg-gray-50/60` |
| `bg-blue-950/40` (today) | `dark:bg-blue-950/40 bg-blue-50/40` |
| `bg-blue-900/55 border-blue-800/50` (slot cards) | `dark:bg-blue-900/55 dark:border-blue-800/50 bg-blue-50 border-blue-200` |
| `text-blue-400` (slot label) | `dark:text-blue-400 text-blue-600` |
| `text-gray-500` (day numbers, no slots) | `dark:text-gray-700 text-gray-300` |

The error and loading states use the same pattern.

---

## Kids Check-In Kiosk Changes

**File:** `frontend/src/pages/kids-checkin/KioskModePage.tsx`

This page already uses `var(--st-*)` CSS variables throughout. Since the variables are defined on `.dark` (any ancestor), applying `dark` to the root div automatically switches all variable-referenced colors to their dark values. No class-by-class replacement is needed.

Changes required:

1. Call `useKioskTheme()` at the top of the component
2. Apply `dark` class conditionally to the outermost `<div>` based on `isDark`
3. Add the toggle button (frosted glass style over gradient)

The gradient background (`from-[var(--st-primary)] via-purple-600 to-[var(--st-color-success)]`) is intentionally kept in both modes — it's the brand identity of the check-in screen.

---

## Files Affected

| File | Change |
| --- | --- |
| `frontend/src/hooks/useKioskTheme.ts` | **New** — theme hook |
| `frontend/src/pages/schedules/ScheduleKioskPage.tsx` | Replace hardcoded dark classes; add hook + toggle button |
| `frontend/src/pages/kids-checkin/KioskModePage.tsx` | Add hook + `dark` class on root + toggle button |

No backend changes. No database migration. No changes to `App.tsx`, `ThemeContext.tsx`, or any shared component.

---

## Behavior

- Default on first visit: **dark** (no change to existing appearance)
- Preference persists across page refreshes via `localStorage`
- The two kiosks have independent preferences (same key `kiosk-theme` is acceptable since they're typically on separate devices; if independence is needed later, keys can be split to `kiosk-schedule-theme` and `kiosk-checkin-theme`)
- Toggle is visible at all times in all kiosk states/steps

---

## Out of Scope

- Admin pre-configuration of kiosk theme (no URL param, no DB field)
- Any changes to the main app theme system
- Kids Check-In admin page (`/kids-checkin`) — unchanged
