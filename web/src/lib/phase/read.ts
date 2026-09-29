import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * P0.2 — Faz kilidi, sunucu tarafı tek doğruluk kaynağı.
 * Plan: docs/plans/02-zip-verisi-urune-baglama.md §P0
 *
 * Fazlar (Sahibin katman dili):
 *   1 = kayıt var, bağlantı yok
 *   2 = + Spotify OAuth bağlı
 *   3 = + Streaming History ZIP işlendi
 *   4 = + Account Data ve Technical Log ZIP (ikisi birlikte)
 *
 * Sayfalar faz NUMARASINA bakmaz — `capabilities` okur. Böylece bir özelliğin
 * hangi fazda açıldığı değişirse tek yer güncellenir.
 */

export type Phase = 1 | 2 | 3 | 4

/**
 * P0.6 — Hangi dinleme verisi okunabilir?
 *
 * 🔴 Faz kilidi ikili (var/yok) DEĞİL, **kaynak-farkındalıklı** olmak zorunda.
 * `play_events.source` iki değer taşır ve Faz 2 ile Faz 3 arasındaki gerçek
 * fark budur (Sahip ölçtü, 2026-07-30):
 *   • `api_realtime`   → Spotify canlı API'si · Faz 2'de VAR (friend'da 558 satır)
 *   • `spotify_export` → Streaming History ZIP · Faz 3'te açılır
 *
 * P0'da bu ayrım yoktu; `canSeeHistory` kapatılınca API verisi de kapandı ve
 * Faz 2 "boş ekran" oldu. Bu tür bunu önler.
 */
export type HistoryWindow = 'none' | 'api' | 'full'

/** `historyWindow`'un DB `p_source` parametresine çevrimi. `undefined` = süzgeç yok. */
export function sourceFilter(w: HistoryWindow): 'api_realtime' | undefined {
  return w === 'api' ? 'api_realtime' : undefined
}

export interface PhaseCapabilities {
  /** Faz 2+ — Spotify canlı API'sine dayanan yüzeyler */
  canSeePlaylists: boolean
  canLikeTracks: boolean
  /**
   * Faz 2+ — canlı API'den gelen son dinlemeler ("Son Dinlenenler" bölümü).
   * Uzun geçmiş GEREKTİRMEZ; bağlantı kurulduğu andan itibaren doludur.
   */
  canSeeRecentPlays: boolean
  /**
   * Faz 2+ — kısa vadeli istatistikler (StatBar + "Dinlemelerim" hafta/ay).
   * Sahip onayı 2026-07-30: Faz 2'de yalnız **Hafta + Ay**; Tüm Zamanlar ve
   * Yıllık ZIP ister (20 günlük API penceresinde yanıltıcı olurdu).
   */
  canSeeShortTermStats: boolean
  /** Faz 3+ — Streaming History gerektiren yüzeyler */
  canSeeRecap: boolean
  canSeeTaste: boolean
  canSeeHistory: boolean
  canSeeMood: boolean
  canSeeJourney: boolean
  /** Faz 4 — iki ZIP birlikte gerektiren yüzeyler */
  canSeeLikedSongs: boolean
  canSeePlaylistTimeline: boolean
  canSeeCar: boolean
  /** Dinleme verisi hangi pencereden okunacak (yukarıdaki tür notuna bak). */
  historyWindow: HistoryWindow
}

export interface PhaseState {
  phase: Phase
  /** Test override'ı aktif mi (UI "test modu" rozetı gösterebilir). */
  isOverride: boolean
  /** Override maskelese bile gerçek durum — admin/hata ayıklama için. */
  naturalPhase: Phase
  /** Faz 4'e bir dosya kaldı mı? (biri var, diğeri yok) */
  partialPhase4: boolean
  /** ZIP şu an işleniyor mu — "işleniyor" bandı için. */
  processing: boolean
  capabilities: PhaseCapabilities
}

