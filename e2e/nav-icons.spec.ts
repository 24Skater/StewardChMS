import { test, expect } from '@playwright/test'

test.describe('nav icon visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
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
    await page.goto('/dashboard')
    await page.waitForSelector('nav')
    await expect(page.locator('aside')).toHaveScreenshot('nav-dashboard-active.png', {
      threshold: 0.02,
    })
  })
})
