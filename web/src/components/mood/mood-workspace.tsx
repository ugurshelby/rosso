'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X, RotateCcw, ChevronDown } from 'lucide-react'
import { TrackTable } from '@/components/playlists/track-table'
import {
  moodEtiketKaydet,
  moodGizlenenleriKaydet,
} from '@/app/(dashboard)/playlists/mood/[key]/actions'
import { listedenCikarirMi, type MoodEtiketi } from '@/lib/analytics/mood-etiket'
import { SPRING_UI } from '@/lib/motion/apple-spring'
import { useT } from '@/lib/i18n/provider'
import { MoodEtiketMenusu } from './mood-etiket-menusu'
import styles from './mood.module.css'

/** Ardışık "çıkar" tıklamalarını TEK ağ isteğinde birleştirir — Sahip
 * (2026-09-16): "hızı arttırılmalı, kullanıcı çıkar butonuna bastığı anda
 * çıkmalı animasyon ile". UI her tıklamada ANINDA güncellenir (iyimser);
 * yalnız SUNUCUYA yazma 400ms ertelenir, art arda 5 tıklama 5 değil 1 istek
 * üretir ve hiçbir tıklama bir öncekinin ağ turunu beklemez. */
const KAYIT_GECIKMESI_MS = 400

/** `TrackTable`'ın beklediği satır şekli — mood tarafında üretiliyor. */
type TrackRow = Parameters<typeof TrackTable>[0]['rows'][number]

interface MoodWorkspaceProps {
  moodKey: string
  rows: TrackRow[]
  /** Sunucudan gelen başlangıç değeri (migration 0255). */
  initialHidden: string[]
  /** Uygunluk etiketleri, `trackId → etiket` (migration 0338). */
  initialEtiketler: Record<string, MoodEtiketi>
}

/**
 * Mood çalışma alanı — listeyi Spotify'a göndermeden ÖNCE düzenleme yüzeyi.
 *
 * Sahibin isteği (2026-08-08):
 *   *"Ruhunu sevdim, içerik pürüzlü → listeye gir, şarkı çıkar, sonra
 *    Spotify'a ekle."*
 *
 * ## Uygunluk etiketleri (2026-09-22, migration 0338)
 * Çıkarmak tek bir cümleydi; etiket iki soruyu ayırır: "listeye ait mi?"
 * (herkes için katalog bilgisi) ve "ben seviyor muyum?" (kişisel).
 * "Alakasız" ve "Uygun, sevmedim" listeden çıkarır; "Uygun" ve "Çok sevdim"
 * onaylar. Kişisel ve katalog etkisini DB tetikleyicisi yapar — burada yalnız
 * görünen liste iyimser güncellenir.
 *
 * ## Neden gizlenen listesi etiketle birlikte AYRICA yazılıyor
 * Tetikleyici gizlemeyi zaten yapıyor. Ama "çıkar (X)" gecikmeli olarak TAM
 * listeyi yazar; araya giren bir etiketin gizlemesini bu tam liste içermezse
 * ezerdi. Her iki yol da aynı yerel durumdan yazdığı için son yazan hep
 * doğru listeyi taşır.
 *
 * ## Neden "gizlenenler" tutuluyor, "kalanlar" değil
 * Paket cron'la tazelenir ve yeni şarkılar gelir. Kalanları saklasaydık,
 * tazeleme sonrası **yeni şarkılar hiç görünmezdi** (kullanıcı onları
 * seçmemişti). Çıkarılanları saklayınca: yeni şarkılar otomatik akar,
 * kullanıcının reddettikleri gizli kalır. Niyet korunur.
 */
