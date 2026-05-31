# StewardChMS Frontend Developer Guide

This guide covers everything a new developer needs to understand to work effectively in the StewardChMS frontend.

---

## Table of Contents

1. [Project Orientation](#1-project-orientation)
2. [Application Structure and Routing](#2-application-structure-and-routing)
3. [Authentication - AuthContext and ProtectedRoute](#3-authentication--authcontext-and-protectedroute)
4. [Theme System](#4-theme-system)
5. [Application Layout (AppLayout)](#5-application-layout-applayout)
6. [Data Fetching Pattern (TanStack Query)](#6-data-fetching-pattern-tanstack-query)
7. [API Layer](#7-api-layer)
8. [Form Handling (React Hook Form + Zod)](#8-form-handling-react-hook-form--zod)
9. [Icon System](#9-icon-system)
10. [Component Library (shadcn/ui)](#10-component-library-shadcnui)
11. [PDF Generation](#11-pdf-generation)
12. [CSV Export](#12-csv-export)
13. [Testing (Vitest + React Testing Library)](#13-testing-vitest--react-testing-library)
14. [Adding a New Feature - End-to-End Checklist](#14-adding-a-new-feature--end-to-end-checklist)

---

## 1. Project Orientation

    frontend/src/
      App.tsx               # Route tree - single source of truth
      context/              # AuthContext, ThemeContext
      components/layout/    # AppLayout (sidebar + header shell)
      components/ui/        # shadcn/ui primitives
      components/ProtectedRoute.tsx
      hooks/                # one use*.ts per domain
      lib/api.ts            # apiRequest() helper + legacy functions
      lib/api/schedules.ts  # per-domain API module (newer pattern)
      lib/icons/            # Icon component, registry, custom SVGs
      lib/pdf.ts            # jsPDF document generation
      lib/csv.ts            # CSV export utilities
      lib/utils.ts          # cn() helper
      pages/                # domain subdirectories
      styles/steward-tokens.css  # CSS --st-* design tokens
      test/setup.ts         # @testing-library/jest-dom import

**Path alias**: @ maps to frontend/src/. Use everywhere - no relative ../../ chains.

```typescript
import { useMembers } from '@/hooks/useMembers'
import { apiRequest } from '@/lib/api'
import { Icon } from '@/lib/icons'
```

---

## 2. Application Structure and Routing

frontend/src/App.tsx contains the complete route tree using React Router v6.

### Public Routes

| Path | Component | Notes |
|------|-----------|-------|
| / | HomePage | Marketing / landing |
| /login | LoginPage | Credential form |
| /setup | SetupWizardPage | First-run wizard |
| /kids-checkin/kiosk | KioskModePage | Standalone kiosk - no sidebar |
| /give | GivingPortalPage | Public online giving |
| /give/thank-you | ThankYouPage | Post-donation confirmation |
| /kiosk/:token | ScheduleKioskPage | Public schedule by share token |
| /icon-test | IconTestPage | Dev-only, guarded by import.meta.env.DEV |

### Protected Routes

All protected routes are children of a single layout route:

```tsx
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  <Route path=/dashboard element={<DashboardPage />} />
  {/* ... all other protected routes */}
</Route>
```

ProtectedRoute wraps the children. When auth passes it renders <AppLayout />, which renders an <Outlet /> in its main content area. That outlet is where the individual page component lands.

### Adding a New Route

```tsx
import MyNewPage from './pages/my-domain/MyNewPage'
<Route path=/my-domain element={<MyNewPage />} />
```

---

## 3. Authentication - AuthContext and ProtectedRoute

### Token Storage

The auth token is stored in localStorage under the key auth_token. Three helpers in frontend/src/lib/api.ts:

```typescript
getToken()      // returns string | null
setToken(t)     // writes to localStorage
removeToken()   // clears from localStorage
```

> **Security note**: localStorage is used for simplicity. The codebase acknowledges httpOnly cookies are the intended production path.

### AuthContext (frontend/src/context/AuthContext.tsx)

AuthProvider wraps the app and exposes useAuth() to every component in the tree.

```typescript
interface AuthContextType {
  user: User | null           // null when logged out
  isLoading: boolean          // true during the initial /auth/me fetch
  isAuthenticated: boolean    // derived: !!user
  setUser: (user) => void     // called by useLogin() after a successful login
  setToken: (token) => void   // persists a new JWT to localStorage
  logout: () => void          // removes token and clears user state
  checkAuth: () => Promise<void>  // re-validate token against /auth/me
}
```

```typescript
interface User {
  id: string; email: string; name: string | null
  roles: string[]        // e.g. ['admin']
  permissions: string[]  // e.g. ['members.view', 'members.edit']
}
```

**Startup flow**: On mount, AuthProvider calls checkAuth(). Reads the token, calls GET /auth/me, sets user. If missing or 401, clears state.

**Using useAuth():**

```typescript
import { useAuth } from '@/context/AuthContext'

function MyComponent() {
  const { user, isAuthenticated } = useAuth()
  const canEdit = user?.permissions.includes('members.edit') ?? false
  return isAuthenticated ? <div>Hello {user?.name}</div> : null
}
```

Calling useAuth() outside of AuthProvider throws: ''useAuth must be used within an AuthProvider''.

### ProtectedRoute (frontend/src/components/ProtectedRoute.tsx)

1. **While loading**: renders a full-screen loading spinner.
2. **Not authenticated**: redirects to /login, preserving state.from.
3. **Missing permission** (optional requiredPermission prop): renders an Access Denied card.
4. **Authenticated and authorized**: renders children.

```tsx
<ProtectedRoute><AppLayout /></ProtectedRoute>

// Optional route-level guard:
<ProtectedRoute requiredPermission=members.edit><MemberFormPage /></ProtectedRoute>
```

### useLogin and useLogout (frontend/src/hooks/useAuth.ts)

```typescript
const loginMutation = useLogin()
loginMutation.mutate({ email, password })

const logoutMutation = useLogout()  // clears token, user, and TanStack Query cache
logoutMutation.mutate()
```

---

## 4. Theme System

### App Theme (ThemeContext)

frontend/src/context/ThemeContext.tsx manages the application-wide theme.

**Storage key**: steward-theme in localStorage. **Default**: system.

```typescript
interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}
```

When resolvedTheme changes, the provider adds/removes the dark class on document.documentElement.

```typescript
import { useTheme } from '@/hooks/useTheme'

const { resolvedTheme, toggleTheme } = useTheme()
const isDark = resolvedTheme === 'dark'
```

### Kiosk Theme (useKioskTheme)

frontend/src/hooks/useKioskTheme.ts — **Storage key**: kiosk-theme — **Default**: dark.

```typescript
const { isDark, toggle } = useKioskTheme()
```

Kiosk pages apply dark to their own container, not <html>, so their theme is independent of the app.

### Logo & Brand Assets

The Cross Key mark lives in `frontend/public/` and is served as static assets. Use the theme-aware pattern in every component that shows the logo:

```tsx
const logoSrc = resolvedTheme === 'dark' ? '/steward-mark.svg' : '/steward-mark-light.svg'
```

| File | Color | Background |
|------|-------|------------|
| `steward-mark.svg` | Kingdom Gold `#E8B847` | Dark (navy) surfaces |
| `steward-mark-light.svg` | Navy `#0D1B2E` | Light (parchment/white) surfaces |
| `steward-lockup.svg` | Gold on transparent | Dark backgrounds — nav/headers |
| `steward-lockup-stacked.svg` | Gold on transparent | Splash, auth pages |
| `steward-app-icon.svg` | Gold on navy square | App icon, rounded-square contexts |

See `docs/brand/brand-guide.md` for full usage rules, color palette tokens, and voice guidelines.

### CSS Tokens (steward-tokens.css)

frontend/src/styles/steward-tokens.css defines the --st-* design tokens. Use these in JSX rather than hardcoded colors.

| Token | Light | Dark | Use for |
|-------|-------|------|---------|

Use CSS variable tokens in Tailwind's arbitrary value syntax: ``className="bg-[var(--st-bg)] text-[var(--st-fg)]"``

The file also sets legacy shadcn/ui HSL variables. Do not modify those.

---
## 5. Application Layout (AppLayout)

frontend/src/components/layout/AppLayout.tsx is the shell rendered for every protected page.

### Sidebar

- Width toggles between w-64 (expanded) and w-20 (collapsed) with a 300ms CSS transition.
- State is useState(true) — expanded by default, not persisted across page loads.
- Renders the navSections array; each item has label, href, and icon (an IconName).
- Active state: location.pathname === item.href or location.pathname.startsWith(item.href).
- Active items get bg-[var(--st-primary)] and pass active={true} to <Icon>.
- In collapsed mode, labels are hidden; a title attribute provides tooltip accessibility.

### Top Header

- Sticky, blurred. Renders <ThemeToggle />, the logged-in user name/email, and a Sign Out button.
- Sign out calls useLogout() from @/hooks/useAuth.

### Main Content

- <main className=p-6> renders <Outlet /> — the current route's page component.

### Adding a Nav Item

```typescript
// In the navSections array at the top of AppLayout.tsx:
{
  title: 'My Section',
  items: [
    { label: 'My Feature', href: '/my-feature', icon: 'members' },
  ],
}
```

---

## 6. Data Fetching Pattern (TanStack Query)

Every domain follows an identical three-layer pattern:

    API function  (lib/api.ts  or  lib/api/<domain>.ts)
          called by
    Domain hook   (hooks/use<Domain>.ts)
          consumed by
    Page component (pages/<domain>/<Name>Page.tsx)

### Query Key Factory

Every domain hook file defines a <domain>Keys object that keeps cache keys organized:

```typescript
export const memberKeys = {
  all:     ['members'] as const,
  lists:   () => [...memberKeys.all, 'list'] as const,
  list:    (params: MemberSearchParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail:  (id: string) => [...memberKeys.details(), id] as const,
}
```

```typescript
// Targeted invalidation:
queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) })
```

### useQuery — Reading Data

```typescript
export function useMembers(params: MemberSearchParams = {}) {
  return useQuery<MemberListResponse, ApiClientError>({
    queryKey: memberKeys.list(params),
    queryFn:  () => getMembers(params),
  })
}

export function useMember(id: string) {
  return useQuery<Member, ApiClientError>({
    queryKey: memberKeys.detail(id),
    queryFn:  () => getMember(id),
    enabled:  !!id,
  })
}
```

In the page component, always handle all three states:

```tsx
const { data, isLoading, error } = useMembers({ search, status, page, limit: 20 })

{isLoading ? (
  <div className=p-8 text-center>Loading...</div>
) : error ? (
  <div className=p-8 text-center text-red-500>Error loading data</div>
) : data?.members.length === 0 ? (
  <EmptyState icon=members title=No members found />
) : (
  <MembersTable members={data.members} />
)}
```

### useMutation — Writing Data

```typescript
export function useCreateMember() {
  const queryClient = useQueryClient()
  return useMutation<Member, ApiClientError, CreateMemberData>({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()
  return useMutation<Member, ApiClientError, { id: string; data: Partial<CreateMemberData> }>({
    mutationFn: ({ id, data }) => updateMember(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
    },
  })
}
```

```typescript
const createMutation = useCreateMember()
createMutation.mutate(payload)            // fire-and-forget
await createMutation.mutateAsync(payload) // async variant
createMutation.isPending  // true while in-flight
createMutation.isError    // true after failure
createMutation.error      // ApiClientError instance
```

---

## 7. API Layer

### apiRequest() — the Core Helper

frontend/src/lib/api.ts exports apiRequest<T>(). All API functions call this helper.

```typescript
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T>
```

**What it does:**

1. Reads the JWT from localStorage via getToken() and attaches it as Authorization: Bearer <token>.
2. Sets Content-Type: application/json.
3. Calls fetch(API_BASE_URL + endpoint, ...). In dev, Vite proxies /api to http://localhost:3001.
4. On a non-OK response, parses the JSON body and throws an ApiClientError.
5. On success, returns response.json() typed as T.

**ApiClientError:**

```typescript
class ApiClientError extends Error {
  status: number   // HTTP status code
  data: ApiError   // { error: string; message?: string; details?: Record<string, string[]> }
}
```

```typescript
if (createMutation.isError) {
  const msg = createMutation.error?.data?.error ?? 'An error occurred'
}
```

**The auth option** — pass auth: false to skip the Authorization header:

```typescript
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST', body: data, auth: false,
  })
  setToken(response.token)
  return response
}
```

### Per-Domain API Module (New Pattern)

New domains use frontend/src/lib/api/<domain>.ts. schedules.ts is the canonical example.

```typescript
import { apiRequest } from '@/lib/api'

export function getCalendars(): Promise<MinistryCalendar[]> {
  return apiRequest('/ministry-calendars')
}
export function createCalendar(data: CreateCalendarData): Promise<MinistryCalendar> {
  return apiRequest('/ministry-calendars', { method: 'POST', body: data })
}
```

frontend/src/lib/api.ts (~1,986 lines) contains all legacy domain functions. **Convention**: extract the domain into its own module when touching this file.

**Adding a new API function**: define types, write the function using apiRequest, import in the domain hook and wrap with useMutation.

---

## 8. Form Handling (React Hook Form + Zod)

Every form page follows the same wiring pattern. MemberFormPage is the canonical example (frontend/src/pages/members/MemberFormPage.tsx).

### Step 1 — Define the Zod Schema

```typescript
import { z } from 'zod'

const memberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Invalid email').optional().or(z.literal(''  )),
  status:    z.enum(['active', 'inactive', 'visitor']),
  notes:     z.string().optional(),
})

// Always derive the TypeScript type - no manual duplication
type MemberFormData = z.infer<typeof memberSchema>
```

### Step 2 — Wire useForm

```typescript
const { register, handleSubmit, setValue, watch, reset,
  formState: { errors, isSubmitting } } = useForm<MemberFormData>({
  resolver: zodResolver(memberSchema),
  defaultValues: {
    firstName: '', lastName: '', email: '', status: 'active', notes: '',
  },
})
```

For edit forms, populate via reset() inside a useEffect that fires when the fetched data arrives:

```typescript
useEffect(() => {
  if (member) {
    reset({ firstName: member.firstName, email: member.email || '', status: member.status })
  }
}, [member, reset])
```

### Step 3 — Register Fields and Display Errors

Native HTML inputs use {...register('fieldName')}. Radix-based Select uses setValue and watch:

```tsx
<Select value={watch('status')} onValueChange={(v) => setValue('status', v as MemberFormData['status'])}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value=active>Active</SelectItem>
    <SelectItem value=inactive>Inactive</SelectItem>
  </SelectContent>
</Select>
```

### Step 4 — Submit Handler

```typescript
const onSubmit = async (data: MemberFormData) => {
  const payload = { ...data, email: data.email || null }
  try {
    if (isEdit) { await updateMutation.mutateAsync({ id, data: payload }) }
    else         { await createMutation.mutateAsync(payload) }
    navigate('/members')
  } catch {
    // Mutation error is surfaced via mutation.isError - no rethrow needed
  }
}

<form onSubmit={handleSubmit(onSubmit)}>
```

### Step 5 — Display Mutation Errors

```tsx
{(createMutation.isError || updateMutation.isError) && (
  <div className=rounded-lg border border-red-500/50 bg-red-500/10 p-4>
    <p className=text-sm text-red-500>
      {createMutation.error?.data?.error ?? updateMutation.error?.data?.error ?? 'An error occurred'}
    </p>
  </div>
)}
```

---

## 9. Icon System

Every icon rendered anywhere in the app goes through <Icon>. Direct Lucide imports and raw <svg> elements in page or component code are not permitted.

**Entry point:**

```typescript
import { Icon } from '@/lib/icons'
import type { IconName } from '@/lib/icons'
```

### The <Icon> Component (frontend/src/lib/icons/Icon.tsx)

```typescript
interface IconProps {
  name: IconName           // type-checked union — 57 values
  size?: 12 | 14 | 16 | 18 | 20 | 24 | 32 | 48  // constrained sizes
  active?: boolean         // false = outlined, true = filled
  className?: string
  'aria-label'?: string    // provide for non-decorative icons
}
```

```tsx
// Decorative — aria-hidden applied automatically
<Icon name=members size={18} />

// Active state — renders filled variant
<Icon name=members size={18} active={isActive} className=flex-shrink-0 />

// Semantic — accessible to screen readers
<Icon name=delete size={16} aria-label=Delete member />
```

**Accessibility**: When aria-label is absent: aria-hidden=true, no role. When present: role=img and aria-label forwarded.

### The Registry (frontend/src/lib/icons/registry.ts)

The registry maps every IconName to { outlined: IconVariant; filled: IconVariant }.

**Factory functions for Lucide icons:**

```typescript
lo(LucideIcon)  // lucide outlined: default stroke rendering
lf(LucideIcon)  // lucide filled: fill=currentColor, strokeWidth=0
```

### Adding a Lucide Icon

```typescript
// 1. Import at top of registry.ts
import { Sparkles } from 'lucide-react'

// 2. Add to IconName union: | 'sparkles'

// 3. Registry entry:
'sparkles': { outlined: lo(Sparkles), filled: lf(Sparkles) },
```

### Adding a Custom SVG Icon

Create two components in frontend/src/lib/icons/custom/MyIcon.tsx:

```typescript
import type { FC, SVGAttributes } from 'react'
type Props = { size?: number; className?: string }
  & Pick<SVGAttributes<SVGSVGElement>, 'aria-hidden' | 'aria-label' | 'role'>

export const MyIconOutlined: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg width={size} height={size} viewBox=0 0 24 24 fill=none className={className} {...aria}>
    <circle cx=12 cy=12 r=8 stroke=currentColor strokeWidth=2 />
  </svg>
)
export const MyIconFilled: FC<Props> = ({ size = 18, className, ...aria }) => (
  <svg width={size} height={size} viewBox=0 0 24 24 fill=none className={className} {...aria}>
    <circle cx=12 cy=12 r=8 fill=currentColor />
  </svg>
)
```

Then import in registry.ts, add to the IconName union and registry object. Add a co-located test file following the pattern in KidsCheckinIcon.test.tsx.

---

## 10. Component Library (shadcn/ui)

### Available Components

All primitives live in frontend/src/components/ui/:

| File | Exports |
|------|---------|
| button.tsx | Button — variants: default, outline, ghost, secondary, destructive |
| input.tsx | Input |
| label.tsx | Label |
| textarea.tsx | Textarea |
| select.tsx | Select, SelectContent, SelectItem, SelectTrigger, SelectValue |
| table.tsx | Table, TableHeader, TableBody, TableRow, TableHead, TableCell |
| card.tsx | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| badge.tsx | Badge — variants: default, secondary, success, warning, destructive |
| dialog.tsx | Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription |
| alert-dialog.tsx | AlertDialog, AlertDialogContent, AlertDialogAction, AlertDialogCancel |
| dropdown-menu.tsx | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem |
| tabs.tsx | Tabs, TabsList, TabsTrigger, TabsContent |
| checkbox.tsx | Checkbox |
| popover.tsx | Popover, PopoverTrigger, PopoverContent |
| calendar.tsx | Calendar |
| date-picker.tsx | DatePicker |
| date-time-picker.tsx | DateTimePicker |
| theme-toggle.tsx | ThemeToggle — sun/moon button, calls useTheme().toggleTheme() |
| EmptyState.tsx | EmptyState — icon + title + optional description + optional action button |

### Import Pattern

```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
```

### The cn() Utility

shadcn components accept a className prop. Use cn() to merge token-based overrides:

```typescript
import { cn } from '@/lib/utils'

<Button
  className={cn(
    'bg-[var(--st-primary)] text-white hover:opacity-90',
    isPending && 'opacity-50 cursor-not-allowed'
  )}
>Save</Button>
```

cn() combines clsx (conditional classes) with tailwind-merge (deduplicates conflicting utilities).

### EmptyState Component

```tsx
import { EmptyState } from '@/components/ui/EmptyState'

<EmptyState
  icon=members
  title=No members found
  description=Add your first member to get started.
  action={{ label: 'Add Member', onClick: () => navigate('/members/new') }}
/>
```

---

## 11. PDF Generation

frontend/src/lib/pdf.ts uses jsPDF with the jspdf-autotable plugin. Three public functions are exported; each calls doc.save(filename) internally — the file downloads immediately.

| Function | Document | Filename |
|----------|----------|---------|
| generateInvoicePDF(invoice, org?) | Invoice | Invoice-<number>.pdf |
| generatePurchaseOrderPDF(po, org?) | Purchase Order | PO-<number>.pdf |
| generateDonorStatementPDF(statement, org?) | IRS 501(c)(3) acknowledgment | Contribution-Statement-<name>-<year>.pdf |

All three accept an optional org: Organization argument. When omitted, a placeholder is used. Fetch from GET /api/settings/organization and pass the result:

```typescript
import { generateInvoicePDF, Organization } from '@/lib/pdf'

const org: Organization = { name: orgSettings.churchName, ein: orgSettings.ein }
generateInvoicePDF(invoice, org)
```

To add a new document type, add a function to pdf.ts to access the module-private addOrgHeader() helper:

```typescript
export function generateMyDocumentPDF(doc: MyDocument, org?: Organization): void {
  const pdfDoc = new jsPDF()
  const y = addOrgHeader(pdfDoc, org)
  autoTable(pdfDoc, {
    startY: y + 20,
    head: [['Description', 'Amount']],
    body: doc.items.map(i => [i.description, (i.amount / 100).toFixed(2)]),
    theme: 'striped',
  })
  pdfDoc.save('MyDoc-' + doc.documentNumber + '.pdf')
}
```

---

## 12. CSV Export

frontend/src/lib/csv.ts provides injection-safe, Excel-compatible CSV generation.

**downloadCSV(filename, headers, rows)** — low-level primitive. Sanitizes cells against CSV injection (neutralizes leading =, +, -, @), adds a UTF-8 BOM, and triggers a browser download via a temporary anchor element.

**exportToCSV<T>(data, columns, filename)** — typed convenience wrapper:

```typescript
import { exportToCSV, generateExportFilename } from '@/lib/csv'

exportToCSV(
  members,
  [
    { header: 'First Name', accessor: 'firstName' },
    { header: 'Status',     accessor: (m) => m.status.toUpperCase() },
  ],
  generateExportFilename('members')  // members-export-2026-01-15.csv
)
```

The accessor field accepts either a keyof T or a transform function (item: T) => string | number | null | undefined.

**Utility formatters:**

| Function | Returns |
|----------|---------|
| generateExportFilename(prefix) | prefix-export-YYYY-MM-DD.csv |
| formatCentsToDollars(cents) | 123.45 (no currency symbol) |
| formatDate(dateStr) | Locale date string, or empty string for null |
| formatDateTime(dateStr) | Locale date+time string, or empty string for null |
| formatBoolean(value) | Yes, No, or empty string |

---

## 13. Testing (Vitest + React Testing Library)

### Running Tests

```bash
npm run test -w frontend
npm run test -w frontend -- --watch
npm run test -w frontend -- --coverage
```

### Test Configuration

| Setting | Value |
|---------|-------|
| Test runner | Vitest |
| DOM environment | jsdom |
| Setup file | frontend/src/test/setup.ts (imports @testing-library/jest-dom) |
| Globals | true — no need to import describe, it, expect |
| Path alias | @ maps to ./src |

### Provider Wrapper

Every component test needs QueryClientProvider and BrowserRouter. Define a local helper per test file:

```typescript
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  )
}
```

When the component calls useAuth(), mock @/context/AuthContext rather than wrapping with the real AuthProvider — the real provider makes a GET /auth/me network call on mount.

### Mocking Domain Hooks

```typescript
vi.mock('@/hooks/useMembers', () => ({
  useMembers: vi.fn(() => ({
    data: {
      members: [{ id: '1', firstName: 'John', lastName: 'Doe',
                  email: 'john@example.com', phone: null, status: 'active',
                  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }],
      total: 1, page: 1, limit: 20, totalPages: 1,
    },
    isLoading: false, error: null,
  })),
  useDeleteMember: vi.fn(() => ({ mutate: vi.fn() })),
}))
```

### Mocking useAuth

```typescript
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user', email: 'admin@test.com', name: 'Admin',
            roles: ['admin'], permissions: ['members.read', 'members.write'] },
    isLoading: false, isAuthenticated: true,
  })),
}))
```

### Mocking React Router

```typescript
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: '123' }),  // simulate edit mode
  }
})
```

### Testing Custom Hooks with renderHook

```typescript
import { renderHook, act } from '@testing-library/react'
import { useKioskTheme } from '@/hooks/useKioskTheme'

describe('useKioskTheme', () => {
  beforeEach(() => { localStorage.clear() })

  it('defaults to dark', () => {
    const { result } = renderHook(() => useKioskTheme())
    expect(result.current.isDark).toBe(true)
  })

  it('toggles to light and persists preference', () => {
    const { result } = renderHook(() => useKioskTheme())
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(false)
    expect(localStorage.getItem('kiosk-theme')).toBe('light')
  })
})
```

### Testing the Icon Registry

```typescript
import { registry, allIconNames } from '@/lib/icons/registry'

it('every IconName has outlined and filled functions', () => {
  allIconNames.forEach(name => {
    expect(typeof registry[name].outlined).toBe('function')
    expect(typeof registry[name].filled).toBe('function')
  })
})
```

### Complete Test Example

```typescript
// frontend/src/pages/members/MembersPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MembersPage from './MembersPage'

vi.mock('@/hooks/useMembers', () => ({
  useMembers: vi.fn(() => ({ data: { members: [{ id: '1', firstName: 'John',
    lastName: 'Doe', email: 'john@example.com', phone: null, status: 'active',
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }],
    total: 1, page: 1, limit: 20, totalPages: 1 }, isLoading: false, error: null })),
  useDeleteMember: vi.fn(() => ({ mutate: vi.fn() })),
}))

beforeEach(() => { vi.clearAllMocks() })
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function renderWithProviders(ui: React.ReactElement) {
  return render(<QueryClientProvider client={qc}><BrowserRouter>{ui}</BrowserRouter></QueryClientProvider>)
}

describe('MembersPage', () => {
  it('renders page title', () => {
    renderWithProviders(<MembersPage />)
    expect(screen.getByText('Members')).toBeInTheDocument()
  })
  it('renders member data from the hook', () => {
    renderWithProviders(<MembersPage />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
  it('renders Add Member button', () => {
    renderWithProviders(<MembersPage />)
    expect(screen.getByText('Add Member')).toBeInTheDocument()
  })
})
```

---

## 14. Adding a New Feature - End-to-End Checklist

Use this checklist when implementing a new domain from scratch.

- [ ] **Prisma model** — add to backend/prisma/schema.prisma, run npm run db:migrate -w backend.
- [ ] **Zod schemas** — add to shared/src/schemas/. Shared between backend validation and frontend form types.
- [ ] **Backend route** — add backend/src/routes/<domain>.ts, register in backend/src/app.ts.
       Every protected route must call requireAuth() then requirePermission(resource.action).
- [ ] **API module** — create frontend/src/lib/api/<domain>.ts following the schedules.ts pattern.
       Import apiRequest from @/lib/api. Export plain async functions and TypeScript types.
- [ ] **Domain hook** — create frontend/src/hooks/use<Domain>.ts following the useMembers.ts pattern.
  - Define a <domain>Keys query key factory.
  - Export one useQuery hook per read operation (with enabled: !!id for single-resource queries).
  - Export one useMutation hook per write operation with onSuccess cache invalidation.
- [ ] **Page components** — create under frontend/src/pages/<domain>/.
  - List page: handle isLoading, error, empty, and populated states.
  - Form page: React Hook Form + Zod; combine create/edit in one component via useParams().
- [ ] **Route registration** — add routes to App.tsx inside the protected layout block.
- [ ] **Nav item** — if needed, add to navSections in AppLayout.tsx with an IconName.
- [ ] **Icon** — confirm an appropriate IconName exists; add one if needed (see Section 9).
- [ ] **Tests** — co-locate *.test.tsx with each page component. Cover: renders without crashing,
       shows mock data, primary action button visible, empty state shown, and validation errors appear on submit.
- [ ] **Verify** — npm run typecheck && npm run lint && npm run test -w frontend.