function buildCapabilities(phase: Phase): PhaseCapabilities {
  return {
    canSeePlaylists: phase >= 2,
    canLikeTracks: phase >= 2,
    canSeeRecentPlays: phase >= 2,
    canSeeShortTermStats: phase >= 2,
    canSeeRecap: phase >= 3,
    canSeeTaste: phase >= 3,
    canSeeHistory: phase >= 3,
    canSeeMood: phase >= 3,
    canSeeJourney: phase >= 3,
    canSeeLikedSongs: phase >= 4,
    canSeePlaylistTimeline: phase >= 4,
    canSeeCar: phase >= 4,
    // Faz 1'de hiç veri yok · Faz 2 yalnız canlı API · Faz 3+ tüm geçmiş.
    historyWindow: phase >= 3 ? 'full' : phase === 2 ? 'api' : 'none',
  }
}

/** Veri okunamazsa en kısıtlı hâl — açık kalmaktansa kapalı kal (güvenli taraf). */
const FALLBACK: PhaseState = {
  phase: 1,
  isOverride: false,
  naturalPhase: 1,
  partialPhase4: false,
  processing: false,
  capabilities: buildCapabilities(1),
}

interface PhaseRow {
  phase: number
  is_override: boolean
  natural_phase: number
  has_account_data: boolean
  has_technical_log: boolean
  processing: boolean
}

function toPhase(value: number): Phase {
  if (value >= 4) return 4
  if (value === 3) return 3
  if (value === 2) return 2
  return 1
}

/**
 * Kullanıcının faz durumunu döner.
 *
 * `cache()` ile sarılı: aynı istek içinde kaç kez çağrılırsa çağrılsın DB'ye
 * tek tur gider (layout + sayfa + bileşen hepsi aynı sonucu paylaşır).
 */
export const getPhaseState = cache(async (userId: string): Promise<PhaseState> => {
  const supabase = await createClient()
  // NOT: `user_phase` migration 0149 ile eklendi; üretilmiş tip dosyası (db:types)
  // henüz onu tanımıyor. `db:types` scripti bozuk olduğu için (bkz. hafıza:
  // aşama-D dersi, tip dosyasını sessizce bozuyor) elle yenilemek yerine burada
  // dar bir cast kullanıyoruz. Şekil doğrulaması aşağıda zaten yapılıyor.
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>
  )('user_phase', { p_user: userId })

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return FALLBACK
  }

  const row = (Array.isArray(data) ? data[0] : data) as PhaseRow
  const phase = toPhase(Number(row.phase))

  return {
    phase,
    isOverride: Boolean(row.is_override),
    naturalPhase: toPhase(Number(row.natural_phase)),
    // Faz 4'e "bir dosya kaldı": biri var, diğeri yok.
    partialPhase4: Boolean(row.has_account_data) !== Boolean(row.has_technical_log),
    processing: Boolean(row.processing),
    capabilities: buildCapabilities(phase),
  }
})

/**
 * P0.5 — Faz geçiş paneli bu kullanıcıya şu an gösterilmeli mi?
 *
 * Gösterilir ki: bu faz için kayıt yok (hiç görülmemiş) VEYA snooze süresi
 * dolmuş ve henüz "Anladım" denmemiş.
 * Faz 1'de panel yok — kullanıcı zaten onboarding'den yeni çıktı.
 */
