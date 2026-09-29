import { VibeCardArt } from '@/components/vibe-cards/vibe-card-art'
import { VIBE_CARDS, pickVibeCardId, type VibeCardId } from '@/lib/vibe-cards/data'
import { getVibeCardNarrative } from '@/lib/vibe-cards/narrative'
import type { Translator } from '@/lib/i18n/translate'
import styles from './vibe-card-hero.module.css'

interface VibeCardHeroProps {
  /** Deterministik fallback anahtarı (ör. user id) — `vibeCardId` verilmezse kullanılır. */
  seed: string
  /** Gerçek sinyal eşleştirmesiyle seçilmiş kart (matchVibeCard). Verilirse seed yerine bu. */
  vibeCardId?: VibeCardId
  /** Kişiye özel açıklama (Katman D, AI). Yoksa elle küratlı sabit metin çizilir. */
  narrativeOverride?: string | null
  t: Translator['t']
}

/**
 * Taste sayfası — Vibe Kartı kalıcı kimlik gösterimi (Sahip onayı 2026-07-11;
 * kare-format hero revizyonu 2026-07-17: "yatay/dikey değil kare, çok daha hero
 * bir his versin, görsele bakınca 'vay bu benim kimlik kartım' desin").
 * Recap'in dönemsel kapanış kartındaki aynı görsel dilini, kalıcı kimlik bağlamında
 * tekrar kullanır (bkz. `src/components/story-deck/cards/closing-card.tsx`).
 *
 * HERO REVİZYONU (2026-07-30): Artık bağımsız tam-genişlik bölüm değil —
 * `IdentityHero` ile aynı sahnenin (taste/page.tsx → .identityPlate) ikinci
 * sütunu/satırı. İki değişiklik: (1) kendi çerçeve/arka planı kaldırıldı,
 * sahnenin ortak sınırına devretti; (2) sanat eseri üstündeki isim tekrarı
 * kaldırıldı — aynı kart adı hem görselin üstünde hem altındaki metinde iki
 * kez gösteriliyordu, kafa karıştırıyordu. Görsel artık yalnız "Kalıcı
 * Kimlik" etiketini taşıyor, gerçek ad tek yerde (alttaki metin sütunu).
 */
export function VibeCardHero({ seed, vibeCardId: matched, narrativeOverride, t }: VibeCardHeroProps) {
  const vibeCardId = matched ?? pickVibeCardId(seed)
  const vibeCard = VIBE_CARDS[vibeCardId]
  const narrative = narrativeOverride ?? getVibeCardNarrative(vibeCardId)

  return (
    <section className={styles.card} aria-label={t('taste.vibeCardHero.ariaLabel')}>
      {/* Progressive blur sahnesi (design-techniques/progressive-blur-card-design.md):
          sanat eseri kare çerçevede; TEK katman blur+gradient+mask — etiket her
          görselde garantili kontrastla okunur, görselin en fazla ~%38'i kapanır. */}
      <div className={styles.artStage}>
        {/* `priority` YOK — bilinçli. Bu, aynı görselin ikinci (net) kopyası;
            LCP elemanı sahnedeki `.plateArt` kopyası olarak ÖLÇÜLDÜ. İkisine
            birden `priority` verilirse öncelik anlamını yitirir. Zaten aynı
            URL olduğu için tarayıcı tek indirme yapar: `.plateArt`'ın preload'u
            bu kopyayı da ücretsiz besler.
            `sizes`: kap `max-width: 420px` (vibe-card-hero.module.css). */}
        <VibeCardArt id={vibeCardId} sizes="(min-width: 768px) 420px, 100vw" />
        <div className={styles.blurLayer} aria-hidden />
        <div className={styles.overlayText}>
          <p className={styles.eyebrow}>{t('taste.vibeCardHero.lastingIdentity')}</p>
        </div>
      </div>
      <div className={styles.textCol}>
        <p className={styles.textColEyebrow}>{t('taste.vibeCardHero.soundRightNow')}</p>
        <h2 className={styles.textColName}>{vibeCard.nameTr}</h2>
        <p className={styles.desc}>{narrative}</p>
      </div>
    </section>
  )
}
