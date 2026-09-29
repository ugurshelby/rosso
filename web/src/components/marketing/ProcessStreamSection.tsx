import { Zap, ShieldCheck, Sparkles } from 'lucide-react'
import styles from './process-stream.module.css'

export type ProcessLang = 'tr' | 'en'

export const PROCESS_STREAM_COPY = {
  tr: {
    sectionTag: 'SÜREÇ',
    title: 'Üç adım. Tüm müzik dünyan.',
    subhead: 'Dakikalar içinde dinleme geçmişini bağla, kişisel müzik evrenine adım at.',
    steps: [
      {
        num: '01',
        label: 'HESAP · IDENTITY',
        title: 'Profilini Aç',
        desc: 'Birkaç saniyede hesabını oluştur, alanını hazırla.',
        microBadge: 'Saniyeler içinde hazır',
        icon: Zap,
      },
      {
        num: '02',
        label: 'BAĞLANTI · SYNC',
        title: 'Spotify’ı Bağla',
        desc: 'Tek tıkla geçmişini güvenle eşitle. Verin tamamen sana ait kalır.',
        microBadge: 'Özel & Güvenli Eşitleme',
        icon: ShieldCheck,
      },
      {
        num: '03',
        label: 'KEŞİF · UNLOCK',
        title: 'Dünyanı Gör',
        desc: 'Müzik kimliğin, geçmiş yolculuğun ve listelerin anında hazır.',
        microBadge: 'Anında Açılır',
        icon: Sparkles,
      },
    ],
  },
  en: {
    sectionTag: 'PROCESS',
    title: 'Three steps to your sound.',
    subhead: 'Connect your listening history in minutes and unlock your personal music ecosystem.',
    steps: [
      {
        num: '01',
        label: 'ACCOUNT · IDENTITY',
        title: 'Create Your Space',
        desc: 'Set up your profile in seconds with zero friction.',
        microBadge: 'Ready in seconds',
        icon: Zap,
      },
      {
        num: '02',
        label: 'CONNECT · SYNC',
        title: 'Connect Spotify',
        desc: 'Securely sync your listening history with a single tap.',
        microBadge: 'Private & Secure Sync',
        icon: ShieldCheck,
      },
      {
        num: '03',
        label: 'REVEAL · UNLOCK',
        title: 'Reveal Your World',
        desc: 'Your taste identity, musical journey, and curated universe—instantly ready.',
        microBadge: 'Instantly Unlocked',
        icon: Sparkles,
      },
    ],
  },
} as const

interface ProcessStreamSectionProps {
  lang?: ProcessLang
}

export function ProcessStreamSection({ lang = 'tr' }: ProcessStreamSectionProps) {
  const c = PROCESS_STREAM_COPY[lang]

  return (
    <section className={styles.section} aria-label={c.title}>
      <div className={styles.atmosphere} aria-hidden>
        <div className={styles.ambientSpot} />
      </div>

      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.tag}>{c.sectionTag}</span>
          <h2 className={styles.title}>{c.title}</h2>
          <p className={styles.lead}>{c.subhead}</p>
        </header>

        <div className={styles.streamStage}>
          {c.steps.map((step, index) => {
            const Icon = step.icon
            const isLast = index === c.steps.length - 1
            return (
              <article key={step.num} className={styles.stepItem}>
                <div className={styles.nodeWrapper}>
                  <div className={styles.nodeGlow} aria-hidden />
                  <div className={styles.nodeCircle}>
                    <span>{step.num}</span>
                  </div>
                  {!isLast && (
                    <div className={styles.connectorTrack} aria-hidden>
                      <div className={styles.connectorLine} />
                    </div>
                  )}
                </div>

                <span className={styles.stepLabel}>{step.label}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>

                <div className={styles.microBadge}>
                  <span className={styles.microIcon} aria-hidden>
                    <Icon size={13} strokeWidth={2} />
                  </span>
                  <span>{step.microBadge}</span>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