export const shouldShowPhasePanel = cache(async (userId: string): Promise<boolean> => {
  // 2026-07-30 (Aşama 1, Bulgu 0.2-A): `phase` artık PARAMETRE DEĞİL — burada
  // `getPhaseState`'ten okunuyor. Sebep: layout eskiden faz durumunu bekleyip
  // SONRA bu fonksiyonu çağırıyordu (dördüncü, seri ağ turu; 28 dashboard
  // sayfasının hepsinde ödeniyordu). Fazı içeriden okumak bağımlılığı kaldırır
  // → çağrı `Promise.all`'a girebilir. `getPhaseState` `cache()`'li olduğu için
  // aynı istekte EK SORGU DOĞMAZ; iki çağrı aynı sonucu paylaşır.
  const { phase } = await getPhaseState(userId)
  if (phase < 2) return false

  const supabase = await createClient()
  // NOT: tablo migration 0150 ile eklendi; üretilmiş tip dosyası henüz tanımıyor
  // (bkz. yukarıdaki `user_phase` notu — db:types scripti güvenilmez).
  const { data, error } = await (
    supabase.from as unknown as (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: unknown) => {
          eq: (c: string, v: unknown) => {
            maybeSingle: () => Promise<{
              data: { dismissed_at: string | null; snoozed_until: string | null } | null
              error: unknown
            }>
          }
        }
      }
    }
  )('user_phase_announcements')
    .select('dismissed_at, snoozed_until')
    .eq('user_id', userId)
    .eq('phase', phase)
    .maybeSingle()

  // Okuma hatasında paneli GÖSTERME — kullanıcıyı her sayfada rahatsız etmektense
  // duyuruyu kaçırmak yeğdir.
  if (error) return false
  if (!data) return true
  if (data.dismissed_at) return false
  if (data.snoozed_until) return new Date(data.snoozed_until) <= new Date()
  return false
})

/**
 * Yalnız aç/kapa yetenekleri — `historyWindow` bunun DIŞINDA kalır (o bir
 * pencere değeri, kilit değil). Böylece `isRouteUnlocked` bir rotayı yanlışlıkla
 * `'api'` gibi truthy bir dizgeye bağlayamaz; derleyici engeller.
 */
export type BooleanCapability = {
  [K in keyof PhaseCapabilities]: PhaseCapabilities[K] extends boolean ? K : never
}[keyof PhaseCapabilities]

/**
 * Rota → gereken yetenek. Sayfa guard'ı ve nav gizleme buradan okur.
 *
 * ⚠ **Harita TAM EŞLEŞMEDİR, önek eşleşmesi değil.** Kilit "nereye" değil
 *   "NEYE" bakar — alt rotalar üstünkünü miras ALMAZ, tek tek yazılır.
 *   (Bu ders projede üç kez aynı sınıf hatayla öğrenildi.)
 */
export const ROUTE_CAPABILITY: Record<string, BooleanCapability> = {
  '/recap': 'canSeeRecap',
  '/journey': 'canSeeJourney',
  '/taste': 'canSeeTaste',
  '/gecmis': 'canSeeHistory',
  '/playlists': 'canSeePlaylists',
  // ⚠ Beğenilen şarkılar `/playlists` ALTINDA ama onun kilidini MİRAS ALMAZ:
  // playlist'ler senkrondan, beğeniler Account Data ZIP'inden gelir — ayrı
  // kaynaklar, ayrı yetenekler.
  '/playlists/liked': 'canSeeLikedSongs',
  // ── FAZ 2 rota taşımaları (2026-08-07) ────────────────────────────────
  // `/mood` → `/playlists/mood`. Eski yol 308 ile yönlendiriliyor ama
  // KİLİT KAYDI DA TAŞINDI: yalnız sayfayı taşıyıp burayı unutmak,
  // taşınan rotayı sessizce KİLİTSİZ bırakırdı (M7 riski).
  '/playlists/mood': 'canSeeMood',
  // Eski yol da haritada kalıyor: redirect'ten ÖNCE middleware çalışır,
  // kilitli kullanıcı doğrudan `/mood`'a giderse orada durdurulmalı.
  '/mood': 'canSeeMood',
  // `/playlists/create` — otomasyonlar buraya taşındı. Playlist üretimi
  // senkron bağlantısı ister, yani `/playlists` ile aynı yetenek.
  '/playlists/create': 'canSeePlaylists',
  // ⚠ `/social` haritada YOK — bilinçli. Sosyal modül faz kilidine tabi
  //   değil: profil oluşturan herkes eşleşebilir, dinleme geçmişi
  //   gerektirmez. (Eski `/discover` ve `/messages` de kilitli değildi.)
}

/** Bu rota şu faz durumunda açık mı? Tanımsız rota → her zaman açık. */
export function isRouteUnlocked(href: string, state: PhaseState): boolean {
  const need = ROUTE_CAPABILITY[href]
  if (!need) return true
  return state.capabilities[need]
}
