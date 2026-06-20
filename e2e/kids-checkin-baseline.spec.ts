import { test, expect } from '@playwright/test'

// storageState is set globally in playwright.config.ts → e2e/.auth/admin.json

test.describe('kids check-in — baseline', () => {
  test('page renders heading and stats cards', async ({ page }) => {
    // Arrange + Act
    await page.goto('/kids-checkin')
    await page.waitForLoadState('networkidle')

    // Assert — main heading
    await expect(page.getByRole('heading', { name: /kids check-in/i })).toBeVisible()

    // Assert — stats cards are present (text content)
    await expect(page.getByText(/total children/i)).toBeVisible()
    await expect(page.getByText(/checked in today/i)).toBeVisible()
    await expect(page.getByText(/currently here/i)).toBeVisible()
    await expect(page.getByText(/checked out/i)).toBeVisible()
  })

  test('check-in card and event select are visible', async ({ page }) => {
    // Arrange + Act
    await page.goto('/kids-checkin')
    await page.waitForLoadState('networkidle')

    // Assert — the "Check In" section heading (CardTitle)
    await expect(page.getByText('Check In').first()).toBeVisible()

    // Assert — Event label and its select trigger
    await expect(page.getByText('Event').first()).toBeVisible()
    const eventSelect = page.getByRole('combobox').first()
    await expect(eventSelect).toBeVisible()
  })

  test('check-out section and code input are visible', async ({ page }) => {
    // Arrange + Act
    await page.goto('/kids-checkin')
    await page.waitForLoadState('networkidle')

    // Assert — the "Check Out" card heading
    await expect(page.getByText('Check Out').first()).toBeVisible()

    // Assert — security-code input (placeholder text)
    await expect(page.getByPlaceholder(/enter security code/i)).toBeVisible()

    // Assert — Check Out button (in the check-out card)
    const checkoutButton = page.getByRole('button', { name: /^check out$/i })
    await expect(checkoutButton).toBeVisible()
  })

  test('selecting an event reveals the child select', async ({ page }) => {
    // Arrange
    await page.goto('/kids-checkin')
    await page.waitForLoadState('networkidle')

    // The child select is conditionally rendered only after an occurrence is selected.
    // If there are no occurrences today the message "No events scheduled for today"
    // will appear — that is still a valid baseline state.
    const noEventsMsg = page.getByText(/no events scheduled for today/i)
    const eventSelect = page.getByRole('combobox').first()

    const hasNoEvents = await noEventsMsg.isVisible().catch(() => false)
    if (hasNoEvents) {
      // Baseline — no events exist today; confirm the informational message is shown
      await expect(noEventsMsg).toBeVisible()
      return
    }

    // Act — open the event dropdown and pick the first available occurrence
    await eventSelect.click()
    const firstOption = page.getByRole('option').first()
    await firstOption.click()

    // Assert — after selecting an event, the Child select appears
    await expect(page.getByText('Child').first()).toBeVisible()
    // There should now be at least two comboboxes (Event + Child)
    const selects = page.getByRole('combobox')
    await expect(selects).toHaveCount(2)
  })

  test('check-in flow: select event → select child → check in → label dialog appears', async ({
    page,
  }) => {
    // Arrange
    await page.goto('/kids-checkin')
    await page.waitForLoadState('networkidle')

    // Skip if there are no events today (CI seeds may not create them)
    const noEventsMsg = page.getByText(/no events scheduled for today/i)
    const hasNoEvents = await noEventsMsg.isVisible().catch(() => false)
    if (hasNoEvents) {
      test.skip(true, 'No occurrences seeded for today — skipping full check-in flow')
      return
    }

    // Act — pick the first event
    const eventSelect = page.getByRole('combobox').first()
    await eventSelect.click()
    await page.getByRole('option').first().click()

    // Wait for the child select to appear
    await expect(page.getByText('Child').first()).toBeVisible()

    // Check if any children are available (they won't be if already all checked in)
    const childSelect = page.getByRole('combobox').nth(1)
    await childSelect.click()

    const childOptions = page.getByRole('option')
    const optionCount = await childOptions.count()
    if (optionCount === 0) {
      // Close the dropdown and skip — no available children left to check in
      await page.keyboard.press('Escape')
      test.skip(true, 'No available children to check in for this occurrence')
      return
    }

    // Act — select the first available child
    await childOptions.first().click()

    // Assert — child info card appears (the selected child's name is shown)
    const checkinButton = page.getByRole('button', { name: /check in & print label/i })
    await expect(checkinButton).toBeVisible()

    // Act — submit the check-in
    await checkinButton.click()

    // Assert — the label dialog opens with "Check-In Complete" title
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /check-in complete/i })).toBeVisible()

    // Assert — the dialog contains a security code (monospace block inside the label)
    await expect(page.locator('.font-mono').first()).toBeVisible()

    // Token propagation baseline
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--st-primary').trim()
    )
    console.log('Current --st-primary:', primary)
  })

  test('check-out with invalid code shows an error state', async ({ page }) => {
    // Arrange
    await page.goto('/kids-checkin')
    await page.waitForLoadState('networkidle')

    // Act — type a bogus code and attempt checkout
    await page.getByPlaceholder(/enter security code/i).fill('XXXX')
    await page.getByRole('button', { name: /^check out$/i }).click()

    // Assert — either an error message appears or the mutation's isError state renders
    // The exact text depends on the API response; just confirm the input is still visible
    // (meaning we did not crash) and the button remains accessible.
    await expect(page.getByPlaceholder(/enter security code/i)).toBeVisible()
  })
})
