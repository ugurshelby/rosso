import { test, expect } from '@playwright/test'

/**
 * Migrate akışı (Faz 8.6).
 * Platform seç → migration başlat → sonuç, bağlı platform + oturum gerektirir.
 * Oturumsuz: migrate korumalı, login'e yönlendirir. Public landing erişilebilir
 * kalmalı (regresyon koruması).
 */

test.describe('migrate', () => {
  test('migrate route is protected when signed out', async ({ page }) => {
    await page.goto('/migrate')
    await expect(page).toHaveURL(/\/login/)
  })

  test('public landing stays reachable', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: /ücretsiz başla|başla/i }).first()).toBeVisible()
  })
})
