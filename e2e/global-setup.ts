import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@stewardchms.local'
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!password) throw new Error('E2E_ADMIN_PASSWORD env var is required')
  await page.goto('http://localhost:5173/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
  await browser.close()
}

export default globalSetup
