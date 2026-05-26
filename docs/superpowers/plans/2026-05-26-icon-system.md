# Icon System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every emoji used as a UI element in StewardChMS with a typed SVG icon system built on Lucide React + 4 custom church-specific icons.

**Architecture:** A single `<Icon name="..." size={n} active={bool} />` component backed by a `registry.ts` that maps `IconName` string literals to `{ outlined, filled }` component pairs. Lucide icons get filled via `fill="currentColor" strokeWidth={0}`; custom SVGs ship separate outlined/filled path sets. All consumers import from `@/lib/icons` only — no direct Lucide imports in app code.

**Tech Stack:** React 18, TypeScript 5.6, Lucide React 0.447, Vitest + @testing-library/react (jsdom), Playwright E2E

---

> **Spec note:** During implementation recon, 11 nav items were found in `AppLayout.tsx` that weren't in the original spec inventory (households, songs, pledges, funds, expenses, invoices, purchase-orders, vendors, products, inventory, sales). The registry in this plan covers all 56 icon names actually needed. The spec's stated count of 46 is superseded by this plan.

---

## File Map

### Create (new files)

| Path | Purpose |
| --- | --- |
| `frontend/src/lib/icons/custom/KidsCheckinIcon.tsx` | Person + check-badge SVG, outlined + filled |
| `frontend/src/lib/icons/custom/MinistryIcon.tsx` | Nested hexagons SVG, outlined + filled |
| `frontend/src/lib/icons/custom/WorshipIcon.tsx` | Raised-arms SVG, outlined + filled |
| `frontend/src/lib/icons/custom/GivingIcon.tsx` | Heart-in-hand SVG, outlined + filled |
| `frontend/src/lib/icons/registry.ts` | `IconName` union + name → `{ outlined, filled }` map |
| `frontend/src/lib/icons/Icon.tsx` | Single public component |
| `frontend/src/lib/icons/index.ts` | Re-exports |
| `frontend/src/lib/icons/Icon.test.tsx` | Unit + a11y tests for Icon |
| `frontend/src/lib/icons/registry.test.ts` | Registry completeness tests |
| `frontend/src/components/ui/EmptyState.tsx` | Shared empty-state component using Icon at 48px |
| `e2e/icon-sprite.spec.ts` | Playwright visual regression — all icons |
| `e2e/nav-icons.spec.ts` | Playwright visual regression — nav sidebar |
| `scripts/check-no-emoji.sh` | CI script: fail if emoji found in source |

### Modify (existing files)

| Path | Change summary |
| --- | --- |
| `frontend/src/components/layout/AppLayout.tsx` | `NavItem.icon: string` → `IconName`; `<span>{emoji}</span>` → `<Icon>` |
| `frontend/src/pages/DashboardPage.tsx` | Quick action + stat card emoji → `<Icon>` |
| `frontend/src/pages/giving/ThankYouPage.tsx` | Error emoji → `<Icon>`; celebratory text cleaned |
| `frontend/src/pages/giving/GivingPortalPage.tsx` | Decorative 💝 → removed |
| `frontend/src/pages/kids-checkin/KidsCheckinPage.tsx` | Emoji in medical note strings → removed |
| `frontend/src/pages/kids-checkin/KioskModePage.tsx` | Emoji in medical note strings → removed |
| `backend/src/index.ts` | Startup log emoji → plain text |
| `backend/src/lib/security.ts` | console.error emoji → plain text |
| `backend/prisma/seed.ts` | Seed log emoji → plain text |

---

## Task 1: Create the feature branch

**Files:** none

- [ ] **Step 1: Create and switch to `feat/icon-system`**

```bash
git checkout -b feat/icon-system
```

Expected: `Switched to a new branch 'feat/icon-system'`

- [ ] **Step 2: Verify all dependencies are present**

```bash
cd frontend && npm ls lucide-react @testing-library/react vitest 2>&1 | grep -E "(lucide|testing-library/react|vitest)"
```

Expected: three lines showing installed versions (lucide-react 0.447.x, @testing-library/react 16.x, vitest 4.x). If any are missing run `npm install <package>`.

---

## Task 2: KidsCheckinIcon — person + check-badge

**Files:**
- Create: `frontend/src/lib/icons/custom/KidsCheckinIcon.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p frontend/src/lib/icons/custom
```

- [ ] **Step 2: Write the failing smoke test**

Create `frontend/src/lib/icons/custom/KidsCheckinIcon.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { KidsCheckinIconOutlined, KidsCheckinIconFilled } from './KidsCheckinIcon'

it('outlined renders an svg at the given size', () => {
  const { container } = render(<KidsCheckinIconOutlined size={24} />)
  const svg = container.querySelector('svg')
  expect(svg).toBeTruthy()
  expect(svg?.getAttribute('width')).toBe('24')
})

it('filled renders an svg at the given size', () => {
  const { container } = render(<KidsCheckinIconFilled size={24} />)
  const svg = container.querySelector('svg')
  expect(svg).toBeTruthy()
  expect(svg?.getAttribute('width')).toBe('24')
})
```

- [ ] **Step 3: Run — expect FAIL (module not found)**

```bash
cd frontend && npx vitest run src/lib/icons/custom/KidsCheckinIcon.test.tsx
```

Expected: `FAIL — Cannot find module './KidsCheckinIcon'`

- [ ] **Step 4: Implement KidsCheckinIcon.tsx**

