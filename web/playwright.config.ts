import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E (Faz 8.6).
 *
 * Kritik akışların render/redirect davranışını doğrular. Authenticated veri
 * gerektiren adımlar (gerçek login, export işleme) test Supabase projesi veya
 * mock gerektirir — burada oturumsuz erişilebilir/redirect davranışı kapsanır,
 * derin akışlar test DB bağlandığında genişletilir.
 *
 * Dev server otomatik başlatılır (port 3847 — package.json ile uyumlu).
 */
const PORT = 3847
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
})
