'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import styles from './progressive-reveal.module.css'

/**
 * Katman katman yükleme — TEK ORTAK ALTYAPI (2026-09-25).
 *
 * Uzun listeler (Geçmiş 100 kart, Playlists 125+) ilk yükte HEPSİNİ mount
 * ediyordu: HAR'da /gecmis 138 görsel isteği ve 9,3 MB, /playlists 122 kapak.
 * Bu altyapı ilk `initial` öğeyi çizer; kullanıcı listenin sonuna yaklaşırken
 * (`preloadPx` önce) `step` öğe daha açar. Görünmeyen kartın görseli hiç
 * istenmez → ilk yük ve geçiş süresi kısalır, yavaşlık hissedilmez.
 *
 * ─── Neden çift tetikleyici ─────────────────────────────────────────────
 * Playlists'te canlıda ölçülen hata: toolbar "125" diyor, kaydırınca liste
 * 24'te kalıyor. Eski hook yalnız IntersectionObserver'a güveniyordu ve tek bir
 * kaçan geçiş sonrası bir daha denemiyordu. KESİN kök neden canlıda
 * doğrulanamadı (giriş gerekiyor); bu altyapı bu sınıfı kapatır: IO + (kaydırma /
 * yeniden boyutlandırma dinleyicisi, zamanlayıcıyla kısılmış) aynı `check()`'i
 * çağırır ve `check()` her parti çizildikten sonra bir kez daha koşar →
 * sentinel hâlâ menzildeyse zincirleme dolar. Sayfa kaydırması ve iç kaydırıcı
 * senaryosu tarayıcıda 24'er ilerleyip 125/125'te bitecek şekilde ölçüldü.
 *
 * ─── Animasyon (apple-design + animate) ─────────────────────────────────
 * Amaç: durum göstergesi + içeriğin ani sıçramasını önleme. Sıklık: kaydırma
 * başına birkaç kez → yalnız `opacity` + `transform`, 250 ms `--ease-default`
 * (güçlü ease-out), 32 ms stagger (en fazla 8 basamak → tüm parti ≤ 0,5 s).
 * `prefers-reduced-motion`: yalnız opacity. İlk `initial` öğe ANİMASYONSUZ
 * (SSR'dan geldi; yeniden animasyon "titreme" olurdu).
 */

interface Options {
  /** Toplam öğe sayısı. */
  total: number
  /** İlk yükte çizilecek öğe (ızgara sütun sayısının katı olmalı: 24 = 2/3/4/6). */
  initial?: number
  /** Her katmanda eklenecek öğe. */
  step?: number
  /**
   * Görünüm kimliği. Değişince (sekme/dönem/sıralama/ızgara↔liste) sayaç başa
   * döner — `total` aynı kalsa bile satır yüksekliği/veri değişmiştir.
   */
  resetKey?: string
  /** Sentinel'e bu kadar px kala sonraki katmanı aç. */
  preloadPx?: number
}

/** Bir öğenin animasyon sınıfı + stagger değişkeni. İlk parti animasyonsuz. */
export function revealItemProps(
  index: number,
  initial: number,
  step: number,
): { className?: string; style?: CSSProperties } {
  if (index < initial) return {}
  return {
    className: styles.enter,
    style: { ['--reveal-i' as string]: (index - initial) % step } as CSSProperties,
  }
}

/**
 * En yakın GERÇEKTEN kayan ata (yoksa `null` = viewport).
 *
 * `overflow-y: auto|scroll` bakmak YETMEZ: CSS'te bir eksen `hidden` ise diğer
 * eksen `visible` kalamaz, hesaplanmış değer `auto`ya döner (ölçüldü:
 * `overflow-x:hidden` sarmalayıcı → `overflow-y: auto`). Dashboard kabuğunda /
 * body'de `overflow-x` kuralları var; içerik yüksekliğine eşit (kaymayan) böyle
 * bir ata kök seçilirse görünür alan yanlış hesaplanır. Koşul: içerik yüksekliği
 * görünen yüksekliği aşmalı. (Sertleştirme — tek başına canlı hatanın kanıtlı
 * nedeni değil.)
 */