```tsx
import type { FC } from 'react'
import type { SVGAttributes } from 'react'

type Props = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export const KidsCheckinIconOutlined: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
    <path
      d="M3 21v-1a6 6 0 0 1 6-6h2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="17.5" cy="16.5" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m14.8 16.5 1.8 1.8 3.1-3.1"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const KidsCheckinIconFilled: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <circle cx="9" cy="8" r="3.5" fill="currentColor" />
    <path
      d="M3 21v-1a6 6 0 0 1 6-6h2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="17.5" cy="16.5" r="4.5" fill="currentColor" />
    <path
      d="m14.8 16.5 1.8 1.8 3.1-3.1"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd frontend && npx vitest run src/lib/icons/custom/KidsCheckinIcon.test.tsx
```

Expected: `PASS — 2 tests passed`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/icons/custom/KidsCheckinIcon.tsx frontend/src/lib/icons/custom/KidsCheckinIcon.test.tsx
git commit -m "feat: add KidsCheckinIcon custom SVG (outlined + filled)"
```

---

## Task 3: MinistryIcon — nested hexagons

**Files:**
- Create: `frontend/src/lib/icons/custom/MinistryIcon.tsx`

- [ ] **Step 1: Write failing test**

Create `frontend/src/lib/icons/custom/MinistryIcon.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { MinistryIconOutlined, MinistryIconFilled } from './MinistryIcon'

it('outlined renders svg at given size', () => {
  const { container } = render(<MinistryIconOutlined size={24} />)
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('width')).toBe('24')
})

it('filled renders svg at given size', () => {
  const { container } = render(<MinistryIconFilled size={24} />)
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('width')).toBe('24')
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/lib/icons/custom/MinistryIcon.test.tsx
```

- [ ] **Step 3: Implement MinistryIcon.tsx**

```tsx
import type { FC, SVGAttributes } from 'react'

type Props = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export const MinistryIconOutlined: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <polygon
      points="12,2 21,7 21,17 12,22 3,17 3,7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <polygon
      points="12,7.5 17,10.2 17,13.8 12,16.5 7,13.8 7,10.2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
)

export const MinistryIconFilled: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <polygon
      points="12,2 21,7 21,17 12,22 3,17 3,7"
      fill="currentColor"
    />
    <polygon
      points="12,7.5 17,10.2 17,13.8 12,16.5 7,13.8 7,10.2"
      fill="white"
      opacity="0.25"
    />
    <circle cx="12" cy="12" r="2" fill="white" />
  </svg>
)
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd frontend && npx vitest run src/lib/icons/custom/MinistryIcon.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/icons/custom/MinistryIcon.tsx frontend/src/lib/icons/custom/MinistryIcon.test.tsx
git commit -m "feat: add MinistryIcon custom SVG (outlined + filled)"
```

---

## Task 4: WorshipIcon — raised arms

**Files:**
- Create: `frontend/src/lib/icons/custom/WorshipIcon.tsx`

- [ ] **Step 1: Write failing test**

Create `frontend/src/lib/icons/custom/WorshipIcon.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { WorshipIconOutlined, WorshipIconFilled } from './WorshipIcon'

