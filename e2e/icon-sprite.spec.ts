import { test, expect } from '@playwright/test'

test.describe('icon sprite visual regression', () => {
  test('all icons render at all sizes on light background', async ({ page }) => {
    await page.goto('/icon-test')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('icon-sprite-light.png', {
      threshold: 0.02,
      fullPage: true,
    })
  })
})
