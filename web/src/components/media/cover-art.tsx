'use client'

import { useEffect, useRef, useState } from 'react'
import { coverFallback } from '@/lib/cover-fallback'
import { isAbortError } from '@/lib/fetch/is-abort-error'
import { sizedUrl } from '@/lib/images/sized-url'
import styles from './cover-art.module.css'

/**
 * Lazy platform görseli (Fable 5 görsel sistemi 2026-07-05).
 *
 * ToS-uyumlu runtime proxy: görsel URL'si DB'de tutulmaz. Bileşen ekrana
 * girince (IntersectionObserver) `/api/images/{kind}/{id}`'den çeker; böylece
 * 100+ track'te yalnızca görünür olanlar istek atar. Placeholder → fade-in.
 *
 * Aynı görsel için modül-içi kısa cache (aynı id'yi iki kez çekmez).
 */

type CoverKind = 'track' | 'artist' | 'playlist'

interface CoverArtProps {
  kind: CoverKind
  /**
   * track/playlist için Rosso DB id'si (path'e gider).
   * artist için sanatçı ADI (query param `?name=` olarak gider — id yok,
   * spotify_artist_ids köprüsü sunucuda kurulur).
   */
  id: string
  /** İstenen kenar boyutu (px) — en yakın Spotify boyutu seçilir */
  size?: number
  /** Görsel yokken gösterilecek placeholder (ör. platform ikonu) */
  fallback: React.ReactNode
  /**
   * Kapak yoksa boş gri kutu yerine deterministik gradyan üretilir
   * (dashboard-design.md §3.7). Bu verilirse `fallback` ikonu yerine
   * ad+sanatçıdan türeyen sabit gradyan + baş harf gösterilir; aynı içerik
   * her zaman aynı kapağı alır.
   */
  fallbackTitle?: string
  /** Gradyan hash'ine karışan ikincil ad (sanatçı vb.) */
  fallbackSubtitle?: string
  alt?: string
  className?: string
  rounded?: boolean
  /**
   * Kalıcı Storage kopyamızın URL'si — sunucudan HAZIR geldiyse.
   *
   * Verilirse bileşen lazy davranışını tamamen atlar: IntersectionObserver
   * kurulmaz, ağ isteği atılmaz, görsel ilk render'da basılır. Recap zaten
   * bu deseni kullanıyordu (payload'a donmuş `image_url`); Journey de
   * 2026-07-21'de buna geçti — Sahip: *"journey'de de tak diye gelmeli,
   * lazy olmamalı."*
   *
   * `null`/verilmemiş → eski lazy davranış aynen korunur (dashboard, taste,
   * playlist ekranları hâlâ bunu kullanıyor).
   */
  src?: string | null
  /**
   * Sayfa katlanma çizgisi (above-the-fold / viewport içi kritik LCP) için
   * eager + high priority + sync decoding.
   * - true: loading="eager", fetchPriority="high", decoding="sync"
   * - false: loading="lazy", fetchPriority="auto", decoding="async" (ağ ve main-thread darboğazını önler)
   * - undefined: geriye dönük uyumluluk (src != null ise eager)
   */
  priority?: boolean
  /**
   * Bileşenin inline `width: size, height: size` stili yerine
   * kapsayıcısının boyutuna (100% x 100%) esnek oturmasını sağlar.
   */
  responsive?: boolean
}

interface SpotifyImage {
  url: string
  width: number | null
  height: number | null
}

// Modül-içi cache: id → url (veya null = görsel yok). Runtime, kalıcı değil.
const _cache = new Map<string, string | null>()
// Eşzamanlı istek tekilleştirme (in-flight deduplication): aynı anda gelen istekler tek promise paylaşır
const _inFlight = new Map<string, Promise<SpotifyImage[] | null>>()

// ── Toplu istek birleştirici — yalnız track (B2.3, 2026-07-19) ──
// Aynı anda görünür olan track kapakları (bir liste render'ında observer'lar
// aynı birkaç frame içinde tetiklenir) 60ms'lik pencerede biriktirilip tek
// /api/images/tracks?ids=... çağrısında birleşir: 20 kapak = 20 auth'lu istek
// yerine 1. Batch yalnız DB-cache'li görselleri bilir; cache'te olmayanlar
// (missing) mevcut tekil uca düşer — canlı Spotify çekme + arka plan Storage
// cache davranışı orada, birebir korunur. Artist/playlist tekil yolda kalır
// (artist isim-köprülü ayrı uç, playlist nadiren liste halinde).
const BATCH_WINDOW_MS = 60
const BATCH_MAX = 50

type ImageResolver = (images: SpotifyImage[] | null) => void
let pendingTrackBatch: Map<string, ImageResolver[]> | null = null
let batchTimer: ReturnType<typeof setTimeout> | null = null

