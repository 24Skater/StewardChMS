import { test, expect } from '@playwright/test'

// storageState is set globally in playwright.config.ts → e2e/.auth/admin.json
// All tests here run as the pre-authenticated admin user.

test.describe('giving — baseline', () => {
  test('donation form renders all required fields', async ({ page }) => {
    // Arrange
    await page.goto('/giving/new')
    await page.waitForLoadState('networkidle')

    // Assert — heading is present
    await expect(page.getByRole('heading', { name: /add donation/i })).toBeVisible()

    // Assert — every required control is on the page
    await expect(page.getByRole('combobox').first()).toBeVisible() // Member select
    await expect(page.getByRole('spinbutton')).toBeVisible()       // Amount input (type=number)
    await expect(page.getByRole('button', { name: /add donation/i })).toBeVisible()

    // Token propagation baseline — capture without asserting an exact value
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--st-primary').trim()
    )
    // baseline comment: current --st-primary value captured pre-migration
    console.log('Current --st-primary:', primary)
  })

  test('submitting as guest (anonymous) navigates to /giving on success', async ({ page }) => {
    // Arrange
    await page.goto('/giving/new')
    await page.waitForLoadState('networkidle')

    // Act — leave member as "Guest/Anonymous", fill required fields

    // Amount
    await page.getByRole('spinbutton').fill('25')

    // Payment Method — default is cash, but explicitly pick "Check" to exercise the select
    // The Method select is the second combobox (Member, Method, Fund, …)
    const selects = page.getByRole('combobox')
    await selects.nth(1).click()
    await page.getByRole('option', { name: 'Check' }).click()

    // Date Received already defaults to today via react-hook-form defaultValues,
    // so no manual fill is needed unless the field is empty.
    const dateInput = page.locator('input[type="date"]')
    const dateValue = await dateInput.inputValue()
    if (!dateValue) {
      const today = new Date().toISOString().split('T')[0]
      await dateInput.fill(today)
    }

    // Submit
    await page.getByRole('button', { name: /add donation/i }).click()

    // Assert — success redirects to the donations list
    await page.waitForURL('**/giving', { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /donations/i })).toBeVisible()
  })

  test('amount validation error appears when submitting without an amount', async ({ page }) => {
    // Arrange
    await page.goto('/giving/new')
    await page.waitForLoadState('networkidle')

    // Act — clear any default amount and submit
    const amountInput = page.getByRole('spinbutton')
    await amountInput.clear()
    await page.getByRole('button', { name: /add donation/i }).click()

    // Assert — zod validation message is displayed
    await expect(page.getByText(/amount must be positive/i)).toBeVisible()

    // URL should NOT have changed — still on the form
    expect(page.url()).toContain('/giving/new')
  })

  test('cancel button returns to /giving list without submitting', async ({ page }) => {
    // Arrange
    await page.goto('/giving/new')
    await page.waitForLoadState('networkidle')

    // Act
    await page.getByRole('button', { name: /cancel/i }).click()

    // Assert
    await page.waitForURL('**/giving', { timeout: 5_000 })
    await expect(page.getByRole('heading', { name: /donations/i })).toBeVisible()
  })

  test('donations list page loads with table headers', async ({ page }) => {
    // Arrange + Act
    await page.goto('/giving')
    await page.waitForLoadState('networkidle')

    // Assert — the page heading exists
    await expect(page.getByRole('heading', { name: /donations/i })).toBeVisible()

    // Assert — there is a link/button to add a new donation
    await expect(page.getByRole('link', { name: /add donation/i }).or(
      page.getByRole('button', { name: /add donation/i })
    )).toBeVisible()
  })
})
