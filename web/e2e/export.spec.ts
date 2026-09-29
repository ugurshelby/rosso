import { test, expect } from '@playwright/test'

/**
 * Export akışı (Faz 8.6).
 * ZIP upload → progress → tamamlanma authenticated oturum + worker gerektirir.
 * Oturumsuz: export ayar sayfası korumalı, login'e yönlendirir.
 */

test.describe('export', () => {
  test('export settings route is protected when signed out', async ({ page }) => {
    await page.goto('/settings/export')
    await expect(page).toHaveURL(/\/login/)
  })
})
