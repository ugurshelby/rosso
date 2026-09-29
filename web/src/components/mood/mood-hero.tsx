'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import type { MoodKey } from '@/lib/analytics/mood'
import { moodCoverSrc } from '@/lib/analytics/mood-cover-art'
import { moodExportDamgala, moodHaftalikSenkronAyarla } from '@/app/(dashboard)/playlists/mood/[key]/actions'
import { useCoverPalette } from '@/hooks/use-cover-palette'
import { PlaylistActionOverlay, type PlaylistActionState } from '@/components/playlists/playlist-action-overlay'
import { useT } from '@/lib/i18n/provider'
import styles from '@/components/playlists/playlist-detail.module.css'

interface MoodHeroProps {
  moodKey: MoodKey
  title: string
  tagline: string
  trackCount: number
  /**
   * Spotify'a en son aktarım (migration 0255). `null` = hiç aktarılmadı.
   * 🔴 ÖNCEDEN: durum yalnız React state'indeydi — sayfa yenilenince
   *    "eklendi" bilgisi kayboluyordu, kullanıcı tekrar ekleyebiliyordu.
   */
  exportedAt?: string | null
  /** Aktarılan playlist kimliği — "Spotify'da aç" bağlantısı için. */
  exportedPlaylistId?: string | null
  /**
   * Senkron açık mı. Yalnız Spotify'a aktarılmışsa (`exportedPlaylistId`
   * dolu) gösterilir — henüz eklenmemiş bir mood'da senkron edecek
   * playlist yok.
   *
   * ⚠ AD YANILTICI, DAVRANIŞ GÜNLÜK. Kolon `mood_workspace.
   * weekly_sync_enabled` (migration 0270) ve prop adı "weekly" diyor, ama
   * `get_mood_weekly_sync_candidates`'te HİÇBİR zaman aralığı filtresi yok
   * ve `runMoodWeeklySync` günlük mood-pkg turunun içinde koşuyor. Yani
   * senkron 0270'ten beri fiilen GÜNLÜK. 2026-09-21'de arayüz etiketleri
   * gerçeğe uyduruldu ("Sync daily"); kolon adı geriye dönük uyumluluk
   * için değişmedi. Buraya dokunan biri kolonun adına değil bu nota
   * güvensin.
   */
  weeklySyncEnabled?: boolean
}

type AddState = 'idle' | 'loading' | 'done' | 'error'

/**
 * Mood detay hero — playlist detay hero'suyla (`PlaylistDetailHero`) AYNI
 * DOM/CSS iskeleti (`.heroBleed`/`.heroStage`/`.heroInfo`/`.heroActionStrip`,
 * `playlist-detail.module.css`).
 *
 * 2026-08-11 (Sahip, ekran görüntüsüyle yakaladı): "playlist sayfasındaki
 * playlistlerim ile mood sayfasındaki Rosso'nun önerilen playlistleri detay
 * sayfaları olarak aynı tasarımı kullanmalı" — eskiden `MoodHero` tamamen
 * ayrı bir bileşen+CSS'ti (`mood.module.css`, köşeli kart, farklı kapak
 * ölçüsü/gradient formülü). Artık TEK kaynak playlist hero'su; mood'un
 * kendine özgü kısmı yalnız action strip İÇERİĞİ (ekle/senkron CTA'ları).
 *
 * Renk zemini: playlist hero'suyla AYNI mekanizma — `useCoverPalette` gerçek
 * kapak görselinden (`moodCoverSrc`) örnekler, elle seçilmiş `--mood-tint`
 * yerine geçmez ama artık kullanılmıyor (tutarlılık playlist ile birebir).
 */
