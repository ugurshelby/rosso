import { test, expect } from '@playwright/test'

/**
 * Auth akışı (Faz 8.6).
 * Gerçek email doğrulama test Supabase projesi gerektirir; burada login
 * sayfasının render'ı, form alanları ve protected-route gating'i doğrulanır.
 * Kayıt kapalı (kişisel Rosso).
 */

test.describe('auth', () => {
  test('login page renders with email + password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /giriş yap/i })).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('unauthenticated user is redirected from a protected route to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows an error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="email"]').fill('nobody@example.com')
    await page.locator('input[name="password"]').fill('wrong-password-123')
    await page.getByRole('button', { name: /giriş yap/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })
})