function findScrollRoot(node: HTMLElement): HTMLElement | null {
  let el = node.parentElement
  while (el && el !== document.body && el !== document.documentElement) {
    const oy = getComputedStyle(el).overflowY
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      el.clientHeight > 0 &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return el
    }
    el = el.parentElement
  }
  return null
}

export function useProgressiveReveal({
  total,
  initial = 24,
  step = 24,
  resetKey = '',
  preloadPx = 600,
}: Options) {
  const identity = `${resetKey}|${total}`
  const [state, setState] = useState(() => ({ identity, count: Math.min(initial, total) }))
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Kimlik değişti → render sırasında sıfırla (efekt + ek render + titreme yok).
  let count = state.count
  if (state.identity !== identity) {
    count = Math.min(initial, total)
    setState({ identity, count })
  }

  const hasMore = count < total

  const reveal = useCallback(() => {
    setState((prev) => {
      if (prev.identity !== identity) return prev
      const next = Math.min(prev.count + step, total)
      return next === prev.count ? prev : { identity, count: next }
    })
  }, [identity, step, total])

  useEffect(() => {
    if (!hasMore) return
    const node = sentinelRef.current
    if (!node) return

    let timer: ReturnType<typeof setTimeout> | null = null
    let done = false

    const check = () => {
      timer = null
      if (done) return
      const rect = node.getBoundingClientRect()
      // Kök HER kontrolde yeniden bulunur: içerik büyüdükçe bir ata kaymaya başlayabilir.
      const root = findScrollRoot(node)
      const viewportBottom = root ? root.getBoundingClientRect().bottom : window.innerHeight
      if (rect.top - viewportBottom < preloadPx) reveal()
    }
    // rAF DEĞİL zamanlayıcı: arka planda/gizli panelde rAF durur ve tetikleyici
    // sessizce ölür; 50 ms'lik kısma kaydırma başına en fazla ~20 kontrol demek.
    const schedule = () => {
      if (!timer) timer = setTimeout(check, 50)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) schedule()
      },
      // root: null → tarayıcı gerçek kırpıcıları (kayan atalar) kendisi hesaba katar.
      { rootMargin: `${preloadPx}px 0px` },
    )
    observer.observe(node)

    // `capture: true`: `scroll` kabarcıklanmaz — iç kaydırıcıdaki kaydırmayı da yakalar.
    document.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule, { passive: true })
    // Parti çizildi (efekt yeniden koştu): sentinel hâlâ menzildeyse zincirle doldur.
    schedule()

    return () => {
      done = true
      observer.disconnect()
      document.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      if (timer) clearTimeout(timer)
    }
  }, [count, hasMore, preloadPx, reveal])

  return { count, hasMore, sentinelRef, initial, step }
}

interface RevealTailProps {
  hasMore: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
  /** İskelet öğeleri (listenin kendi ızgara sınıfıyla sarılır). */
  children: ReactNode
  /** Izgarayla aynı sütun düzenini veren sınıf. */
  className?: string
  /** Izgara yoğunluğu (`data-cols`) — Geçmiş gibi ızgaralar için. */
  dataCols?: number
  /** Ekran okuyucu metni. */
  label?: string
}

/**
 * Listenin altındaki "sonraki katman geliyor" şeridi: sentinel + iskelet.
 * Kullanıcı sona yaklaşırken iskeletler görünür, gelen kartlar onların yerini
 * alır → boşluk ya da sıçrama yok. `aria-live="polite"` yalnız metni okur.
 */
export function RevealTail({
  hasMore,
  sentinelRef,
  children,
  className,
  dataCols,
  label = 'Loading more',
}: RevealTailProps) {
  if (!hasMore) return null
  return (
    <>
      <div
        className={cn(styles.tail, className)}
        data-cols={dataCols}
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">{label}</span>
        {children}
      </div>
      <div ref={sentinelRef} aria-hidden className={styles.sentinel} />
    </>
  )
}
