import Image from 'next/image'
import styles from './hero-ambient-image.module.css'

/**
 * Hero Ambient Image
 *
 * Video oynatma tamamen kaldırılmıştır.
 * 4:3 orijinal proporsiyonunu koruyan (crop etmeyen) ve viewport kenarlarına
 * doğru yumuşak sinematik karartmayla (vignette / edge fade) kaynaşan tekil görsel sahnesi.
 */
export function HeroAmbientImage() {
  return (
    <div className={styles.imageStageWrap} aria-hidden>
      <div className={styles.imageStage}>
        <div className={styles.imageContainer}>
          <Image
            src="/marketing/landing-hero-image.png"
            alt=""
            width={1600}
            height={1200}
            priority
            quality={92}
            className={styles.heroImage}
            sizes="100vw"
          />
        </div>
      </div>

      {/* Viewport kenarlarına doğru çok yönlü yumuşak karartma / vignette maskesi */}
      <div className={styles.vignetteOverlay} />
    </div>
  )
}
