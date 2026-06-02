import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots')
const BASE_URL = 'http://localhost'
const EMAIL = 'admin@stewardchms.local'
const PASSWORD = 'admin123'

const PUBLIC_PAGES = [
  { path: '/',                slug: 'home',              label: 'Home / Landing' },
  { path: '/login',           slug: 'login',             label: 'Login' },
  { path: '/forgot-password', slug: 'forgot-password',   label: 'Forgot Password' },
  { path: '/give',            slug: 'give',              label: 'Online Giving Portal' },
]

const PROTECTED_PAGES = [
  { path: '/dashboard',                   slug: 'dashboard',                  label: 'Dashboard' },
  { path: '/members',                     slug: 'members',                    label: 'Members' },
  { path: '/households',                  slug: 'households',                 label: 'Households' },
  { path: '/events',                      slug: 'events',                     label: 'Events' },
  { path: '/songs',                       slug: 'songs',                      label: 'Songs' },
  { path: '/groups',                      slug: 'groups',                     label: 'Groups & Ministries' },
  { path: '/communications',              slug: 'communications',             label: 'Messages' },
  { path: '/communications/templates',    slug: 'communications-templates',   label: 'Message Templates' },
  { path: '/giving',                      slug: 'giving',                     label: 'Donations' },
  { path: '/pledges',                     slug: 'pledges',                    label: 'Pledges' },
  { path: '/funds',                       slug: 'funds',                      label: 'Funds' },
  { path: '/vendors',                     slug: 'vendors',                    label: 'Vendors' },
  { path: '/expenses',                    slug: 'expenses',                   label: 'Expenses' },
  { path: '/invoices',                    slug: 'invoices',                   label: 'Invoices' },
  { path: '/purchase-orders',             slug: 'purchase-orders',            label: 'Purchase Orders' },
  { path: '/products',                    slug: 'products',                   label: 'Products' },
  { path: '/inventory',                   slug: 'inventory',                  label: 'Inventory' },
  { path: '/sales',                       slug: 'sales',                      label: 'Sales' },
  { path: '/reports',                     slug: 'reports',                    label: 'Reports Hub' },
  { path: '/reports/financial-dashboard', slug: 'reports-financial-dashboard',label: 'Financial Dashboard' },
  { path: '/reports/finance',             slug: 'reports-finance',            label: 'Finance Reports' },
  { path: '/reports/membership',          slug: 'reports-membership',         label: 'Membership Report' },
  { path: '/reports/attendance',          slug: 'reports-attendance',         label: 'Attendance Report' },
  { path: '/reports/giving',              slug: 'reports-giving',             label: 'Giving Report' },
  { path: '/reports/sales',              slug: 'reports-sales',               label: 'Sales Report' },
  { path: '/kids-checkin',               slug: 'kids-checkin',                label: 'Kids Check-in' },
  { path: '/schedules',                   slug: 'schedules',                  label: 'Ministry Schedules' },
  { path: '/admin/settings',              slug: 'admin-settings',             label: 'Admin Settings' },
]

async function shot(page, slug, label) {
  const file = path.join(OUT_DIR, `${slug}.png`)
  // wait for network to settle
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(800)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`  ✓  ${label}  →  ${slug}.png`)
  return { slug, label, file: `docs/screenshots/${slug}.png` }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const results = []

  console.log('\n── Public pages ──')
  for (const p of PUBLIC_PAGES) {
    await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'domcontentloaded' })
    results.push({ ...await shot(page, p.slug, p.label), section: 'Public' })
  }

  console.log('\n── Logging in ──')
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"], input[name="email"]', EMAIL)
  await page.fill('input[type="password"], input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {})
  console.log('  ✓  Logged in')

  console.log('\n── Protected pages ──')
  for (const p of PROTECTED_PAGES) {
    await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'domcontentloaded' })
    results.push({ ...await shot(page, p.slug, p.label), section: p.path.startsWith('/reports') ? 'Reports' : p.path.startsWith('/admin') ? 'Settings' : p.path.startsWith('/giving') || p.path.startsWith('/pledges') ? 'Giving' : p.path.startsWith('/funds') || p.path.startsWith('/vendors') || p.path.startsWith('/expenses') || p.path.startsWith('/invoices') || p.path.startsWith('/purchase-orders') ? 'Accounting' : p.path.startsWith('/products') || p.path.startsWith('/inventory') || p.path.startsWith('/sales') ? 'Products & Sales' : p.path.startsWith('/communications') ? 'Communications' : 'Core' })
  }

  await browser.close()

  // Output JSON for doc generation
  console.log('\n__RESULTS__')
  console.log(JSON.stringify(results))
}

main().catch(err => { console.error(err); process.exit(1) })
