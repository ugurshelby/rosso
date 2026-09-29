import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // server-only / client-only sadece build-time guard'lardır; testte no-op'a alias
      'server-only': path.resolve(__dirname, './src/test/empty-module.ts'),
      'client-only': path.resolve(__dirname, './src/test/empty-module.ts'),
    },
  },
})
