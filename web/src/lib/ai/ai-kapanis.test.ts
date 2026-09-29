import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { aiKapanisAktif } from './ai-kapanis'
import { vertexYapilandirmasi } from './vertex-core'

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/observability/logger', () => ({ systemLog: vi.fn(async () => undefined) }))

describe('aiKapanisAktif — otomatik AI kapanış kilidi', () => {
  // Tarih env ile açıkça verilir: yayın kopyasında sabit `null` olsa da testler aynı kalır.
  const KAPANIS = { AI_KAPANIS_TARIHI: '2026-12-17' }
  it('kapanıştan önceki gün AI açık', () => {
    expect(aiKapanisAktif(new Date('2026-12-16T23:59:59Z'), KAPANIS)).toBe(false)
  })
  it('17 Aralık 2026 00:00 UTC ve sonrasında kapalı', () => {
    expect(aiKapanisAktif(new Date('2026-12-17T00:00:00Z'), KAPANIS)).toBe(true)
    expect(aiKapanisAktif(new Date('2027-03-01T12:00:00Z'), KAPANIS)).toBe(true)
  })
  it('env ile ileri tarihe alınabilir', () => {
    const env = { AI_KAPANIS_TARIHI: '2027-06-01' }
    expect(aiKapanisAktif(new Date('2027-05-31T00:00:00Z'), env)).toBe(false)
    expect(aiKapanisAktif(new Date('2027-06-01T00:00:00Z'), env)).toBe(true)
  })
  it("env 'yok' kilidi kaldırır", () => {
    expect(aiKapanisAktif(new Date('2030-01-01T00:00:00Z'), { AI_KAPANIS_TARIHI: 'yok' })).toBe(false)
  })
  it('bozuk env değeri güvenli yönde: kapalı', () => {
    expect(aiKapanisAktif(new Date('2026-01-01T00:00:00Z'), { AI_KAPANIS_TARIHI: 'yarın' })).toBe(true)
  })
})

describe('vertexYapilandirmasi — kapanıştan sonra anahtar kullanılmaz', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-20T00:00:00Z'))
  })
  afterAll(() => vi.useRealTimers())

  it('geçerli anahtar olsa bile null döner', () => {
    expect(
      vertexYapilandirmasi({ GCP_PROJECT_ID: 'p', GOOGLE_APPLICATION_CREDENTIALS: './k.json', AI_KAPANIS_TARIHI: '2026-12-17' }),
    ).toBeNull()
  })
  it("sahibin bilinçli 'yok' kararıyla yeniden açılır", () => {
    expect(
      vertexYapilandirmasi({ GCP_PROJECT_ID: 'p', GOOGLE_APPLICATION_CREDENTIALS: './k.json', AI_KAPANIS_TARIHI: 'yok' }),
    ).not.toBeNull()
  })
})
