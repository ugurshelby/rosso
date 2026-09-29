import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * KVKK/GDPR "Verilerimi talep et" — veri taşınabilirliği paketi (2026-07-27).
 *
 * Sahibin tarifi: SMTP henüz kurulmadı (Resend'e geçiş bekliyor). O yüzden
 * ÖNCE "veri olarak ne vereceğimizi belirleyen sistem" kurulur; kullanıcı paketi
 * ANINDA indirir. SMTP gelince bu fonksiyon aynen kullanılır, çıktısı maile ZIP
 * olarak eklenir (yalnız teslim kanalı değişir, İÇERİK aynı kalır — §1.7).
 *
 * ── Kapsam kararı (KVKK m.11 "veri taşınabilirliği"): kullanıcının SAĞLADIĞI
 *    ve onu TANIMLAYAN veriler. Sistem içi/hassas/başka kullanıcıyı ifşa eden
 *    veriler HARİÇ. Her tablo için gerekçe aşağıda.
 *
 *  DAHİL:
 *   - Hesap/kimlik: social_profiles, user_preferences, user_consents,
 *     profile_interests, profile_prompts, user_plans
 *   - Aktivite (kullanıcının kendi dinleme/etkileşim geçmişi): play_events,
 *     podcast_events, liked_songs_events, playlist_track_events, car_sessions,
 *     user_export_signals
 *   - Playlist'ler: playlists (+ playlist_tracks)
 *   - Türetilmiş kimlik (kullanıcıyı doğrudan ilgilendirir): recaps,
 *     user_taste_profile, user_genre_vectors, journey_arc,
 *     journey_year_milestones, journey_ritual_answers
 *   - Mood kararları (kullanıcının kendi verdiği sinyal): mood_workspace,
 *     mood_track_feedback
 *   - Bağlantı META'sı: platform_connections — ⚠ access/refresh TOKEN HARİÇ
 *     (şifreli sır; kullanıcıya ham token vermek güvenlik açığı). Yalnız hangi
 *     platform, ne zaman bağlandı, aktif mi.
 *
 *  HARİÇ (ve NEDEN):
 *   - Token'lar → şifreli sır, ifşa güvenlik açığı.
 *   - spotify_byoc_credentials (migration 0339, 2026-09-23) → client_secret
 *     access/refresh token'larla AYNI kategoride bir sır; asla düz metin
 *     dönmez. `client_id` (gizli değil) bile buraya eklenmiyor — kullanıcı
 *     BYOC durumunu zaten Ayarlar'daki ilgili ekrandan görüyor, bu paket
 *     "kişisel içerik" içindir, "hangi app'e bağlısın" bağlantı meta'sına
 *     daha yakın (platform_connections'la aynı muamele).
 *   - kullanici_animasyonlari (migration 0345, 2026-09-24) → "hangi kutlama
     animasyonu oynatıldı" arayüz durumu; kullanıcının sağladığı ya da onu
     tanımlayan içerik değil, hesap silinince ON DELETE CASCADE ile gider.
   - match_passes / match_daily_slots / user_match_filters → BAŞKA kullanıcıları
 *     ifşa eder (kimi geçtin/eşleştin). Kişinin kendi verisi değil, ilişki verisi.
 *   - system_logs → operasyonel iz, kişisel içerik değil (üstelik hata ayrıntısı).
 *   - migration_jobs/queue, export_jobs, sync_rules, auto_playlist_rules,
 *     user_migration_quota → sistem/iş kuyruğu meta'sı, kişisel içerik değil.
 *   - *_cache, user_top_strips, user_track_weights, social_profiles_public →
 *     türetilmiş/geçici; kaynak veriden (yukarıda dahil) her an yeniden üretilir.
 *   - profile_hidden_items, spotify_allowlist_requests → dahil edilebilir ama
 *     düşük değer; v1'de dışarıda, gerekirse eklenir (§1.7 küçük başla).
 */

/** İçindeki her tablo user_id'ye göre süzülüp aynen dökülür (küçük tablolar). */
const DIRECT_TABLES = [
  'social_profiles',
  'user_preferences',
  'user_consents',
  'profile_interests',
  'profile_prompts',
  'user_plans',
  'recaps',
  'user_taste_profile',
  'user_genre_vectors',
  'journey_arc',
  'journey_year_milestones',
  'journey_ritual_answers',
  'liked_songs_events',
  'playlist_track_events',
  'car_sessions',
  'user_export_signals',
  'podcast_events',
  /*
   * Mood çalışma alanı + uygunluk etiketleri (2026-09-22, KVKK denetimi).
   * İkisi de kullanıcının KENDİ verdiği veri: hangi parçayı listeden
   * çıkardı, hangisini onayladı, hangi parçaya hangi etiketi verdi.
   * Migration 0338 tabloyu ekledi ama paket güncellenmemişti — "yeni tablo
   * açıldı, dışa aktarma unutuldu" kalıbı. Kullanıcının sağladığı her veri
   * m.11 kapsamında geri verilebilmeli.
   */
  'mood_workspace',
  'mood_track_feedback',
] as const

export interface DataExportBundle {
  meta: {
    exported_at: string
    user_id: string
    email: string | null
    format_version: 1
    note: string
  }
  account: Record<string, unknown>
  tables: Record<string, unknown[]>
  play_events: { count: number; rows: unknown[] }
  playlists: unknown[]
  platform_connections: Array<{ platform: string; connected_at: string | null; is_active: boolean }>
}

/**
 * Kullanıcının kişisel veri paketini toplar. `service` RLS'i bypass eden
 * service-role client olmalı (kullanıcı adına tüm satırları okumak için —
 * çağıran route önce oturumu doğrular, yalnız kendi user_id'sini geçirir).
 */
export async function collectUserDataExport(
  service: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<DataExportBundle> {
  const tables: Record<string, unknown[]> = {}

  // Küçük tabloları paralel çek.
  await Promise.all(
    DIRECT_TABLES.map(async (table) => {
      const { data, error } = await service.from(table).select('*').eq('user_id', userId)
      tables[table] = error ? [] : (data ?? [])
    }),
  )

  // account = social_profiles'ın tek satırı (kolaylık; tables içinde de var).
  const account = (tables['social_profiles']?.[0] as Record<string, unknown>) ?? {}

  // play_events büyük olabilir (organik kullanıcıda 100K+). Tümünü döneriz ama
  // sayısını ayrı veririz. RLS bypass + tek user_id filtresi → REST ~1000 satır
  // kırpması RİSKİ VAR (§1.65). Bu yüzden sayfalayarak çekeriz.
  const playEvents = await fetchAllRows(service, 'play_events', userId)

  // Playlist'ler + track'leri (iç içe).
  const { data: playlistsRaw } = await service
    .from('playlists')
    .select('*, playlist_tracks(*)')
    .eq('user_id', userId)

  // platform_connections — token'ları ASLA dahil etme.
  const { data: connsRaw } = await service
    .from('platform_connections')
    .select('platform, connected_at, is_active')
    .eq('user_id', userId)

  return {
    meta: {
      exported_at: new Date().toISOString(),
      user_id: userId,
      email,
      format_version: 1,
      note:
        'Bu paket Rosso hesabındaki kişisel verilerinin bir kopyasıdır (KVKK m.11 / GDPR Art. 20). ' +
        'Güvenlik gereği erişim jetonların (Spotify/YT Music oturum anahtarların) dahil edilmemiştir.',
    },
    account,
    tables,
    play_events: { count: playEvents.length, rows: playEvents },
    playlists: playlistsRaw ?? [],
    platform_connections: (connsRaw ?? []) as DataExportBundle['platform_connections'],
  }
}

/**
 * Bir tabloyu user_id'ye göre SAYFALAYARAK çeker — REST'in ~1000 satır sessiz
 * kırpmasını (§1.65) aşmak için. play_events gibi büyüyen tablolarda şart.
 */
async function fetchAllRows(
  service: SupabaseClient,
  table: string,
  userId: string,
  pageSize = 1000,
): Promise<unknown[]> {
  const all: unknown[] = []
  let from = 0
  // Güvenlik tavanı: makul bir üst sınır (kötü niyetli/bozuk durumda sonsuz döngü yok).
  const MAX_ROWS = 1_000_000
  for (;;) {
    const { data, error } = await service
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error || !data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize || all.length >= MAX_ROWS) break
    from += pageSize
  }
  return all
}
