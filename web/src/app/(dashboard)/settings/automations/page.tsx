import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ListMusic, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AutoPlaylistRule, type AutoPlaylistRuleData } from '@/components/automations/auto-playlist-rule'
import { getT } from '@/lib/i18n/server'
import styles from '@/app/(dashboard)/playlists/create/automations.module.css'

/**
 * `/settings/automations` — OTOMASYON YÖNETİMİ.
 *
 * 🔄 2026-08-15 (P4.1): Bu sayfa eskiden `/playlists/create`'e 308 ile
 * yönlendiriyordu; ayarlardan gelen kullanıcı "Playlist oluştur" formu
 * buluyordu (2026-08-14 kullanıcı testi, Ş-33).
 *
 * Sahibin kararı: *"Bunlar birbirine benzer ama FARKLI iki sayfa. Biri
 * sadece otomatik playlistleri düzenleme/kontrol etmek için, diğeri playlist
 * oluşturmak için… Tek seferlik playlist oluşturmanın burada işi yok."*
 *
 *   → BURASI: hazır otomasyonları yönetir (aç/kapat · şarkı sayısı ·
 *     sıralama ölçütü · senkron kuralları · silme)
 *   → `/playlists/create`: tek seferlik playlist üretimi (parametreli)
 */
export default async function AutomationsPage() {
  const { t, tp } = await getT()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: playlistRules } = await supabase
    .from('auto_playlist_rules')
    .select('*')
    .eq('user_id', user.id)
    .in('rule_type', ['top_month', 'top_year'])

  function normalizeRule(
    rawRule: AutoPlaylistRuleData | null,
  ): AutoPlaylistRuleData | null {
    return rawRule
      ? {
          ...rawRule,
          track_count: (rawRule.track_count as 20 | 50 | 100) ?? 50,
          sort_by: (rawRule.sort_by as 'plays' | 'duration') ?? 'plays',
        }
      : null
  }

  const rules = (playlistRules ?? []) as AutoPlaylistRuleData[]
  const monthlyRule = normalizeRule(rules.find((r) => r.rule_type === 'top_month') ?? null)
  const yearlyRule = normalizeRule(rules.find((r) => r.rule_type === 'top_year') ?? null)

  const autoRuleIds = (playlistRules ?? []).map((r: { id: string }) => r.id)
  const { data: autoRuns } = autoRuleIds.length
    ? await supabase
        .from('auto_playlist_runs')
        .select('id, rule_id, platform, status, track_count, ran_at')
        .in('rule_id', autoRuleIds)
        .order('ran_at', { ascending: false })
        .limit(5)
    : { data: [] }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <Link href="/settings" className={styles.heroBack}>
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
          {t('settings.automationsPage.back')}
        </Link>
        <h1 className={styles.heroTitle}>{t('settings.automationsPage.title')}</h1>
        <p className={styles.heroDesc}>
          {t('settings.automationsPage.descPrefix')}{' '}
          <Link href="/playlists/create" className={styles.heroInlineLink}>
            {t('settings.automationsPage.createPlaylistLink')}
          </Link>
          .
        </p>
      </header>

      {/* ── Otomatik Top Playlist (aylık + yıllık) ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>
            <ListMusic size={13} strokeWidth={1.75} aria-hidden />
            {t('settings.automationsPage.sectionLabel')}
          </span>
          <span className={styles.sectionHint}>{t('settings.automationsPage.sectionHint')}</span>
        </div>

        <AutoPlaylistRule variant="monthly" initialRule={monthlyRule} />
        <AutoPlaylistRule variant="yearly" initialRule={yearlyRule} />

        {(autoRuns ?? []).length > 0 && (
          <div className={styles.runsList}>
            <p className={styles.runsTitle}>{t('settings.automationsPage.latestRuns')}</p>
            {(autoRuns ?? []).map((run: {
              id: string
              platform: string
              status: string
              track_count: number
              ran_at: string
            }) => (
              <div key={run.id} className={styles.runRow}>
                <span className={styles.runPlatform}>
                  {run.platform === 'spotify' ? 'Spotify' : run.platform.replace('_', ' ')}
                </span>
                <span
                  className={`${styles.runStatus} ${
                    run.status === 'completed'
                      ? styles.statusOk
                      : run.status === 'partial'
                      ? styles.statusPartial
                      : styles.statusFail
                  }`}
                >
                  {run.status === 'completed'
                    ? t('settings.automationsPage.status.completed')
                    : run.status === 'partial'
                    ? t('settings.automationsPage.status.partial')
                    : t('settings.automationsPage.status.failed')}
                </span>
                <span>{tp('settings.automationsPage.tracks', run.track_count)}</span>
                <span className={styles.runMeta}>
                  {new Date(run.ran_at).toLocaleDateString('en-US')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 🗑 SENKRONİZASYON KURALLARI BÖLÜMÜ KALDIRILDI (2026-08-26).
          Rosso plan 07'den beri (2026-07-28) saf Spotify — bu özellik
          platformlar-arası (Spotify/Apple/YT) A→B kopyalama içindi.
          Worker'daki nightly_sync.py aynı Spotify playlistini hem kaynak
          hem hedef olarak okuyup kendisiyle karşılaştırıyordu: fark HER
          ZAMAN boş çıkıyor, cron her gece hiçbir şey yapmadan "başarılı"
          logluyordu — sessizce ölü bir özellik. sync_rules tablosu zaten
          2026-08-08'de 0 kayıt ölçülmüştü (bkz. playlists/[id]/page.tsx).
          `sync_rules`/`sync_runs` tabloları DURUYOR (silme ayrı onay ister),
          yalnız kod/UI kaldırıldı. */}

      {/* Tek seferlik üretim buradan DEĞİL — yönü açıkça göster. */}
      <section className={styles.section}>
        <Link href="/playlists/create" className={styles.crossLink}>
          <Plus size={15} strokeWidth={1.75} aria-hidden />
          <span>
            <strong>{t('settings.automationsPage.crossLink.title')}</strong>
            <span className={styles.crossLinkHint}>
              {t('settings.automationsPage.crossLink.hint')}
            </span>
          </span>
        </Link>
      </section>
    </div>
  )
}