async function fetchSingleTrackImages(id: string): Promise<SpotifyImage[] | null> {
  const flightKey = `single-track:${id}`
  if (_inFlight.has(flightKey)) return _inFlight.get(flightKey)!

  const p = (async () => {
    try {
      const res = await fetch(`/api/images/track/${id}`)
      if (!res.ok) return null
      const data = (await res.json()) as { images?: SpotifyImage[] }
      return data.images ?? null
    } catch {
      return null
    } finally {
      _inFlight.delete(flightKey)
    }
  })()

  _inFlight.set(flightKey, p)
  return p
}

function flushTrackBatch() {
  const batch = pendingTrackBatch
  pendingTrackBatch = null
  if (batchTimer) {
    clearTimeout(batchTimer)
    batchTimer = null
  }
  if (!batch || batch.size === 0) return

  void (async () => {
    const ids = [...batch.keys()]
    let found: Record<string, SpotifyImage[]> = {}
    try {
      const res = await fetch(`/api/images/tracks?ids=${ids.join(',')}`)
      if (res.ok) {
        const data = (await res.json()) as { found?: Record<string, SpotifyImage[]> }
        found = data.found ?? {}
      }
    } catch {
      // Batch ucu düşerse hiçbir görsel kaybolmaz — hepsi tekil yola düşer.
    }

    for (const id of ids) {
      const resolvers = batch.get(id)!
      const images = found[id]
      if (images) {
        for (const r of resolvers) r(images)
      } else {
        // Cache'te yok (veya batch başarısız) → tekil uç: canlı Spotify +
        // arka planda Storage'a kalıcı kopya (bir sonraki açılış batch'ten gelir).
        void fetchSingleTrackImages(id).then((imgs) => {
          for (const r of resolvers) r(imgs)
        })
      }
    }
  })()
}

function requestTrackImages(id: string): Promise<SpotifyImage[] | null> {
  return new Promise((resolve) => {
    if (!pendingTrackBatch) pendingTrackBatch = new Map()
    const resolvers = pendingTrackBatch.get(id) ?? []
    resolvers.push(resolve)
    pendingTrackBatch.set(id, resolvers)

    if (pendingTrackBatch.size >= BATCH_MAX) {
      flushTrackBatch()
      return
    }
    if (!batchTimer) batchTimer = setTimeout(flushTrackBatch, BATCH_WINDOW_MS)
  })
}

function pickImage(images: SpotifyImage[], targetSize: number): string | null {
  if (images.length === 0) return null
  // width null olabilir (Spotify playlist kapakları): null'ları en sona koy,
  // hedef boyuta en yakın (ondan büyük tercih) görseli seç.
  const withW = images.filter((im): im is SpotifyImage & { width: number } => typeof im.width === 'number')
  if (withW.length === 0) return sizedUrl(images[0]!.url, targetSize) // boyut bilinmiyor → ilkini al
  const sorted = withW.sort((a, b) => a.width - b.width)
  const bigEnough = sorted.find((im) => im.width >= targetSize)
  return sizedUrl((bigEnough ?? sorted[sorted.length - 1]!).url, targetSize)
}

/**
 * `sizedUrl` 2026-09-24'te `@/lib/images/sized-url`'e taşındı (Storage +
 * Spotify sabit varyantları + Deezer). Mevcut import'lar kırılmasın diye
 * buradan da dışa verilir.
 */
export { sizedUrl }