it('outlined renders svg at given size', () => {
  const { container } = render(<WorshipIconOutlined size={24} />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
})

it('filled renders svg at given size', () => {
  const { container } = render(<WorshipIconFilled size={24} />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/lib/icons/custom/WorshipIcon.test.tsx
```

- [ ] **Step 3: Implement WorshipIcon.tsx**

```tsx
import type { FC, SVGAttributes } from 'react'

type Props = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export const WorshipIconOutlined: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    {/* Left raised arm */}
    <path
      d="M8 13 Q6 9 7 5 Q8 3 10 4 Q11 5 10 8 L9 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right raised arm */}
    <path
      d="M16 13 Q18 9 17 5 Q16 3 14 4 Q13 5 14 8 L15 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Body arch */}
    <path
      d="M9 13 Q9 17 12 18 Q15 17 15 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

export const WorshipIconFilled: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <path
      d="M8 13 Q6 9 7 5 Q8 3 10 4 Q11 5 10 8 L9 13 Q9 17 12 18 Q15 17 15 13 L14 8 Q13 5 14 4 Q16 3 17 5 Q18 9 16 13"
      fill="currentColor"
      stroke="none"
    />
  </svg>
)
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd frontend && npx vitest run src/lib/icons/custom/WorshipIcon.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/icons/custom/WorshipIcon.tsx frontend/src/lib/icons/custom/WorshipIcon.test.tsx
git commit -m "feat: add WorshipIcon custom SVG (outlined + filled)"
```

---

## Task 5: GivingIcon — heart in open hand

**Files:**
- Create: `frontend/src/lib/icons/custom/GivingIcon.tsx`

- [ ] **Step 1: Write failing test**

Create `frontend/src/lib/icons/custom/GivingIcon.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { GivingIconOutlined, GivingIconFilled } from './GivingIcon'

it('outlined renders svg at given size', () => {
  const { container } = render(<GivingIconOutlined size={24} />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
})

it('filled renders svg at given size', () => {
  const { container } = render(<GivingIconFilled size={24} />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/lib/icons/custom/GivingIcon.test.tsx
```

- [ ] **Step 3: Implement GivingIcon.tsx**

```tsx
import type { FC, SVGAttributes } from 'react'

type Props = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export const GivingIconOutlined: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    {/* Open palm / hand */}
    <path
      d="M6 15h12l2 6H4l2-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Heart above */}
    <path
      d="M12 13 C12 13 7 10 7 7.5 C7 6 8.5 5 10 5.5 C11 6 12 7 12 7 C12 7 13 6 14 5.5 C15.5 5 17 6 17 7.5 C17 10 12 13 12 13 Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
)

export const GivingIconFilled: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...aria}
  >
    <path d="M6 15h12l2 6H4l2-6z" fill="currentColor" />
    <path
      d="M12 13 C12 13 7 10 7 7.5 C7 6 8.5 5 10 5.5 C11 6 12 7 12 7 C12 7 13 6 14 5.5 C15.5 5 17 6 17 7.5 C17 10 12 13 12 13 Z"
      fill="currentColor"
    />
  </svg>
)
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd frontend && npx vitest run src/lib/icons/custom/GivingIcon.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/icons/custom/GivingIcon.tsx frontend/src/lib/icons/custom/GivingIcon.test.tsx
git commit -m "feat: add GivingIcon custom SVG (outlined + filled)"
```

---

## Task 6: Registry — name → component map (TDD)

**Files:**
- Create: `frontend/src/lib/icons/registry.ts`
- Create: `frontend/src/lib/icons/registry.test.ts`

- [ ] **Step 1: Write the failing registry test**

Create `frontend/src/lib/icons/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { registry, allIconNames } from './registry'

describe('registry', () => {
  it('has 56 entries', () => {
    expect(allIconNames.length).toBe(56)
  })

  it('every IconName has an entry in the registry', () => {
    allIconNames.forEach(name => {
      expect(registry[name], `registry missing entry for "${name}"`).toBeDefined()
    })
  })

  it('every entry has an outlined function', () => {
    allIconNames.forEach(name => {
      expect(
        typeof registry[name].outlined,
        `registry["${name}"].outlined is not a function`
      ).toBe('function')
    })
  })

  it('every entry has a filled function', () => {
    allIconNames.forEach(name => {
      expect(
        typeof registry[name].filled,
        `registry["${name}"].filled is not a function`
      ).toBe('function')
    })
  })
})
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
cd frontend && npx vitest run src/lib/icons/registry.test.ts
```

- [ ] **Step 3: Implement registry.ts**

Create `frontend/src/lib/icons/registry.ts`:

```tsx
import React from 'react'
import type { FC, SVGAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, Home, Landmark, Calendar, Music,
  MessageSquare, DollarSign, Handshake, Wallet, TrendingDown,
  FileText, ClipboardList, Building2, ShoppingCart, Package,
  CreditCard, BarChart2, Settings, Plus, Edit2, Trash2, Search,
  Filter, Download, Share2, ArrowDownUp, MoreHorizontal, ExternalLink,
  Check, CheckCircle2, AlertTriangle, XCircle, Info, Mail, Lock,
  User, Phone, MapPin, CalendarDays, X, ChevronLeft, RefreshCw,
  Upload, Copy, Printer, Tag, Star, Bell, LogOut, Eye, EyeOff,
} from 'lucide-react'
import { KidsCheckinIconOutlined, KidsCheckinIconFilled } from './custom/KidsCheckinIcon'
import { MinistryIconOutlined, MinistryIconFilled } from './custom/MinistryIcon'
import { WorshipIconOutlined, WorshipIconFilled } from './custom/WorshipIcon'
import { GivingIconOutlined, GivingIconFilled } from './custom/GivingIcon'

export type IconVariantProps = {
  size?: number
  className?: string
} & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export type IconVariant = FC<IconVariantProps>

function lo(L: LucideIcon): IconVariant {
  return ({ size, className, ...aria }) =>
    React.createElement(L, { size, className, ...aria })
}

function lf(L: LucideIcon): IconVariant {
  return ({ size, className, ...aria }) =>
    React.createElement(L, { size, className, fill: 'currentColor', strokeWidth: 0, ...aria })
}

export type IconName =
  | 'dashboard' | 'members' | 'households' | 'groups' | 'events'
  | 'kids-checkin' | 'songs' | 'messages' | 'giving' | 'pledges'
  | 'funds' | 'expenses' | 'invoices' | 'purchase-orders' | 'vendors'
  | 'products' | 'inventory' | 'sales' | 'reports' | 'settings'
  | 'ministry' | 'worship' | 'giving-hand'
  | 'add' | 'edit' | 'delete' | 'search' | 'filter' | 'download'
  | 'share' | 'sort' | 'more' | 'external-link'
  | 'check' | 'check-circle' | 'alert' | 'error' | 'info'
  | 'mail' | 'lock' | 'user' | 'phone' | 'location' | 'date'
  | 'close' | 'back' | 'refresh' | 'upload' | 'copy' | 'print'
  | 'tag' | 'star' | 'bell' | 'logout' | 'eye' | 'eye-off'

export const registry: Record<IconName, { outlined: IconVariant; filled: IconVariant }> = {
  // Nav
  'dashboard':       { outlined: lo(LayoutDashboard), filled: lf(LayoutDashboard) },
  'members':         { outlined: lo(Users),           filled: lf(Users) },
  'households':      { outlined: lo(Home),            filled: lf(Home) },
  'groups':          { outlined: lo(Landmark),        filled: lf(Landmark) },
  'events':          { outlined: lo(Calendar),        filled: lf(Calendar) },
  'kids-checkin':    { outlined: KidsCheckinIconOutlined, filled: KidsCheckinIconFilled },
  'songs':           { outlined: lo(Music),           filled: lf(Music) },
  'messages':        { outlined: lo(MessageSquare),   filled: lf(MessageSquare) },
  'giving':          { outlined: lo(DollarSign),      filled: lf(DollarSign) },
  'pledges':         { outlined: lo(Handshake),       filled: lf(Handshake) },
  'funds':           { outlined: lo(Wallet),          filled: lf(Wallet) },
  'expenses':        { outlined: lo(TrendingDown),    filled: lf(TrendingDown) },
  'invoices':        { outlined: lo(FileText),        filled: lf(FileText) },
  'purchase-orders': { outlined: lo(ClipboardList),   filled: lf(ClipboardList) },
  'vendors':         { outlined: lo(Building2),       filled: lf(Building2) },
  'products':        { outlined: lo(ShoppingCart),    filled: lf(ShoppingCart) },
  'inventory':       { outlined: lo(Package),         filled: lf(Package) },
  'sales':           { outlined: lo(CreditCard),      filled: lf(CreditCard) },
  'reports':         { outlined: lo(BarChart2),       filled: lf(BarChart2) },
  'settings':        { outlined: lo(Settings),        filled: lf(Settings) },
  // Custom church SVGs
  'ministry':        { outlined: MinistryIconOutlined,    filled: MinistryIconFilled },
  'worship':         { outlined: WorshipIconOutlined,     filled: WorshipIconFilled },
  'giving-hand':     { outlined: GivingIconOutlined,      filled: GivingIconFilled },
  // Actions
  'add':             { outlined: lo(Plus),            filled: lf(Plus) },
  'edit':            { outlined: lo(Edit2),           filled: lf(Edit2) },
  'delete':          { outlined: lo(Trash2),          filled: lf(Trash2) },
  'search':          { outlined: lo(Search),          filled: lf(Search) },
  'filter':          { outlined: lo(Filter),          filled: lf(Filter) },
  'download':        { outlined: lo(Download),        filled: lf(Download) },
  'share':           { outlined: lo(Share2),          filled: lf(Share2) },
  'sort':            { outlined: lo(ArrowDownUp),     filled: lf(ArrowDownUp) },
  'more':            { outlined: lo(MoreHorizontal),  filled: lf(MoreHorizontal) },
  'external-link':   { outlined: lo(ExternalLink),    filled: lf(ExternalLink) },
  // Status
  'check':           { outlined: lo(Check),           filled: lf(Check) },
  'check-circle':    { outlined: lo(CheckCircle2),    filled: lf(CheckCircle2) },
  'alert':           { outlined: lo(AlertTriangle),   filled: lf(AlertTriangle) },
  'error':           { outlined: lo(XCircle),         filled: lf(XCircle) },
  'info':            { outlined: lo(Info),            filled: lf(Info) },
  // Form
  'mail':            { outlined: lo(Mail),            filled: lf(Mail) },
  'lock':            { outlined: lo(Lock),            filled: lf(Lock) },
  'user':            { outlined: lo(User),            filled: lf(User) },
  'phone':           { outlined: lo(Phone),           filled: lf(Phone) },
  'location':        { outlined: lo(MapPin),          filled: lf(MapPin) },
  'date':            { outlined: lo(CalendarDays),    filled: lf(CalendarDays) },
  // Misc
  'close':           { outlined: lo(X),               filled: lf(X) },
  'back':            { outlined: lo(ChevronLeft),     filled: lf(ChevronLeft) },
  'refresh':         { outlined: lo(RefreshCw),       filled: lf(RefreshCw) },
  'upload':          { outlined: lo(Upload),          filled: lf(Upload) },
  'copy':            { outlined: lo(Copy),            filled: lf(Copy) },
  'print':           { outlined: lo(Printer),         filled: lf(Printer) },
  'tag':             { outlined: lo(Tag),             filled: lf(Tag) },
  'star':            { outlined: lo(Star),            filled: lf(Star) },
  'bell':            { outlined: lo(Bell),            filled: lf(Bell) },
  'logout':          { outlined: lo(LogOut),          filled: lf(LogOut) },
  'eye':             { outlined: lo(Eye),             filled: lf(Eye) },
  'eye-off':         { outlined: lo(EyeOff),          filled: lf(EyeOff) },
}

export const allIconNames = Object.keys(registry) as IconName[]
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd frontend && npx vitest run src/lib/icons/registry.test.ts
```

Expected: `PASS — 4 tests passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/icons/registry.ts frontend/src/lib/icons/registry.test.ts
git commit -m "feat: add icon registry with 56 named entries"
```

---

## Task 7: Icon component (TDD)

**Files:**
- Create: `frontend/src/lib/icons/Icon.tsx`
- Create: `frontend/src/lib/icons/Icon.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/lib/icons/Icon.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Icon } from './Icon'
import { allIconNames } from './registry'

describe('Icon', () => {
  it('renders without crashing for all 56 names', () => {
    allIconNames.forEach(name => {
      const { unmount } = render(<Icon name={name} />)
      unmount()
    })
  })

  it('defaults to size 18', () => {
    const { container } = render(<Icon name="dashboard" />)
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('18')
  })

  it('applies custom size', () => {
    const { container } = render(<Icon name="dashboard" size={24} />)
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
  })

  it('decorative icon (no aria-label) has aria-hidden="true"', () => {
    const { container } = render(<Icon name="dashboard" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('decorative icon has no role attribute', () => {
    const { container } = render(<Icon name="dashboard" />)
    expect(container.querySelector('svg')?.getAttribute('role')).toBeNull()
  })

  it('labelled icon is findable by role="img" and label', () => {
    render(<Icon name="delete" aria-label="Delete member" />)
    expect(screen.getByRole('img', { name: 'Delete member' })).toBeInTheDocument()
  })

  it('labelled icon does not have aria-hidden', () => {
    const { container } = render(<Icon name="delete" aria-label="Delete member" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBeNull()
  })

  it('active=false renders outlined variant (fill="none" on Lucide icons)', () => {
    const { container } = render(<Icon name="dashboard" active={false} />)
    expect(container.querySelector('svg')?.getAttribute('fill')).toBe('none')
  })

  it('active=true renders filled variant (fill="currentColor" on Lucide icons)', () => {
    const { container } = render(<Icon name="dashboard" active />)
    expect(container.querySelector('svg')?.getAttribute('fill')).toBe('currentColor')
  })

  it('forwards className to the svg', () => {
    const { container } = render(<Icon name="dashboard" className="text-blue-500" />)
    expect(container.querySelector('svg')?.classList.contains('text-blue-500')).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
cd frontend && npx vitest run src/lib/icons/Icon.test.tsx
```

- [ ] **Step 3: Implement Icon.tsx**

```tsx
import { registry } from './registry'
import type { IconName } from './registry'

interface IconProps {
  name: IconName
  size?: 12 | 14 | 16 | 18 | 20 | 24 | 32 | 48
  active?: boolean
  className?: string
  'aria-label'?: string
}

export function Icon({
  name,
  size = 18,
  active = false,
  className,
  'aria-label': ariaLabel,
}: IconProps) {
  const entry = registry[name]
  const Component = active ? entry.filled : entry.outlined

  return (
    <Component
      size={size}
      className={className}
      aria-hidden={ariaLabel ? undefined : 'true'}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    />
  )
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd frontend && npx vitest run src/lib/icons/Icon.test.tsx
```

Expected: `PASS — 10 tests passed`

- [ ] **Step 5: Run all icon tests together**

```bash
cd frontend && npx vitest run src/lib/icons/
```

Expected: all tests pass across Icon, registry, and the 4 custom SVG smoke tests.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/icons/Icon.tsx frontend/src/lib/icons/Icon.test.tsx
git commit -m "feat: add Icon component with outlined/filled toggle and a11y props"
```

---

## Task 8: index.ts re-exports + EmptyState component

**Files:**
- Create: `frontend/src/lib/icons/index.ts`
- Create: `frontend/src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Create index.ts**

```ts
export { Icon } from './Icon'
export type { IconName } from './registry'
export { allIconNames } from './registry'
```

- [ ] **Step 2: Write EmptyState test**

Create `frontend/src/components/ui/EmptyState.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'

it('renders the title', () => {
  render(<EmptyState icon="members" title="No members yet" />)
  expect(screen.getByText('No members yet')).toBeInTheDocument()
})

it('renders optional description', () => {
  render(
    <EmptyState icon="events" title="No events" description="Add your first event to get started." />
  )
  expect(screen.getByText('Add your first event to get started.')).toBeInTheDocument()
})

it('renders a 48px icon', () => {
  const { container } = render(<EmptyState icon="reports" title="No reports" />)
  expect(container.querySelector('svg')?.getAttribute('width')).toBe('48')
})

it('renders optional action button', () => {
  render(
    <EmptyState
      icon="members"
      title="No members"
      action={{ label: 'Add Member', onClick: () => {} }}
    />
  )
  expect(screen.getByRole('button', { name: 'Add Member' })).toBeInTheDocument()
})
```

- [ ] **Step 3: Run — expect FAIL**

```bash
cd frontend && npx vitest run src/components/ui/EmptyState.test.tsx
```

- [ ] **Step 4: Implement EmptyState.tsx**

```tsx
import { Icon } from '@/lib/icons'
import type { IconName } from '@/lib/icons'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: IconName
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon
        name={icon}
        size={48}
        className="text-[var(--st-muted)] mb-4"
        aria-hidden="true"
      />
      <h3 className="text-lg font-semibold text-[var(--st-fg)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--st-muted)] max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd frontend && npx vitest run src/components/ui/EmptyState.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/icons/index.ts frontend/src/components/ui/EmptyState.tsx frontend/src/components/ui/EmptyState.test.tsx
git commit -m "feat: add icon index re-exports and EmptyState component"
```

---

## Task 9: Migrate AppLayout.tsx

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add Icon import and update NavItem type**

In `frontend/src/components/layout/AppLayout.tsx`, make these changes:

Add import after the existing imports:
```tsx
import { Icon } from '@/lib/icons'
import type { IconName } from '@/lib/icons'
```

Change the `NavItem` interface (line 9):
```tsx
// BEFORE
interface NavItem {
  label: string
  href: string
  icon: string
}

// AFTER
interface NavItem {
  label: string
  href: string
  icon: IconName
}
```

- [ ] **Step 2: Replace emoji strings in navSections**

Replace the entire `navSections` constant with:

```tsx
const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    ],
  },
  {
    title: 'People & Groups',
    items: [
      { label: 'Members', href: '/members', icon: 'members' },
      { label: 'Households', href: '/households', icon: 'households' },
      { label: 'Groups', href: '/groups', icon: 'groups' },
    ],
  },
  {
    title: 'Events & Worship',
    items: [
      { label: 'Events', href: '/events', icon: 'events' },
      { label: 'Kids Check-In', href: '/kids-checkin', icon: 'kids-checkin' },
      { label: 'Songs', href: '/songs', icon: 'songs' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Messages', href: '/communications', icon: 'messages' },
    ],
  },
  {
    title: 'Giving & Finance',
    items: [
      { label: 'Donations', href: '/giving', icon: 'giving' },
      { label: 'Pledges', href: '/pledges', icon: 'pledges' },
      { label: 'Funds', href: '/funds', icon: 'funds' },
      { label: 'Expenses', href: '/expenses', icon: 'expenses' },
      { label: 'Invoices', href: '/invoices', icon: 'invoices' },
      { label: 'Purchase Orders', href: '/purchase-orders', icon: 'purchase-orders' },
      { label: 'Vendors', href: '/vendors', icon: 'vendors' },
    ],
  },
  {
    title: 'Sales & Inventory',
    items: [
      { label: 'Products', href: '/products', icon: 'products' },
      { label: 'Inventory', href: '/inventory', icon: 'inventory' },
      { label: 'Sales', href: '/sales', icon: 'sales' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Reports', href: '/reports', icon: 'reports' },
      { label: 'Settings', href: '/admin/settings', icon: 'settings' },
    ],
  },
]
```

- [ ] **Step 3: Replace the icon render (line 139)**

Find this line:
```tsx
<span className="text-lg flex-shrink-0">{item.icon}</span>
```

Replace with:
```tsx
<Icon name={item.icon} size={18} active={isActive} className="flex-shrink-0" />
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors. If you see `Type '"kids-checkin"' is not assignable to type 'IconName'`, the registry.ts `IconName` union is missing that name — check Task 6 output.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "feat: migrate AppLayout nav from emoji to Icon component"
```

---

## Task 10: Migrate DashboardPage.tsx

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add Icon import**

Add after existing imports in `frontend/src/pages/DashboardPage.tsx`:

```tsx
import { Icon } from '@/lib/icons'
import type { IconName } from '@/lib/icons'
```

- [ ] **Step 2: Update quickActions type and values**

Find the `quickActions` array (around line 74). The array items have `icon: string`. Change them:

```tsx
// Find the type definition for quick actions (may be inline). 
// Change icon field type to IconName.
// Replace emoji values:

{ label: 'Create Event', href: '/events/new', icon: 'events' as IconName, color: 'bg-emerald-500/20 text-emerald-400' },
{ label: 'Record Donation', href: '/giving/new', icon: 'giving' as IconName, color: 'bg-amber-500/20 text-amber-400' },
{ label: 'Send Message', href: '/communications/new', icon: 'messages' as IconName, color: 'bg-purple-500/20 text-purple-400' },
```

If there is an inline type for quickActions items, update `icon: string` → `icon: IconName`. Then remove the `as IconName` casts.

- [ ] **Step 3: Replace stat card emoji spans**

Find (around line 110) four blocks like:
```tsx
<span className="text-2xl">👥</span>
<span className="text-2xl">📅</span>
<span className="text-2xl">💝</span>
<span className="text-2xl">🏛️</span>
```

Replace each with:
```tsx
<Icon name="members" size={24} className="text-[var(--st-muted)]" />
<Icon name="events" size={24} className="text-[var(--st-muted)]" />
<Icon name="giving" size={24} className="text-[var(--st-muted)]" />
<Icon name="groups" size={24} className="text-[var(--st-muted)]" />
```

- [ ] **Step 4: Replace quick action icon render**

Find the JSX that renders `action.icon` as an emoji (look for `{action.icon}` inside a `<span>`). Replace with:

```tsx
<Icon name={action.icon} size={20} />
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: migrate DashboardPage stat cards and quick actions to Icon"
```

---

## Task 11: PR 1 — run checks and verify

**Files:** none (verification only)

- [ ] **Step 1: Run all frontend unit tests**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass including the new icon tests.

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Build check**

```bash
cd frontend && npm run build
```

Expected: build succeeds. Fix any errors before continuing.

- [ ] **Step 4: Tag PR 1 completion**

```bash
git tag pr1-icon-foundation
```

---

## Task 12: Emoji sweep script

**Files:**
- Create: `scripts/check-no-emoji.sh`

- [ ] **Step 1: Create the script**

```bash
cat > scripts/check-no-emoji.sh << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

FOUND=$(grep -rPn '[\x{1F000}-\x{1FFFF}\x{2600}-\x{27FF}]' \
  --include='*.ts' --include='*.tsx' \
  frontend/src backend/src backend/prisma \
  2>/dev/null || true)

if [[ -n "$FOUND" ]]; then
  echo "FAIL: Emoji found in source files:"
  echo "$FOUND"
  exit 1
fi

echo "OK: No emoji found in source files."
SCRIPT
chmod +x scripts/check-no-emoji.sh
```

- [ ] **Step 2: Run against current state (expect FAIL — PR 2 files not migrated yet)**

```bash
bash scripts/check-no-emoji.sh
```

Expected: `FAIL` listing the remaining emoji in ThankYouPage, GivingPortalPage, kids-checkin files, and backend. This confirms the script works.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-no-emoji.sh
git commit -m "chore: add emoji sweep CI script"
```

---

## Task 13: Migrate remaining frontend pages

**Files:**
- Modify: `frontend/src/pages/giving/ThankYouPage.tsx`
- Modify: `frontend/src/pages/giving/GivingPortalPage.tsx`
- Modify: `frontend/src/pages/kids-checkin/KidsCheckinPage.tsx`
- Modify: `frontend/src/pages/kids-checkin/KioskModePage.tsx`

- [ ] **Step 1: Fix ThankYouPage.tsx**

Open `frontend/src/pages/giving/ThankYouPage.tsx`.

Find line 51: `<div className="text-6xl mb-4">❌</div>`

Add icon import at top:
```tsx
import { Icon } from '@/lib/icons'
```

Replace the error emoji div with:
```tsx
<Icon name="error" size={48} className="text-red-500 mb-4" aria-label="Payment failed" />
```

Search the file for any remaining emoji characters and remove them, replacing with plain text where needed.

- [ ] **Step 2: Fix GivingPortalPage.tsx**

Open `frontend/src/pages/giving/GivingPortalPage.tsx`.

Find line 211: `<div className="text-4xl mb-2">💝</div>`

This is a decorative element. Remove the emoji div entirely (the surrounding context provides enough visual meaning without it).

Verify no other emoji remain in the file.

- [ ] **Step 3: Fix kids-checkin — strip medical note emoji**

In both `frontend/src/pages/kids-checkin/KidsCheckinPage.tsx` and `frontend/src/pages/kids-checkin/KioskModePage.tsx`, find the medical notes display lines:

```tsx
// In KidsCheckinPage.tsx line ~61:
<strong>📋 MEDICAL:</strong> {data.medicalNotes}

// In KidsCheckinPage.tsx line ~255:
📋 Medical: {selectedChild.medicalNotes}

// In KioskModePage.tsx line ~61:
<strong>📋 MEDICAL:</strong> {data.medicalNotes}
```

Replace each with the emoji stripped — just the text:
```tsx
<strong>MEDICAL:</strong> {data.medicalNotes}
Medical: {selectedChild.medicalNotes}
<strong>MEDICAL:</strong> {data.medicalNotes}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/giving/ThankYouPage.tsx \
        frontend/src/pages/giving/GivingPortalPage.tsx \
        frontend/src/pages/kids-checkin/KidsCheckinPage.tsx \
        frontend/src/pages/kids-checkin/KioskModePage.tsx
git commit -m "feat: remove emoji from giving and kids check-in pages"
```

---

## Task 14: Migrate backend files

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/src/lib/security.ts`
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Fix backend/src/index.ts**

Open `backend/src/index.ts`. Find (lines 6-7):

```ts
console.log(`🚀 Server running on http://localhost:${PORT}`)
console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
```

Replace with:
```ts
console.log(`Server running on http://localhost:${PORT}`)
console.log(`Health check: http://localhost:${PORT}/api/health`)
```

- [ ] **Step 2: Fix backend/src/lib/security.ts**

Open `backend/src/lib/security.ts`. Find line ~54:

```ts
console.error('❌ Security validation failed:')
```

Replace with:
```ts
console.error('Security validation failed:')
```

- [ ] **Step 3: Fix backend/prisma/seed.ts**

Open `backend/prisma/seed.ts`. Make these replacements:

```ts
// Line ~75 — BEFORE:
console.log('📋 Seeding permissions...')
// AFTER:
console.log('Seeding permissions...')

// Line ~175 — BEFORE:
console.log('✅ Seed completed successfully!')
// AFTER:
console.log('Seed completed successfully!')

// Line ~196 — BEFORE:
console.log('✅ Seed completed successfully!')
// AFTER:
console.log('Seed completed successfully!')

// Line ~203 — BEFORE:
console.error('❌ Seed failed:', e)
// AFTER:
console.error('Seed failed:', e)
```

- [ ] **Step 4: Verify backend TypeScript**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/index.ts backend/src/lib/security.ts backend/prisma/seed.ts
git commit -m "feat: remove emoji from backend startup and seed logs"
```

---

## Task 15: Playwright visual regression tests

**Files:**
- Create: `e2e/icon-sprite.spec.ts`
- Create: `e2e/nav-icons.spec.ts`

> **Prerequisite:** Playwright must be installed in the project. If `e2e/` directory doesn't exist yet, create it. Check with: `ls e2e/` and `npx playwright --version`.

- [ ] **Step 1: Check Playwright setup**

```bash
cd frontend && npx playwright --version 2>/dev/null || echo "NOT INSTALLED"
```

If not installed:
```bash
cd frontend && npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Create icon sprite test**

Create `e2e/icon-sprite.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { allIconNames } from '../frontend/src/lib/icons'

test.describe('icon sprite visual regression', () => {
  test('all icons render at all sizes on light background', async ({ page }) => {
    // Navigate to a test harness page (must exist — see Step 3)
    await page.goto('http://localhost:5173/icon-test')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('icon-sprite-light.png', {
      threshold: 0.02,
      fullPage: true,
    })
  })
})
```

- [ ] **Step 3: Create icon test harness page**

Create `frontend/src/pages/IconTestPage.tsx` (dev-only, not linked in nav):

```tsx
import { allIconNames } from '@/lib/icons'
import { Icon } from '@/lib/icons'

const sizes = [12, 14, 16, 18, 24, 48] as const

export function IconTestPage() {
  return (
    <div className="p-8 bg-white min-h-screen">
      <h1 className="text-xl font-bold mb-6">Icon Sprite — {allIconNames.length} icons</h1>
      {allIconNames.map(name => (
        <div key={name} className="flex items-center gap-4 mb-3 border-b pb-2">
          <span className="w-36 text-xs font-mono text-gray-500">{name}</span>
          {sizes.map(size => (
            <div key={size} className="flex flex-col items-center gap-1">
              <Icon name={name} size={size} />
              <Icon name={name} size={size} active className="text-blue-600" />
              <span className="text-xs text-gray-400">{size}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

Register the route in `frontend/src/App.tsx` — add inside the routes:
```tsx
<Route path="/icon-test" element={<IconTestPage />} />
```

- [ ] **Step 4: Create nav screenshot test**

Create `e2e/nav-icons.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('nav icon visual regression', () => {
  test.beforeEach(async ({ page }) => {
    // Login using test credentials — adjust URL and credentials as needed
    await page.goto('http://localhost:5173/login')
    await page.fill('input[name="email"]', 'admin@stewardchms.local')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
  })

  test('nav sidebar inactive state', async ({ page }) => {
    await page.waitForSelector('nav')
    await expect(page.locator('aside')).toHaveScreenshot('nav-inactive.png', {
      threshold: 0.02,
    })
  })

  test('nav sidebar with active dashboard item', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard')
    await page.waitForSelector('nav')
    await expect(page.locator('aside')).toHaveScreenshot('nav-dashboard-active.png', {
      threshold: 0.02,
    })
  })
})
```

- [ ] **Step 5: Generate baseline screenshots**

Start the dev server in one terminal, then run:

```bash
cd frontend && npm run dev &
# Wait for it to start, then:
npx playwright test e2e/ --update-snapshots
```

This creates the baseline PNG files in `e2e/screenshots/`. Commit them.

- [ ] **Step 6: Commit**

```bash
git add e2e/ frontend/src/pages/IconTestPage.tsx
git commit -m "test: add Playwright visual regression for icon sprite and nav"
```

---

## Task 16: Final sweep + PR 2 complete

- [ ] **Step 1: Run emoji sweep**

```bash
bash scripts/check-no-emoji.sh
```

Expected: `OK: No emoji found in source files.`

If any are found, fix them (they will be listed with file and line number) and re-run until clean.

- [ ] **Step 2: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: TypeScript check — both workspaces**

```bash
cd frontend && npx tsc --noEmit && cd ../backend && npx tsc --noEmit
```

Expected: zero errors in both.

- [ ] **Step 4: Build**

```bash
cd frontend && npm run build
```

Expected: clean build.

- [ ] **Step 5: Run Playwright tests**

```bash
cd frontend && npx playwright test e2e/
```

Expected: all screenshot comparisons pass (within 0.02 threshold).

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete icon system — all emoji replaced, tests green"
```

- [ ] **Step 7: Push branch**

```bash
git push -u origin feat/icon-system
```

- [ ] **Step 8: Open PRs**

Open PR 1 (foundation commit range — Task 1 through Task 11):
```bash
gh pr create \
  --title "feat: icon system foundation — Icon component, registry, nav + dashboard migration" \
  --body "## Summary
- Adds \`frontend/src/lib/icons/\` module: \`Icon.tsx\`, \`registry.ts\`, 4 custom SVGs, \`index.ts\`
- Adds \`EmptyState\` component
- Migrates \`AppLayout.tsx\` (20 nav emoji → \`<Icon>\`) and \`DashboardPage.tsx\` (7 emoji)
- 56 \`IconName\` entries, TypeScript-checked at compile time
- All icon variants tested (Vitest), accessibility invariants tested

## Test plan
- [ ] \`npx vitest run src/lib/icons/\` — all pass
- [ ] \`npx tsc --noEmit\` — zero errors
- [ ] Dev server: nav icons render correctly, active state shows filled variant
" \
  --base main
```

Open PR 2 (sweep commits — Task 12 through Task 16):
```bash
gh pr create \
  --title "feat: icon system sweep — all remaining emoji removed" \
  --body "## Summary
- Removes emoji from ThankYouPage, GivingPortalPage, kids check-in pages (medical note text)
- Removes emoji from backend startup log, security.ts, seed.ts
- Adds \`scripts/check-no-emoji.sh\` CI guard
- Adds Playwright visual regression tests (icon sprite + nav screenshots)

## Test plan
- [ ] \`bash scripts/check-no-emoji.sh\` — exits 0
- [ ] \`npx vitest run\` — all pass
- [ ] \`npx playwright test e2e/\` — screenshots match baselines
" \
  --base main
```

---

## Self-review notes

**Spec gaps found and addressed:**
1. Spec listed 46 icons; codebase has 56 needed — added households, songs, pledges, funds, expenses, invoices, purchase-orders, vendors, products, inventory, sales to registry
2. `backend/src/lib/security.ts` had emoji — added to Task 14
3. `frontend/src/pages/giving/GivingPortalPage.tsx` had emoji — added to Task 13
4. PR split in plan follows commit tags, not a hard branch split (both PRs from same branch, different commit ranges)

**Type consistency verified:** `IconVariantProps` defined in `registry.ts`, consumed in `Icon.tsx` and each custom SVG via explicit local `Props` type that matches the same shape.

**No placeholders:** all code steps contain complete, runnable code.
