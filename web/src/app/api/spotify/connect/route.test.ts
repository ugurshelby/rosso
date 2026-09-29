// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    })),
  })),
}))
// BYOC (2026-09-23): route testi byoc.ts'in İÇİNİ değil route mantığını test
// eder — byoc.ts kendi testlerinde ayrı doğrulanır (lib/spotify/byoc.test.ts).
// "BYOC yok" senaryosu simüle edilir: gerçek davranışla aynı şekilde
// paylaşılan env'e düşer, env de yoksa null döner (SPOTIFY_CLIENT_ID
// missing testinin hâlâ 500 beklemesi için şart).
vi.mock('@/lib/spotify/byoc', () => ({
  resolveSpotifyClientId: vi.fn(async () => process.env.SPOTIFY_CLIENT_ID ?? null),
  deleteByocCredentials: vi.fn(async () => {}),
}))

import { GET, DELETE } from './route'
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SPOTIFY_CLIENT_ID = 'test-client-id'
  process.env.SPOTIFY_REDIRECT_URI = 'http://localhost/api/spotify/callback'
})

describe('GET /api/spotify/connect', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/spotify/connect')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('redirects to spotify authorize URL and sets state cookie when authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    const req = new NextRequest('http://localhost/api/spotify/connect')
    const res = await GET(req)
    expect(res.status).toBe(302)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('accounts.spotify.com/authorize')
    expect(location).toContain('test-client-id')
    expect(location).toContain('state=')
    const cookie = res.cookies.get('spotify_oauth_state')
    expect(cookie?.value).toBeDefined()
    expect(cookie?.httpOnly).toBe(true)
  })

  it('returns 500 when SPOTIFY_CLIENT_ID missing', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    delete process.env.SPOTIFY_CLIENT_ID
    const req = new NextRequest('http://localhost/api/spotify/connect')
    const res = await GET(req)
    expect(res.status).toBe(500)
  })

  it('includes playlist write and recently-played scopes', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    const req = new NextRequest('http://localhost/api/spotify/connect')
    const res = await GET(req)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('playlist-modify-public')
    expect(location).toContain('playlist-modify-private')
    expect(location).toContain('playlist-read-collaborative')
    expect(location).toContain('user-read-recently-played')
  })

  it('ugc-image-upload izni ister (playlist ÖZEL KAPAK yükleme)', async () => {
    // Bu izin düşerse PUT /playlists/{id}/images 403 "Insufficient client scope"
    // verir — playlist-modify yetmez, kapak yükleme ayrı scope (2026-07-25 canlı
    // ölçüldü). Taşıma/otomatik playlist kapağı bunsuz basılamaz.
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    const req = new NextRequest('http://localhost/api/spotify/connect')
    const res = await GET(req)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('ugc-image-upload')
  })

  it('user-library-modify izni ister (beğeni EKLEME/ÇIKARMA)', async () => {
    // Bu izin düşerse PUT|DELETE /v1/me/tracks 403 döner ve kalp butonu
    // çalışmaz — kullanıcı yalnız "Kaydedilemedi." görür.
    // ⚠ `user-library-read` bunun yerine GEÇMEZ: okuma izni yazmaya yetmez.
    // 2026-08-05 canlı ölçüm: izin listede yokken iki aktif token'ın ikisinde
    // de eksikti ve her beğeni denemesi 403 alıyordu.
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    const req = new NextRequest('http://localhost/api/spotify/connect')
    const res = await GET(req)
    expect(res.headers.get('location') ?? '').toContain('user-library-modify')
  })

  it('show_dialog=true gönderir (yeni izin sessizce atlanmasın)', async () => {
    // Bu parametre olmadan Spotify, uygulamayı daha önce onaylamış kullanıcıyı
    // onay ekranını göstermeden geri çevirebilir → yeniden bağlanma "başarılı"
    // görünür ama YENİ izin gelmez ve kalp butonu hâlâ 403 alır.
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    const req = new NextRequest('http://localhost/api/spotify/connect')
    const res = await GET(req)
    expect(res.headers.get('location') ?? '').toContain('show_dialog=true')
  })

  it('user-read-email izni ister (FAZ 6: allowlist e-postası)', async () => {
    // Bu izin düşerse Spotify e-postasını hiç öğrenemeyiz ve admin allowlist'e
    // kimi ekleyeceğini yine bilemez — FAZ 6'nın tüm zinciri buna dayanıyor.
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    const req = new NextRequest('http://localhost/api/spotify/connect')
    const res = await GET(req)
    expect(res.headers.get('location') ?? '').toContain('user-read-email')
  })
})

describe('DELETE /api/spotify/connect', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await DELETE()
    expect(res.status).toBe(401)
  })

  it('returns 200 on successful disconnect', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never)
    const res = await DELETE()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