export function CoverArt({
  kind,
  id,
  size = 64,
  fallback,
  fallbackTitle,
  fallbackSubtitle,
  alt = '',
  className,
  rounded,
  src,
  priority,
  responsive = false,
}: CoverArtProps) {
  const cacheKey = `${kind}:${id}`
  /*
   * 2026-09-24 performans denetimi: sunucudan hazır gelen `src` eskiden
   * OLDUĞU GİBİ basılıyordu — lazy yol `pickImage → sizedUrl` ile küçülürken
   * hazır yol 640 px orijinali indiriyordu (HAR: dashboard'da 36 px'lik
   * satırlar için kapak başına 50-220 KB). Artık o da `size`'a göre
   * boyutlanır. `responsive` modda `size` gerçek gösterim boyutunu
   * yansıtmayabilir → orada çağıran taraf `sizedUrl`'i kendisi uygular
   * (journey bileşenleri ve history-card bunu yapıyor). `sizedUrl` idempotent.
   */
  const sizedSrc = src != null && !responsive ? sizedUrl(src, size) : src
  const [url, setUrl] = useState<string | null>(() => sizedSrc ?? _cache.get(cacheKey) ?? null)
  // resolved: fetch tamamlandı mı? Cache'te giriş VARSA (url veya kesin-null)
  // sonuç bellidir. Aksi halde henüz çekiliyor → skeleton göster.
  // src verildiyse sonuç en baştan bellidir — skeleton hiç gösterilmez.
  const [resolved, setResolved] = useState<boolean>(() => src != null || _cache.has(cacheKey))
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Sunucudan hazır URL geldiyse hiçbir ağ işi yapma — observer bile kurma.
    if (sizedSrc != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(sizedSrc)
      setResolved(true)
      return
    }
    // Zaten cache'te (url veya kesin-yok) ise fetch etme. id/kind değiştiğinde
    // state'i cache sonucuna göre eşitlemek gerekir; setState burada bilinçli.
    if (_cache.has(cacheKey)) {
      setUrl(_cache.get(cacheKey) ?? null)
      setResolved(true)
      return
    }
    setResolved(false)

    const el = ref.current
    if (!el) return

    let cancelled = false
    const ac = new AbortController()
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        observer.disconnect()

        void (async () => {
          try {
            let images: SpotifyImage[] | null
            if (kind === 'track') {
              images = await requestTrackImages(id)
            } else {
              if (_inFlight.has(cacheKey)) {
                images = await _inFlight.get(cacheKey)!
              } else {
                const endpoint =
                  kind === 'artist'
                    ? `/api/images/artist?name=${encodeURIComponent(id)}`
                    : `/api/images/${kind}/${id}`
                const fetchPromise = (async () => {
                  try {
                    const res = await fetch(endpoint, { signal: ac.signal })
                    return res.ok ? ((await res.json()) as { images?: SpotifyImage[] }).images ?? null : null
                  } catch {
                    return null
                  } finally {
                    _inFlight.delete(cacheKey)
                  }
                })()
                _inFlight.set(cacheKey, fetchPromise)
                images = await fetchPromise
              }
            }

            if (!images || images.length === 0) {
              _cache.set(cacheKey, null)
              if (!cancelled) setResolved(true)
              return
            }
            const picked = pickImage(images, size)
            _cache.set(cacheKey, picked)
            if (!cancelled) {
              setUrl(picked)
              setResolved(true)
            }
          } catch (error) {
            if (isAbortError(error) || cancelled) return
            _cache.set(cacheKey, null)
            if (!cancelled) setResolved(true)
          }
        })()
      },
      { rootMargin: '200px' },
    )

    observer.observe(el)
    return () => {
      cancelled = true
      ac.abort()
      observer.disconnect()
    }
  }, [cacheKey, kind, id, size, sizedSrc])

  return (
    <span
      ref={ref}
      className={`${styles.wrap} ${rounded ? styles.rounded : ''} ${
        responsive ? styles.responsive : ''
      } ${className ?? ''}`}
      style={responsive ? undefined : { width: size, height: size }}
      /* `alt=""` = kapak DEKORATİF (şarkı adı/sanatçı zaten yanında yazılı).
         O hâlde sarmalayıcı da ağaçtan çıkmalı: aksi hâlde ekran okuyucu boş
         bir görsel düğümü ve içindeki iskelet/fallback metnini duyurabiliyor
         (2026-08-14 kullanıcı testi, Ş-13 — Son Dinlenenler'de 5 kapak).
         alt DOLU olduğunda hiçbir şey değişmez. */
      aria-hidden={alt === '' ? 'true' : undefined}
    >
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className={`${styles.img} ${
              src != null ? styles.imgInstant : loaded ? styles.imgLoaded : ''
            }`}
            onLoad={() => setLoaded(true)}
            // Sayfa başı/LCP (priority=true) anında boyanmalı. Aşağıdaki kapaklar
            // ise (priority=false) lazy + async decode ile ağ ve CPU'yu rahatlatır.
            loading={priority !== undefined ? (priority ? 'eager' : 'lazy') : (src != null ? 'eager' : 'lazy')}
            fetchPriority={priority !== undefined ? (priority ? 'high' : 'auto') : (src != null ? 'high' : 'auto')}
            decoding={priority !== undefined ? (priority ? 'sync' : 'async') : (src != null ? 'sync' : 'async')}
            draggable={false}
          />
          {/* Görsel decode edilene kadar shimmer.
              src hazırsa gösterilmez: kapak zaten anında boyanıyor, araya
              shimmer sokmak "tak diye geldi" hissini titremeye çevirirdi. */}
          {!loaded && src == null && <span className={styles.skeleton} aria-hidden="true" />}
        </>
      ) : !resolved ? (
        // Henüz çekiliyor (fetch/observer sürüyor) → yükleniyor hissi
        <span className={styles.skeleton} aria-hidden="true" />
      ) : fallbackTitle ? (
        // Kesin görsel yok → deterministik gradyan (§3.7): boş gri kutu bırakma
        (() => {
          const fb = coverFallback(fallbackTitle, fallbackSubtitle)
          return (
            <span
              className={styles.generated}
              style={{ background: fb.background }}
              aria-hidden="true"
            >
              <span
                className={styles.generatedInitial}
                style={{ fontSize: Math.max(12, Math.round(size * 0.42)) }}
              >
                {fb.initial}
              </span>
            </span>
          )
        })()
      ) : (
        // Kesin görsel yok, ad da verilmemiş → durağan fallback ikonu
        <span className={styles.placeholder}>{fallback}</span>
      )}
    </span>
  )
}
