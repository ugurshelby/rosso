import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { indekslenebilir, mutlakUrl, siteUrl } from './site-url'

const ANAHTARLAR = [
  'NEXT_PUBLIC_APP_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
  'VERCEL_ENV',
] as const

beforeEach(() => {
  for (const k of ANAHTARLAR) vi.stubEnv(k, '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('siteUrl', () => {
  it('elle ayarlanan adresi tercih eder, sondaki eğik çizgiyi kırpar', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://your-app.example/')
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'your-app.vercel.app')
    expect(siteUrl()).toBe('https://your-app.example')
  })

  it('şemasız Vercel adına https ekler', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'your-app.vercel.app')
    expect(siteUrl()).toBe('https://your-app.vercel.app')
  })

  it('mutlakUrl kökte eğik çizgi bırakmaz', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://your-app.example')
    expect(mutlakUrl('/')).toBe('https://your-app.example')
    expect(mutlakUrl('blog')).toBe('https://your-app.example/blog')
  })
})

describe('indekslenebilir', () => {
  it('production + kanonik domain → açık', () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://your-app.example')
    expect(indekslenebilir()).toBe(true)
  })

  it('preview → kapalı', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://your-app.example')
    expect(indekslenebilir()).toBe(false)
  })

  it('kanonik adres yalnız *.vercel.app ise → kapalı', () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'your-app.vercel.app')
    expect(indekslenebilir()).toBe(false)
  })

  it('localhost → kapalı', () => {
    expect(indekslenebilir()).toBe(false)
  })
})
