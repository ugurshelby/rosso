import Image from 'next/image'
import { VIBE_CARDS, type VibeCardId } from '@/lib/vibe-cards/data'
import { getT } from '@/lib/i18n/server'

/**
 * Vibe Kartı görselleri — gerçek sanat eserleri (2026-07-14, Sahip temin etti).
 * Eski placeholder SVG'ler (figürsüz, kötü çizilmiş insansı şekiller) kaldırıldı.
 * Kaynak: `design-components/art-images/vibe-cards/` → `public/vibe-cards/*.webp`
 * (1500×1500, WebP q88, Canva metadata temizlendi). Dosya adı = VibeCardId.
 *
 * ⚠ Bu not 2026-08-10'da DÜZELTİLDİ. Eskiden "story-deck kapanış kartında
 * (`.closingArt`) + Taste hero'sunda (84×84 `.artWrap`)" yazıyordu; ikisi de
 * artık doğru değil. `placard-card.tsx` bu bileşeni hiç kullanmıyor (arandı,
 * sıfır eşleşme) ve `.artWrap` diye bir kap kalmamış.
 *
 * Gerçek çağrı yerleri — ikisi de `/taste`, ikisi de AYNI görsel:
 *   1. `taste/page.tsx` → `.plateArt` — sahnenin arka plan dekoru (opacity
 *      .5, üstünde 46px blur katmanı). Küçük görünmesine rağmen kabı sahnenin
 *      tamamı olduğu için **sayfanın LCP elemanı budur** (ölçüldü: 378×755 px).
 *   2. `vibe-card-hero.tsx` → `.artStage` — kartın net kopyası, `max-width: 420px`.
 *
 * Aynı `src` olduğu için tarayıcı tek indirme yapar; (1)'in preload'u (2)'yi de
 * besler. Kaplar `position: relative` + `overflow: hidden` → `fill` modu uygun.
 */

interface VibeCardArtProps {
  id: VibeCardId
  className?: string
  /**
   * 🔴 LCP — yalnız sayfanın EN BÜYÜK görünür elemanı olan çağrıda `true`.
   *
   * Ölçüm (2026-08-10, kimlikli Lighthouse — `lighthouse/10-08-2026/taste.json`):
   * `/taste`'in LCP elemanı bu bileşenin `.plateArt` kopyası. `lcp-breakdown`
   * dağılımı → TTFB 74 ms · **resourceLoadDelay 3.331 ms** · indirme yalnız
   * 84 ms. Yani dosya küçük ve hızlı; tarayıcı onu GEÇ ÖĞRENİYOR.
   * `lcp-discovery` üç maddesinden ikisi kırmızıydı: `priorityHinted: false`
   * ve `eagerlyLoaded: false` (işaretlenen `loading="lazy"`).
   *
   * `priority` bu ikisini birden kapatır: `loading="eager"` + `fetchpriority=
   * "high"` + `<head>`'e preload. Görsel artık HTML'le birlikte keşfedilir.
   *
   * ⚠ HER çağrıya verilmez. `priority` bir önceliktir; her yere dağıtılırsa
   * hiçbir yerde önceliğe dönüşmez ve Next.js "preloaded but not used"
   * uyarısı basar. Bu yüzden varsayılan `false` — açmak bilinçli bir karar.
   */
  priority?: boolean
  /**
   * Kap genişliği farklı olan çağrılar için `sizes` override'ı.
   *
   * Varsayılan değer iki kullanımın ikisine de tam uymuyordu: `.artStage`
   * `max-width: 420px` ile sınırlı, `.plateArt` ise masaüstünde sahnenin
   * `1.2fr` sütununu kaplıyor — "768px üstü = 480px" ikisini de aşıyordu.
   * `sizes` srcset'ten hangi genişliğin seçileceğini belirlediği için
   * fazla büyük değer, LCP görselinde gereksiz büyük dosya demek.
   */
  sizes?: string
}

export async function VibeCardArt({
  id,
  className,
  priority = false,
  sizes = '(min-width: 768px) 480px, 100vw',
}: VibeCardArtProps) {
  const card = VIBE_CARDS[id]
  const { t } = await getT()
  return (
    <Image
      src={`/vibe-cards/${id}.webp`}
      alt={t('catalog.vibeCard.artAlt', { name: card.nameEn })}
      fill
      className={className}
      style={{ objectFit: 'cover' }}
      priority={priority}
      sizes={sizes}
    />
  )
}
