import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `getDashboardAlerts` — banner ÖNCELİK SIRASI sözleşmesi.
 *
 * ─── Neden bu test var ──────────────────────────────────────────────────
 * Fonksiyon tek bir uyarı döndürür; hangisinin kazandığı bir ÜRÜN kararıdır,
 * bir uygulama ayrıntısı değil. Sıra bozulursa hiçbir araç yakalamaz:
 * build geçer, tip doğru, lint temiz — kullanıcı yalnızca yanlış mesajı
 * görür ve yanlış adımı atar.
 *
 * Korunan sıra ve gerekçesi:
 *   1. cooldown            → Rosso'nun kendi hatası; kullanıcı ne yaparsa
 *                            yapsın veri gelmez, her şeyin üstünde
 *   2. veri izni eksik     → kullanıcının atabileceği TEK adım bu
 *   3. senkron gecikmesi   → veri var, yalnız tazeliği düşük
 *
 * ⚠ 2 neden 3'ten önce: hiç bağlantısı olmayan birine *"veriler biraz
 * geride olabilir"* demek yanıltıcıdır — geride değil, hiç yok.
 */

const cooldownRpc = vi.fn()
const connSorgusu = vi.fn()
const kimlikDurumu = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({ rpc: cooldownRpc }),
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: connSorgusu }),
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/auth/spotify-kimlik', () => ({
  spotifyKimlikDurumu: (...a: unknown[]) => kimlikDurumu(...a),
}))

const { getDashboardAlerts } = await import('./dashboard-alerts')

/** Varsayılan: cooldown yok, Spotify bağlı, senkron taze. */
function temizDurum() {
  cooldownRpc.mockResolvedValue({ data: [{ blocked_until: null }], error: null })
  kimlikDurumu.mockResolvedValue({
    girisVar: false,
    veriBaglantisiVar: true,
    veriBaglantisiEksik: false,
  })
  connSorgusu.mockResolvedValue({
    data: { last_recently_played_sync_at: new Date().toISOString() },
  })
}

describe('getDashboardAlerts — öncelik sırası', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    temizDurum()
  })

  it('her şey yolundaysa uyarı yok', async () => {
    expect(await getDashboardAlerts('u1')).toEqual([])
  })

  it('cooldown varsa DİĞER HER ŞEYİ bastırır', async () => {
    // Aynı anda üç sorunun da olduğu en kötü durum.
    cooldownRpc.mockResolvedValue({
      data: [{ blocked_until: new Date(Date.now() + 3600_000).toISOString() }],
      error: null,
    })
    kimlikDurumu.mockResolvedValue({
      girisVar: true,
      veriBaglantisiVar: false,
      veriBaglantisiEksik: true,
    })
    connSorgusu.mockResolvedValue({ data: null })

    const alerts = await getDashboardAlerts('u1')
    expect(alerts).toHaveLength(1)
    expect(alerts[0].kind).toBe('spotify_cooldown')
  })

  it('Spotify ile girip veri bağlamayan kullanıcı özel çağrı görür', async () => {
    kimlikDurumu.mockResolvedValue({
      girisVar: true,
      veriBaglantisiVar: false,
      veriBaglantisiEksik: true,
    })

    const alerts = await getDashboardAlerts('u1')
    expect(alerts).toEqual([{ kind: 'spotify_veri_izni_gerekli' }])
  })

  it('veri izni eksikliği, senkron gecikmesinden ÖNCE gelir', async () => {
    /*
     * Kritik senaryo: bağlantısı olmayan kullanıcıya "veriler geride"
     * demek yanıltıcıdır. Sıra bozulursa bu test kırılır.
     */
    kimlikDurumu.mockResolvedValue({
      girisVar: true,
      veriBaglantisiVar: false,
      veriBaglantisiEksik: true,
    })
    connSorgusu.mockResolvedValue({
      data: { last_recently_played_sync_at: new Date(Date.now() - 48 * 3600_000).toISOString() },
    })

    const alerts = await getDashboardAlerts('u1')
    expect(alerts[0].kind).toBe('spotify_veri_izni_gerekli')
  })

  it('bağlantısı olan kullanıcıda gecikme uyarısı çalışmayı sürdürür', async () => {
    // Yeni uyarı eskisini gölgelememeli.
    connSorgusu.mockResolvedValue({
      data: { last_recently_played_sync_at: new Date(Date.now() - 30 * 3600_000).toISOString() },
    })

    const alerts = await getDashboardAlerts('u1')
    expect(alerts[0].kind).toBe('sync_delay')
  })

  it('e-posta ile giren (Spotify girişi olmayan) kullanıcıya bu uyarı çıkmaz', async () => {
    /*
     * Uyarı yalnız "Spotify'la GİRDİ ama veri yok" durumuna özel.
     * E-posta ile girip Spotify'ı hiç bağlamamış kullanıcı farklı bir
     * hikâyededir — ona genel bağlantı akışı gösterilir.
     */
    kimlikDurumu.mockResolvedValue({
      girisVar: false,
      veriBaglantisiVar: false,
      veriBaglantisiEksik: false,
    })
    connSorgusu.mockResolvedValue({ data: null })

    const alerts = await getDashboardAlerts('u1')
    expect(alerts.some((a) => a.kind === 'spotify_veri_izni_gerekli')).toBe(false)
  })
})