export function MoodWorkspace({ moodKey, rows, initialHidden, initialEtiketler }: MoodWorkspaceProps) {
  const { t, tp } = useT()
  const [hidden, setHidden] = useState<string[]>(initialHidden)
  const [etiketler, setEtiketler] = useState<Record<string, MoodEtiketi>>(initialEtiketler)
  const [elenenlerAcik, setElenenlerAcik] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  // Sunucunun DOĞRULADIĞI son durum — geri alma buna döner (bir batch'in
  // ORTASINDAKİ iyimser bir ara duruma değil, bkz. debounce yorumu yukarıda).
  const dogrulanmisRef = useRef<string[]>(initialHidden)
  const zamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Etiket yazımı sırasında en güncel gizli listeye erişim (kapanış bayatlığı).
  const hiddenRef = useRef<string[]>(initialHidden)

  const gizliSet = new Set(hidden)
  const gorunenler = rows.filter((r) => !gizliSet.has(r.tracks?.id ?? ''))
  const elenenler = rows.filter((r) => r.tracks?.id && gizliSet.has(r.tracks.id))
  const etiketliSayisi = rows.filter((r) => r.tracks?.id && etiketler[r.tracks.id]).length
  // "Hepsini geri al" yalnız ETİKETSİZ çıkarılanları döndürür — etiketli
  // eleme bilinçli bir karardır, toplu geri almayla silinmemeli.
  const etiketsizElenenSayisi = elenenler.filter((r) => !listedenCikarirMi(etiketler[r.tracks!.id])).length

  function kaydet(yeniGizli: string[]) {
    hiddenRef.current = yeniGizli
    setHidden(yeniGizli) // iyimser — HER TIKLAMADA anında, hiçbir ağ beklemesi yok
    setHata(null)

    if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current)
    zamanlayiciRef.current = setTimeout(() => {
      void (async () => {
        const sonuc = await moodGizlenenleriKaydet(moodKey, yeniGizli)
        if (sonuc.ok) {
          dogrulanmisRef.current = yeniGizli
        } else {
          hiddenRef.current = dogrulanmisRef.current
          setHidden(dogrulanmisRef.current) // geri al — yalan söyleme
          setHata(sonuc.hata)
        }
      })()
    }, KAYIT_GECIKMESI_MS)
  }

  /**
   * Rosso'dan çıkarma DB yazımıyla birlikte Spotify'a da yayılır
   * (Sahip, 2026-08-11: "rossodan çıkardığımda spotifydan da çıkmalı").
   * Fire-and-forget: Rosso tarafı zaten `kaydet` ile garanti; Spotify
   * çağrısı başarısız olsa da kullanıcının gördüğü liste doğru kalır
   * (`/api/mood/remove-track` kendi içinde bunu warning olarak işler).
   */
  function spotifydanCikar(spotifyTrackId: string | null | undefined) {
    if (!spotifyTrackId) return
    fetch('/api/mood/remove-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moodKey, spotifyTrackId }),
    }).catch((err) => {
      console.warn('[mood] Spotify senkron çağrısı başarısız:', err)
    })
  }

  const cikar = (trackId: string, spotifyTrackId: string | null | undefined) => {
    kaydet([...hiddenRef.current, trackId])
    spotifydanCikar(spotifyTrackId)
  }

  function etiketSec(trackId: string, spotifyTrackId: string | null | undefined, yeni: MoodEtiketi | null) {
    const onceki = etiketler[trackId] ?? null
    if (onceki === yeni) return

    setEtiketler((e) => {
      const kopya = { ...e }
      if (yeni) kopya[trackId] = yeni
      else delete kopya[trackId]
      return kopya
    })

    const gizliMi = hiddenRef.current.includes(trackId)
    if (listedenCikarirMi(yeni)) {
      if (!gizliMi) {
        kaydet([...hiddenRef.current, trackId])
        spotifydanCikar(spotifyTrackId)
      }
    } else if (gizliMi && (yeni !== null || listedenCikarirMi(onceki))) {
      // Olumlu etiket ya da olumsuz etiketin kaldırılması → listeye döner.
      kaydet(hiddenRef.current.filter((id) => id !== trackId))
    }

    void (async () => {
      const sonuc = await moodEtiketKaydet(moodKey, trackId, yeni)
      if (!sonuc.ok) {
        setEtiketler((e) => {
          const kopya = { ...e }
          if (onceki) kopya[trackId] = onceki
          else delete kopya[trackId]
          return kopya
        })
        setHata(sonuc.hata)
      }
    })()
  }

  const hepsiniGeriAl = () =>
    kaydet(hiddenRef.current.filter((id) => listedenCikarirMi(etiketler[id])))

  return (
    <>
      <div className={styles.workspaceBar}>
        <p className={styles.workspaceCount} role="status">
          {tp('mood.workspace.trackCount', gorunenler.length)}
          {etiketliSayisi > 0 && (
            <span className={styles.workspaceEtiketSayisi}>{t('mood.workspace.tagged', { count: etiketliSayisi })}</span>
          )}
        </p>

        {etiketsizElenenSayisi > 0 && (
          <button
            type="button"
            className={styles.workspaceUndo}
            onClick={hepsiniGeriAl}
          >
            <RotateCcw size={14} aria-hidden />
            {t('mood.workspace.undoAll')}
          </button>
        )}
      </div>

      {hata && (
        <p className={styles.workspaceError} role="alert">
          {hata}
        </p>
      )}

      {gorunenler.length === 0 ? (
        <p className={styles.preparing} role="status">
          {t('mood.workspace.allClearedMessage')}
        </p>
      ) : (
        <div className={styles.workspaceList}>
          <TrackTable rows={gorunenler} animated />

          {/* Eylem düğmeleri ayrı katmanda: `TrackTable` paylaşılan bir
              bileşen (playlist detay da kullanıyor) — ona mood'a özel bir
              prop eklemek onu kirletirdi. Satır hizası CSS ile kuruluyor.
              `TrackTable animated` ile AYNI exit animasyonu burada da
              tekrarlanır — aksi halde satırlar yavaşça küçülürken düğme
              sütunu anında zıplardı (Sahip: "deneyim arttırılmalı"). */}
          <ul className={styles.workspaceActions} aria-label={t('mood.workspace.trackActionsAria')}>
            <AnimatePresence initial={false}>
              {gorunenler.map((r) => {
                const id = r.tracks?.id ?? ''
                return (
                  <motion.li
                    key={id || r.position}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, transition: { ...SPRING_UI, duration: 0.22 } }}
                    transition={SPRING_UI}
                  >
                    <MoodEtiketMenusu
                      parcaAdi={r.tracks?.title ?? 'Track'}
                      etiket={etiketler[id] ?? null}
                      onSec={(e) => etiketSec(id, r.tracks?.spotify_id, e)}
                      disabled={!id}
                    />
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => cikar(id, r.tracks?.spotify_id)}
                      disabled={!id}
                      aria-label={t('mood.workspace.removeUntaggedAria', { title: r.tracks?.title ?? 'Track' })}
                      title={t('mood.workspace.removeUntaggedTitle')}
                    >
                      <X size={15} aria-hidden />
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {elenenler.length > 0 && (
        <section className={styles.elenenler} aria-label={t('mood.workspace.excludedAria')}>
          <button
            type="button"
            className={styles.elenenlerBaslik}
            onClick={() => setElenenlerAcik((a) => !a)}
            aria-expanded={elenenlerAcik}
          >
            <ChevronDown
              size={14}
              aria-hidden
              className={elenenlerAcik ? styles.elenenlerOkAcik : styles.elenenlerOk}
            />
            {t('mood.workspace.excludedHeading', { count: elenenler.length })}
          </button>

          <AnimatePresence initial={false}>
            {elenenlerAcik && (
              <motion.ul
                className={styles.elenenlerListe}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={SPRING_UI}
              >
                {elenenler.map((r) => {
                  const id = r.tracks!.id
                  return (
                    <li key={id} className={styles.elenenSatir}>
                      <span className={styles.elenenMetin}>
                        <span className={styles.elenenBaslik}>{r.tracks!.title}</span>
                        <span className={styles.elenenSanatci}>{r.tracks!.artist_name}</span>
                      </span>
                      <MoodEtiketMenusu
                        parcaAdi={r.tracks!.title}
                        etiket={etiketler[id] ?? null}
                        onSec={(e) => etiketSec(id, r.tracks!.spotify_id, e)}
                      />
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() =>
                          listedenCikarirMi(etiketler[id])
                            ? etiketSec(id, r.tracks!.spotify_id, null)
                            : kaydet(hiddenRef.current.filter((x) => x !== id))
                        }
                        aria-label={t('mood.workspace.restoreAria', { title: r.tracks!.title })}
                        title={t('mood.workspace.restoreTitle')}
                      >
                        <RotateCcw size={14} aria-hidden />
                      </button>
                    </li>
                  )
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}
    </>
  )
}
