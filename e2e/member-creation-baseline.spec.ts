import { test, expect } from '@playwright/test'

// storageState is set globally in playwright.config.ts → e2e/.auth/admin.json

test.describe('member creation — baseline', () => {
  test('new-member form renders all required fields', async ({ page }) => {
    // Arrange + Act
    await page.goto('/members/new')
    await page.waitForLoadState('networkidle')

    // Assert — page heading
    await expect(page.getByRole('heading', { name: /add new member/i })).toBeVisible()

    // Assert — labelled inputs are present
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/last name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/phone/i)).toBeVisible()
    await expect(page.getByLabel(/status/i)).toBeVisible()

    // Assert — submit and cancel buttons
    await expect(page.getByRole('button', { name: /create member/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()

    // Token propagation baseline — capture without asserting an exact value
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--st-primary').trim()
    )
    // baseline comment: current --st-primary captured pre-migration
    console.log('Current --st-primary:', primary)
  })

  test('validation errors appear when submitting an empty form', async ({ page }) => {
    // Arrange
    await page.goto('/members/new')
    await page.waitForLoadState('networkidle')

    // Act — submit without filling anything
    await page.getByRole('button', { name: /create member/i }).click()

    // Assert — zod validation messages from the schema
    await expect(page.getByText(/first name is required/i)).toBeVisible()
    await expect(page.getByText(/last name is required/i)).toBeVisible()

    // URL must not have changed — still on the form
    expect(page.url()).toContain('/members/new')
  })

  test('invalid email shows validation error', async ({ page }) => {
    // Arrange
    await page.goto('/members/new')
    await page.waitForLoadState('networkidle')

    // Act — fill required fields but enter a bad email
    await page.getByLabel(/first name/i).fill('Test')
    await page.getByLabel(/last name/i).fill('User')
    await page.getByLabel(/email/i).fill('not-an-email')
    await page.getByRole('button', { name: /create member/i }).click()

    // Assert
    await expect(page.getByText(/invalid email/i)).toBeVisible()
  })

  test('cancel button navigates back to /members list', async ({ page }) => {
    // Arrange
    await page.goto('/members/new')
    await page.waitForLoadState('networkidle')

    // Act
    await page.getByRole('button', { name: /cancel/i }).click()

    // Assert
    await page.waitForURL('**/members', { timeout: 5_000 })
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible()
  })

  test('creating a valid member redirects to /members and new member appears in list', async ({
    page,
  }) => {
    // Arrange — use a timestamp to make the name unique per run
    const unique = Date.now()
    const firstName = `E2E`
    const lastName = `Member${unique}`
    const email = `e2e.${unique}@test.invalid`

    await page.goto('/members/new')
    await page.waitForLoadState('networkidle')

    // Act — fill the minimum required fields
    await page.getByLabel(/first name/i).fill(firstName)
    await page.getByLabel(/last name/i).fill(lastName)
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/phone/i).fill('555-000-0001')

    // Status defaults to "Active" via react-hook-form; leave it as-is

    // Submit
    await page.getByRole('button', { name: /create member/i }).click()

    // Assert — redirected to members list
    await page.waitForURL('**/members', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible()

    // Assert — the newly created member appears in the list
    // MembersPage uses a plain <Input placeholder="Search by name or email..."> inside a form.
    // Locate it by placeholder, fill, then click the adjacent Search button.
    const searchInput = page.locator('input[placeholder*="search" i]')
    await searchInput.fill(lastName)
    await page.getByRole('button', { name: /^search$/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(lastName)).toBeVisible({ timeout: 10_000 })
  })

  test('members list page renders with Add Member link', async ({ page }) => {
    // Arrange + Act
    await page.goto('/members')
    await page.waitForLoadState('networkidle')

    // Assert — heading
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible()

    // Assert — there is a way to navigate to the creation form
    await expect(
      page.getByRole('link', { name: /add member/i }).or(
        page.getByRole('button', { name: /add member/i })
      )
    ).toBeVisible()
  })
})