export function MoodHero({
  moodKey,
  title,
  tagline,
  trackCount,
  exportedAt = null,
  exportedPlaylistId = null,
  weeklySyncEnabled = false,
}: MoodHeroProps) {
  const router = useRouter()
  const { t, tp } = useT()
  // Başlangıç durumu SUNUCUDAN gelir — sayfa yenilenince kaybolmaz (0255).
  const [addState, setAddState] = useState<AddState>(exportedAt ? 'done' : 'idle')
  const [message, setMessage] = useState<string | null>(null)
  const [syncOn, setSyncOn] = useState(weeklySyncEnabled)
  const [syncBusy, setSyncBusy] = useState(false)
  const [sonuc, setSonuc] = useState<PlaylistActionState>(null)

  const coverUrl = moodCoverSrc(moodKey)
  const palette = useCoverPalette(coverUrl)
  const heroStyle = {
    ...(palette.dominant ? { '--hero-color': palette.dominant } : {}),
    ...(palette.muted ? { '--hero-color-muted': palette.muted } : {}),
  } as CSSProperties

  async function toggleWeeklySync() {
    const next = !syncOn
    setSyncBusy(true)
    setSyncOn(next) // iyimser güncelleme — düşük riskli işlem (loading-states §3)
    const res = await moodHaftalikSenkronAyarla(moodKey, next)
    if (!res.ok) {
      setSyncOn(!next) // geri al
      setMessage(res.hata || t('mood.hero.syncSaveFailed'))
    }
    setSyncBusy(false)
  }

  async function addToSpotify() {
    setAddState('loading')
    setMessage(null)
    setSonuc('loading')

    /*
     * 🔴 SEKMEYİ ŞİMDİ AÇ, jestin İÇİNDE — sonra değil.
     *
     * Sahip: "sonrasında direkt spotifydaki listeye yönlendirme".
     * `await fetch`'ten SONRA `window.open` çağırmak tarayıcıların pop-up
     * engeline takılır: kullanıcı jesti ile açılış arasındaki bağ kopar.
     * Bu yüzden boş sekme tıklama anında açılır, hedefi cevap gelince
     * yazılır. Başarısızlıkta sekme kapatılır (yoksa kullanıcıda boş bir
     * sekme kalırdı).
     *
     * YENİ SEKME, aynı sekme DEĞİL — ölçülmüş bir gerekçeyle: eski akış
     * `router.push('/playlists/<dbId>')` ile Rosso'nun kendi playlist
     * sayfasına gidiyordu. Sahibin *"senkronize et toggle'ını görmedim"*
     * gözlemi tam olarak bunun sonucu: toggle mood sayfasında duruyor ama
     * kullanıcı 900 ms sonra oradan GÖTÜRÜLÜYORDU. Artık mood sayfası
     * altta kalıyor; Spotify listesi yeni sekmede açılıyor ve geri
     * dönüldüğünde "Spotify'da aç" + "Senkronize et" ikisi de orada.
     */
    const spotifySekmesi = window.open('', '_blank', 'noopener,noreferrer')

    try {
      const res = await fetch('/api/mood/create-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /* ⚠ `excludeTrackIds` İSTEMCİDEN GÖNDERİLMEZ. Route'un kendi notu:
           *"Mood listesini SUNUCUDA üret — istemci track ID'si gönderemez
           (güvenlik + tutarlılık)."* Aynı gerekçe çıkarılanlar için de
           geçerli: sunucu `mood_workspace`'ten kendisi okur. */
        body: JSON.stringify({ moodKey, platforms: ['spotify'] }),
      })
      const data = await res.json()
      const outcome = data?.result?.outcomes?.[0]
      if (!res.ok || !outcome || outcome.status === 'failed') {
        throw new Error(data?.error ?? 'Couldn’t create')
      }
      const spotifyId: string | undefined = outcome.playlistId ?? undefined

      setAddState('done')
      setMessage(t('mood.hero.tracksAdded', { count: outcome.trackCount }))
      setSonuc('success')

      /* Damga AKTARIMDAN SONRA atılır — sıra önemli. Önce damgalayıp
         sonra Spotify çağrısı yapsaydık, çağrı patladığında kullanıcı
         "eklendi" görür ama aslında eklenmemiş olurdu. */
      await moodExportDamgala(moodKey, spotifyId)
      /* Damga yazıldıktan SONRA sunucudan tazele: `exportedPlaylistId`
         prop'u dolsun ki "Spotify'da aç" + "Senkronize et" bu turda
         görünür olsun. `await` bilinçli — `void` bıraksaydık refresh
         damgadan önce koşabilir ve toggle yine görünmezdi. */
      router.refresh()

      /*
       * Onay animasyonunun okunması için kısa bir bekleme, sonra Spotify.
       * 900 ms ölçülmüş bir değer değil ama gerekçesi var: `SPRING_REVEAL`
       * 550 ms sürüyor, onay ikonu + etiket ondan sonra ~200 ms okunur
       * kalıyor. Daha kısası "bir şey oldu ama ne?" bırakır.
       */
      setTimeout(() => {
        if (spotifyId && spotifySekmesi) {
          spotifySekmesi.location.href = `https://open.spotify.com/playlist/${spotifyId}`
        } else {
          // Pop-up engellendi ya da Spotify id dönmedi: sekme açmaya
          // ZORLAMA. Kullanıcı mood sayfasında kalır ve "Spotify'da aç"
          // butonu zaten orada — sessiz bir başarısızlık değil, görünür
          // bir alternatif.
          spotifySekmesi?.close()
        }
        setSonuc(null)
      }, 900)
    } catch (err) {
      spotifySekmesi?.close()
      setAddState('error')
      setSonuc('error')
      setMessage(err instanceof Error ? err.message : t('mood.hero.addFailed'))
      setTimeout(() => setSonuc(null), 1600)
    }
  }

  const isDone = addState === 'done'
  const isBusy = addState === 'loading'

  return (
    <header className={styles.hero} style={heroStyle}>
      {/* Tam-kenar zemin — playlist hero'suyla aynı gerekçe, bkz.
          playlist-detail.module.css `.heroBleed` yorumu. */}
      <div className={styles.heroBleed} aria-hidden />
      <div className={styles.heroStage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt="" className={styles.heroCoverImg} />

        <div className={styles.heroInfo}>
          <span className={styles.heroEyebrow}>{t('mood.hero.eyebrow')}</span>
          <h1 className={styles.heroTitle}>{title}</h1>
          <p className={styles.heroDescription}>{tagline}</p>
          <p className={styles.heroMeta}>{tp('mood.hero.trackCount', trackCount)}</p>
        </div>
      </div>

      <div className={styles.heroActionStrip}>
        <div className={styles.heroActionsLeft}>
          {/* Eklendiyse "Spotify'da aç" — senkron toggle'ı yalnız playlist
              zaten Spotify'daysa anlamlı (henüz eklenmemiş moodda senkron
              edecek playlist yok). */}
          {isDone && exportedPlaylistId && (
            <a
              href={`https://open.spotify.com/playlist/${exportedPlaylistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroActionSecondary}
            >
              <ExternalLink size={15} strokeWidth={1.75} aria-hidden />
              <span className={styles.heroActionSecondaryLabel}>{t('mood.hero.openInSpotify')}</span>
            </a>
          )}

          {/*
            🔴 GÜNLÜK, "haftalık" DEĞİL. Etiket yanlıştı: arka uçta
            `get_mood_weekly_sync_candidates`'in hiçbir zaman aralığı
            filtresi yok ve `runMoodWeeklySync` GÜNLÜK mood-pkg turunun
            içinde koşuyor — yani senkron zaten her gün oluyordu, yalnız
            adı "weekly" kalmıştı. Sahibin beklentisi de günlük
            ("günlük olarak spotifyda da öyle olmalı"), o yüzden davranış
            değil ETİKET düzeltildi.

            🔴 GİRİŞ ANİMASYONU YOK — denendi, sonra KALDIRILDI.
            İlk hâlde bu buton ve "Spotify'da aç" bağlantısı Motion ile
            `opacity: 0 → 1` beliriyordu. Kaldırma gerekçesi `animate`
            skill'inin 1. kapısı: amaç zayıf ("nadir bir eylemden sonra
            beliren bir kontrolün sert geçişini yumuşatmak"), bedel ise
            ağır — kullanıcının BULMAK ZORUNDA olduğu bir kontrolün
            görünürlüğü bir animasyonun tamamlanmasına bağlanıyor.
            Sahibin şikâyeti zaten "toggle'ı görmedim"di; onu bir
            `opacity: 0` başlangıç durumunun arkasına koymak, çözdüğümüz
            problemi başka kapıdan geri getirir. Skill'in kendi ifadesiyle:
            "animating something that shouldn't animate" en kötü
            başarısızlık türüdür.
            Delight bütçesi overlay'de duruyor (yükleniyor → onay): o
            geçici bir katman, hiçbir kontrolü kilitlemiyor.
          */}
          {isDone && exportedPlaylistId && (
            <button
              type="button"
              className={`${styles.moodSyncToggle} ${syncOn ? styles.moodSyncToggleOn : ''}`}
              onClick={toggleWeeklySync}
              disabled={syncBusy}
              aria-pressed={syncOn}
              aria-label={
                syncOn
                  ? t('mood.hero.dailySyncOnAria')
                  : t('mood.hero.dailySyncOffAria')
              }
              title={
                syncOn
                  ? t('mood.hero.dailySyncOnTitle')
                  : t('mood.hero.dailySyncOffTitle')
              }
            >
              <RefreshCw
                size={14}
                aria-hidden
                className={syncBusy ? styles.moodSpin : undefined}
              />
              <span className={styles.moodSyncToggleLabel}>
                {syncOn ? t('mood.hero.dailySyncOnLabel') : t('mood.hero.dailySyncOffLabel')}
              </span>
            </button>
          )}

          {message && (
            <span
              className={addState === 'error' ? styles.moodActionMsgError : styles.moodActionMsg}
              role="status"
            >
              {message}
            </span>
          )}
        </div>

        <div className={styles.heroActionsRight}>
          {/* "Spotify'a ekle" — playlist hero'sunun ikon-only birincil eylem
              alanında, ama metin taşıyan bir pill (mood'a özel içerik). */}
          <button
            type="button"
            className={`${styles.moodAddButton} ${isDone ? styles.moodAddButtonDone : ''}`}
            onClick={addToSpotify}
            disabled={isBusy || isDone || trackCount === 0}
          >
            {isBusy ? (
              <Loader2 size={18} className={styles.moodSpin} aria-hidden />
            ) : isDone ? (
              <Check size={18} aria-hidden />
            ) : (
              <Plus size={18} aria-hidden />
            )}
            {isDone ? t('mood.hero.addedToSpotify') : t('mood.hero.addToSpotify')}
          </button>
        </div>
      </div>

      <PlaylistActionOverlay
        state={sonuc}
        loadingLabel={t('mood.hero.overlay.loading')}
        successLabel={t('mood.hero.overlay.success')}
        errorLabel={t('mood.hero.overlay.error')}
      />
    </header>
  )
}
